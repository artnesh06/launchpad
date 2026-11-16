/**
 * RPC Request Cache and Debouncing
 * 
 * This module provides caching and debouncing for RPC requests
 * to reduce unnecessary network calls and improve performance.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

// In-memory cache for RPC responses
const responseCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, PendingRequest>();

// Cache TTL in milliseconds
const CACHE_TTL = 2000; // 2 seconds
const PENDING_REQUEST_TIMEOUT = 30000; // 30 seconds

// Methods that can be cached
const CACHEABLE_METHODS = new Set([
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getCode',
  'eth_call',
  'eth_gasPrice',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_chainId',
  'net_version',
]);

/**
 * Generate cache key from RPC request
 */
function getCacheKey(url: string, body: any): string {
  const method = body?.method || 'unknown';
  const params = JSON.stringify(body?.params || []);
  return `${url}:${method}:${params}`;
}

/**
 * Check if method is cacheable
 */
function isCacheable(method: string): boolean {
  return CACHEABLE_METHODS.has(method);
}

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  
  // Clean response cache
  const cacheKeys = Array.from(responseCache.keys());
  for (const key of cacheKeys) {
    const entry = responseCache.get(key);
    if (entry && now - entry.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
  
  // Clean pending requests
  const pendingKeys = Array.from(pendingRequests.keys());
  for (const key of pendingKeys) {
    const request = pendingRequests.get(key);
    if (request && now - request.timestamp > PENDING_REQUEST_TIMEOUT) {
      pendingRequests.delete(key);
    }
  }
}

// Run cleanup every 10 seconds
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 10000);
}

/**
 * Cached fetch for RPC requests
 * Automatically caches responses and deduplicates concurrent requests
 */
export async function cachedRpcFetch(url: string, options: RequestInit): Promise<Response> {
  const body = options.body ? JSON.parse(options.body as string) : {};
  const method = body.method;
  
  // Don't cache write operations
  if (!method || !isCacheable(method)) {
    return fetch(url, options);
  }
  
  const cacheKey = getCacheKey(url, body);
  const now = Date.now();
  
  // Check cache first
  const cached = responseCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    // Return cached response
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Check if there's already a pending request for this
  const pending = pendingRequests.get(cacheKey);
  if (pending && now - pending.timestamp < PENDING_REQUEST_TIMEOUT) {
    // Wait for the existing request
    const data = await pending.promise;
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Make new request
  const requestPromise = fetch(url, options)
    .then(async (response) => {
      const data = await response.json();
      
      // Cache successful responses
      if (response.ok) {
        responseCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }
      
      // Remove from pending
      pendingRequests.delete(cacheKey);
      
      return data;
    })
    .catch((error) => {
      // Remove from pending on error
      pendingRequests.delete(cacheKey);
      throw error;
    });
  
  // Store as pending
  pendingRequests.set(cacheKey, {
    promise: requestPromise,
    timestamp: now,
  });
  
  const data = await requestPromise;
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Clear all cached responses
 */
export function clearRpcCache() {
  responseCache.clear();
  pendingRequests.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cachedResponses: responseCache.size,
    pendingRequests: pendingRequests.size,
  };
}
