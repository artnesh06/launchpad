/**
 * NFT Contract NFTs API Route
 * 
 * Get all NFTs for a given contract
 * GET /api/nft/contract/nfts?contract=0x...
 * 
 * Cache: 10 seconds TTL (moderate frequency, contract data with pagination)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractAddress = searchParams.get('contract');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');
    const withMetadata = searchParams.get('withMetadata') === 'true';

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

    // Generate cache key with contract address and pagination parameters
    const cacheKey = getCacheKey('/api/nft/contract/nfts', { 
      contract: contractAddress,
      pageSize: pageSize.toString(),
      withMetadata: withMetadata.toString()
    });

    // Wrap Alchemy API call with cache (10 seconds TTL for contract data)
    return await cachedFetch(cacheKey, async () => {
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      const result = await alchemyService.getNFTsForContract(contractAddress, {
        pageSize,
        withMetadata,
      });

      // Return raw Alchemy response
      return NextResponse.json({
        success: true,
        data: result,
      });
    }, 10); // 10 seconds TTL for contract data
  } catch (error) {
    console.error('Contract NFTs API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch contract NFTs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
