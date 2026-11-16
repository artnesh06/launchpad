'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, DollarCircleIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmergencyWithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EmergencyWithdrawModal({ isOpen, onClose }: EmergencyWithdrawModalProps) {
    const [launchpadAddress, setLaunchpadAddress] = useState('');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [chainId, setChainId] = useState(11155111);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/admin/emergency/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    launchpadAddress,
                    recipient,
                    amount,
                    chainId
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to withdraw funds');
            }

            setSuccess(true);
            
            setTimeout(() => {
                onClose();
                setLaunchpadAddress('');
                setRecipient('');
                setAmount('');
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#0D0E11] border border-[#2F3336] rounded-lg w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white font-mono">Emergency Withdraw</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="launchpadAddress" className="text-[#B392F0] font-mono">
                            Launchpad Address
                        </Label>
                        <Input
                            id="launchpadAddress"
                            type="text"
                            value={launchpadAddress}
                            onChange={(e) => setLaunchpadAddress(e.target.value)}
                            placeholder="0x..."
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="recipient" className="text-[#B392F0] font-mono">
                            Recipient Address
                        </Label>
                        <Input
                            id="recipient"
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="0x..."
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="amount" className="text-[#B392F0] font-mono">
                            Amount (ETH)
                        </Label>
                        <Input
                            id="amount"
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                            required
                        />
                        <p className="text-xs text-gray-400 font-mono mt-1">
                            Leave empty to withdraw all available funds
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="chainId" className="text-[#B392F0] font-mono">
                            Chain
                        </Label>
                        <select
                            id="chainId"
                            value={chainId}
                            onChange={(e) => setChainId(Number(e.target.value))}
                            className="mt-1 w-full px-3 py-2 bg-[#1E1F22] border border-[#2F3336] text-white font-mono rounded-md"
                        >
                            <option value={1}>Ethereum Mainnet</option>
                            <option value={11155111}>Sepolia Testnet</option>
                            <option value={8453}>Base</option>
                            <option value={84532}>Base Sepolia</option>
                        </select>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-green-500/10 border-green-500/50">
                            <AlertDescription className="text-green-400">
                                Funds withdrawn successfully!
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-mono"
                            disabled={isLoading}
                        >
                            <HugeiconsIcon icon={DollarCircleIcon} size={16} className="mr-2" />
                            {isLoading ? 'Withdrawing...' : 'Withdraw'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
