import { useState, useEffect } from 'react';

export interface PlatformFeeStats {
    totalCollected: string;
    monthlyCollected: string;
    monthlyChange?: number;
    totalTransactions: number;
    feePercentage: number;
    treasury?: string;
    byChain: {
        chainId: number;
        chainName: string;
        collected: string;
        transactions: number;
        percentage: number;
    }[];
}

export function usePlatformFeeStats() {
    const [stats, setStats] = useState<PlatformFeeStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchStats = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch('/api/admin/platform-fee/stats');
            
            if (!response.ok) {
                throw new Error('Failed to fetch platform fee stats');
            }
            
            const data = await response.json();
            setStats(data.data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return {
        stats,
        isLoading,
        error,
        refetch: fetchStats
    };
}
