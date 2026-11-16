'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon, ArrowDownRight01Icon, Loading03Icon, Settings02Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi';
import { toast } from 'sonner';
import { OddsLaunchpadABI } from '@/abi/OddsLaunchpad';
import { usePlatformBalance } from '@/hooks/admin/usePlatformBalance';
import { UpdatePlatformFeeModal } from './update-platform-fee-modal';

interface PlatformFeeWithdrawCardProps {
    contractAddress: string;
    chainId: number;
    chainName: string;
    onWithdrawSuccess?: () => void;
}

export function PlatformFeeWithdrawCard({ 
    contractAddress, 
    chainId, 
    chainName,
    onWithdrawSuccess 
}: PlatformFeeWithdrawCardProps) {
    const { address, chain: currentChain } = useAccount();
    const { balance, isLoading, error } = usePlatformBalance(contractAddress, chainId);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const { switchChainAsync } = useSwitchChain();

    const { 
        data: hash, 
        writeContract, 
        isPending: isWritePending,
        error: writeError 
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const handleWithdraw = async () => {
        if (!balance || !address) return;

        try {
            setIsWithdrawing(true);
            
            // Check if we need to switch chain
            if (currentChain?.id !== chainId) {
                toast.loading(`Switching to ${chainName}...`, { id: 'switch-chain' });
                try {
                    await switchChainAsync({ chainId });
                    toast.success('Chain switched successfully', { id: 'switch-chain' });
                } catch (switchError) {
                    console.error('Switch chain error:', switchError);
                    toast.error('Failed to switch chain', { id: 'switch-chain' });
                    setIsWithdrawing(false);
                    return;
                }
            }
            
            writeContract({
                address: contractAddress as `0x${string}`,
                abi: OddsLaunchpadABI,
                functionName: 'withdrawPlatform',
                chainId,
            });

            toast.loading('Withdrawing platform fees...', { id: 'withdraw-platform' });
        } catch (err) {
            console.error('Withdraw error:', err);
            toast.error('Failed to withdraw platform fees', { id: 'withdraw-platform' });
            setIsWithdrawing(false);
        }
    };

    // Handle transaction confirmation
    if (isSuccess && isWithdrawing) {
        toast.success('Platform fees withdrawn successfully!', { id: 'withdraw-platform' });
        setIsWithdrawing(false);
        onWithdrawSuccess?.();
    }

    if (writeError && isWithdrawing) {
        toast.error(`Withdrawal failed: ${writeError.message}`, { id: 'withdraw-platform' });
        setIsWithdrawing(false);
    }

    const isPending = isWritePending || isConfirming || isWithdrawing;
    const hasBalance = balance && parseFloat(balance.balance) > 0;
    const needsChainSwitch = currentChain?.id !== chainId;

    return (
        <>
            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white font-mono flex items-center gap-2">
                                <HugeiconsIcon icon={Wallet01Icon} size={20} />
                                {chainName} Platform Balance
                            </CardTitle>
                            <CardDescription className="text-gray-400 font-mono">
                                Available platform fees to withdraw
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsUpdateModalOpen(true)}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                            disabled={isLoading || !!error}
                        >
                            <HugeiconsIcon icon={Settings02Icon} size={16} />
                        </Button>
                    </div>
                </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <HugeiconsIcon icon={Loading03Icon} size={32} className="text-[#B392F0] animate-spin" />
                    </div>
                ) : error ? (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Failed to load balance: {error.message}
                        </AlertDescription>
                    </Alert>
                ) : balance ? (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-white font-mono">
                                    {parseFloat(balance.balance).toFixed(6)}
                                </span>
                                <span className="text-xl text-gray-400 font-mono">ETH</span>
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-400 font-mono">
                                <p>Platform Treasury: {balance.platformTreasury.slice(0, 6)}...{balance.platformTreasury.slice(-4)}</p>
                                <p>Flat Fee: {balance.flatFee} ETH</p>
                                <p>Status: {balance.isEnabled ? (
                                    <span className="text-green-400">Enabled</span>
                                ) : (
                                    <span className="text-red-400">Disabled</span>
                                )}</p>
                            </div>
                        </div>

                        {needsChainSwitch && (
                            <Alert>
                                <AlertDescription className="text-xs font-mono">
                                    You need to switch to {chainName} to withdraw
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            onClick={handleWithdraw}
                            disabled={!hasBalance || isPending || !balance.isEnabled}
                            className="w-full bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
                        >
                            {isPending ? (
                                <>
                                    <HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 animate-spin" />
                                    {needsChainSwitch && !isWritePending && !isConfirming ? 'Switching Chain...' : 'Withdrawing...'}
                                </>
                            ) : (
                                <>
                                    <HugeiconsIcon icon={ArrowDownRight01Icon} size={16} className="mr-2" />
                                    {needsChainSwitch ? `Switch to ${chainName} & Withdraw` : 'Withdraw Platform Fees'}
                                </>
                            )}
                        </Button>

                        {!hasBalance && (
                            <p className="text-xs text-center text-gray-500 font-mono">
                                No fees available to withdraw
                            </p>
                        )}

                        {!balance.isEnabled && (
                            <Alert>
                                <AlertDescription className="text-xs font-mono">
                                    Platform fees are currently disabled for this collection
                                </AlertDescription>
                            </Alert>
                        )}
                    </>
                ) : null}
            </CardContent>
        </Card>

        {/* Update Platform Fee Modal */}
        {balance && (
            <UpdatePlatformFeeModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                contractAddress={contractAddress}
                chainId={chainId}
                chainName={chainName}
                currentFlatFee={balance.flatFee}
                onUpdateSuccess={onWithdrawSuccess}
            />
        )}
    </>
    );
}
