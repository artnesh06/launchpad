import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET() {
  try {
    // Generate cache key for health check
    const cacheKey = getCacheKey('/api/health', {});

    // Wrap health check with cache (5 seconds TTL for health status)
    return await cachedFetch(cacheKey, async () => {
    const startTime = Date.now();

    // Check database connection
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbStatus = 'healthy';
    } catch (error) {
      dbStatus = 'unhealthy';
      console.error('Database health check failed:', error);
    }

    // Get system stats
    const [totalLaunchpads, totalMints, activeLaunchpads] = await Promise.all([
      prisma.launchpad.count(),
      prisma.mint.count(),
      prisma.launchpad.count({ where: { status: 'ACTIVE' } })
    ]);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: {
          status: dbStatus,
          latency: `${dbLatency}ms`
        }
      },
      stats: {
        totalLaunchpads,
        activeLaunchpads,
        totalMints
      },
      performance: {
        responseTime: `${responseTime}ms`,
        dbLatency: `${dbLatency}ms`
      },
      note: 'Mint listeners run in separate nft-listener-service'
    });
    }, 5); // 5 seconds TTL for health check
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
