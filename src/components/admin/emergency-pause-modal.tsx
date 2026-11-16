'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Alert01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmergencyPauseModalProps {
    isOpen: boolean;
    onClose: () => void;
    action: 'pause' | 'unpause' | null;
}

export function EmergencyPauseModal({ isOpen, onClose, action }: EmergencyPauseModalProps) {
    const [launchpadAddress, setLaunchpadAddress] = useState('');
    const [chainId, setChainId] = useState(11155111);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen || !action) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/admin/emergency/pause', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    launchpadAddress,
                    chainId,
                    action,
                    reason
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `Failed to ${action} contract`);
            }

            setSuccess(true);
            
            setTimeout(() => {
                onClose();
                setLaunchpadAddress('');
                setReason('');
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
                    <h2 className="text-xl font-bold text-white font-mono">
                        {action === 'pause' ? 'Pause' : 'Unpause'} Contract
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                </div>

                <Alert className="mb-4 bg-red-500/10 border-red-500/50">
                    <HugeiconsIcon icon={Alert01Icon} size={16} className="text-red-500" />
                    <AlertDescription className="text-red-400">
                        This action will {action === 'pause' ? 'stop all contract operations' : 'resume contract operations'}. 
                        Requires admin role and blockchain transaction.
                    </AlertDescription>
                </Alert>

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

                    <div>
                        <Label htmlFor="reason" className="text-[#B392F0] font-mono">
                            Reason
                        </Label>
                        <Input
                            id="reason"
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Emergency reason..."
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                            required
                        />
                        <p className="text-xs text-gray-400 font-mono mt-1">
                            This will be logged for audit purposes
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-green-500/10 border-green-500/50">
                            <AlertDescription className="text-green-400">
                                Contract {action}d successfully!
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
                            variant={action === 'pause' ? 'destructive' : 'default'}
                            className="flex-1 font-mono"
                            disabled={isLoading}
                        >
                            {isLoading ? `${action === 'pause' ? 'Pausing' : 'Unpausing'}...` : `${action === 'pause' ? 'Pause' : 'Unpause'} Contract`}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
