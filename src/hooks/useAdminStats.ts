'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApiClient } from '@/lib/admin-api-client';
import { displayError } from '@/lib/admin-error-handler';
import type { AdminStats, ApiResponse } from '@/types/admin';

export interface UseAdminStatsReturn {
  stats: AdminStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch dashboard statistics with React Query caching
 * Fetches total collections, mints, volume, and active launchpads
 * 
 * Uses React Query for automatic caching and background refetching
 * - Cache time: 2 minutes (stats should be relatively fresh)
 * - Stale time: 2 minutes
 * 
 * @param chainId - Optional chain ID to filter stats by chain
 * @returns Stats data, loading state, error state, and refetch function
 */
export function useAdminStats(chainId?: number): UseAdminStatsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-stats', chainId],
    queryFn: async () => {
      try {
        const params: Record<string, any> = {};
        if (chainId !== undefined) {
          params.chainId = chainId;
        }

        const response = await adminApiClient.get<ApiResponse<AdminStats>>(
          '/stats',
          params
        );

        if (response.success && response.data) {
          return response.data;
        } else {
          throw new Error(response.error || 'Failed to fetch stats');
        }
      } catch (err) {
        displayError(err);
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - stats should be relatively fresh
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch: async () => {
      await refetch();
    },
  };
}
