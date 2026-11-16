/**
 * NFT Portfolio API Route
 * 
 * Example API endpoint using Alchemy NFT Service
 * GET /api/nft/portfolio?wallet=0x...
 * 
 * Cache: 5 seconds TTL (user-specific portfolio data, needs freshness)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate API key
    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      );
    }

    // Generate cache key with wallet address
    const cacheKey = getCacheKey('/api/nft/portfolio', {
      wallet: walletAddress
    });

    // Wrap Alchemy API call with cache (5 seconds TTL for user portfolio)
    return await cachedFetch(cacheKey, async () => {
      // Initialize Alchemy service
      const alchemyService = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY!,
        network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
      });

      // Get all NFT contracts owned by wallet - return raw Alchemy response
      const contracts = await alchemyService.getContractsForOwner(walletAddress, {
        pageSize: 100,
      });

      // Return raw Alchemy response
      return NextResponse.json({
        success: true,
        data: contracts,
      });
    }, 5); // 5 seconds TTL for user portfolio
  } catch (error) {
    console.error('Portfolio API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch NFT portfolio',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
