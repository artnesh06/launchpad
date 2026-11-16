import { useState, useEffect, useCallback } from 'react';
import { AdminApiClient } from '@/lib/admin-api-client';
import { displayError } from '@/lib/admin-error-handler';
import type { AnalyticsData } from '@/types/admin';

interface UseAdminAnalyticsOptions {
  chainId?: number;
  days?: number;
}

interface UseAdminAnalyticsReturn {
  analytics: AnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminAnalytics(
  options: UseAdminAnalyticsOptions = {}
): UseAdminAnalyticsReturn {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const client = new AdminApiClient();
      const params: Record<string, any> = {};
      
      if (options.chainId) {
        params.chainId = options.chainId;
      }
      
      if (options.days) {
        params.days = options.days;
      }

      const response = await client.get<{ success: boolean; data: AnalyticsData }>(
        '/analytics',
        params
      );

      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      displayError(err);
    } finally {
      setIsLoading(false);
    }
  }, [options.chainId, options.days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}
