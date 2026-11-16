'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, TickDouble02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PlatformFeeSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSettings?: {
        feePercentage: number;
        treasury?: string;
    };
    onUpdate: () => void;
}

export function PlatformFeeSettingsModal({
    isOpen,
    onClose,
    currentSettings,
    onUpdate
}: PlatformFeeSettingsModalProps) {
    const [feePercentage, setFeePercentage] = useState(currentSettings?.feePercentage || 2.5);
    const [treasury, setTreasury] = useState(currentSettings?.treasury || '');
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
            const response = await fetch('/api/admin/platform-fee/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    feePercentage,
                    treasury
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update settings');
            }

            setSuccess(true);
            onUpdate();
            
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
                    <h2 className="text-xl font-bold text-white font-mono">Platform Fee Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="feePercentage" className="text-[#B392F0] font-mono">
                            Fee Percentage (%)
                        </Label>
                        <Input
                            id="feePercentage"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={feePercentage}
                            onChange={(e) => setFeePercentage(parseFloat(e.target.value))}
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                            required
                        />
                        <p className="text-xs text-gray-400 font-mono mt-1">
                            Platform fee percentage for each transaction
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="treasury" className="text-[#B392F0] font-mono">
                            Treasury Address
                        </Label>
                        <Input
                            id="treasury"
                            type="text"
                            value={treasury}
                            onChange={(e) => setTreasury(e.target.value)}
                            placeholder="0x..."
                            className="mt-1 bg-[#1E1F22] border-[#2F3336] text-white font-mono"
                        />
                        <p className="text-xs text-gray-400 font-mono mt-1">
                            Address where platform fees are collected
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
                                Settings updated successfully!
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
                            className="flex-1 bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono"
                            disabled={isLoading}
                        >
                            <HugeiconsIcon icon={TickDouble02Icon} size={16} className="mr-2" />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
