/**
 * NFT Attributes Summary API Route
 * 
 * Generate summary of attribute prevalence for a collection
 * GET /api/nft/attributes?contract=0x...
 * 
 * Cache: 60 seconds TTL (expensive computation, attributes rarely change)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractAddress = searchParams.get('contract');

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      );
    }

    // Generate cache key with contract address
    const cacheKey = getCacheKey('/api/nft/attributes', {
      contract: contractAddress
    });

    // Wrap Alchemy API call with cache (60 seconds TTL for expensive computation)
    return await cachedFetch(cacheKey, async () => {
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      const attributes = await alchemyService.summarizeNFTAttributes(contractAddress);

      return NextResponse.json({
        success: true,
        data: attributes,
      });
    }, 60); // 60 seconds TTL for expensive queries
  } catch (error) {
    console.error('Attributes API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch attributes summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
