/**
 * Safe Cache Wrapper for API Routes
 * 
 * Ensures that cachedFetch always returns a valid NextResponse
 * Prevents empty responses and 503 errors caused by cache failures
 */

import { NextResponse } from 'next/server';
import { cachedFetch, getCacheKey } from './hybrid-cache';

/**
 * Safe wrapper around cachedFetch that ensures valid NextResponse
 * 
 * @param key - Cache key
 * @param fetcher - Function that returns NextResponse
 * @param ttlSeconds - TTL in seconds
 * @returns NextResponse (never null/undefined)
 */
export async function safeCachedFetch<T = any>(
  key: string,
  fetcher: () => Promise<NextResponse<T>>,
  ttlSeconds: number = 5
): Promise<NextResponse<T>> {
  try {
    const result = await cachedFetch(key, fetcher, ttlSeconds);
    
    // Validate that result is a valid NextResponse
    if (!result) {
      console.error(`[Cache] Empty response for key: ${key}`);
      return NextResponse.json(
        { success: false, error: 'Empty cache response' },
        { status: 500 }
      ) as NextResponse<T>;
    }
    
    // Check if result is a NextResponse instance
    if (!(result instanceof NextResponse)) {
      console.error(`[Cache] Invalid response type for key: ${key}`, typeof result);
      return NextResponse.json(
        { success: false, error: 'Invalid cache response type' },
        { status: 500 }
      ) as NextResponse<T>;
    }
    
    return result;
  } catch (error) {
    console.error(`[Cache] safeCachedFetch error for key: ${key}:`, error);
    
    // Return proper error response instead of throwing
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cache fetch failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    ) as NextResponse<T>;
  }
}

/**
 * Generate cache key with validation
 * 
 * @param path - API path
 * @param params - Query parameters
 * @returns Cache key string
 */
export function safeGetCacheKey(path: string, params: Record<string, any> = {}): string {
  try {
    return getCacheKey(path, params);
  } catch (error) {
    console.error('[Cache] getCacheKey error:', error);
    // Fallback to path only
    return path;
  }
}

/**
 * Wrapper for endpoints that return JSON data directly
 * Automatically wraps data in NextResponse
 * 
 * @param key - Cache key
 * @param fetcher - Function that returns data (not NextResponse)
 * @param ttlSeconds - TTL in seconds
 * @returns NextResponse with data
 */
export async function cachedJsonFetch<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 5
): Promise<NextResponse> {
  try {
    const data = await cachedFetch(key, fetcher, ttlSeconds);
    
    if (data === null || data === undefined) {
      console.error(`[Cache] Empty data for key: ${key}`);
      return NextResponse.json(
        { success: false, error: 'No data returned' },
        { status: 404 }
      );
    }
    
    // If data is already a NextResponse, return it
    if (data instanceof NextResponse) {
      return data;
    }
    
    // Wrap data in NextResponse
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[Cache] cachedJsonFetch error for key: ${key}:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export { getCacheKey };
