'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApiClient } from '@/lib/admin-api-client';
import { displayError } from '@/lib/admin-error-handler';
import type { AdminLaunchpad, ApiResponse } from '@/types/admin';

export interface UseAdminLaunchpadDetailReturn {
  launchpad: AdminLaunchpad | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch detailed information for a single launchpad
 * 
 * @param id - Launchpad ID
 * @returns Launchpad details, loading state, error state, and refetch function
 */
export function useAdminLaunchpadDetail(id: string): UseAdminLaunchpadDetailReturn {
  const [launchpad, setLaunchpad] = useState<AdminLaunchpad | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLaunchpad = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await adminApiClient.get<ApiResponse<AdminLaunchpad>>(
        `/launchpads/${id}`
      );

      if (response.success && response.data) {
        setLaunchpad(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch launchpad details');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      displayError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const refetch = useCallback(async () => {
    await fetchLaunchpad();
  }, [fetchLaunchpad]);

  useEffect(() => {
    fetchLaunchpad();
  }, [fetchLaunchpad]);

  return {
    launchpad,
    isLoading,
    error,
    refetch,
  };
}
