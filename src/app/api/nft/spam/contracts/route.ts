/**
 * NFT Spam Contracts API Route
 * 
 * Get list of contracts marked as spam
 * GET /api/nft/spam/contracts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';

export async function GET(request: NextRequest) {
  try {
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

    const result = await alchemyService.getSpamContracts();

    return NextResponse.json({
      success: true,
      data: {
        totalSpamContracts: result.spamContracts.length,
        spamContracts: result.spamContracts,
      },
    });
  } catch (error) {
    console.error('Spam Contracts API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch spam contracts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
