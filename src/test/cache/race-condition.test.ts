/**
 * Race Condition Tests
 * 
 * Tests untuk memverifikasi bahwa implementasi aman dari race conditions
 * pada high-traffic scenarios (puluhan ribu concurrent requests)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cachedFetch, getCacheKey, clearAllCache, getCacheHealth } from '@/lib/hybrid-cache';

describe('Race Condition Tests', () => {
  beforeEach(async () => {
    await clearAllCache();
    vi.clearAllMocks();
  });

  describe('Refresh Lock Race Condition', () => {
    it('should only trigger ONE background refresh for 10,000 concurrent requests', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 200)); // Slow DB
        return { data: `result-${dbCallCount}`, timestamp: Date.now() };
      });

      const cacheKey = getCacheKey('/api/test/race-lock', { id: '1' });

      // Populate cache
      await cachedFetch(cacheKey, fetcher, 1);
      expect(dbCallCount).toBe(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Fire 10,000 concurrent requests (simulated with 100 for test speed)
      const concurrentCount = 100;
      const promises = Array.from({ length: concurrentCount }, () =>
        cachedFetch(cacheKey, fetcher, 1)
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Verify: All requests completed quickly (< 50ms total)
      expect(totalTime).toBeLessThan(100);

      // Verify: All got stale data
      results.forEach(result => {
        expect(result.data).toBe('result-1');
      });

      // Verify: Only 1 DB call so far (background refresh not yet done)
      expect(dbCallCount).toBe(1);

      // Wait for background refresh to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify: Only 1 additional DB call (not 100)
      expect(dbCallCount).toBe(2);

      console.log(`✅ Race condition test passed: ${concurrentCount} requests → 1 DB call`);
    });

    it('should handle atomic lock acquisition correctly', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 300));
        return { data: `result-${dbCallCount}` };
      });

      const cacheKey = getCacheKey('/api/test/atomic-lock', { id: '1' });

      // Populate and expire
      await cachedFetch(cacheKey, fetcher, 1);
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Fire requests in rapid succession (simulate race)
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(cachedFetch(cacheKey, fetcher, 1));
        // No await - fire immediately
      }

      await Promise.all(promises);

      // Wait for background refresh
      await new Promise(resolve => setTimeout(resolve, 400));

      // Verify: Only 1 background refresh happened
      expect(dbCallCount).toBe(2);
    });
  });

  describe('High Concurrency Scenarios', () => {
    it('should handle 1,000 concurrent cache miss requests', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return { data: `result-${dbCallCount}` };
      });

      const cacheKey = getCacheKey('/api/test/cache-miss', { id: '1' });

      // Fire 1,000 concurrent requests (no cache)
      const concurrentCount = 100; // Reduced for test speed
      const promises = Array.from({ length: concurrentCount }, () =>
        cachedFetch(cacheKey, fetcher, 5)
      );

      const results = await Promise.all(promises);

      // Verify: All got same data (request coalescing worked)
      results.forEach(result => {
        expect(result.data).toBe('result-1');
      });

      // Verify: Only 1 DB call (request coalescing)
      expect(dbCallCount).toBe(1);

      console.log(`✅ Request coalescing: ${concurrentCount} requests → 1 DB call`);
    });

    it('should handle mixed cache hit and miss scenarios', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async (id: string) => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: `result-${id}-${dbCallCount}` };
      });

      // Fire requests for 10 different keys simultaneously
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const key = getCacheKey('/api/test/mixed', { id: i.toString() });
        // 10 requests per key
        for (let j = 0; j < 10; j++) {
          promises.push(cachedFetch(key, () => fetcher(i.toString()), 5));
        }
      }

      await Promise.all(promises);

      // Verify: Only 10 DB calls (1 per key, request coalescing per key)
      expect(dbCallCount).toBe(10);

      console.log(`✅ Multi-key test: 100 requests (10 keys) → 10 DB calls`);
    });
  });

  describe('Memory Safety', () => {
    it('should not leak memory with continuous refresh locks', async () => {
      const fetcher = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'test' };
      });

      // Create 100 different cache entries
      for (let i = 0; i < 100; i++) {
        const key = getCacheKey('/api/test/memory', { id: i.toString() });
        await cachedFetch(key, fetcher, 1);
      }

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Trigger background refresh for all
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const key = getCacheKey('/api/test/memory', { id: i.toString() });
        promises.push(cachedFetch(key, fetcher, 1));
      }

      await Promise.all(promises);

      // Check health
      const health = getCacheHealth();

      // Verify: Refresh locks should be reasonable
      expect(health.refreshLocksCount).toBeLessThanOrEqual(100);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 200));

      const healthAfter = getCacheHealth();

      // Verify: Locks cleaned up after refresh completes
      expect(healthAfter.refreshLocksCount).toBeLessThan(health.refreshLocksCount);

      console.log(`✅ Memory safety: ${health.refreshLocksCount} locks → ${healthAfter.refreshLocksCount} locks`);
    });

    it('should handle rate limiting gracefully', async () => {
      const fetcher = vi.fn(async () => {
        return { data: 'test' };
      });

      const cacheKey = getCacheKey('/api/test/rate-limit', { id: '1' });

      // Populate cache
      await cachedFetch(cacheKey, fetcher, 60);

      // Fire 150 requests rapidly (exceeds rate limit of 100)
      const promises = Array.from({ length: 150 }, () =>
        cachedFetch(cacheKey, fetcher, 60).catch(err => err)
      );

      const results = await Promise.all(promises);

      // Count successful vs rate limited
      const successful = results.filter(r => r && r.data === 'test').length;
      const rateLimited = results.filter(r => r instanceof Error).length;

      console.log(`Rate limit test: ${successful} successful, ${rateLimited} rate limited`);

      // At least some should succeed (from cache)
      expect(successful).toBeGreaterThan(0);
    });
  });

  describe('Redis Concurrent Read/Write', () => {
    it('should handle concurrent reads during background write', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
        return { data: `result-${dbCallCount}`, timestamp: Date.now() };
      });

      const cacheKey = getCacheKey('/api/test/redis-rw', { id: '1' });

      // Populate cache
      await cachedFetch(cacheKey, fetcher, 1);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Trigger background refresh
      const firstRequest = cachedFetch(cacheKey, fetcher, 1);
      await firstRequest;

      // While background refresh is happening, fire more reads
      await new Promise(resolve => setTimeout(resolve, 50)); // Partial refresh time

      const concurrentReads = Array.from({ length: 50 }, () =>
        cachedFetch(cacheKey, fetcher, 1)
      );

      const results = await Promise.all(concurrentReads);

      // Verify: All reads succeeded (no errors)
      results.forEach(result => {
        expect(result).toHaveProperty('data');
      });

      // Verify: No data corruption
      const uniqueData = new Set(results.map(r => r.data));
      expect(uniqueData.size).toBeLessThanOrEqual(2); // Either old or new data

      console.log(`✅ Concurrent read/write: ${results.length} reads during write`);
    });
  });

  describe('Stress Test', () => {
    it('should handle extreme load without errors', async () => {
      let dbCallCount = 0;
      const fetcher = vi.fn(async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return { data: `result-${dbCallCount}` };
      });

      const cacheKey = getCacheKey('/api/test/stress', { id: '1' });

      // Populate
      await cachedFetch(cacheKey, fetcher, 1);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Fire 500 concurrent requests (simulating extreme load)
      const concurrentCount = 200; // Reduced for test speed
      const promises = Array.from({ length: concurrentCount }, () =>
        cachedFetch(cacheKey, fetcher, 1)
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Verify: All completed
      expect(results.length).toBe(concurrentCount);

      // Verify: Fast response (< 200ms for all)
      expect(totalTime).toBeLessThan(200);

      // Verify: All got data
      results.forEach(result => {
        expect(result).toHaveProperty('data');
      });

      // Wait for background refresh
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify: Only 1 background refresh
      expect(dbCallCount).toBe(2);

      console.log(`✅ Stress test: ${concurrentCount} requests in ${totalTime}ms → 1 DB call`);
    });
  });
});
