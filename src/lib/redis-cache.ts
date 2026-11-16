// Redis cache untuk production
// Install: npm install ioredis

import Redis from 'ioredis';

// Lazy initialization
let redis: Redis | null = null;
let redisConnectionFailed: boolean = false;

function getRedis(): Redis | null {
  if (redisConnectionFailed) {
    return null;
  }

  if (!process.env.REDIS_URL) {
    console.warn('⚠️ REDIS_URL not configured, caching disabled');
    redisConnectionFailed = true;
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('❌ Redis retry limit exceeded');
            return null;
          }
          return Math.min(times * 200, 1000);
        },
        connectTimeout: 10000, // 10 seconds connection timeout
        commandTimeout: 5000, // 5 seconds command timeout
        lazyConnect: false, // Connect immediately
        enableOfflineQueue: false, // Don't queue commands when disconnected
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });

      redis.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        // Don't set redisConnectionFailed here - let retry strategy handle it
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected');
        redisConnectionFailed = false;
      });

      redis.on('ready', () => {
        console.log('✅ Redis ready');
        redisConnectionFailed = false;
      });

      redis.on('close', () => {
        console.warn('⚠️ Redis connection closed');
      });

      redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      redis.on('end', () => {
        console.warn('⚠️ Redis connection ended');
        redisConnectionFailed = true;
      });
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      redisConnectionFailed = true;
      return null;
    }
  }

  return redis;
}

export class RedisCache {
  private redis: Redis | null;

  constructor() {
    this.redis = getRedis();
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 5): Promise<void> {
    if (!this.redis) return;

    try {
      const serialized = JSON.stringify(data);
      await Promise.race([
        this.redis.setex(key, ttlSeconds, serialized),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis set timeout')), 5000)
        )
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Don't log read-only replica errors as errors - they're expected in replica setup
      if (errorMsg.includes('READONLY') || errorMsg.includes('read only replica')) {
        // Silent skip for read-only replicas
        return;
      }
      console.error('Redis set error:', errorMsg);
      // Don't throw - cache failures should not break the app
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const data = await Promise.race([
        this.redis.get(key),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Redis get timeout')), 5000)
        )
      ]);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      if (error instanceof Error && error.message !== 'Redis get timeout') {
        console.error('Redis get error:', error.message);
      }
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      await Promise.race([
        this.redis.del(key),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis delete timeout')), 3000)
        )
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Don't log read-only replica errors as errors
      if (errorMsg.includes('READONLY') || errorMsg.includes('read only replica')) {
        return;
      }
      console.error('Redis delete error:', errorMsg);
      // Don't throw - cache failures should not break the app
    }
  }

  async clear(pattern: string = '*'): Promise<void> {
    if (!this.redis) return;

    try {
      // Use SCAN instead of KEYS to avoid blocking Redis
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100
      });

      const pipeline = this.redis.pipeline();
      let keysToDelete = 0;

      stream.on('data', (keys: string[]) => {
        if (keys.length > 0) {
          keys.forEach(key => pipeline.del(key));
          keysToDelete += keys.length;
        }
      });

      await Promise.race([
        new Promise<void>((resolve, reject) => {
          stream.on('end', async () => {
            if (keysToDelete > 0) {
              await pipeline.exec().catch(reject);
            }
            resolve();
          });
          stream.on('error', reject);
        }),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Redis clear timeout')), 10000)
        )
      ]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Don't log read-only replica errors as errors
      if (errorMsg.includes('READONLY') || errorMsg.includes('read only replica')) {
        return;
      }
      console.error('Redis clear error:', errorMsg);
      // Don't throw - cache failures should not break the app
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        console.error('Redis disconnect error:', error);
      }
      this.redis = null;
    }
  }
}

// Global instance
export const redisCache = new RedisCache();

// Cache wrapper dengan fallback ke in-memory
export async function withRedisCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 5
): Promise<T> {
  // Try Redis first
  const cached = await redisCache.get<T>(key);
  
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Cache it
  await redisCache.set(key, data, ttlSeconds);
  
  return data;
}
