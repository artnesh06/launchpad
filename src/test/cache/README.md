# Cache Testing Infrastructure

This directory contains all tests for the API caching implementation.

## Test Structure

### Property-Based Tests
Located in `property-tests/` directory:
- `cache-key.property.test.ts` - Tests for cache key generation properties
- `cache-behavior.property.test.ts` - Tests for cache TTL and behavior properties
- `cache-invalidation.property.test.ts` - Tests for cache invalidation properties
- `error-handling.property.test.ts` - Tests for error handling and fallback properties
- `backward-compatibility.property.test.ts` - Tests for backward compatibility properties
- `cache-metrics.property.test.ts` - Tests for cache metrics properties

### Unit Tests
Located in `unit-tests/` directory:
- Endpoint-specific tests for each cached endpoint group
- Integration tests for cache + database interactions
- Error scenario tests

## Test Utilities

### Cache Test Utils (`../utils/cache-test-utils.ts`)
Provides:
- `MockRedisCache` - Mock Redis implementation for testing
- `TimeController` - Time manipulation for TTL testing
- `testFixtures` - Pre-configured test data for various endpoints
- Helper functions for common test scenarios

### Test Environment (`../setup/test-env.ts`)
Configures:
- Environment variables for testing
- Cache state reset between tests
- Console mocking to reduce noise

## Running Tests

```bash
# Run all tests
bun test

# Run property tests only
bun test property-tests

# Run unit tests only
bun test unit-tests

# Run with coverage
bun test --coverage

# Run in watch mode
bun test --watch
```

## Environment Variables

### Required for Testing
- `CACHE_ENABLED` - Enable/disable cache (default: true)
- `REDIS_URL` - Redis connection URL (optional, uses mock if not provided)

### Optional
- `TEST_DATABASE_URL` - Test database URL (falls back to DATABASE_URL)
- `TEST_REDIS_URL` - Separate Redis instance for testing

## Test Configuration

Tests use the following configuration:
- **Property tests**: Minimum 100 iterations per property
- **Coverage target**: 90%+ for cache-related code
- **Timeout**: 5000ms per test (configurable)

## Writing New Tests

### Property-Based Test Example
```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { getCacheKey } from '@/lib/hybrid-cache';

describe('Feature: api-caching-implementation', () => {
  it('Property 1: Cache Key Uniqueness', () => {
    fc.assert(
      fc.property(
        fc.record({
          path: fc.string(),
          params1: fc.dictionary(fc.string(), fc.string()),
          params2: fc.dictionary(fc.string(), fc.string())
        }),
        ({ path, params1, params2 }) => {
          const key1 = getCacheKey(path, params1);
          const key2 = getCacheKey(path, params2);
          
          if (JSON.stringify(params1) !== JSON.stringify(params2)) {
            expect(key1).not.toBe(key2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Example
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { cachedFetch } from '@/lib/hybrid-cache';
import { createMockFetcher } from '../utils/cache-test-utils';

describe('Banner Endpoint Caching', () => {
  it('should cache banner responses', async () => {
    const { fetcher, getCallCount } = createMockFetcher({ data: 'test' });
    
    await cachedFetch('test-key', fetcher, 5);
    await cachedFetch('test-key', fetcher, 5);
    
    expect(getCallCount()).toBe(1); // Second call should hit cache
  });
});
```

## Troubleshooting

### Tests Failing Due to Redis
If tests fail because Redis is not available:
1. Ensure `REDIS_URL` is not set in test environment
2. Tests should automatically use mock Redis
3. Check that mock Redis is properly initialized

### Time-Based Tests Flaky
If TTL tests are flaky:
1. Use `TimeController` for deterministic time control
2. Avoid using real `setTimeout` in tests
3. Ensure proper cleanup between tests

### Cache State Leaking Between Tests
If cache state persists between tests:
1. Ensure `setupCacheReset()` is called in test setup
2. Manually clear cache in `beforeEach` if needed
3. Use isolated cache instances per test

## Best Practices

1. **Use Property Tests for Universal Properties**
   - Cache key uniqueness
   - TTL behavior
   - Fallback mechanisms

2. **Use Unit Tests for Specific Scenarios**
   - Endpoint-specific behavior
   - Edge cases
   - Integration points

3. **Mock External Dependencies**
   - Use MockRedisCache instead of real Redis
   - Mock database calls when testing cache logic
   - Use TimeController for time-dependent tests

4. **Keep Tests Fast**
   - Avoid real network calls
   - Use mocks and stubs
   - Minimize database interactions

5. **Test Error Paths**
   - Redis failures
   - Database errors
   - Invalid inputs
   - Network timeouts
