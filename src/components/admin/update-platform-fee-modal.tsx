'use client';

import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, TickDouble02Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi';
import { toast } from 'sonner';
import { OddsLaunchpadABI } from '@/abi/OddsLaunchpad';
import { parseEther } from 'viem';

interface UpdatePlatformFeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractAddress: string;
    chainId: number;
    chainName: string;
    currentFlatFee: string;
    onUpdateSuccess?: () => void;
}

export function UpdatePlatformFeeModal({
    isOpen,
    onClose,
    contractAddress,
    chainId,
    chainName,
    currentFlatFee,
    onUpdateSuccess
}: UpdatePlatformFeeModalProps) {
    const [newFlatFee, setNewFlatFee] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const { address, chain: currentChain } = useAccount();
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

    useEffect(() => {
        if (isOpen) {
            setNewFlatFee(currentFlatFee);
        }
    }, [isOpen, currentFlatFee]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!address || !newFlatFee) return;

        try {
            setIsUpdating(true);

            // Check if we need to switch chain
            if (currentChain?.id !== chainId) {
                toast.loading(`Switching to ${chainName}...`, { id: 'switch-chain-fee' });
                try {
                    await switchChainAsync({ chainId });
                    toast.success('Chain switched successfully', { id: 'switch-chain-fee' });
                } catch (switchError) {
                    console.error('Switch chain error:', switchError);
                    toast.error('Failed to switch chain', { id: 'switch-chain-fee' });
                    setIsUpdating(false);
                    return;
                }
            }

            const feeInWei = parseEther(newFlatFee);

            writeContract({
                address: contractAddress as `0x${string}`,
                abi: OddsLaunchpadABI,
                functionName: 'updatePlatformFlatFee',
                args: [feeInWei],
                chainId,
            });

            toast.loading('Updating platform flat fee...', { id: 'update-fee' });
        } catch (err) {
            console.error('Update error:', err);
            toast.error('Failed to update platform fee', { id: 'update-fee' });
            setIsUpdating(false);
        }
    };

    // Handle transaction confirmation
    useEffect(() => {
        if (isSuccess && isUpdating) {
            toast.success('Platform flat fee updated successfully!', { id: 'update-fee' });
            setIsUpdating(false);
            onUpdateSuccess?.();
            setTimeout(() => {
                onClose();
            }, 1500);
        }
    }, [isSuccess, isUpdating, onUpdateSuccess, onClose]);

    useEffect(() => {
        if (writeError && isUpdating) {
            toast.error(`Update failed: ${writeError.message}`, { id: 'update-fee' });
            setIsUpdating(false);
        }
    }, [writeError, isUpdating]);

    if (!isOpen) return null;

    const isPending = isWritePending || isConfirming || isUpdating;
    const needsChainSwitch = currentChain?.id !== chainId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#0D0E11] border border-[#2F3336] rounded-lg w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white font-mono">Update Platform Flat Fee</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                        disabled={isPending}
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="chainName" className="text-[#B392F0] font-mono">
                            Collection
                        </Label>
                        <Input
                            id="chainName"
                            type="text"
                            value={chainName}
                            disabled
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-gray-400 font-mono"
                        />
                    </div>

                    <div>
                        <Label htmlFor="currentFee" className="text-[#B392F0] font-mono">
                            Current Flat Fee
                        </Label>
                        <Input
                            id="currentFee"
                            type="text"
                            value={`${currentFlatFee} ETH`}
                            disabled
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-gray-400 font-mono"
                        />
                    </div>

                    <div>
                        <Label htmlFor="newFlatFee" className="text-[#B392F0] font-mono">
                            New Flat Fee (ETH)
                        </Label>
                        <Input
                            id="newFlatFee"
                            type="number"
                            step="0.0001"
                            min="0"
                            value={newFlatFee}
                            onChange={(e) => setNewFlatFee(e.target.value)}
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                            placeholder="0.001"
                            required
                            disabled={isPending}
                        />
                        <p className="text-xs text-gray-400 font-mono mt-1">
                            Platform flat fee charged per mint transaction
                        </p>
                    </div>

                    {needsChainSwitch && (
                        <Alert>
                            <AlertDescription className="text-xs font-mono">
                                You need to switch to {chainName} to update
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
                            disabled={isPending || !newFlatFee}
                        >
                            {isPending ? (
                                <>
                                    <HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 animate-spin" />
                                    {needsChainSwitch && !isWritePending && !isConfirming ? 'Switching...' : 'Updating...'}
                                </>
                            ) : (
                                <>
                                    <HugeiconsIcon icon={TickDouble02Icon} size={16} className="mr-2" />
                                    Update Fee
                                </>
                            )}
                        </Button>
                    </div>
                </form>

                <Alert className="mt-4 bg-yellow-500/10 border-yellow-500/50">
                    <AlertDescription className="text-xs text-yellow-400 font-mono">
                        <strong>Note:</strong> Platform treasury address cannot be changed after deployment. Only the flat fee amount can be updated.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
}
