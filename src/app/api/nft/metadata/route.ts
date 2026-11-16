/**
 * NFT Metadata API Route
 * 
 * Example API endpoint for getting NFT metadata
 * GET /api/nft/metadata?contract=0x...&tokenId=1
 * Cache TTL: 300s (5 minutes) - Immutable metadata with long TTL
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractAddress = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');
    const refresh = searchParams.get('refresh') === 'true';

    if (!contractAddress || !tokenId) {
      return NextResponse.json(
        { error: 'Contract address and tokenId are required' },
        { status: 400 }
      );
    }

    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      );
    }

    // Generate cache key with contract and tokenId parameters
    const cacheKey = getCacheKey('/api/nft/metadata', {
      contract: contractAddress,
      tokenId,
      refresh: refresh.toString()
    });

    // Wrap Alchemy API call with cache (300s TTL for immutable metadata)
    return await cachedFetch(cacheKey, async () => {
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      // Get NFT metadata - return raw Alchemy response
      const metadata = await alchemyService.getNFTMetadata(
        contractAddress,
        tokenId,
        { refreshCache: refresh }
      );

      // Return raw Alchemy response
      return NextResponse.json({
        success: true,
        data: metadata,
      });
    }, 300); // Cache for 300 seconds (5 minutes) - immutable metadata
  } catch (error) {
    console.error('Metadata API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch NFT metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
