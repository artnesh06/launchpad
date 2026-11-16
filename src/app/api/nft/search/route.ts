/**
 * NFT Search API Route
 * 
 * Search contract metadata for specific keywords
 * GET /api/nft/search?query=cryptopunks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      );
    }

    // Generate cache key including search query
    const cacheKey = getCacheKey('/api/nft/search', {
      query,
    });

    // Wrap search API call with cache (10 seconds TTL for search results)
    return await cachedFetch(cacheKey, async () => {

    const alchemyService = createAlchemyNFTService({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
    });

    const result = await alchemyService.searchContractMetadata(query);

    // Return raw Alchemy response
    return NextResponse.json({
      success: true,
      data: result,
    });
    }, 10); // 10 seconds TTL for search results
  } catch (error) {
    console.error('Search API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to search contracts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
