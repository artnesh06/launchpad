import { NextResponse } from 'next/server';
import { getCacheHealth } from '@/lib/hybrid-cache';

/**
 * Cache Health Monitoring Endpoint
 * GET /api/cache/health
 * 
 * Returns cache system health status for monitoring
 */
export async function GET() {
  try {
    const health = getCacheHealth();
    
    const status = health.redisHealthy ? 'healthy' : 'degraded';
    const statusCode = health.redisHealthy ? 200 : 503;
    
    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      redis: {
        healthy: health.redisHealthy,
        lastError: health.lastRedisError ? new Date(health.lastRedisError).toISOString() : null,
        errorAge: health.lastRedisError ? Math.round((Date.now() - health.lastRedisError) / 1000) : null
      },
      cache: {
        staleCacheSize: health.staleCacheSize,
        ongoingFetches: health.ongoingFetchesCount,
        failedFetches: health.failedFetchesCount
      },
      warnings: [
        health.staleCacheSize > 800 ? 'Stale cache size approaching limit' : null,
        health.failedFetchesCount > 50 ? 'High number of failed fetches' : null,
        !health.redisHealthy ? 'Redis is unhealthy - using memory cache fallback' : null
      ].filter(Boolean)
    }, { status: statusCode });
  } catch (error) {
    console.error('[Cache Health] Error:', error);
    return NextResponse.json({
      status: 'error',
      error: 'Failed to get cache health'
    }, { status: 500 });
  }
}
