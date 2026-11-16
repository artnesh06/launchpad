'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Delete02Icon, Alert01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RemoveTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateAddress: string | null;
    onSuccess: () => void;
}

export function RemoveTemplateModal({ isOpen, onClose, templateAddress, onSuccess }: RemoveTemplateModalProps) {
    const [chainId, setChainId] = useState(11155111);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen || !templateAddress) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/admin/templates/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    templateAddress,
                    chainId
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove template');
            }

            setSuccess(true);
            onSuccess();
            
            setTimeout(() => {
                onClose();
            }, 1500);
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
                    <h2 className="text-xl font-bold text-white font-mono">Remove Template</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                </div>

                <Alert className="mb-4 bg-red-500/10 border-red-500/50">
                    <HugeiconsIcon icon={Alert01Icon} size={16} className="text-red-500" />
                    <AlertDescription className="text-red-400">
                        This will prevent new deployments using this template. Existing contracts will not be affected.
                    </AlertDescription>
                </Alert>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <p className="text-sm text-gray-400 font-mono">Template Address</p>
                        <p className="mt-1 text-xs text-white font-mono break-all bg-[#1E1F22] p-2 rounded">
                            {templateAddress}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="chainId" className="text-sm text-[#B392F0] font-mono">
                            Chain
                        </label>
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
                                Template removed successfully!
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
                            variant="destructive"
                            className="flex-1 font-mono"
                            disabled={isLoading}
                        >
                            <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                            {isLoading ? 'Removing...' : 'Remove Template'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
