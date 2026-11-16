/**
 * NFT Spam Check API Route
 * 
 * Check if a contract is marked as spam
 * GET /api/nft/spam/check?contract=0x...
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
    const cacheKey = getCacheKey('/api/nft/spam/check', {
      contract: contractAddress,
    });

    // Wrap spam check API call with cache (60 seconds TTL for spam detection)
    return await cachedFetch(cacheKey, async () => {

    const alchemyService = createAlchemyNFTService({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
    });

    const result = await alchemyService.isSpamContract(contractAddress);

    return NextResponse.json({
      success: true,
      data: {
        contractAddress,
        isSpam: result.isSpamContract,
      },
    });
    }, 60); // 60 seconds TTL for spam detection
  } catch (error) {
    console.error('Spam Check API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check spam status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
