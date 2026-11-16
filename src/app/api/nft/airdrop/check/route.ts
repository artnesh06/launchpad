/**
 * NFT Airdrop Check API Route
 * 
 * Check if a token is marked as an airdrop
 * GET /api/nft/airdrop/check?contract=0x...&tokenId=1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contractAddress = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');

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

    const result = await alchemyService.isAirdropNFT(contractAddress, tokenId);

    return NextResponse.json({
      success: true,
      data: {
        contractAddress,
        tokenId,
        isAirdrop: result.isAirdrop,
      },
    });
  } catch (error) {
    console.error('Airdrop Check API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check airdrop status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
