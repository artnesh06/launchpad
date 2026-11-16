/**
 * NFT Floor Price API Route
 * 
 * Get floor price of an NFT collection by marketplace
 * GET /api/nft/floor-price?contract=0x...
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

    // Generate cache key including contract address
    const cacheKey = getCacheKey('/api/nft/floor-price', {
      contract: contractAddress,
    });

    // Wrap Alchemy API call with cache (30 seconds TTL for floor price)
    return await cachedFetch(cacheKey, async () => {

    const alchemyService = createAlchemyNFTService({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
    });

    const floorPrice = await alchemyService.getFloorPrice(contractAddress);

    // Return raw Alchemy response
    return NextResponse.json({
      success: true,
      data: floorPrice,
    });
    }, 30); // 30 seconds TTL for floor price data
  } catch (error) {
    console.error('Floor Price API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch floor price',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
