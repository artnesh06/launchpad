/**
 * NFT Sales API Route
 * 
 * Example API endpoint for getting NFT sales data
 * GET /api/nft/sales?contract=0x...&limit=100
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractAddress = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');
    const buyerAddress = searchParams.get('buyer');
    const sellerAddress = searchParams.get('seller');
    const marketplace = searchParams.get('marketplace');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!contractAddress && !buyerAddress && !sellerAddress) {
      return NextResponse.json(
        { error: 'At least one filter is required (contract, buyer, or seller)' },
        { status: 400 }
      );
    }

    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: 'Alchemy API key not configured' },
        { status: 500 }
      );
    }

    // Generate cache key including all market parameters
    const cacheKey = getCacheKey('/api/nft/sales', {
      contract: contractAddress,
      tokenId,
      buyer: buyerAddress,
      seller: sellerAddress,
      marketplace,
      limit: limit.toString(),
    });

    // Wrap Alchemy API call with cache (10 seconds TTL for sales data)
    return await cachedFetch(cacheKey, async () => {

    const alchemyService = createAlchemyNFTService({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
    });

    // Get sales data - return raw Alchemy response
    const salesData = await alchemyService.getNFTSales({
      contractAddress: contractAddress || undefined,
      tokenId: tokenId || undefined,
      buyerAddress: buyerAddress || undefined,
      sellerAddress: sellerAddress || undefined,
      marketplace: marketplace || undefined,
      order: 'desc',
      limit,
    });

    // Return raw Alchemy response
    return NextResponse.json({
      success: true,
      data: salesData,
    });
    }, 10); // 10 seconds TTL for sales data
  } catch (error) {
    console.error('Sales API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch NFT sales data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
