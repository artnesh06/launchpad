/**
 * Cache Key Filtering Tests
 * 
 * Tests that cache-busting parameters are properly excluded from cache keys
 * to ensure cache effectiveness across all API endpoints.
 */

import { describe, it, expect } from 'vitest';
import { getCacheKey } from '@/lib/cache';

describe('getCacheKey - Cache Busting Parameter Filtering', () => {
  it('should exclude _t parameter from cache key', () => {
    const key1 = getCacheKey('/api/test', { id: '123', _t: '1000' });
    const key2 = getCacheKey('/api/test', { id: '123', _t: '2000' });
    const key3 = getCacheKey('/api/test', { id: '123', _t: '3000' });
    
    // All keys should be identical despite different _t values
    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
    expect(key1).toBe('/api/test?id=s:123');
  });

  it('should exclude _ parameter from cache key', () => {
    const key1 = getCacheKey('/api/test', { id: '123', _: '1000' });
    const key2 = getCacheKey('/api/test', { id: '123', _: '2000' });
    
    expect(key1).toBe(key2);
    expect(key1).toBe('/api/test?id=s:123');
  });

  it('should exclude timestamp parameter from cache key', () => {
    const key1 = getCacheKey('/api/test', { id: '123', timestamp: '1000' });
    const key2 = getCacheKey('/api/test', { id: '123', timestamp: '2000' });
    
    expect(key1).toBe(key2);
    expect(key1).toBe('/api/test?id=s:123');
  });

  it('should exclude nocache parameter from cache key', () => {
    const key1 = getCacheKey('/api/test', { id: '123', nocache: 'true' });
    const key2 = getCacheKey('/api/test', { id: '123', nocache: 'false' });
    const key3 = getCacheKey('/api/test', { id: '123' });
    
    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
    expect(key1).toBe('/api/test?id=s:123');
  });

  it('should exclude v (version) parameter from cache key', () => {
    const key1 = getCacheKey('/api/test', { id: '123', v: '1' });
    const key2 = getCacheKey('/api/test', { id: '123', v: '2' });
    
    expect(key1).toBe(key2);
    expect(key1).toBe('/api/test?id=s:123');
  });

  it('should exclude multiple cache-busting parameters at once', () => {
    const key1 = getCacheKey('/api/test', { 
      id: '123', 
      _t: '1000',
      _: '2000',
      timestamp: '3000',
      nocache: 'true',
      v: '1'
    });
    const key2 = getCacheKey('/api/test', { id: '123' });
    
    expect(key1).toBe(key2);
    expect(key1).toBe('/api/test?id=s:123');
  });

  it('should keep legitimate parameters while excluding cache busters', () => {
    const key = getCacheKey('/api/admin/launchpads', {
      contractAddress: '0xabc',
      page: 1,
      limit: 10,
      _t: '1771832664172', // Should be excluded
      timestamp: '999999',  // Should be excluded
    });
    
    // Should only include legitimate params
    expect(key).toContain('contractAddress=s:0xabc');
    expect(key).toContain('page=n:1');
    expect(key).toContain('limit=n:10');
    
    // Should NOT include cache busters
    expect(key).not.toContain('_t');
    expect(key).not.toContain('1771832664172');
    expect(key).not.toContain('timestamp');
    expect(key).not.toContain('999999');
  });

  it('should handle real-world launchpads API scenario', () => {
    // Simulate multiple requests with different _t values
    const requests = [
      { contractAddress: '0xeb8a15bb1b9842bee34caf5823bc7a7017c0d4ac', _t: '1771832664172' },
      { contractAddress: '0xeb8a15bb1b9842bee34caf5823bc7a7017c0d4ac', _t: '1771832664173' },
      { contractAddress: '0xeb8a15bb1b9842bee34caf5823bc7a7017c0d4ac', _t: '1771832664174' },
      { contractAddress: '0xeb8a15bb1b9842bee34caf5823bc7a7017c0d4ac', _t: '1771832664175' },
    ];
    
    const keys = requests.map(params => 
      getCacheKey('/api/admin/launchpads', params)
    );
    
    // All keys should be identical
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(1);
    
    // Should only contain contractAddress
    const key = keys[0];
    expect(key).toBe('/api/admin/launchpads?contractAddress=s:0xeb8a15bb1b9842bee34caf5823bc7a7017c0d4ac');
  });

  it('should maintain parameter order consistency', () => {
    // Different parameter order should produce same key
    const key1 = getCacheKey('/api/test', { 
      b: '2', 
      a: '1', 
      c: '3',
      _t: '1000' // Should be excluded
    });
    const key2 = getCacheKey('/api/test', { 
      c: '3', 
      a: '1', 
      b: '2',
      _t: '2000' // Should be excluded
    });
    
    expect(key1).toBe(key2);
    // Parameters should be sorted alphabetically
    expect(key1).toBe('/api/test?a=s:1&b=s:2&c=s:3');
  });

  it('should preserve type information in cache key', () => {
    const key = getCacheKey('/api/test', {
      stringParam: 'hello',
      numberParam: 123,
      boolParam: true,
      _t: '1000' // Should be excluded
    });
    
    // Should have type prefixes
    expect(key).toContain('stringParam=s:hello');
    expect(key).toContain('numberParam=n:123');
    expect(key).toContain('boolParam=b:true');
    
    // Should not contain _t
    expect(key).not.toContain('_t');
  });

  it('should handle empty params object', () => {
    const key = getCacheKey('/api/test', {});
    expect(key).toBe('/api/test');
  });

  it('should handle only cache-busting params', () => {
    const key = getCacheKey('/api/test', {
      _t: '1000',
      _: '2000',
      timestamp: '3000',
      nocache: 'true',
      v: '1'
    });
    
    // Should return path only (no query string)
    expect(key).toBe('/api/test');
  });

  it('should handle null and undefined values correctly', () => {
    const key = getCacheKey('/api/test', {
      validParam: 'value',
      nullParam: null,
      undefinedParam: undefined,
      _t: '1000'
    });
    
    // Should only include validParam
    expect(key).toBe('/api/test?validParam=s:value');
  });

  it('should handle special characters in parameter values', () => {
    const key = getCacheKey('/api/test', {
      address: '0xABC123!@#$%',
      _t: '1000'
    });
    
    // Should URL encode special characters
    expect(key).toContain('address=s:');
    expect(key).toContain(encodeURIComponent('0xABC123!@#$%'));
    expect(key).not.toContain('_t');
  });
});

