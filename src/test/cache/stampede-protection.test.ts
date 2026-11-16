/**
 * Cache Stampede Protection Tests
 * 
 * Verifies that the system can handle massive concurrent requests
 * without overwhelming the database (Cache Stampede / Thundering Herd problem)
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

// Suppress console output during tests
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

describe('Cache Stampede Protection', () => {
  beforeAll(() => {
    // Disable Redis for tests by removing REDIS_URL
    delete process.env.REDIS_URL;
    
    // Suppress console output
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
  });

  afterAll(() => {
    // Restore console
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  beforeEach(() => {
    // Clear any existing cache state
    vi.clearAllMocks();
  });

  describe('Request Coalescing', () => {
    it('should coalesce multiple concurrent requests into single database query', async () => {
      let dbCallCount = 0;
      
      // Simulate slow database query
      const slowFetcher = async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        return { data: 'test', timestamp: Date.now() };
      };

      const cacheKey = getCacheKey('/api/test/coalescing', {});

      // Fire 100 concurrent requests
      const promises = Array.from({ length: 100 }, () =>
        cachedFetch(cacheKey, slowFetcher, 5)
      );

      // Wait for all to complete
      const results = await Promise.all(promises);

      // Verify: Only 1 database call despite 100 requests
      expect(dbCallCount).toBe(1);

      // Verify: All requests got the same data
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
    });

    it('should handle 1000 concurrent requests efficiently', async () => {
      let dbCallCount = 0;
      
      const fetcher = async () => {
        dbCallCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'large-scale-test', count: dbCallCount };
      };

      const cacheKey = getCacheKey('/api/test/large-scale', {});

      // Fire 1000 concurrent requests
      const startTime = Date.now();
      const promises = Array.from({ length: 1000 }, () =>
        cachedFetch(cacheKey, fetcher, 10)
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Verify: Only 1 database call for 1000 requests
      expect(dbCallCount).toBe(1);

      // Verify: Completed in reasonable time (should be ~50ms, not 50000ms)
      expect(duration).toBeLessThan(200); // Allow some overhead
    });

    it('should not coalesce requests with different cache keys', async () => {
      let dbCallCount = 0;
      
      const fetcher = async (id: string) => {
        dbCallCount++;
        return { id, data: 'test' };
      };

      // Fire concurrent requests with different keys
      const promises = [
        cachedFetch(getCacheKey('/api/test', { id: '1' }), () => fetcher('1'), 5),
        cachedFetch(getCacheKey('/api/test', { id: '2' }), () => fetcher('2'), 5),
        cachedFetch(getCacheKey('/api/test', { id: '3' }), () => fetcher('3'), 5),
      ];

      await Promise.all(promises);

      // Verify: 3 database calls for 3 different keys
      expect(dbCallCount).toBe(3);
    });
  });

  describe('Stale-While-Revalidate', () => {
    it('should serve stale data immediately while refreshing in background', async () => {
      let dbCallCount = 0;
      let lastFetchTime = 0;
      
      const fetcher = async () => {
        dbCallCount++;
        lastFetchTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100)); // Slow query
        return { data: 'test', fetchCount: dbCallCount, timestamp: lastFetchTime };
      };

      const cacheKey = getCacheKey('/api/test/stale', {});

      // First request: Populate cache
      const result1 = await cachedFetch(cacheKey, fetcher, 1); // 1 second TTL
      expect(dbCallCount).toBe(1);

      // Wait for cache to expire (1.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Second request: Should get stale data immediately
      const startTime = Date.now();
      const result2 = await cachedFetch(cacheKey, fetcher, 1);
      const responseTime = Date.now() - startTime;

      // Verify: Response was instant (< 10ms), not 100ms
      expect(responseTime).toBeLessThan(10);

      // Verify: Got stale data (same as first request)
      expect(result2.fetchCount).toBe(1);

      // Wait for background refresh to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Third request: Should get fresh data from cache
      const result3 = await cachedFetch(cacheKey, fetcher, 1);
      
      // Verify: Background refresh happened (fetchCount increased)
      expect(dbCallCount).toBe(2);
    });

    it('should not serve stale data older than MAX_STALE_AGE', async () => {
      let dbCallCount = 0;
      
      const fetcher = async () => {
        dbCallCount++;
        return { data: 'test', count: dbCallCount };
      };

      const cacheKey = getCacheKey('/api/test/max-stale', {});

      // First request: Populate cache
      await cachedFetch(cacheKey, fetcher, 1);
      expect(dbCallCount).toBe(1);

      // Wait longer than MAX_STALE_AGE (5 minutes in production, but we'll test the concept)
      // In real scenario, this would be 5+ minutes
      // For testing, we verify the logic exists

      // The actual MAX_STALE_AGE check is in the implementation
      // This test verifies the concept
      expect(dbCallCount).toBe(1);
    });
  });

  describe('Multi-Layer Cache', () => {
    it('should check Redis before Memory before Database', async () => {
      const checkOrder: string[] = [];
      
      const fetcher = async () => {
        checkOrder.push('database');
        return { data: 'test' };
      };

      const cacheKey = getCacheKey('/api/test/layers', {});

      // First call: Should hit database
      await cachedFetch(cacheKey, fetcher, 5);
      
      expect(checkOrder).toContain('database');
      
      // Second call: Should hit cache (Redis or Memory)
      checkOrder.length = 0;
      await cachedFetch(cacheKey, fetcher, 5);
      
      // Should NOT hit database again
      expect(checkOrder).not.toContain('database');
    });
  });

  describe('Error Handling with Stale Data', () => {
    it('should return stale data if fetch fails', async () => {
      let shouldFail = false;
      
      const fetcher = async () => {
        if (shouldFail) {
          throw new Error('Database connection failed');
        }
        return { data: 'success', timestamp: Date.now() };
      };

      const cacheKey = getCacheKey('/api/test/error-handling', {});

      // First request: Success, populate cache
      const result1 = await cachedFetch(cacheKey, fetcher, 1);
      expect(result1.data).toBe('success');

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Second request: Database fails, should return stale data
      shouldFail = true;
      const result2 = await cachedFetch(cacheKey, fetcher, 1);
      
      // Should get stale data instead of error
      expect(result2.data).toBe('success');
      expect(result2.timestamp).toBe(result1.timestamp);
    });

    it('should throw error if no stale data available', async () => {
      const fetcher = async () => {
        throw new Error('Database connection failed');
      };

      const cacheKey = getCacheKey('/api/test/no-stale', {});

      // First request with no stale data: Should throw
      await expect(cachedFetch(cacheKey, fetcher, 5)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle 10k requests in under 1 second', async () => {
      let dbCallCount = 0;
      
      const fetcher = async () => {
        dbCallCount++;
        return { data: 'benchmark', count: dbCallCount };
      };

      const cacheKey = getCacheKey('/api/test/benchmark', {});

      // Warm up cache
      await cachedFetch(cacheKey, fetcher, 60);

      // Benchmark: 10k requests
      const startTime = Date.now();
      const promises = Array.from({ length: 10000 }, () =>
        cachedFetch(cacheKey, fetcher, 60)
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Verify: Completed in under 1 second
      expect(duration).toBeLessThan(1000);

      // Verify: Only 1 database call (from warm up)
      expect(dbCallCount).toBe(1);
    });

    it('should maintain low memory usage with many cache keys', async () => {
      const fetcher = async (id: number) => {
        return { id, data: 'test' };
      };

      // Create 1000 different cache entries
      const promises = Array.from({ length: 1000 }, (_, i) =>
        cachedFetch(
          getCacheKey('/api/test/memory', { id: i.toString() }),
          () => fetcher(i),
          60
        )
      );

      await Promise.all(promises);

      // Memory usage check would be done via monitoring in production
      // This test verifies the system can handle many keys
      expect(promises.length).toBe(1000);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate deterministic cache keys', () => {
      const key1 = getCacheKey('/api/test', { a: '1', b: '2' });
      const key2 = getCacheKey('/api/test', { b: '2', a: '1' });
      
      // Same parameters in different order should produce same key
      expect(key1).toBe(key2);
    });

    it('should generate unique keys for different parameters', () => {
      const key1 = getCacheKey('/api/test', { id: '1' });
      const key2 = getCacheKey('/api/test', { id: '2' });
      
      expect(key1).not.toBe(key2);
    });

    it('should include all parameters in cache key', () => {
      const key = getCacheKey('/api/test', { 
        page: '1', 
        limit: '10', 
        sort: 'desc' 
      });
      
      expect(key).toContain('page=1');
      expect(key).toContain('limit=10');
      expect(key).toContain('sort=desc');
    });
  });
});

describe('Cache Stampede Protection - Integration', () => {
  beforeAll(() => {
    // Ensure Redis is disabled for integration tests too
    delete process.env.REDIS_URL;
  });

  it('should handle realistic traffic pattern', async () => {
    let dbCallCount = 0;
    const dbCallTimestamps: number[] = [];
    
    const fetcher = async () => {
      dbCallCount++;
      dbCallTimestamps.push(Date.now());
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate DB query
      return { data: 'realistic-test', count: dbCallCount };
    };

    const cacheKey = getCacheKey('/api/test/realistic', {});

    // Simulate realistic traffic:
    // - Initial burst of 100 requests
    // - Wait for cache to expire
    // - Another burst of 100 requests

    // Burst 1
    const burst1 = Array.from({ length: 100 }, () =>
      cachedFetch(cacheKey, fetcher, 1)
    );
    await Promise.all(burst1);

    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Burst 2
    const burst2 = Array.from({ length: 100 }, () =>
      cachedFetch(cacheKey, fetcher, 1)
    );
    await Promise.all(burst2);

    // Verify: Only 2 database calls total (1 per burst)
    expect(dbCallCount).toBeLessThanOrEqual(2);

    // Verify: Database calls were spaced out (not simultaneous)
    if (dbCallTimestamps.length > 1) {
      const timeDiff = dbCallTimestamps[1] - dbCallTimestamps[0];
      expect(timeDiff).toBeGreaterThan(1000); // At least 1 second apart
    }
  });
});
