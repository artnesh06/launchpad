'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { useAccount } from 'wagmi';
import { ModalFooterWithGas } from '@/components/modal-footer-with-gas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BurnNftModalProps {
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  prefilledTokenId?: string;
  chainId?: number;
  onBurnSuccess?: (tokenId: string) => void;
}

export function BurnNftModal({ open, onClose, contractAddress, prefilledTokenId, chainId: propChainId, onBurnSuccess }: BurnNftModalProps) {
  const { address: walletAddress, chainId: walletChainId } = useAccount();
  const [tokenId, setTokenId] = React.useState(prefilledTokenId || '');
  const [burning, setBurning] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  // Use chainId from props, or from wallet, or default to Sepolia
  const chainId = propChainId || walletChainId || 11155111;

  // Update tokenId when prefilledTokenId changes
  React.useEffect(() => {
    if (prefilledTokenId) {
      setTokenId(prefilledTokenId);
    }
  }, [prefilledTokenId]);

  const handleExecute = async () => {
    if (!tokenId.trim()) {
      toast.error('Please enter a Token ID', { id: TOAST_ID });
      return;
    }

    // Check wallet connection
    if (!walletAddress) {
      toast.error('Please connect your wallet first', { id: TOAST_ID });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmBurn = async () => {
    setShowConfirmDialog(false);
    setBurning(true);
    const loadingToast = toast.loading('Preparing to burn NFT...', { id: TOAST_ID });

    try {
      const { ContractService } = await import('@/lib/contract-service');
      const service = new ContractService();

      console.log('🔥 Burning NFT:', {
        tokenId,
        contractAddress,
        chainId,
        owner: walletAddress
      });

      toast.dismiss(loadingToast);
      toast.loading('Sending burn transaction...', {  id: loadingToast , id: TOAST_ID });

      // Call burn method from ContractService (includes gas options)
      const txHash = await service.burn(chainId, contractAddress, parseInt(tokenId));

      console.log('✅ Burn transaction sent:', txHash);

      toast.dismiss(loadingToast);
      toast.loading('Waiting for confirmation...', {  id: loadingToast , id: TOAST_ID });

      const signer = await service.getSigner();
      const provider = signer.provider;
      if (provider) {
        const receipt = await provider.waitForTransaction(txHash);
        console.log('✅ Burn confirmed:', receipt?.hash);
      }

      toast.dismiss(loadingToast);
      toast.success('NFT burned successfully!', {
        id: TOAST_ID,
        description: `Token #${tokenId} has been permanently destroyed.`
      });

      // Notify parent component about successful burn
      onBurnSuccess?.(tokenId);

      // Reset form and close
      setTokenId('');
      onClose();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('❌ Failed to burn NFT:', error);

      // Handle specific error cases
      if (error.code === 4001 || error.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user', { id: TOAST_ID });
      } else if (error.message?.includes('Wrong network')) {
        toast.error('Wrong network', {
          description: error.message
        , id: TOAST_ID });
      } else if (error.message?.includes('not owner') || error.message?.includes('NotTokenOwner')) {
        toast.error('You do not own this NFT', {
          description: 'Only the token owner can burn it'
        , id: TOAST_ID });
      } else if (error.message?.includes('token does not exist') || error.message?.includes('TokenDoesNotExist')) {
        toast.error('Token does not exist', { id: TOAST_ID });
      } else {
        toast.error('Failed to burn NFT', {
          description: error.message || 'Please try again'
        , id: TOAST_ID });
      }
    } finally {
      setBurning(false);
    }
  };

  return (
    <>
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
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Warning Message Row */}
        <div className="border-b border-[#2F3336] bg-[#0D0E11] px-6 py-4">
          <div className="flex items-center gap-2 text-[#FFA500] font-mono text-sm">
            <span className="text-xl">⚠</span>
            <span>Burning an NFT is permanent and cannot be undone!</span>
          </div>
        </div>

        {/* Execute Button Row */}
        <div className="flex items-center px-6 py-2 justify-between border-b border-[#2F3336]">
          <ModalFooterWithGas chainId={chainId} />
          <div className="flex items-center gap-4">
            <button
              onClick={handleExecute}
              disabled={!tokenId.trim() || burning}
              className="w-[150px] h-10 bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
            >
              {burning ? (
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="border-[#2F3336] bg-[#0D0E11]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#FFA500] flex items-center gap-2">
              <span className="text-2xl">⚠️</span> Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#857F94] space-y-2">
              <p>Are you sure you want to burn Token #{tokenId}?</p>
              <p className="text-[#FFA500] font-semibold">This action is PERMANENT and CANNOT be undone!</p>
              <p>The NFT will be destroyed forever.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-[#2F3336] border-[#2F3336] text-white hover:bg-[#3F4346] hover:text-white"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-[#B392F0] text-black hover:bg-[#9B7FD8]"
              onClick={handleConfirmBurn}
            >
              Burn NFT
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


