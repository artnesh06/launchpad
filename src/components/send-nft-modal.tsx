'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { ModalFooterWithGas } from '@/components/modal-footer-with-gas';

interface SendNftModalProps {
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  prefilledTokenId?: string;
  chainId?: number;
  onSendSuccess?: (tokenId: string) => void;
}

export function SendNftModal({ open, onClose, contractAddress, prefilledTokenId, chainId: propChainId, onSendSuccess }: SendNftModalProps) {
  const { address: walletAddress, chainId: walletChainId } = useAccount();
  const [tokenId, setTokenId] = React.useState(prefilledTokenId || '');
  const [recipientAddress, setRecipientAddress] = React.useState('');
  const [sending, setSending] = React.useState(false);

  // Use chainId from props, or from wallet, or default to Sepolia
  const chainId = propChainId || walletChainId || 11155111;

  // Update tokenId when prefilledTokenId changes
  React.useEffect(() => {
    if (prefilledTokenId) {
      setTokenId(prefilledTokenId);
    }
  }, [prefilledTokenId]);

  // Reset recipient address when modal opens
  React.useEffect(() => {
    if (open) {
      setRecipientAddress('');
    }
  }, [open]);

  const handleExecute = async () => {
    if (!tokenId.trim() || !recipientAddress.trim()) {
      toast.error('Please fill in all fields', { id: TOAST_ID });
      return;
    }

    // Validate Ethereum address
    if (!ethers.isAddress(recipientAddress)) {
      toast.error('Invalid recipient address', { id: TOAST_ID });
      return;
    }

    // Check wallet connection
    if (!walletAddress) {
      toast.error('Please connect your wallet first', { id: TOAST_ID });
      return;
    }

    setSending(true);
    const loadingToast = toast.loading('Preparing to send NFT...', { id: TOAST_ID });

    try {
      const { ContractService } = await import('@/lib/contract-service');
      const service = new ContractService();

      console.log('🎨 Sending NFT:', {
        from: walletAddress,
        to: recipientAddress,
        tokenId,
        contractAddress,
        chainId
      });

      toast.loading('Sending transaction...', { id: TOAST_ID });

      // Use safeTransferFrom method from ContractService (includes gas options)
      const txHash = await service.safeTransferFrom(
        chainId,
        contractAddress,
        walletAddress,
        recipientAddress,
        parseInt(tokenId)
      );

      console.log('✅ Transaction sent:', txHash);

      toast.loading('Waiting for confirmation...', { id: TOAST_ID });

      // Wait for transaction confirmation
      const signer = await service.getSigner();
      const provider = signer.provider;
      if (provider) {
        const receipt = await provider.waitForTransaction(txHash);
        console.log('✅ Transaction confirmed:', receipt?.hash);
      }

      toast.success('NFT sent successfully!', {
        id: TOAST_ID,
        description: `Token #${tokenId} sent to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
      });

      // Notify parent component about successful transfer
      onSendSuccess?.(tokenId);

      // Reset form and close
      setTokenId('');
      setRecipientAddress('');
      onClose();
    } catch (error: any) {
      console.error('❌ Failed to send NFT:', error);

      // Handle specific error cases
      if (error.code === 4001 || error.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user', { id: TOAST_ID });
      } else if (error.message?.includes('Wrong network')) {
        toast.error('Wrong network', {
          id: TOAST_ID,
          description: error.message
        });
      } else if (error.message?.includes('not owner') || error.message?.includes('ERC721: caller is not token owner')) {
        toast.error('You do not own this NFT', { id: TOAST_ID });
      } else if (error.message?.includes('token does not exist') || error.message?.includes('nonexistent token')) {
        toast.error('Token does not exist', { id: TOAST_ID });
      } else if (error.message?.includes('not approved')) {
        toast.error('Transfer not approved', { id: TOAST_ID });
      } else {
        toast.error('Failed to send NFT', {
          id: TOAST_ID,
          description: error.message || 'Please try again'
        });
      }
    } finally {
      setSending(false);
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
        {/* NFT ID Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">NFT ID</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="#123"
              disabled={!!prefilledTokenId}
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Recipient Address Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Recipient Address</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x32e5129d9712bb53a18bbf9781cc5c35b7c89150"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Execute Button Row */}
        <div className="flex items-center px-6 py-2 justify-between border-b border-[#2F3336]">
          <ModalFooterWithGas chainId={chainId} />
          <div className="flex items-center gap-4">
            <button
              onClick={handleExecute}
              disabled={!tokenId.trim() || !recipientAddress.trim() || sending}
              className="w-[150px] h-10 bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
            >
              {sending ? (
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


