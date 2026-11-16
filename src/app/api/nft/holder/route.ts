/**
 * NFT Holder Check API Route
 * 
 * Check if a wallet owns any NFT in a collection
 * GET /api/nft/holder?wallet=0x...&contract=0x...
 * 
 * Cache: 5 seconds TTL (user-specific holder status, needs freshness)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');
    const contractAddress = searchParams.get('contract');

    if (!wallet || !contractAddress) {
      return NextResponse.json(
        { error: 'Wallet address and contract address are required' },
        { status: 400 }
      );
    }

    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      );
    }

    // Generate cache key with wallet and contract address
    const cacheKey = getCacheKey('/api/nft/holder', {
      wallet,
      contract: contractAddress
    });

    // Wrap Alchemy API call with cache (5 seconds TTL for holder status)
    return await cachedFetch(cacheKey, async () => {
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      const result = await alchemyService.isHolderOfContract(wallet, contractAddress);

      // Return raw Alchemy response
      return NextResponse.json({
        success: true,
        data: result,
      });
    }, 5); // 5 seconds TTL for holder status
  } catch (error) {
    console.error('Holder Check API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check holder status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
