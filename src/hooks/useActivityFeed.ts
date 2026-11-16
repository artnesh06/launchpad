'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ActivityItem, ActivityType } from '@/types/activity';

interface UseActivityFeedOptions {
  type: ActivityType | 'all';
  chainId?: number | 'all';
  limit?: number;
  pollingInterval?: number; // default: 10000ms
  enabled?: boolean; // Allow disabling the hook
}

interface UseActivityFeedReturn {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_POLLING_INTERVAL = 10000; // 10 seconds
const ERROR_RETRY_INTERVAL = 30000; // 30 seconds

export function useActivityFeed(options: UseActivityFeedOptions): UseActivityFeedReturn {
  const {
    type,
    chainId = 'all',
    limit = 3,
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    enabled = true,
  } = options;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isVisibleRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cachedActivitiesRef = useRef<ActivityItem[]>([]);
  const consecutiveErrorsRef = useRef<number>(0);

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (type !== 'all') {
        params.append('type', type);
      }
      if (chainId !== 'all') {
        params.append('chain', String(chainId));
      }
      params.append('limit', String(limit));

      const response = await fetch(`/api/activity/recent?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const newActivities = data.data.activities || [];
        setActivities(newActivities);
        
        // Cache successful response
        cachedActivitiesRef.current = newActivities;
        
        // Reset error state and consecutive error count
        setError(null);
        consecutiveErrorsRef.current = 0;
      } else {
        throw new Error(data.error || 'Failed to fetch activities');
      }

      // Only set loading to false on initial load
      if (loading) {
        setLoading(false);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Error fetching activities:', err);
      consecutiveErrorsRef.current++;

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Use cached data if available and this is not the first load
      if (cachedActivitiesRef.current.length > 0 && !loading) {
        console.log('Using cached activity data due to fetch error');
        setActivities(cachedActivitiesRef.current);
        
        // Set error but don't clear activities
        if (consecutiveErrorsRef.current >= 3) {
          setError(`Connection issue (using cached data): ${errorMessage}`);
        } else {
          // Don't show error to user on first few failures
          setError(null);
        }
      } else {
        // No cached data available or initial load
        setError(errorMessage);
      }

      // Only set loading to false on initial load
      if (loading) {
        setLoading(false);
      }

      // Schedule retry after error with exponential backoff
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      const retryDelay = consecutiveErrorsRef.current >= 3 
        ? ERROR_RETRY_INTERVAL 
        : Math.min(5000 * consecutiveErrorsRef.current, ERROR_RETRY_INTERVAL);
      
      retryTimeoutRef.current = setTimeout(() => {
        if (enabled && isVisibleRef.current) {
          fetchActivities();
        }
      }, retryDelay);
    }
  }, [type, chainId, limit, loading, enabled]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchActivities();
  }, [fetchActivities]);

  // Handle visibility change to pause/resume polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;

      if (isVisibleRef.current && enabled) {
        // Resume polling when tab becomes visible
        fetchActivities();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchActivities, enabled]);

  // Setup polling
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial fetch
    fetchActivities();

    // Setup polling interval
    pollingIntervalRef.current = setInterval(() => {
      // Only poll if tab is visible
      if (isVisibleRef.current) {
        fetchActivities();
      }
    }, pollingInterval);

    // Cleanup function
    return () => {
      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [enabled, fetchActivities, pollingInterval]);

  return {
    activities,
    loading,
    error,
    refetch,
  };
}
