/**
 * Stale-While-Revalidate Implementation Tests
 * 
 * Tests untuk memverifikasi:
 * 1. Immediate stale response (no blocking)
 * 2. Single background refresh dengan lock
 * 3. Request coalescing untuk cache miss
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cachedFetch, getCacheKey, clearAllCache } from '@/lib/hybrid-cache';

describe('Stale-While-Revalidate Implementation', () => {
  beforeEach(async () => {
    // Clear all cache before each test
    await clearAllCache();
    vi.clearAllMocks();
  });

  describe('Immediate Stale Response', () => {
    it('should return stale data immediately without waiting for refresh', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate slow DB
        return { data: `result-${dbCallCount}`, timestamp: Date.now() };
      });

      const cacheKey = getCacheKey('/api/test/stale', { id: '1' });

      // First call: Populate cache
      const result1 = await cachedFetch(cacheKey, fetcher, 1); // 1 second TTL
      expect(result1.data).toBe('result-1');
      expect(dbCallCount).toBe(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second call: Should return stale data IMMEDIATELY
      const startTime = Date.now();
      const result2 = await cachedFetch(cacheKey, fetcher, 1);
      const responseTime = Date.now() - startTime;

      // Verify: Response is immediate (< 50ms, not waiting for 100ms DB call)
      expect(responseTime).toBeLessThan(50);
      
      // Verify: Got stale data (same as first call)
      expect(result2.data).toBe('result-1');
      
      // Verify: DB call count still 1 (background refresh not yet completed)
      expect(dbCallCount).toBe(1);

      // Wait for background refresh to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Third call: Should get fresh data from cache
      const result3 = await cachedFetch(cacheKey, fetcher, 1);
      
      // Verify: Background refresh happened (got new data)
      expect(result3.data).toBe('result-2');
      expect(dbCallCount).toBe(2);
    });
  });

  describe('Single Background Refresh with Lock', () => {
    it('should only trigger one background refresh for concurrent requests', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 200)); // Slow DB
        return { data: `result-${dbCallCount}` };
      });

      const cacheKey = getCacheKey('/api/test/lock', { id: '1' });

      // First call: Populate cache
      await cachedFetch(cacheKey, fetcher, 1);
      expect(dbCallCount).toBe(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Fire 10 concurrent requests after cache expired
      const promises = Array.from({ length: 10 }, () =>
        cachedFetch(cacheKey, fetcher, 1)
      );

      const results = await Promise.all(promises);

      // Verify: All got stale data immediately
      results.forEach(result => {
        expect(result.data).toBe('result-1');
      });

      // Verify: Only 1 DB call so far (background refresh not yet done)
      expect(dbCallCount).toBe(1);

      // Wait for background refresh
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify: Only 1 additional DB call (not 10)
      expect(dbCallCount).toBe(2);
    });

    it('should skip refresh if already in progress', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 500)); // Very slow DB
        return { data: `result-${dbCallCount}` };
      });

      const cacheKey = getCacheKey('/api/test/skip', { id: '1' });

      // Populate cache
      await cachedFetch(cacheKey, fetcher, 1);
      expect(dbCallCount).toBe(1);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Request 1: Triggers background refresh
      const result1 = await cachedFetch(cacheKey, fetcher, 1);
      expect(result1.data).toBe('result-1');

      // Wait a bit (refresh still in progress)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Request 2-5: Should skip refresh (lock exists)
      const promises = Array.from({ length: 4 }, () =>
        cachedFetch(cacheKey, fetcher, 1)
      );
      const results = await Promise.all(promises);

      // All should get stale data
      results.forEach(result => {
        expect(result.data).toBe('result-1');
      });

      // Wait for refresh to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify: Only 1 background refresh (total 2 DB calls)
      expect(dbCallCount).toBe(2);
    });
  });

  describe('Request Coalescing (Cache Miss)', () => {
    it('should coalesce concurrent requests when cache is empty', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return { data: `result-${dbCallCount}` };
      });

      const cacheKey = getCacheKey('/api/test/coalesce', { id: '1' });

      // Fire 50 concurrent requests (no cache)
      const promises = Array.from({ length: 50 }, () =>
        cachedFetch(cacheKey, fetcher, 5)
      );

      const results = await Promise.all(promises);

      // Verify: All got same data
      results.forEach(result => {
        expect(result.data).toBe('result-1');
      });

      // Verify: Only 1 DB call (request coalescing worked)
      expect(dbCallCount).toBe(1);
    });
  });

  describe('Performance Benchmark', () => {
    it('should handle 100 concurrent requests with expired cache in <50ms each', async () => {
      const fetcher = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Slow DB
        return { data: 'test-data' };
      });

      const cacheKey = getCacheKey('/api/test/perf', { id: '1' });

      // Populate cache
      await cachedFetch(cacheKey, fetcher, 1);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Benchmark: 100 concurrent requests
      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, () =>
        cachedFetch(cacheKey, fetcher, 1)
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Verify: All requests completed quickly
      expect(totalTime).toBeLessThan(100); // Total time < 100ms
      
      // Average per request should be < 50ms
      const avgTime = totalTime / 100;
      expect(avgTime).toBeLessThan(50);

      // All got stale data
      results.forEach(result => {
        expect(result.data).toBe('test-data');
      });
    });
  });

  describe('Cache Health Monitoring', () => {
    it('should track refresh locks in cache health', async () => {
      const { getCacheHealth } = await import('@/lib/hybrid-cache');
      
      const fetcher = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { data: 'test' };
      });

      const cacheKey = getCacheKey('/api/test/health', { id: '1' });

      // Populate and expire
      await cachedFetch(cacheKey, fetcher, 1);
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Trigger background refresh
      await cachedFetch(cacheKey, fetcher, 1);

      // Check health immediately (refresh in progress)
      const health = getCacheHealth();
      
      // Should have metrics
      expect(health).toHaveProperty('refreshLocksCount');
      expect(health).toHaveProperty('staleCacheSize');
      expect(health).toHaveProperty('ongoingFetchesCount');
    });
  });
});
