/**
 * NFT Contract Owners API Route
 * 
 * Get all owners for a given NFT contract
 * GET /api/nft/owners/contract?contract=0x...
 * 
 * Cache: 5 seconds TTL (ownership data, needs freshness)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractAddress = searchParams.get('contract');
    const withTokenBalances = searchParams.get('withTokenBalances') === 'true';

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

    // Generate cache key with contract address and parameters
    const cacheKey = getCacheKey('/api/nft/owners/contract', {
      contract: contractAddress,
      withTokenBalances: withTokenBalances.toString()
    });

    // Wrap Alchemy API call with cache (5 seconds TTL for ownership data)
    return await cachedFetch(cacheKey, async () => {
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      const result = await alchemyService.getOwnersForContract(contractAddress, {
        withTokenBalances,
      });

      // Return raw Alchemy response
      return NextResponse.json({
        success: true,
        data: result,
      });
    }, 5); // 5 seconds TTL for ownership data
  } catch (error) {
    console.error('Contract Owners API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch contract owners',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
