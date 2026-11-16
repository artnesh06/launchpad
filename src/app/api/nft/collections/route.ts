/**
 * NFT Collections API Route
 * 
 * Get all NFT collections held by an owner address
 * GET /api/nft/collections?owner=0x...
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');
    const excludeSpam = searchParams.get('excludeSpam') === 'true';

    if (!owner) {
      return NextResponse.json(
        { error: 'Owner address is required' },
        { status: 400 }
      );
    }

    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      );
    }

    // Generate cache key including owner, pageSize, and excludeSpam parameters
    const cacheKey = getCacheKey('/api/nft/collections', {
      owner,
      pageSize: pageSize.toString(),
      excludeSpam: excludeSpam.toString()
    });

    // Wrap Alchemy API call with cache (TTL: 10 seconds for moderate updates)
    return await cachedFetch(cacheKey, async () => {
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      // Note: excludeFilters requires Growth plan or higher
      const options: any = {
        pageSize,
      };
      
      // Only add excludeFilters if explicitly requested and you have the right plan
      // if (excludeSpam) {
      //   options.excludeFilters = ['SPAM'];
      // }
      
      const result = await alchemyService.getCollectionsForOwner(owner, options);

      // Return raw Alchemy response
      return NextResponse.json({
        success: true,
        data: result,
      });
    }, 10); // TTL: 10 seconds (moderate updates for collection list)
  } catch (error) {
    console.error('Collections API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch collections',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
