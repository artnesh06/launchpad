'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApiClient } from '@/lib/admin-api-client';
import { displayError, displaySuccess } from '@/lib/admin-error-handler';
import type { 
  AdminLaunchpad, 
  LaunchpadFilters, 
  PaginatedResponse, 
  PaginationInfo,
  ApiResponse 
} from '@/types/admin';

export interface UseAdminLaunchpadsReturn {
  launchpads: AdminLaunchpad[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
}

/**
 * Hook to fetch and manage launchpads with filtering and pagination
 * 
 * @param filters - Filter options including chainId, status, search, page, limit
 * @returns Launchpads data, pagination info, loading state, error state, and utility functions
 */
export function useAdminLaunchpads(filters: LaunchpadFilters): UseAdminLaunchpadsReturn {
  const [launchpads, setLaunchpads] = useState<AdminLaunchpad[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current: 1,
    total: 0,
    count: 0,
    limit: filters.limit || 10,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to track if we're currently fetching to prevent duplicate requests
  const isFetchingRef = useRef(false);

  const fetchLaunchpads = useCallback(async () => {
    // Prevent duplicate concurrent requests
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const params: Record<string, any> = {
        page: filters.page || 1,
        limit: filters.limit || 10,
      };

      if (filters.chainId !== undefined) {
        params.chainId = filters.chainId;
      }
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.creatorAddress) {
        params.creatorAddress = filters.creatorAddress;
      }

      const response = await adminApiClient.get<ApiResponse<PaginatedResponse<AdminLaunchpad>>>(
        '/launchpads',
        params
      );

      if (response.success && response.data) {
        setLaunchpads(response.data.items);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.error || 'Failed to fetch launchpads');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      displayError(err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [filters.page, filters.limit, filters.chainId, filters.status, filters.search, filters.creatorAddress]);

  const refetch = useCallback(async () => {
    await fetchLaunchpads();
  }, [fetchLaunchpads]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    try {
      const response = await adminApiClient.patch<ApiResponse<AdminLaunchpad>>(
        `/launchpads/${id}/status`,
        { status }
      );

      if (response.success && response.data) {
        // Update the launchpad in the local state
        setLaunchpads(prev => 
          prev.map(lp => lp.id === id ? { ...lp, status: response.data!.status } : lp)
        );
        displaySuccess('Status updated successfully');
      } else {
        throw new Error(response.error || 'Failed to update status');
      }
    } catch (err) {
      displayError(err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchLaunchpads();
  }, [filters.page, filters.limit, filters.chainId, filters.status, filters.search, filters.creatorAddress]);

  return {
    launchpads,
    pagination,
    isLoading,
    error,
    refetch,
    updateStatus,
  };
}
