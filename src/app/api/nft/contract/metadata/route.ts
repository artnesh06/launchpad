/**
 * NFT Contract Metadata API Route
 * 
 * Get contract metadata
 * GET /api/nft/contract/metadata?contract=0x...
 * 
 * Cache: 10 seconds TTL (moderate frequency, contract data)
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
    const cacheKey = getCacheKey('/api/nft/contract/metadata', { 
      contract: contractAddress 
    });

    // Wrap Alchemy API call with cache (10 seconds TTL for contract data)
    return await cachedFetch(cacheKey, async () => {
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      const metadata = await alchemyService.getContractMetadata(contractAddress);

      // Return raw Alchemy response
      return NextResponse.json({
        success: true,
        data: metadata,
      });
    }, 10); // 10 seconds TTL for contract data
  } catch (error) {
    console.error('Contract Metadata API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch contract metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
