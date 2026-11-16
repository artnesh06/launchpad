// Simple in-memory cache untuk API routes
// Works di Vercel serverless functions

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 1000; // Limit cache size

  set<T>(key: string, data: T, ttlSeconds: number = 5): void {
    // Clean old entries if cache is too large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));

    // If still too large, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }
}

// Global cache instance
export const cache = new SimpleCache();

// Cache wrapper untuk API handlers
export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 5
): Promise<T> {
  const cached = cache.get<T>(key);
  
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return fetcher().then(data => {
    cache.set(key, data, ttlSeconds);
    return data;
  });
}

// Generate cache key dari request
export function getCacheKey(path: string, params: Record<string, any> = {}): string {
  // List of parameters to exclude from cache key
  // These are typically used for cache busting or client-side tracking
  const excludedParams = new Set([
    '_t',        // Timestamp for cache busting
    '_',         // Alternative timestamp parameter
    'timestamp', // Another common cache buster
    'nocache',   // Explicit no-cache flag
    'v',         // Version parameter sometimes used for cache busting
  ]);

  const sortedParams = Object.keys(params)
    .filter(key => {
      // Exclude cache-busting parameters
      if (excludedParams.has(key)) {
        return false;
      }
      
      const value = params[key];
      // Filter out null/undefined, but keep empty strings and 0
      // This prevents cache collision between missing params and null params
      return value !== null && value !== undefined;
    })
    .sort()
    .map(key => {
      const value = params[key];
      // Preserve type information in cache key to prevent number/string collision
      const typePrefix = typeof value === 'number' ? 'n:' : 
                        typeof value === 'boolean' ? 'b:' : 
                        's:'; // string (default)
      return `${key}=${typePrefix}${encodeURIComponent(String(value))}`;
    })
    .join('&');
  
  return sortedParams ? `${path}?${sortedParams}` : path;
}
