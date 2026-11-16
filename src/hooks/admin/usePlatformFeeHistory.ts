import { useState, useEffect } from 'react';
import type { PaginationInfo } from '@/types/admin';

export interface PlatformFeeTransaction {
    id: string;
    chainId: number;
    chainName: string;
    txHash: string;
    from: string;
    amount: string;
    quantity: number;
    launchpadName?: string;
    launchpadAddress?: string;
    timestamp: Date;
}

export function usePlatformFeeHistory(page = 1, limit = 20) {
    const [history, setHistory] = useState<PlatformFeeTransaction[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch(`/api/admin/platform-fee/history?page=${page}&limit=${limit}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch platform fee history');
            }
            
            const data = await response.json();
            setHistory(data.data.items);
            setPagination(data.data.pagination);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [page, limit]);

    return {
        history,
        pagination,
        isLoading,
        error,
        refetch: fetchHistory
    };
}
