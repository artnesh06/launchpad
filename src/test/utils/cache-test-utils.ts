/**
 * Cache Test Utilities
 * 
 * Provides utilities for testing cache functionality including:
 * - Mock Redis implementation
 * - Time manipulation helpers
 * - Cache state inspection
 * - Test fixtures for various scenarios
 */

import { vi } from 'vitest';

/**
 * Mock Redis Cache Implementation
 * Simulates Redis behavior for testing without requiring actual Redis connection
 */
export class MockRedisCache {
  private store: Map<string, { data: any; expiresAt: number }> = new Map();
  private shouldFail: boolean = false;

  /**
   * Get value from mock Redis
   */
  async get(key: string): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Mock Redis connection failed');
    }

    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set value in mock Redis
   */
  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock Redis connection failed');
    }

    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete key from mock Redis
   */
  async delete(key: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock Redis connection failed');
    }

    this.store.delete(key);
  }

  /**
   * Clear cache with pattern matching
   */
  async clear(pattern: string = '*'): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock Redis connection failed');
    }

    if (pattern === '*') {
      this.store.clear();
      return;
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keysToDelete: string[] = [];

    this.store.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.store.delete(key));
  }

  /**
   * Simulate Redis failure
   */
  simulateFailure(shouldFail: boolean = true): void {
    this.shouldFail = shouldFail;
  }

  /**
   * Get all keys (for testing)
   */
  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Get store size (for testing)
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Reset mock Redis to initial state
   */
  reset(): void {
    this.store.clear();
    this.shouldFail = false;
  }
}

/**
 * Time Manipulation Utilities
 */
export class TimeController {
  private originalDateNow: () => number;
  private currentTime: number;

  constructor() {
    this.originalDateNow = Date.now;
    this.currentTime = Date.now();
  }

  /**
   * Start controlling time
   */
  start(): void {
    this.currentTime = Date.now();
    Date.now = vi.fn(() => this.currentTime);
  }

  /**
   * Advance time by specified milliseconds
   */
  advance(ms: number): void {
    this.currentTime += ms;
  }

  /**
   * Advance time by specified seconds
   */
  advanceSeconds(seconds: number): void {
    this.advance(seconds * 1000);
  }

  /**
   * Set time to specific timestamp
   */
  setTime(timestamp: number): void {
    this.currentTime = timestamp;
  }

  /**
   * Reset time to current real time
   */
  reset(): void {
    Date.now = this.originalDateNow;
  }

  /**
   * Get current mocked time
   */
  now(): number {
    return this.currentTime;
  }
}

/**
 * Test Fixtures for Various Endpoint Scenarios
 */
