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

interface WithdrawTreasuryModalProps {
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  chainId?: number;
  collectionName?: string;
  onWithdrawSuccess?: () => void;
}

export function WithdrawTreasuryModal({ 
  open, 
  onClose, 
  contractAddress, 
  chainId: propChainId, 
  collectionName,
  onWithdrawSuccess 
}: WithdrawTreasuryModalProps) {
  const { address: walletAddress, chainId: walletChainId } = useAccount();
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [currentBalance, setCurrentBalance] = React.useState('0');
  const [balanceUsd, setBalanceUsd] = React.useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = React.useState(false);
  // Use chainId from props, or from wallet, or default to Sepolia
  const chainId = propChainId || walletChainId || 11155111;

  // Fetch current balance when modal opens
  React.useEffect(() => {
    if (open && contractAddress) {
      fetchBalance();
    }
  }, [open, contractAddress, chainId]);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const [{ ContractService }, ethPriceRes] = await Promise.all([
        import('@/lib/contract-service'),
        fetch('/api/crypto-price?symbol=ETH&currency=USD')
          .then(r => r.json())
          .catch(() => null)
      ]);
      
      const service = new ContractService();
      // Use getTreasuryPendingBalance to get actual withdrawable amount
      const balance = await service.getTreasuryPendingBalance(chainId, contractAddress);
      setCurrentBalance(balance);
      
      // Calculate USD value
      if (ethPriceRes?.success && ethPriceRes?.data?.price) {
        const usdValue = (parseFloat(balance) * ethPriceRes.data.price).toFixed(2);
        setBalanceUsd(usdValue);
      }
    } catch (error) {
      console.error('Failed to fetch treasury balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleExecute = async () => {
    // Check wallet connection
    if (!walletAddress) {
      toast.error('Please connect your wallet first', { id: TOAST_ID });
      return;
    }

    // Check if there's balance to withdraw
    if (parseFloat(currentBalance) <= 0) {
      toast.error('No balance to withdraw', { id: TOAST_ID });
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmWithdraw = async () => {
    setShowConfirmDialog(false);
    setWithdrawing(true);
    const loadingToast = toast.loading('Preparing to withdraw treasury...', { id: TOAST_ID });

    try {
      const { ContractService } = await import('@/lib/contract-service');
      const service = new ContractService();

      console.log('💰 Withdrawing treasury:', {
        contractAddress,
        chainId,
        balance: currentBalance,
        owner: walletAddress
      });

      toast.dismiss(loadingToast);
      toast.loading('Sending withdraw transaction...', { id: TOAST_ID });

      // Call withdrawTreasury function
      const txHash = await service.withdrawTreasury(chainId, contractAddress);

      console.log('✅ Withdraw transaction sent:', txHash);

      toast.dismiss(loadingToast);
      toast.success('Treasury withdrawn successfully!', {
        id: TOAST_ID,
        description: `${currentBalance} ETH has been sent to treasury address.`
      });

      // Notify parent component about successful withdrawal
      onWithdrawSuccess?.();

      // Close modal
      onClose();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('❌ Failed to withdraw treasury:', error);

      // Handle specific error cases
      if (error.code === 4001 || error.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user', { id: TOAST_ID });
      } else if (error.message?.includes('Wrong network')) {
        toast.error('Wrong network', {
          description: error.message
        , id: TOAST_ID });
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('AccessControl')) {
        toast.error('Unauthorized', {
          description: 'Only the collection owner or admin can withdraw'
        , id: TOAST_ID });
      } else if (error.message?.includes('WithdrawalFailed')) {
        toast.error('Withdrawal failed', {
          description: 'The withdrawal transaction failed'
        , id: TOAST_ID });
      } else {
        toast.error('Failed to withdraw treasury', {
          description: error.message || 'Please try again'
        , id: TOAST_ID });
      }
    } finally {
      setWithdrawing(false);
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
          {/* Collection Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
            <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
              <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Collection</label>
            </div>
            <div className="bg-[#0D0E11] flex items-center px-3">
              <span className="text-white font-mono text-[15px]">{collectionName || 'Unknown Collection'}</span>
            </div>
          </div>

          {/* Contract Address Row */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
            <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
              <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Contract</label>
            </div>
            <div className="bg-[#0D0E11] flex items-center px-3">
              <span className="text-[#857F94] font-mono text-[15px]">
                {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
              </span>
            </div>
          </div>

          {/* Treasury Balance Row */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
            <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
              <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Treasury Balance</label>
            </div>
            <div className="bg-[#0D0E11] flex items-center px-3">
              {loadingBalance ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#B392F0] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[#857F94] font-mono text-[15px]">Loading...</span>
                </div>
              ) : (
                <span className="text-white font-mono text-[15px]">
                  {parseFloat(currentBalance).toFixed(6)} ETH
                  {balanceUsd && (
                    <span className="text-[#857F94] ml-2">≈ ${balanceUsd}</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Info Message Row */}
          <div className="border-b border-[#2F3336] bg-[#0D0E11] px-6 py-4">
            <div className="flex items-center gap-2 text-[#05DF72] font-mono text-sm">
              <span className="text-xl">💰</span>
              <span>Funds will be sent to the treasury address configured for this collection.</span>
            </div>
          </div>

          {/* Execute Button Row */}
          <div className="flex items-center px-6 py-2 justify-between border-b border-[#2F3336]">
            <ModalFooterWithGas chainId={chainId} />
            <div className="flex items-center gap-4">
              <button
                onClick={handleExecute}
                disabled={withdrawing || loadingBalance || parseFloat(currentBalance) <= 0}
                className="w-[150px] h-10 bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
              >
                {withdrawing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  'Withdraw'
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
            <AlertDialogTitle className="text-[#05DF72] flex items-center gap-2">
              <span className="text-2xl">💰</span> Confirm Withdrawal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#857F94] space-y-2">
              <p>You are about to withdraw <span className="text-white font-semibold">{parseFloat(currentBalance).toFixed(6)} ETH</span> from the collection treasury.</p>
              <p>The funds will be sent to the treasury address configured for this collection.</p>
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
              onClick={handleConfirmWithdraw}
            >
              Confirm Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


