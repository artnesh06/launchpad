// Hybrid cache: Redis jika tersedia, fallback ke in-memory
// Best untuk Vercel deployment
// Includes Cache Stampede Protection untuk handle 500k+ concurrent requests

import { cache as memoryCache, getCacheKey } from './cache';
import { NextResponse } from 'next/server';

// Dynamic import Redis untuk avoid error jika tidak terinstall
let RedisCache: any = null;
let redisCache: any = null;
let redisImportAttempted: boolean = false;
let redisImportFailed: boolean = false;

// Request Coalescing: Track ongoing fetches to prevent stampede
// Key: cache key, Value: Promise of the fetch operation
const ongoingFetches = new Map<string, Promise<any>>();

// Track failed fetches to implement retry with exponential backoff
// Key: cache key, Value: { count, lastAttempt }
const failedFetches = new Map<string, { count: number; lastAttempt: number }>();

// Stale data storage for Stale-While-Revalidate pattern
// Key: cache key, Value: { data, timestamp }
const staleCache = new Map<string, { data: any; timestamp: number }>();

// Refresh Lock: Track ongoing background refreshes to prevent duplicate refreshes
// Key: cache key, Value: unique lock identifier (Symbol or timestamp)
const refreshLocks = new Map<string, any>();
const REFRESH_LOCK_TTL = 30000; // 30 seconds - max time for a refresh operation

// Rate limiting removed to support high traffic (100k+ requests)

// Redis health monitoring with mutex for thread safety
let redisHealthy = true;
let lastRedisError: number = 0;
let redisHealthCheckInProgress = false;
let redisErrorCount = 0;
const REDIS_ERROR_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const REDIS_ERROR_COUNT_THRESHOLD = 5; // Circuit breaker: 5 errors in short time

// Configuration
const STALE_WHILE_REVALIDATE_WINDOW = 0; // 0 = always serve stale immediately if available
const MAX_STALE_AGE = 5 * 60 * 1000; // 5 minutes max stale age
const STALE_CACHE_MAX_SIZE = 1000; // Prevent memory leak
const STALE_CACHE_CLEANUP_INTERVAL = 60 * 1000; // Cleanup every 60 seconds
const MAX_RETRY_ATTEMPTS = 3; // Max retry for failed fetches
const RETRY_BACKOFF_BASE = 1000; // Base backoff time in ms
const FETCH_TIMEOUT = 30000; // 30 seconds timeout for fetcher
const MAX_ONGOING_FETCHES = 500; // Prevent memory leak from too many concurrent fetches

// Periodic cleanup for stale cache to prevent memory leak
let cleanupInterval: NodeJS.Timeout | null = null;