describe('getCacheKey - Performance', () => {
  it('should handle large number of parameters efficiently', () => {
    const params: Record<string, any> = {};
    
    // Add 100 legitimate parameters
    for (let i = 0; i < 100; i++) {
      params[`param${i}`] = `value${i}`;
    }
    
    // Add cache-busting parameters
    params._t = '1000';
    params._ = '2000';
    params.timestamp = '3000';
    
    const startTime = Date.now();
    const key = getCacheKey('/api/test', params);
    const endTime = Date.now();
    
    // Should complete in less than 10ms
    expect(endTime - startTime).toBeLessThan(10);
    
    // Should not contain cache-busting params
    expect(key).not.toContain('_t');
    expect(key).not.toContain('timestamp');
    
    // Should contain legitimate params
    expect(key).toContain('param0=s:value0');
    expect(key).toContain('param99=s:value99');
  });
});

describe('getCacheKey - Edge Cases', () => {
  it('should handle parameter with value "0"', () => {
    const key = getCacheKey('/api/test', {
      page: 0,
      _t: '1000'
    });
    
    // Should include 0 (not filter it out)
    expect(key).toBe('/api/test?page=n:0');
  });

  it('should handle parameter with empty string value', () => {
    const key = getCacheKey('/api/test', {
      search: '',
      _t: '1000'
    });
    
    // Should include empty string (not filter it out)
    expect(key).toBe('/api/test?search=s:');
  });

  it('should handle parameter with boolean false value', () => {
    const key = getCacheKey('/api/test', {
      enabled: false,
      _t: '1000'
    });
    
    // Should include false (not filter it out)
    expect(key).toBe('/api/test?enabled=b:false');
  });

  it('should handle mixed case parameter names', () => {
    const key1 = getCacheKey('/api/test', { MyParam: 'value', _t: '1000' });
    const key2 = getCacheKey('/api/test', { myParam: 'value', _t: '2000' });
    
    // Different case = different parameters
    expect(key1).not.toBe(key2);
    expect(key1).toBe('/api/test?MyParam=s:value');
    expect(key2).toBe('/api/test?myParam=s:value');
  });
});
