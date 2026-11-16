/**
 * NFT Rarity API Route
 * 
 * Compute rarity of each attribute of an NFT
 * GET /api/nft/rarity?contract=0x...&tokenId=1
 * 
 * Cache: 60 seconds TTL (expensive computation, rarity rarely changes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractAddress = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');

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

    // Generate cache key with contract address and tokenId
    const cacheKey = getCacheKey('/api/nft/rarity', {
      contract: contractAddress,
      tokenId: tokenId
    });

    // Wrap Alchemy API call with cache (60 seconds TTL for expensive computation)
    return await cachedFetch(cacheKey, async () => {
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      const rarity = await alchemyService.computeRarity(contractAddress, tokenId);

      // Return raw Alchemy response
      return NextResponse.json({
        success: true,
        data: rarity,
      });
    }, 60); // 60 seconds TTL for expensive queries
  } catch (error) {
    console.error('Rarity API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to compute rarity',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
