'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { useAccount } from 'wagmi';
import { ModalFooterWithGas } from '@/components/modal-footer-with-gas';

interface SnapshotHoldersModalProps {
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  chainId?: number;
}

interface HolderData {
  address: string;
  tokenIds: number[];
  balance: number;
}

export function SnapshotHoldersModal({ open, onClose, contractAddress, chainId: propChainId }: SnapshotHoldersModalProps) {
  const { chainId: walletChainId } = useAccount();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [totalTokens, setTotalTokens] = React.useState(0);

  // Use chainId from props, or from wallet, or default to Sepolia
  const chainId = propChainId || walletChainId || 11155111;

  const handleExecute = async () => {
    setIsGenerating(true);
    setProgress(0);
    setTotalTokens(0);
    const loadingToast = toast.loading('Initializing snapshot...', { id: TOAST_ID });

    try {
      console.log('📸 Generating snapshot for:', { contractAddress, chainId });

      // Call backend API with streaming
      const response = await fetch('/api/admin/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress, chainId })
      });

      if (!response.ok) {
        throw new Error('Failed to start snapshot');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let csvContent = '';
      let holdersCount = 0;
      let method = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'status') {
              toast.dismiss(loadingToast);
              toast.loading(data.message, { id: TOAST_ID });
            } else if (data.type === 'total') {
              setTotalTokens(data.total);
              toast.dismiss(loadingToast);
              toast.loading(`Scanning tokens (0/${data.total})...`, { id: TOAST_ID });
            } else if (data.type === 'progress') {
              setProgress(data.current);
              toast.dismiss(loadingToast);
              toast.loading(`Scanning tokens (${data.current}/${data.total})...`, { id: TOAST_ID });
              setTotalTokens(data.total);
            } else if (data.type === 'complete') {
              csvContent = data.csv;
              holdersCount = data.holders;
              method = data.method || 'Unknown';
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          }
        }
      }

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `holders-snapshot-${contractAddress.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success('Snapshot generated successfully!', {
        id: TOAST_ID,
        description: `${holdersCount} holders exported via ${method}`
      });

      onClose();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('❌ Failed to generate snapshot:', error);

      if (error.message?.includes('No tokens minted')) {
        toast.error('No tokens minted yet', {
          description: 'This collection has no minted tokens'
        , id: TOAST_ID });
      } else {
        toast.error('Failed to generate snapshot', {
          description: error.message || 'Please try again'
        , id: TOAST_ID });
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setTotalTokens(0);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      position="bottom"
      showOverlay={true}
    >
      {/* Content - Table Layout */}
      <div className="w-full max-w-[1000px] mx-auto">
        {/* Contract Address Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Contract Address</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={contractAddress}
              disabled
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none opacity-50 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Description Row */}
        <div className="border-b border-[#2F3336] bg-[#0D0E11] px-6 py-4">
          <p className="text-[#B392F0] font-mono text-[15px] leading-relaxed">
            Generate a snapshot of all current NFT holders. This will scan the blockchain and download a CSV file containing wallet addresses, balances, and token IDs.
          </p>
        </div>

        {/* Progress Row (shown when generating) */}
        {isGenerating && totalTokens > 0 && (
          <div className="border-b border-[#2F3336] bg-[#0D0E11] px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-[#B392F0] font-mono text-sm mb-2">
                  <span>Scanning tokens...</span>
                  <span>{progress} / {totalTokens}</span>
                </div>
                <div className="w-full h-2 bg-[#1E1F22] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#B392F0] transition-all duration-300"
                    style={{ width: `${(progress / totalTokens) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Execute Button Row */}
        <div className="flex items-center px-6 py-2 justify-between border-b border-[#2F3336]">
          <ModalFooterWithGas chainId={chainId} />
          <div className="flex items-center gap-4">
            <button
              onClick={handleExecute}
              disabled={isGenerating}
              className="w-[150px] h-10 bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                'Execute'
              )}
            </button>
            <button
              onClick={onClose}
              className="relative bg-[#2F3336] w-[120px] h-10 border border-[#2F3336] rounded-[10px] overflow-hidden group hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}