function startStaleCacheCleanup() {
  if (cleanupInterval) return; // Already running
  
  cleanupInterval = setInterval(() => {
    try {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      // Remove entries older than MAX_STALE_AGE
      staleCache.forEach((entry, key) => {
        if (now - entry.timestamp > MAX_STALE_AGE) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        staleCache.delete(key);
        failedFetches.delete(key);
      });
      
      // If still too large, remove oldest entries
      if (staleCache.size > STALE_CACHE_MAX_SIZE) {
        const entries = Array.from(staleCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = entries.slice(0, Math.floor(STALE_CACHE_MAX_SIZE * 0.2));
        toRemove.forEach(([key]) => {
          staleCache.delete(key);
          failedFetches.delete(key);
        });
      }
      
      // Cleanup old failed fetch records (older than 10 minutes)
      const failedKeysToDelete: string[] = [];
      failedFetches.forEach((record, key) => {
        if (now - record.lastAttempt > 10 * 60 * 1000) {
          failedKeysToDelete.push(key);
        }
      });
      failedKeysToDelete.forEach(key => failedFetches.delete(key));
      
      // Cleanup stale ongoing fetches (older than 2 minutes - likely hung)
      const ongoingKeysToDelete: string[] = [];
      ongoingFetches.forEach((promise, key) => {
        // Check if promise is still pending by checking stale cache timestamp
        const staleEntry = staleCache.get(key);
        if (staleEntry && now - staleEntry.timestamp > 2 * 60 * 1000) {
          ongoingKeysToDelete.push(key);
        }
      });
      ongoingKeysToDelete.forEach(key => {
        console.warn(`[Cache] Removing hung ongoing fetch for key: ${key}`);
        ongoingFetches.delete(key);
      });
      
      // Cleanup expired refresh locks (older than REFRESH_LOCK_TTL)
      // Note: Locks using Symbol won't have timestamp, so we track them separately
      const refreshLocksToDelete: string[] = [];
      refreshLocks.forEach((lockValue, key) => {
        // If lock is a number (timestamp), check if expired
        if (typeof lockValue === 'number' && now - lockValue > REFRESH_LOCK_TTL) {
          refreshLocksToDelete.push(key);
        }
        // If lock is Symbol, check stale cache timestamp as proxy
        else if (typeof lockValue === 'symbol') {
          const staleEntry = staleCache.get(key);
          if (staleEntry && now - staleEntry.timestamp > REFRESH_LOCK_TTL * 2) {
            // Lock is very old (2x TTL), likely hung
            refreshLocksToDelete.push(key);
          }
        }
      });
      refreshLocksToDelete.forEach(key => {
        console.warn(`[Cache] Removing expired refresh lock for key: ${key}`);
        refreshLocks.delete(key);
      });
      
      // Prevent memory leak from too many ongoing fetches
      if (ongoingFetches.size > MAX_ONGOING_FETCHES) {
        console.error(`[Cache] Too many ongoing fetches (${ongoingFetches.size}), clearing oldest`);
        const keys = Array.from(ongoingFetches.keys());
        const toClear = keys.slice(0, Math.floor(MAX_ONGOING_FETCHES * 0.3));
        toClear.forEach(key => ongoingFetches.delete(key));
      }
      
      // Rate limiting cleanup removed
      
      // Check Redis health status
      if (!redisHealthy && now - lastRedisError > REDIS_ERROR_THRESHOLD) {
        console.log('[Cache] Redis health recovered, re-enabling Redis cache');
        redisHealthy = true;
        redisErrorCount = 0; // Reset error count
      }
      
      // Reset error count periodically if Redis is healthy
      if (redisHealthy && redisErrorCount > 0) {
        redisErrorCount = Math.max(0, redisErrorCount - 1);
      }
      
      if (keysToDelete.length > 0 || staleCache.size > STALE_CACHE_MAX_SIZE || failedKeysToDelete.length > 0 || ongoingKeysToDelete.length > 0 || refreshLocksToDelete.length > 0) {
        console.log(`[Cache] Cleanup: ${keysToDelete.length} stale, ${failedKeysToDelete.length} failed, ${ongoingKeysToDelete.length} hung, ${refreshLocksToDelete.length} locks, size: ${staleCache.size}, ongoing: ${ongoingFetches.size}`);
      }
    } catch (error) {
      console.error('[Cache] Cleanup error:', error);
      // Don't throw - cleanup errors should not break the app
    }
  }, STALE_CACHE_CLEANUP_INTERVAL);
  
  // Ensure cleanup runs even if process is about to exit
  if (typeof process !== 'undefined' && process.on) {
    process.on('beforeExit', () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
    });
  }
}

// Start cleanup on module load
startStaleCacheCleanup();

async function getRedisCache() {
  // Skip Redis if marked unhealthy
  if (!redisHealthy) {
    return null;
  }

  // Skip if import already failed - don't retry on every request
  if (redisImportFailed) {
    return null;
  }

  if (!process.env.REDIS_URL) {
    if (!redisImportAttempted) {
      console.warn('⚠️ REDIS_URL not configured, using in-memory cache only');
      redisImportAttempted = true;
    }
    return null;
  }

  // Check if Redis URL is localhost (won't work in production)
  if (process.env.REDIS_URL.includes('localhost') || process.env.REDIS_URL.includes('127.0.0.1')) {
    if (!redisImportAttempted) {
      console.warn('⚠️ Redis configured with localhost - this will not work in production!');
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Production environment detected with localhost Redis URL - falling back to memory cache');
      }
      redisImportAttempted = true;
    }
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
  }

  // Only attempt import once
  if (!RedisCache && !redisImportAttempted) {
    redisImportAttempted = true;
    try {
      const module = await import('./redis-cache');
      RedisCache = module.RedisCache;
      redisCache = module.redisCache;
      console.log('✅ Redis module loaded successfully');
    } catch (error) {
      console.error('❌ Redis module import failed:', error);
      console.warn('⚠️ Falling back to in-memory cache');
      redisImportFailed = true;
      markRedisUnhealthy();
      return null;
    }
  }

  return redisCache;
}

