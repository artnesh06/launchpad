'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
    Add01Icon, 
    Delete02Icon, 
    Loading03Icon,
    CheckmarkCircle02Icon,
    AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import OddsLaunchpadABI from '../../../abi/OddsLaunchpad.json';
import { getChainConfig } from '@/config/chains';

interface AirdropRow {
    id: string;
    address: string;
    quantity: string;
}

interface BatchAirdropModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    launchpadId: string; // Launchpad ID from database
    contractAddress: string;
    chainId: number;
    collectionName: string;
    creator: string; // Owner address from launchpad data
}

export function BatchAirdropModal({
    open,
    onOpenChange,
    launchpadId,
    contractAddress,
    chainId,
    collectionName,
    creator,
}: BatchAirdropModalProps) {
    const [rows, setRows] = useState<AirdropRow[]>([
        { id: crypto.randomUUID(), address: '', quantity: '' }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { address: connectedAddress, isConnected } = useAccount();

    // Add new row
    const handleAddRow = () => {
        console.log('Adding new row');
        setRows([...rows, { id: crypto.randomUUID(), address: '', quantity: '' }]);
    };

    // Remove row
    const handleRemoveRow = (id: string) => {
        console.log('Removing row:', id);
        if (rows.length > 1) {
            setRows(rows.filter(row => row.id !== id));
        }
    };

    // Update row data
    const handleUpdateRow = (id: string, field: 'address' | 'quantity', value: string) => {
        console.log('Updating row:', { id, field, value });
        setRows(rows.map(row => 
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    // Validate Ethereum address
    const isValidAddress = (address: string): boolean => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    // Validate form
    const validateForm = (): { valid: boolean; error?: string } => {
        // Check if all rows have data
        for (const row of rows) {
            if (!row.address.trim()) {
                return { valid: false, error: 'All address fields must be filled' };
            }
            if (!isValidAddress(row.address)) {
                return { valid: false, error: `Invalid address: ${row.address}` };
            }
            if (!row.quantity.trim() || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) {
                return { valid: false, error: 'All quantity fields must be valid positive numbers' };
            }
        }
        return { valid: true };
    };

    // Handle submit
    const handleSubmit = async () => {
        console.log('=== BATCH AIRDROP DEBUG START ===');
        console.log('Connected Address:', connectedAddress);
        console.log('Is Connected:', isConnected);
        console.log('Contract Address:', contractAddress);
        console.log('Chain ID:', chainId);
        console.log('Collection Name:', collectionName);
        console.log('Rows:', rows);

        // Check wallet connection first
        if (!isConnected || !connectedAddress) {
            console.error('Wallet not connected');
            toast.error('Wallet Not Connected', { 
                description: 'Please connect your wallet first',
                id: 'airdrop' 
            });
            return;
        }

        // Check if connected wallet is the owner (from launchpad data)
        console.log('Contract Owner (from data):', creator);
        console.log('Connected Address:', connectedAddress);
        
        if (creator.toLowerCase() !== connectedAddress.toLowerCase()) {
            console.error('Not contract owner!');
            toast.error('Access Denied', { 
                description: 'Only the contract owner can perform batch airdrop',
                id: 'airdrop' 
            });
            return;
        }
        
        console.log('✅ Owner check passed');

        const validation = validateForm();
        console.log('Validation Result:', validation);
        
        if (!validation.valid) {
            console.error('Validation Failed:', validation.error);
            toast.error('Validation Error', { description: validation.error });
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare arrays for smart contract
            const recipients = rows.map(row => row.address);
            const quantities = rows.map(row => Number(row.quantity)); // Convert to number

            console.log('Recipients:', recipients);
            console.log('Quantities:', quantities);

            // Calculate total quantity
            const totalQuantity = quantities.reduce((sum, qty) => sum + Number(qty), 0);
            console.log('Total Quantity:', totalQuantity);
            
            // Calculate platform fee using ContractService (same as mint)
            toast.loading('Calculating platform fee...', { id: 'airdrop' });
            
            const { ContractService } = await import('@/lib/contract-service');
            const contractService = new ContractService();
            
            // Get platform fee from contract
            const costInfo = await contractService.calculateMintCost(
                chainId,
                contractAddress,
                0, // Use phase 0 as reference
                totalQuantity
            );
            
            console.log('Cost Info from contract:', costInfo);
            console.log('Platform Fee in ETH:', costInfo.platformFee);

            toast.loading('Please confirm transaction in your wallet...', { id: 'airdrop' });

            // Call batchAirdrop using ContractService (same pattern as mint)
            const { ethers } = await import('ethers');
            
            // Get contract with signer
            const contract = await contractService.getNFTCollectionContract(chainId, contractAddress);
            
            // Check current supply before proceeding
            console.log('Checking contract supply...');
            const totalSupply = await contract.totalSupply();
            const totalMaxSupply = await contract.totalMaxSupply();
            const availableSupply = Number(totalMaxSupply) - Number(totalSupply);
            
            console.log('Total Supply (minted):', totalSupply.toString());
            console.log('Total Max Supply:', totalMaxSupply.toString());
            console.log('Available Supply:', availableSupply);
            console.log('Requested Quantity:', totalQuantity);
            
            if (availableSupply < totalQuantity) {
                toast.error('Insufficient Supply', {
                    id: 'airdrop',
                    description: `Only ${availableSupply} NFTs available, but you requested ${totalQuantity}`
                });
                return;
            }
            
            // Check platform fee config
            console.log('Checking platform fee config...');
            const platformFeeConfig = await contract.getPlatformFeeConfig();
            const isPlatformFeeEnabled = await contract.isPlatformFeeEnabled();
            console.log('Platform Fee Config:', {
                enabled: isPlatformFeeEnabled,
                flatFee: platformFeeConfig.flatFee.toString()
            });
            
            if (!isPlatformFeeEnabled) {
                console.warn('⚠️ Platform fee is disabled, setting fee to 0');
            }
            
            // Convert platform fee to Wei
            const platformFeeWei = ethers.parseEther(costInfo.platformFee);
            
            console.log('Calling batchAirdrop with:');
            console.log('  Recipients:', recipients);
            console.log('  Quantities:', quantities);
            console.log('  Value (Wei):', platformFeeWei.toString());
            console.log('  Value (ETH):', costInfo.platformFee);

            // Try to call the function statically first to get better error message
            try {
                console.log('Testing call statically first...');
                await contract.batchAirdrop.staticCall(recipients, quantities, {
                    value: platformFeeWei,
                    from: connectedAddress
                });
                console.log('✅ Static call successful, proceeding with actual transaction');
            } catch (staticError: any) {
                console.error('❌ Static call failed:', staticError);
                
                // Try to extract error reason
                let errorMessage = 'Transaction will fail';
                if (staticError.reason) {
                    errorMessage = staticError.reason;
                } else if (staticError.message) {
                    errorMessage = staticError.message;
                }
                
                // Check for common errors
                if (errorMessage.includes('ExceedsTotalSupply')) {
                    errorMessage = 'Exceeds total supply. Not enough NFTs available.';
                } else if (errorMessage.includes('InsufficientPayment')) {
                    errorMessage = 'Insufficient payment. Please check platform fee.';
                } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('Ownable')) {
                    errorMessage = 'Only contract owner can perform batch airdrop.';
                }
                
                toast.error('Transaction Validation Failed', {
                    id: 'airdrop',
                    description: errorMessage
                });
                return;
            }

            // Call batchAirdrop function
            const tx = await contract.batchAirdrop(recipients, quantities, {
                value: platformFeeWei
            });

            console.log('Transaction sent:', tx.hash);
            toast.loading('Waiting for confirmation...', { id: 'airdrop' });

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            
            console.log('Transaction confirmed:', receipt);
            
            toast.success('Airdrop Successful!', {
                id: 'airdrop',
                description: `${totalQuantity} NFTs airdropped to ${recipients.length} recipients`,
                duration: 5000,
            });

            // Auto-sync mint using transaction hash with async processing (background)
            const syncMintData = async (): Promise<void> => {
                try {
                    console.log(`🔄 Queuing airdrop sync job in background...`);

                    // Queue the sync job (returns immediately)
                    const queueResponse = await fetch('/api/admin/launchpads/sync-mint-tx-async', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            launchpadId: launchpadId,
                            contractAddress: contractAddress,
                            chainId: chainId,
                            txHash: tx.hash
                        })
                    });

                    const queueResult = await queueResponse.json();

                    if (!queueResult.success) {
                        console.error('❌ Failed to queue sync job:', queueResult.error);
                        return;
                    }

                    console.log('✅ Sync job queued, data will be updated via WebSocket');

                } catch (syncError) {
                    console.error('❌ Failed to sync airdrop data:', syncError);
                }
            };

            // Run sync in background without blocking modal
            syncMintData();

            // Reset form and close modal
            setRows([{ id: crypto.randomUUID(), address: '', quantity: '' }]);
            onOpenChange(false);

        } catch (err: any) {
            console.error('Transaction Error:', err);
            
            // Show error toast with specific message
            if (err.message?.includes('user rejected')) {
                toast.error('Transaction rejected by user', { id: 'airdrop' });
            } else if (err.message?.includes('insufficient funds')) {
                toast.error('Insufficient funds to complete airdrop', { id: 'airdrop' });
            } else if (err.message) {
                toast.error('Airdrop failed', {
                    id: 'airdrop',
                    description: err.message,
                });
            } else {
                toast.error('Airdrop failed. Please try again.', { id: 'airdrop' });
            }
        } finally {
            setIsSubmitting(false);
        }
        console.log('=== BATCH AIRDROP DEBUG END ===');
    };

    // Calculate summary
    const totalRecipients = rows.length;
    const totalNFTs = rows.reduce((sum, row) => {
        const qty = Number(row.quantity);
        return sum + (isNaN(qty) ? 0 : qty);
    }, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-mono">Batch Airdrop</DialogTitle>
                    <DialogDescription className="text-gray-400 font-mono">
                        Airdrop NFTs to multiple addresses for <span className="text-white">{collectionName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Wallet Connection Warning */}
                    {!isConnected && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-yellow-400 font-mono">
                                <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                <span className="font-semibold">Wallet Not Connected</span>
                            </div>
                            <p className="text-sm text-gray-400 font-mono mt-2">
                                Please connect your wallet to execute batch airdrop
                            </p>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="bg-[#1E1F22] border border-[#2F3336] rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                            <div>
                                <span className="text-gray-400">Total Recipients:</span>
                                <span className="ml-2 text-white font-semibold">{totalRecipients}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">Total NFTs:</span>
                                <span className="ml-2 text-white font-semibold">{totalNFTs}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-3">
                        {rows.map((row, index) => (
                            <div key={row.id} className="flex items-end gap-3">
                                <div className="flex-1">
                                    <Label className="text-gray-400 font-mono text-xs">
                                        Address {index + 1}
                                    </Label>
                                    <Input
                                        placeholder="0x..."
                                        value={row.address}
                                        onChange={(e) => handleUpdateRow(row.id, 'address', e.target.value)}
                                        className="bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                                    />
                                </div>
                                <div className="w-32">
                                    <Label className="text-gray-400 font-mono text-xs">
                                        Quantity
                                    </Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={row.quantity}
                                        onChange={(e) => handleUpdateRow(row.id, 'quantity', e.target.value)}
                                        className="bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleRemoveRow(row.id)}
                                    disabled={rows.length === 1}
                                    className="border-[#2F3336] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                >
                                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Add Row Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddRow}
                        className="w-full border-[#2F3336] border-dashed text-gray-400 hover:text-white hover:bg-[#1E1F22] font-mono"
                    >
                        <HugeiconsIcon icon={Add01Icon} size={16} />
                        Add Recipient
                    </Button>

                    {/* Info */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-xs text-blue-300 font-mono">
                            <HugeiconsIcon icon={AlertCircleIcon} size={14} className="inline mr-1" />
                            You can add the same address multiple times. Each row will be sent separately to the smart contract.
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isConnected || isSubmitting || rows.length === 0}
                        className="bg-[#B392F0] hover:bg-[#9B7AD9] text-black font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                                Processing...
                            </>
                        ) : !isConnected ? (
                            <>
                                <HugeiconsIcon icon={AlertCircleIcon} size={16} className="mr-2" />
                                Connect Wallet First
                            </>
                        ) : (
                            <>
                                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="mr-2" />
                                Execute Airdrop
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
