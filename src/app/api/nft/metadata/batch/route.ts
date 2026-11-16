/**
 * NFT Metadata Batch API Route
 * 
 * Get metadata for multiple NFTs in a single request
 * POST /api/nft/metadata/batch
 * Body: { tokens: [{ contractAddress, tokenId }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokens, refreshCache } = body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Tokens array is required' },
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

    const result = await alchemyService.getNFTMetadataBatch(tokens, {
      refreshCache,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalNFTs: result.nfts.length,
        nfts: result.nfts,
      },
    });
  } catch (error) {
    console.error('Metadata Batch API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch NFT metadata batch',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
