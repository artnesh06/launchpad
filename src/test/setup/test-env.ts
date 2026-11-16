/**
 * Test Environment Setup
 * 
 * Configures environment variables and global test setup for cache testing
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

/**
 * Default test environment variables
 */
export const TEST_ENV = {
  // Redis configuration - DISABLED for tests by default
  // Tests should work without Redis to avoid connection errors
  // Set TEST_REDIS_URL environment variable to enable Redis in tests
  REDIS_URL: process.env.TEST_REDIS_URL || undefined,
  
  // Cache configuration
  CACHE_ENABLED: 'true',
  
  // Test database (if needed)
  DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
};

/**
 * Setup test environment before all tests
 */
export function setupTestEnvironment() {
  beforeAll(() => {
    // Store original environment
    (global as any).__ORIGINAL_ENV__ = { ...process.env };
    
    // Set test environment variables
    Object.entries(TEST_ENV).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        // Explicitly remove the key if value is undefined
        delete process.env[key];
      }
    });
    
    console.log('✓ Test environment configured (Redis disabled for tests)');
  });

  afterAll(() => {
    // Restore original environment
    if ((global as any).__ORIGINAL_ENV__) {
      process.env = (global as any).__ORIGINAL_ENV__;
      delete (global as any).__ORIGINAL_ENV__;
    }
    
    console.log('✓ Test environment restored');
  });
}

/**
 * Reset cache state between tests
 */
export function setupCacheReset() {
  beforeEach(async () => {
    // Clear any existing cache state
    // This will be implemented when we test actual cache
  });

  afterEach(async () => {
    // Clean up after each test
  });
}

/**
 * Mock console methods to reduce noise in tests
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  beforeAll(() => {
    // Suppress console output in tests unless explicitly needed
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

  return originalConsole;
}

/**
 * Get test configuration
 */
export function getTestConfig() {
  return {
    isRedisAvailable: !!process.env.REDIS_URL,
    isCacheEnabled: process.env.CACHE_ENABLED !== 'false',
    databaseUrl: process.env.DATABASE_URL,
  };
}
