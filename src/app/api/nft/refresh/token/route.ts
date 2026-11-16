/**
 * NFT Refresh Token API Route
 * 
 * Refresh metadata for a specific NFT
 * POST /api/nft/refresh/token
 * Body: { contractAddress: "0x...", tokenId: "1" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress, tokenId } = body;

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

    const alchemyService = createAlchemyNFTService({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
    });

    const result = await alchemyService.refreshNFTMetadata(contractAddress, tokenId);

    return NextResponse.json({
      success: true,
      data: {
        contractAddress,
        tokenId,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('Refresh Token API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to refresh token metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
