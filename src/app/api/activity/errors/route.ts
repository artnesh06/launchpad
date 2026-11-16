import { NextRequest, NextResponse } from 'next/server';
import { getErrorLogs, getErrorStats } from '@/utils/error-logger';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

interface ErrorLogsResponse {
  success: boolean;
  data?: {
    logs?: any[];
    stats?: any;
  };
  error?: string;
}

/**
 * GET /api/activity/errors
 * Returns recent error logs and statistics
 * Query parameters:
 * - count: number of recent logs to return (default: 50, max: 200)
 * - stats: if 'true', return statistics instead of logs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const countParam = searchParams.get('count') || '50';
    const statsParam = searchParams.get('stats') === 'true';

    // Generate cache key with query parameters
    const cacheKey = getCacheKey('/api/activity/errors', {
      count: countParam,
      stats: statsParam.toString()
    });

    // Return cached response if available (10 seconds TTL for error logs)
    return await cachedFetch(cacheKey, async () => {

    // Validate count parameter
    const count = parseInt(countParam, 10);
    if (isNaN(count) || count < 1 || count > 200) {
      return NextResponse.json<ErrorLogsResponse>(
        {
          success: false,
          error: 'Invalid count parameter. Must be between 1 and 200'
        },
        { status: 400 }
      );
    }

    if (statsParam) {
      // Return error statistics
      const stats = getErrorStats();
      
      return NextResponse.json<ErrorLogsResponse>({
        success: true,
        data: {
          stats
        }
      });
    } else {
      // Return recent error logs
      const logs = getErrorLogs(count);
      
      return NextResponse.json<ErrorLogsResponse>({
        success: true,
        data: {
          logs
        }
      });
    }
    }, 10); // Cache for 10 seconds (error logs)

  } catch (error) {
    console.error('Error logs API error:', error);
    
    return NextResponse.json<ErrorLogsResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
