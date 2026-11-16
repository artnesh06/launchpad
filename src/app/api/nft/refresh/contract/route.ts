/**
 * NFT Refresh Contract API Route
 * 
 * Trigger metadata refresh for an NFT collection
 * POST /api/nft/refresh/contract
 * Body: { contractAddress: "0x..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress } = body;

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

    const alchemyService = createAlchemyNFTService({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
    });

    const result = await alchemyService.invalidateContract(contractAddress);

    return NextResponse.json({
      success: true,
      data: {
        contractAddress,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('Refresh Contract API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to refresh contract',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
