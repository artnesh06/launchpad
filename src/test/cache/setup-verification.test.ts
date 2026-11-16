/**
 * Setup Verification Test
 * 
 * Verifies that the testing infrastructure is properly configured
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { MockRedisCache, TimeController, testFixtures, createMockFetcher } from '../utils/cache-test-utils';
import { setupTestEnvironment } from '../setup/test-env';

describe('Testing Infrastructure Setup', () => {
  setupTestEnvironment();

  describe('MockRedisCache', () => {
    it('should create mock Redis instance', () => {
      const mockRedis = new MockRedisCache();
      expect(mockRedis).toBeDefined();
      expect(mockRedis.size()).toBe(0);
    });

    it('should set and get values', async () => {
      const mockRedis = new MockRedisCache();
      await mockRedis.set('test-key', { data: 'test' }, 60);
      const value = await mockRedis.get('test-key');
      expect(value).toEqual({ data: 'test' });
    });

    it('should delete values', async () => {
      const mockRedis = new MockRedisCache();
      await mockRedis.set('test-key', { data: 'test' }, 60);
      await mockRedis.delete('test-key');
      const value = await mockRedis.get('test-key');
      expect(value).toBeNull();
    });

    it('should clear all values', async () => {
      const mockRedis = new MockRedisCache();
      await mockRedis.set('key1', 'value1', 60);
      await mockRedis.set('key2', 'value2', 60);
      await mockRedis.clear();
      expect(mockRedis.size()).toBe(0);
    });

    it('should simulate failures', async () => {
      const mockRedis = new MockRedisCache();
      mockRedis.simulateFailure(true);
      await expect(mockRedis.get('test-key')).rejects.toThrow('Mock Redis connection failed');
    });

    it('should support pattern matching in clear', async () => {
      const mockRedis = new MockRedisCache();
      await mockRedis.set('/api/test/1', 'value1', 60);
      await mockRedis.set('/api/test/2', 'value2', 60);
      await mockRedis.set('/api/other/1', 'value3', 60);
      
      await mockRedis.clear('/api/test*');
      
      expect(await mockRedis.get('/api/test/1')).toBeNull();
      expect(await mockRedis.get('/api/test/2')).toBeNull();
      expect(await mockRedis.get('/api/other/1')).not.toBeNull();
    });
  });

  describe('TimeController', () => {
    it('should create time controller', () => {
      const timeController = new TimeController();
      expect(timeController).toBeDefined();
    });

    it('should control time', () => {
      const timeController = new TimeController();
      const startTime = Date.now();
      
      timeController.start();
      const controlledTime = timeController.now();
      
      timeController.advance(5000);
      expect(Date.now()).toBe(controlledTime + 5000);
      
      timeController.reset();
    });

    it('should advance time by seconds', () => {
      const timeController = new TimeController();
      timeController.start();
      
      const startTime = timeController.now();
      timeController.advanceSeconds(10);
      
      expect(Date.now()).toBe(startTime + 10000);
      
      timeController.reset();
    });
  });

  describe('Test Fixtures', () => {
    it('should provide activity fixtures', () => {
      expect(testFixtures.activity).toBeDefined();
      expect(testFixtures.activity.recent).toBeDefined();
      expect(testFixtures.activity.recent.path).toBe('/api/activity/recent');
      expect(testFixtures.activity.recent.ttl).toBe(1);
    });

    it('should provide banner fixtures', () => {
      expect(testFixtures.banners).toBeDefined();
      expect(testFixtures.banners.active).toBeDefined();
      expect(testFixtures.banners.active.ttl).toBe(300);
    });

    it('should provide collection fixtures', () => {
      expect(testFixtures.collections).toBeDefined();
      expect(testFixtures.collections.byAddress).toBeDefined();
      expect(testFixtures.collections.byAddress.ttl).toBe(10);
    });

    it('should provide metadata fixtures', () => {
      expect(testFixtures.metadata).toBeDefined();
      expect(testFixtures.metadata.nft).toBeDefined();
      expect(testFixtures.metadata.nft.ttl).toBe(300);
    });

    it('should provide error fixtures', () => {
      expect(testFixtures.error).toBeDefined();
      expect(testFixtures.error.notFound).toBeDefined();
      expect(testFixtures.error.notFound.status).toBe(404);
    });
  });

  describe('Mock Fetcher', () => {
    it('should create mock fetcher', () => {
      const { fetcher, getCallCount } = createMockFetcher({ data: 'test' });
      expect(fetcher).toBeDefined();
      expect(getCallCount()).toBe(0);
    });

    it('should track call count', async () => {
      const { fetcher, getCallCount } = createMockFetcher({ data: 'test' });
      
      await fetcher();
      expect(getCallCount()).toBe(1);
      
      await fetcher();
      expect(getCallCount()).toBe(2);
    });

    it('should return mock data', async () => {
      const mockData = { id: 1, name: 'test' };
      const { fetcher } = createMockFetcher(mockData);
      
      const result = await fetcher();
      expect(result).toEqual(mockData);
    });

    it('should simulate failures', async () => {
      const { fetcher } = createMockFetcher({ data: 'test' }, true);
      await expect(fetcher()).rejects.toThrow('Fetcher failed');
    });

    it('should reset call count', async () => {
      const { fetcher, getCallCount, reset } = createMockFetcher({ data: 'test' });
      
      await fetcher();
      expect(getCallCount()).toBe(1);
      
      reset();
      expect(getCallCount()).toBe(0);
    });
  });

  describe('Environment Variables', () => {
    it('should have CACHE_ENABLED set', () => {
      expect(process.env.CACHE_ENABLED).toBe('true');
    });

    it('should have test environment configured', () => {
      // Verify test environment is set up
      expect(process.env).toBeDefined();
    });
  });

  describe('Fast-check Library', () => {
    it('should be able to import fast-check', async () => {
      const fc = await import('fast-check');
      expect(fc).toBeDefined();
      expect(fc.assert).toBeDefined();
      expect(fc.property).toBeDefined();
    });
  });
});
