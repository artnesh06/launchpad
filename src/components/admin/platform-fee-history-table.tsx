'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { PlatformFeeTransaction } from '@/hooks/admin/usePlatformFeeHistory';
import type { PaginationInfo } from '@/types/admin';
import { formatDistanceToNow } from 'date-fns';

interface PlatformFeeHistoryTableProps {
    history: PlatformFeeTransaction[];
    isLoading: boolean;
    error: Error | null;
    pagination: PaginationInfo | null;
    onRefresh: () => void;
}

export function PlatformFeeHistoryTable({
    history,
    isLoading,
    error,
    pagination,
    onRefresh
}: PlatformFeeHistoryTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between border-b border-[#2F3336] pb-3">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[150px]" />
                        </div>
                        <Skeleton className="h-5 w-[80px]" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                <AlertTitle>Error loading history</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>{error.message}</span>
                    <Button variant="outline" size="sm" onClick={onRefresh}>
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-gray-400 font-mono">No transactions found</p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                    Platform fee transactions will appear here
                </p>
            </div>
        );
    }

    const getExplorerUrl = (chainId: number, txHash: string) => {
        const explorers: Record<number, string> = {
            1: 'https://etherscan.io',
            11155111: 'https://sepolia.etherscan.io',
            8453: 'https://basescan.org',
            84532: 'https://sepolia.basescan.org',
            6343: 'https://explorer.monad.xyz', // Monad testnet
        };
        return `${explorers[chainId] || 'https://etherscan.io'}/tx/${txHash}`;
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {history.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between border-b border-[#2F3336] pb-3 last:border-0 last:pb-0">
                        <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white font-mono">
                                    {tx.launchpadName || 'Unknown Collection'}
                                </p>
                                <Badge variant="outline" className="text-xs border-[#2F3336] text-gray-400 font-mono">
                                    {tx.chainName}
                                </Badge>
                            </div>
                            <p className="text-xs text-gray-400 font-mono">
                                From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)} • Minted {tx.quantity}x
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                                {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                {parseFloat(tx.amount) === 0 ? (
                                    <p className="text-sm font-bold text-green-400 font-mono">
                                        FREE
                                    </p>
                                ) : (
                                    <p className="text-sm font-bold text-white font-mono">
                                        {tx.amount} ETH
                                    </p>
                                )}
                            </div>
                            <a
                                href={getExplorerUrl(tx.chainId, tx.txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#B392F0] hover:text-[#9370DB]"
                            >
                                <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {pagination && pagination.total > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[#2F3336]">
                    <p className="text-sm text-gray-400 font-mono">
                        Page {pagination.current} of {pagination.total}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current === 1}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current === pagination.total}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