// Mark Redis as unhealthy and log for monitoring
// Uses atomic increment to prevent race conditions
// Implements circuit breaker pattern
function markRedisUnhealthy() {
  // Atomic increment - safe for concurrent access
  const currentErrorCount = ++redisErrorCount;
  
  // Circuit breaker: if too many errors in short time, mark unhealthy
  // Use atomic check to ensure only one thread marks unhealthy
  if (redisHealthy && currentErrorCount >= REDIS_ERROR_COUNT_THRESHOLD) {
    // Try to acquire lock atomically
    if (!redisHealthCheckInProgress) {
      redisHealthCheckInProgress = true;
      
      // Double-check redisHealthy after acquiring lock
      if (redisHealthy) {
        redisHealthy = false;
        lastRedisError = Date.now();
        console.error('🚨 [ALERT] Redis marked as UNHEALTHY - falling back to memory cache');
        console.error(`🚨 [ALERT] Circuit breaker triggered after ${currentErrorCount} errors`);
        console.error('🚨 [ALERT] This may impact performance. Check Redis connection!');
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        redisHealthCheckInProgress = false;
      }, 100);
    }
  }
}

/**
 * Extract serializable data from NextResponse
 * This allows us to cache the response data without losing the Response object
 */
async function extractResponseData(response: any): Promise<any> {
  // If it's a NextResponse, extract the JSON data
  if (response instanceof NextResponse || (response && typeof response.json === 'function')) {
    try {
      // Clone the response to avoid consuming the body
      const cloned = response.clone();
      const data = await cloned.json();
      return {
        _type: 'NextResponse',
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      console.error('[Cache] Failed to extract response data:', error);
      return response;
    }
  }
  
  return response;
}

/**
 * Reconstruct NextResponse from cached data
 * Returns null if reconstruction fails to allow fallback
 */
function reconstructResponse(cached: any): any {
  try {
    // Validate input
    if (cached === null || cached === undefined) {
      return null;
    }
    
    if (cached && cached._type === 'NextResponse') {
      // Validate required fields
      if (!cached.data) {
        console.error('[Cache] Invalid NextResponse cache: missing data');
        return null;
      }
      
      return NextResponse.json(cached.data, {
        status: cached.status || 200,
        statusText: cached.statusText || 'OK',
        headers: cached.headers || {}
      });
    }
    
    return cached;
  } catch (error) {
    console.error('[Cache] Error reconstructing response:', error);
    return null;
  }
}

/**
 * Advanced Cached Fetch with Cache Stampede Protection
 * 
 * Features:
 * 1. Request Coalescing - Only 1 request hits database, others wait (for cache miss)
 * 2. Stale-While-Revalidate - Serve stale data IMMEDIATELY while refreshing in background
 * 3. Refresh Lock - Only 1 background refresh per key, concurrent requests skip
 * 4. Multi-layer cache - Redis → Memory → Stale → Database
 * 5. Automatic cleanup to prevent memory leaks
 * 6. NextResponse serialization - Properly handles NextResponse objects
 * 
 * Flow:
 * - Cache HIT (fresh): Return immediately
 * - Cache HIT (expired but stale exists): Return stale IMMEDIATELY + trigger background refresh (once)
 * - Cache MISS: Wait for database (with request coalescing)
 * 
 * @param key - Cache key
 * @param fetcher - Function to fetch fresh data (can return NextResponse or plain data)
 * @param ttlSeconds - Time to live in seconds
 * @returns Cached or fresh data (reconstructed as NextResponse if needed)
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 5
): Promise<T> {
  if (!key || typeof key !== 'string') {
    throw new Error('Cache key must be a non-empty string');
  }
  if (typeof fetcher !== 'function') {
    throw new Error('Fetcher must be a function');
  }
  if (ttlSeconds < 0) {
    throw new Error('TTL must be non-negative');
  }
  
  const now = Date.now();
  
  // Prevent memory leak from too many concurrent fetches
  if (ongoingFetches.size > MAX_ONGOING_FETCHES) {
    console.warn(`[Cache] Too many ongoing fetches (${ongoingFetches.size}), rejecting new request for key: ${key}`);
    // Try to serve from stale cache if available
    const staleData = staleCache.get(key);
    if (staleData) {
      console.log(`[Cache] Serving stale data due to overload for key: ${key}`);
      const reconstructed = reconstructResponse(staleData.data);
      if (reconstructed !== null && reconstructed !== undefined) {
        return reconstructed as T;
      }
    }
    throw new Error('Cache system overloaded, please retry');
  }

  // Try Redis first
  const redis = await getRedisCache();
  
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached !== null && cached !== undefined) {
        console.log(`[Cache] Redis HIT for key: ${key}`);
        // Update stale cache BEFORE return to avoid race condition
        const cacheData = { data: cached, timestamp: Date.now() };
        staleCache.set(key, cacheData);
        // Clear failed fetch record on successful cache hit
        failedFetches.delete(key);
        const reconstructed = reconstructResponse(cached);
        // Validate reconstructed response
        if (reconstructed === null || reconstructed === undefined) {
          console.error(`[Cache] Failed to reconstruct Redis cache for key: ${key}`);
          // Fall through to memory cache
        } else {
          return reconstructed as T;
        }
      }
    } catch (error) {
      console.error('[Cache] Redis get failed:', error);
      markRedisUnhealthy();
      // Continue to memory cache fallback
    }
  }

  // Fallback to memory cache
  try {
    const memoryCached = memoryCache.get<any>(key);
    if (memoryCached !== null && memoryCached !== undefined) {
      console.log(`[Cache] Memory HIT for key: ${key}`);
      // Update stale cache BEFORE return to avoid race condition
      const cacheData = { data: memoryCached, timestamp: Date.now() };
      staleCache.set(key, cacheData);
      // Clear failed fetch record on successful cache hit
      failedFetches.delete(key);
      const reconstructed = reconstructResponse(memoryCached);
      // Validate reconstructed response
      if (reconstructed === null || reconstructed === undefined) {
        console.error(`[Cache] Failed to reconstruct memory cache for key: ${key}`);
        // Fall through to stale check
      } else {
        return reconstructed as T;
      }
    }
  } catch (error) {
    console.error('[Cache] Memory cache get failed:', error);
    // Continue to stale check
  }

  // Check if there's stale data we can serve while revalidating
  const staleData = staleCache.get(key);
  const staleAge = staleData ? now - staleData.timestamp : Infinity;
  
  // Check if we should retry failed fetch with exponential backoff
  const failedRecord = failedFetches.get(key);
  const shouldRetry = !failedRecord || 
    (now - failedRecord.lastAttempt > Math.min(RETRY_BACKOFF_BASE * Math.pow(2, failedRecord.count), 60000));
  
  // STALE-WHILE-REVALIDATE: Serve stale data IMMEDIATELY if available
  // Condition: stale data exists AND within MAX_STALE_AGE
  if (staleData && staleAge < MAX_STALE_AGE) {
    console.log(`[Cache] Serving STALE data for key: ${key} (age: ${Math.round(staleAge / 1000)}s)`);
    
    // Trigger background revalidation (fire and forget) with ATOMIC refresh lock
    // ATOMIC CHECK-AND-SET to prevent race condition
    const refreshLock = refreshLocks.get(key);
    // Check if lock exists and is not expired (for timestamp-based locks)
    const isRefreshInProgress = refreshLock && (
      typeof refreshLock === 'symbol' || // Symbol locks are always valid until deleted
      (typeof refreshLock === 'number' && now - refreshLock < REFRESH_LOCK_TTL)
    );
    
    // CRITICAL: Use atomic check-and-set pattern
    // Only ONE request will successfully set the lock
    if (!isRefreshInProgress && shouldRetry) {
      // ATOMIC: Try to set lock - if key already exists, someone else got it
      const lockId = Symbol('refresh-lock');
      
      // Check if lock already exists BEFORE setting
      if (!refreshLocks.has(key)) {
        refreshLocks.set(key, lockId as any);
        
        // Verify we got the lock (defense in depth)
        if (refreshLocks.get(key) === lockId) {
          // We successfully acquired the lock
          console.log(`[Cache] Triggering background refresh for key: ${key}`);
          
          // Start background refresh (non-blocking)
          // Use Promise.resolve().then() for better compatibility (not setImmediate)
          try {
            Promise.resolve().then(() => {
              performFetch(key, fetcher, ttlSeconds, redis)
                .then(() => {
                  // Success - clear failed fetch record and refresh lock
                  failedFetches.delete(key);
                  refreshLocks.delete(key);
                  console.log(`[Cache] Background refresh completed for key: ${key}`);
                })
                .catch(error => {
                  console.error(`[Cache] Background revalidation failed for key: ${key}:`, error);
                  // Track failed attempt for exponential backoff
                  const record = failedFetches.get(key) || { count: 0, lastAttempt: 0 };
                  failedFetches.set(key, {
                    count: Math.min(record.count + 1, MAX_RETRY_ATTEMPTS),
                    lastAttempt: Date.now()
                  });
                  // Release refresh lock on error
                  refreshLocks.delete(key);
                  // Don't throw - we already served stale data
                });
            }).catch(error => {
              // Catch promise creation errors
              console.error(`[Cache] Background refresh promise error for key: ${key}:`, error);
              refreshLocks.delete(key);
            });
          } catch (error) {
            // Catch synchronous errors
            console.error(`[Cache] Background refresh sync error for key: ${key}:`, error);
            refreshLocks.delete(key);
          }
        } else {
          // Someone else got the lock between our check and set
          console.log(`[Cache] Lost race for refresh lock on key: ${key}, skipping`);
        }
      }
    } else if (isRefreshInProgress) {
      console.log(`[Cache] Refresh already in progress for key: ${key}, skipping`);
    } else if (!shouldRetry) {
      const backoffTime = Math.min(RETRY_BACKOFF_BASE * Math.pow(2, failedRecord!.count), 60000);
      const waitTime = Math.max(0, Math.round((backoffTime - (now - failedRecord!.lastAttempt)) / 1000));
      console.log(`[Cache] Refresh in backoff for key: ${key}, retry in ${waitTime}s`);
    }
    
    // Return stale data IMMEDIATELY (don't wait for refresh)
    const reconstructed = reconstructResponse(staleData.data);
    if (reconstructed === null || reconstructed === undefined) {
      console.error(`[Cache] Failed to reconstruct stale data for key: ${key}, fetching fresh`);
      // Fall through to fresh fetch
    } else {
      return reconstructed as T;
    }
  }

  // No cache available (fresh or stale) - need to fetch and WAIT
  console.log(`[Cache] MISS for key: ${key} - fetching fresh data (blocking)`);
  
  // REQUEST COALESCING: ATOMIC check-and-set to prevent race condition
  // Multiple requests arriving at the same time should only create ONE fetch
  let fetchPromise = ongoingFetches.get(key);
  
  if (fetchPromise) {
    // Someone else is already fetching - wait for their result
    console.log(`[Cache] Coalescing request for key: ${key}`);
    try {
      const result = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Coalesced fetch timeout')), FETCH_TIMEOUT)
        )
      ]);
      // Validate result before returning
      if (result === null || result === undefined) {
        console.error(`[Cache] Ongoing fetch returned null/undefined for key: ${key}`);
        // Remove invalid entry and fall through to create new fetch
        ongoingFetches.delete(key);
      } else {
        const reconstructed = reconstructResponse(result);
        if (reconstructed !== null && reconstructed !== undefined) {
          return reconstructed as T;
        }
        // If reconstruction failed, fall through
        ongoingFetches.delete(key);
      }
    } catch (error) {
      // If ongoing fetch fails, remove it and fall through to create new fetch
      console.log(`[Cache] Ongoing fetch failed for key: ${key}, retrying fresh fetch`);
      ongoingFetches.delete(key);
    }
  }
  
  // Check retry backoff before fetching
  if (!shouldRetry && failedRecord) {
    const backoffTime = Math.min(RETRY_BACKOFF_BASE * Math.pow(2, failedRecord.count), 60000);
    const waitTime = Math.max(0, Math.round((backoffTime - (now - failedRecord.lastAttempt)) / 1000));
    console.log(`[Cache] Fetch in backoff for key: ${key}, retry in ${waitTime}s`);
    
    // If we have very stale data, serve it instead of failing
    if (staleData) {
      console.log(`[Cache] Serving VERY STALE data due to backoff for key: ${key}`);
      const reconstructed = reconstructResponse(staleData.data);
      if (reconstructed !== null && reconstructed !== undefined) {
        return reconstructed as T;
      }
    }
    
    throw new Error(`Fetch temporarily unavailable (retry in ${waitTime}s)`);
  }
  
  // ATOMIC: Create and register fetch promise in one step
  // This prevents race condition where multiple requests create multiple fetches
  try {
    fetchPromise = performFetch(key, fetcher, ttlSeconds, redis)
      .then(result => {
        // Success - clear failed fetch record
        failedFetches.delete(key);
        return result;
      })
      .catch(error => {
        // Track failed attempt for exponential backoff
        const record = failedFetches.get(key) || { count: 0, lastAttempt: 0 };
        failedFetches.set(key, {
          count: Math.min(record.count + 1, MAX_RETRY_ATTEMPTS),
          lastAttempt: Date.now()
        });
        
        console.error(`[Cache] Fetch failed (attempt ${record.count + 1}/${MAX_RETRY_ATTEMPTS}) for key: ${key}`);
        
        // Remove from ongoing fetches on error to allow retry
        ongoingFetches.delete(key);
        throw error;
      })
      .finally(() => {
        // Always cleanup after fetch completes
        ongoingFetches.delete(key);
      });
    
    // CRITICAL: Set IMMEDIATELY after creation to prevent race
    ongoingFetches.set(key, fetchPromise);
  } catch (error) {
    // Handle synchronous errors during promise creation
    console.error(`[Cache] Error creating fetch promise for key: ${key}:`, error);
    throw error;
  }
  
  const result = await fetchPromise;
  const reconstructed = reconstructResponse(result);
  
  // Final validation
  if (reconstructed === null || reconstructed === undefined) {
    console.error(`[Cache] Final result is null/undefined for key: ${key}`);
    throw new Error('Cache fetch returned invalid result');
  }
  
  return reconstructed as T;
}

/**
 * Perform the actual fetch and cache the result
 * Separated for reuse in background revalidation
 */
async function performFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  redis: any
): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Fetch fresh data with timeout protection
    const rawData = await Promise.race([
      fetcher(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Fetch timeout after ${FETCH_TIMEOUT}ms`)), FETCH_TIMEOUT)
      )
    ]);
    
    const fetchTime = Date.now() - startTime;
    
    // Validate fetcher result
    if (rawData === null || rawData === undefined) {
      console.error(`[Cache] Fetcher returned null/undefined for key: ${key}`);
      throw new Error('Fetcher returned invalid data');
    }
    
    console.log(`[Cache] Fetch completed for key: ${key} in ${fetchTime}ms`);

    // Extract serializable data from NextResponse
    const serializableData = await extractResponseData(rawData);
    
    // Validate serialized data
    if (serializableData === null || serializableData === undefined) {
      console.error(`[Cache] Serialization failed for key: ${key}`);
      throw new Error('Failed to serialize response data');
    }

    // Store in stale cache immediately (atomic operation)
    try {
      const cacheData = { data: serializableData, timestamp: Date.now() };
      staleCache.set(key, cacheData);
    } catch (err) {
      console.error('[Cache] Failed to update stale cache:', err);
      // Continue - not critical
    }

    // Cache in both Redis and memory (fire and forget for Redis)
    if (redis) {
      redis.set(key, serializableData, ttlSeconds).catch((err: any) => {
        // Check if error is due to read-only replica
        const errorMsg = err?.message || String(err);
        if (errorMsg.includes('READONLY') || errorMsg.includes('read only replica')) {
          console.warn('[Cache] Redis is read-only replica, skipping write. Using memory cache only.');
          // Don't mark as unhealthy for read-only errors - it's expected in replica setup
        } else {
          console.error('[Cache] Redis set failed:', err);
          markRedisUnhealthy();
        }
      });
    }
    
    try {
      memoryCache.set(key, serializableData, ttlSeconds);
    } catch (err) {
      console.error('[Cache] Memory cache set failed:', err);
      // Continue - not critical
    }

    return serializableData;
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error(`[Cache] Fetch failed for key: ${key} after ${fetchTime}ms:`, error);
    
    // If fetch fails but we have stale data (even very old), return it
    const staleData = staleCache.get(key);
    if (staleData && staleData.data) {
      const staleAge = Math.round((Date.now() - staleData.timestamp) / 1000);
      console.log(`[Cache] Fetch failed, returning stale data for key: ${key} (age: ${staleAge}s)`);
      return staleData.data;
    }
    
    // No stale data available, propagate error
    throw error;
  }
}

// Invalidate cache
export async function invalidateCache(key: string): Promise<void> {
  try {
    const redis = await getRedisCache();
    
    if (redis) {
      await redis.delete(key).catch((err: any) => {
        const errorMsg = err?.message || String(err);
        if (errorMsg.includes('READONLY') || errorMsg.includes('read only replica')) {
          console.warn('[Cache] Redis is read-only replica, skipping delete');
        } else {
          console.error('[Cache] Redis delete failed:', err);
        }
      });
    }
    
    memoryCache.delete(key);
    staleCache.delete(key);
    ongoingFetches.delete(key);
    failedFetches.delete(key);
    refreshLocks.delete(key);
  } catch (error) {
    console.error('[Cache] Invalidate cache failed:', error);
    // Don't throw - invalidation failure should not break the app
  }
}

// Clear all cache
export async function clearAllCache(pattern: string = '*'): Promise<void> {
  try {
    const redis = await getRedisCache();
    
    if (redis) {
      await redis.clear(pattern).catch((err: any) => {
        const errorMsg = err?.message || String(err);
        if (errorMsg.includes('READONLY') || errorMsg.includes('read only replica')) {
          console.warn('[Cache] Redis is read-only replica, skipping clear');
        } else {
          console.error('[Cache] Redis clear failed:', err);
        }
      });
    }
    
    memoryCache.clear();
    
    // Clear stale cache entries matching pattern
    if (pattern === '*') {
      staleCache.clear();
      ongoingFetches.clear();
      failedFetches.clear();
      refreshLocks.clear();
    } else {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);
      
      // Clear matching entries
      const keysToDelete: string[] = [];
      staleCache.forEach((_, key) => {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        staleCache.delete(key);
        ongoingFetches.delete(key);
        failedFetches.delete(key);
        refreshLocks.delete(key);
      });
    }
  } catch (error) {
    console.error('[Cache] Clear all cache failed:', error);
    // Don't throw - cache clear failure should not break the app
  }
}

// Cleanup function for graceful shutdown
export function shutdownCache(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  
  staleCache.clear();
  ongoingFetches.clear();
  failedFetches.clear();
  refreshLocks.clear();
  memoryCache.clear();
  
  console.log('[Cache] Cache shutdown complete');
}

// Get cache health status for monitoring
export function getCacheHealth(): {
  redisHealthy: boolean;
  redisErrorCount: number;
  staleCacheSize: number;
  ongoingFetchesCount: number;
  failedFetchesCount: number;
  refreshLocksCount: number;
  lastRedisError: number | null;
  memoryUsage: {
    staleCache: number;
    ongoingFetches: number;
    failedFetches: number;
    refreshLocks: number;
  };
} {
  return {
    redisHealthy,
    redisErrorCount,
    staleCacheSize: staleCache.size,
    ongoingFetchesCount: ongoingFetches.size,
    failedFetchesCount: failedFetches.size,
    refreshLocksCount: refreshLocks.size,
    lastRedisError: lastRedisError > 0 ? lastRedisError : null,
    memoryUsage: {
      staleCache: staleCache.size,
      ongoingFetches: ongoingFetches.size,
      failedFetches: failedFetches.size,
      refreshLocks: refreshLocks.size,
    }
  };
}

export { getCacheKey };
