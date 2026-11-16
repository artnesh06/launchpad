'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { ModalFooterWithGas } from '@/components/modal-footer-with-gas';
import { useAccount } from 'wagmi';

interface GetFeaturedModalProps {
  open: boolean;
  onClose: () => void;
  chainId?: number;
}

export function GetFeaturedModal({ open, onClose, chainId: propChainId }: GetFeaturedModalProps) {
  const { address: walletAddress, chainId: walletChainId } = useAccount();
  const [partnerCode, setPartnerCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Use chainId from props, or from wallet, or default to Sepolia
  const chainId = propChainId || walletChainId || 11155111;


  const handleExecute = async () => {
    if (!partnerCode.trim()) {
      toast.error('Please enter a partner code', { id: TOAST_ID });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to submit featured partner code
      console.log('Featured Partner Code:', partnerCode);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Featured partner code submitted successfully!', { id: TOAST_ID });
      onClose();
      setPartnerCode('');
    } catch (error: any) {
      console.error('Failed to submit partner code:', error);
      toast.error('Failed to submit partner code', {
        description: error.message || 'Please try again'
      , id: TOAST_ID });
    } finally {
      setLoading(false);
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
        {/* Featured Partner Code Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Featured Partner Code</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              placeholder="123456789"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Execute Button Row */}
        <div className="flex items-center px-6 py-2 justify-between border-b border-[#2F3336]">
          <ModalFooterWithGas chainId={chainId} />
          <div className="flex items-center gap-4"><button
            onClick={handleExecute}
            disabled={loading}
            className="w-[150px] h-10 bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
          >
            {loading ? (
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


