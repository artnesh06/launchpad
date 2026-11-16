'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApiClient } from '@/lib/admin-api-client';
import { displayError } from '@/lib/admin-error-handler';
import type { AdminActivity, ApiResponse } from '@/types/admin';

export interface UseAdminActivityReturn {
  activities: AdminActivity[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago", "1 day ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } else if (diffWeek < 4) {
    return `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffMonth < 12) {
    return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
  } else {
    return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Hook to fetch recent platform activities
 * Automatically formats timestamps as relative time
 * 
 * @param limit - Maximum number of activities to fetch (default: 10)
 * @returns Activities data, loading state, error state, and refetch function
 */
export function useAdminActivity(limit: number = 10): UseAdminActivityReturn {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: Record<string, any> = {
        limit,
      };

      const response = await adminApiClient.get<ApiResponse<AdminActivity[]>>(
        '/activities',
        params
      );

      if (response.success && response.data) {
        // Format timestamps as relative time
        const formattedActivities = response.data.map(activity => ({
          ...activity,
          // Store the relative time in a computed field
          relativeTime: formatRelativeTime(activity.createdAt),
        }));
        setActivities(formattedActivities);
      } else {
        throw new Error(response.error || 'Failed to fetch activities');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      displayError(err);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  const refetch = useCallback(async () => {
    await fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Export the formatRelativeTime function for use in components
 */
export { formatRelativeTime };
