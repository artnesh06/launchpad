/**
 * WebSocket Optimization Hooks
 * 
 * Utility hooks untuk mengoptimalkan handling multiple websocket events:
 * - Debouncing: Ambil event terakhir setelah jeda
 * - Throttling: Update maksimal sekali per interval
 * - Batching: Kumpulkan events lalu update sekaligus
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================================
// Debouncing Hook
// ============================================================================

/**
 * useDebounce - Delay update sampai tidak ada event baru dalam interval tertentu
 * 
 * Use case: Stats, counters, atau data yang sering berubah
 * Contoh: Total mints counter yang update setelah burst of events selesai
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Throttling Hook
// ============================================================================

/**
 * useThrottle - Update maksimal sekali per interval
 * 
 * Use case: Real-time charts, progress bars
 * Contoh: Chart yang update maksimal 1x per detik meskipun ada banyak events
 */
export function useThrottle<T>(value: T, interval: number = 1000): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      setThrottledValue(value);
      lastUpdated.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdated.current = Date.now();
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// ============================================================================
// Batching Hook
// ============================================================================

interface BatchOptions<T> {
  maxBatchSize?: number;
  maxWaitTime?: number;
  processor: (batch: T[]) => void;
}

/**
 * useBatch - Kumpulkan events lalu process sekaligus
 * 
 * Use case: Bulk updates, mengurangi re-renders
 * Contoh: Aggregate multiple mint events menjadi satu update
 */
export function useBatch<T>(options: BatchOptions<T>) {
  const {
    maxBatchSize = 10,
    maxWaitTime = 1000,
    processor,
  } = options;

  const batchRef = useRef<T[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const processBatch = useCallback(() => {
    if (batchRef.current.length > 0) {
      processor([...batchRef.current]);
      batchRef.current = [];
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, [processor]);

  const addToBatch = useCallback((item: T) => {
    batchRef.current.push(item);

    // Process immediately if batch is full
    if (batchRef.current.length >= maxBatchSize) {
      processBatch();
      return;
    }

    // Otherwise, schedule processing
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      processBatch();
    }, maxWaitTime);
  }, [maxBatchSize, maxWaitTime, processBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Process remaining items
      if (batchRef.current.length > 0) {
        processor([...batchRef.current]);
      }
    };
  }, [processor]);

  return { addToBatch, processBatch };
}

// ============================================================================
// Event Aggregator Hook
// ============================================================================

interface AggregatorOptions<T, R> {
  aggregator: (events: T[]) => R;
  interval?: number;
}

/**
 * useEventAggregator - Aggregate multiple events menjadi single result
 * 
 * Use case: Menghitung total dari multiple events
 * Contoh: Sum total quantity dari multiple mint events
 */
export function useEventAggregator<T, R>(
  events: T[],
  options: AggregatorOptions<T, R>
): R | null {
  const { aggregator, interval = 500 } = options;
  const [result, setResult] = useState<R | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (events.length === 0) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const aggregated = aggregator(events);
      setResult(aggregated);
    }, interval);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [events, aggregator, interval]);

  return result;
}

// ============================================================================
// Rate Limiter Hook
// ============================================================================

interface RateLimiterOptions {
  maxUpdatesPerSecond?: number;
}

/**
 * useRateLimiter - Limit update rate untuk prevent excessive re-renders
 * 
 * Use case: High-frequency updates yang perlu dibatasi
 */
export function useRateLimiter(options: RateLimiterOptions = {}) {
  const { maxUpdatesPerSecond = 2 } = options;
  const lastUpdateRef = useRef<number>(0);
  const minInterval = 1000 / maxUpdatesPerSecond;

  const shouldUpdate = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= minInterval) {
      lastUpdateRef.current = now;
      return true;
    }

    return false;
  }, [minInterval]);

  return { shouldUpdate };
}