export const testFixtures = {
  /**
   * Activity endpoint test data
   */
  activity: {
    recent: {
      path: '/api/activity/recent',
      params: { limit: 10, chainId: 1 },
      response: {
        success: true,
        data: [
          { id: 1, type: 'mint', timestamp: Date.now() },
          { id: 2, type: 'transfer', timestamp: Date.now() - 1000 },
        ],
      },
      ttl: 1,
    },
    mintsChart: {
      path: '/api/activity/mints-chart',
      params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      response: {
        success: true,
        data: { dates: ['2024-01-01'], counts: [10] },
      },
      ttl: 5,
    },
    errors: {
      path: '/api/activity/errors',
      params: { page: 1, limit: 20 },
      response: {
        success: true,
        data: [{ id: 1, error: 'Test error', timestamp: Date.now() }],
      },
      ttl: 10,
    },
  },

  /**
   * Banner endpoint test data
   */
  banners: {
    active: {
      path: '/api/banners',
      params: { status: 'ACTIVE' },
      response: {
        success: true,
        data: [
          { id: 1, title: 'Test Banner', status: 'ACTIVE' },
        ],
      },
      ttl: 300,
    },
    admin: {
      path: '/api/admin/banners',
      params: {},
      response: {
        success: true,
        data: [
          { id: 1, title: 'Admin Banner', status: 'ACTIVE' },
        ],
      },
      ttl: 300,
    },
  },

  /**
   * Collection endpoint test data
   */
  collections: {
    byAddress: {
      path: '/api/collections/0x123',
      params: { chainId: 1 },
      response: {
        success: true,
        data: {
          address: '0x123',
          name: 'Test Collection',
          chainId: 1,
        },
      },
      ttl: 10,
    },
    list: {
      path: '/api/nft/collections',
      params: { page: 1, limit: 10 },
      response: {
        success: true,
        data: [
          { address: '0x123', name: 'Collection 1' },
          { address: '0x456', name: 'Collection 2' },
        ],
      },
      ttl: 10,
    },
  },

  /**
   * NFT metadata test data
   */
  metadata: {
    nft: {
      path: '/api/metadata/0xabc/1',
      params: {},
      response: {
        success: true,
        data: {
          name: 'Test NFT #1',
          description: 'Test description',
          image: 'ipfs://test',
        },
      },
      ttl: 300,
    },
    ipfs: {
      path: '/api/ipfs/QmTest123',
      params: {},
      response: {
        success: true,
        data: { content: 'IPFS content' },
      },
      ttl: 300,
    },
  },

  /**
   * Price data test data
   */
  price: {
    crypto: {
      path: '/api/crypto-price',
      params: { currency: 'USD' },
      response: {
        success: true,
        data: { price: 2000, currency: 'USD' },
      },
      ttl: 10,
    },
    floorPrice: {
      path: '/api/nft/floor-price',
      params: { collection: '0x123' },
      response: {
        success: true,
        data: { floorPrice: 0.5, currency: 'ETH' },
      },
      ttl: 30,
    },
  },

  /**
   * Whitelist test data
   */
  whitelist: {
    proof: {
      path: '/api/whitelist/proof',
      params: {
        address: '0x123',
        contractAddress: '0xabc',
        phaseId: 1,
      },
      response: {
        success: true,
        data: { proof: ['0xproof1', '0xproof2'] },
      },
      ttl: 30,
    },
  },

  /**
   * Error response (should not be cached)
   */
  error: {
    notFound: {
      path: '/api/test/not-found',
      params: {},
      response: {
        success: false,
        error: 'Not found',
      },
      status: 404,
    },
    serverError: {
      path: '/api/test/error',
      params: {},
      response: {
        success: false,
        error: 'Internal server error',
      },
      status: 500,
    },
  },
};

/**
 * Helper to create a mock fetcher function
 */
export function createMockFetcher<T>(data: T, shouldFail: boolean = false) {
  let callCount = 0;

  const fetcher = vi.fn(async () => {
    callCount++;
    if (shouldFail) {
      throw new Error('Fetcher failed');
    }
    return data;
  });

  return {
    fetcher,
    getCallCount: () => callCount,
    reset: () => {
      callCount = 0;
      fetcher.mockClear();
    },
  };
}

/**
 * Helper to wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to generate random cache keys for testing
 */
export function generateRandomCacheKey(): string {
  const paths = ['/api/test', '/api/nft', '/api/collections', '/api/activity'];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const params = {
    id: Math.floor(Math.random() * 1000),
    page: Math.floor(Math.random() * 10),
  };
  return `${path}?id=${params.id}&page=${params.page}`;
}

/**
 * Helper to create test environment variables
 */
export function setupTestEnv(config: {
  redisUrl?: string;
  cacheEnabled?: boolean;
} = {}) {
  const originalEnv = { ...process.env };

  if (config.redisUrl !== undefined) {
    if (config.redisUrl) {
      process.env.REDIS_URL = config.redisUrl;
    } else {
      delete process.env.REDIS_URL;
    }
  }

  if (config.cacheEnabled !== undefined) {
    process.env.CACHE_ENABLED = config.cacheEnabled ? 'true' : 'false';
  }

  return {
    restore: () => {
      process.env = originalEnv;
    },
  };
}
