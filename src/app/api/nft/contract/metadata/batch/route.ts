/**
 * NFT Contract Metadata Batch API Route
 * 
 * Get contract metadata for multiple contracts
 * POST /api/nft/contract/metadata/batch
 * Body: { contractAddresses: ["0x...", "0x..."] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddresses } = body;

    if (!contractAddresses || !Array.isArray(contractAddresses) || contractAddresses.length === 0) {
      return NextResponse.json(
        { error: 'Contract addresses array is required' },
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

    const result = await alchemyService.getContractMetadataBatch(contractAddresses);

    return NextResponse.json({
      success: true,
      data: {
        totalContracts: result.contracts.length,
        contracts: result.contracts,
      },
    });
  } catch (error) {
    console.error('Contract Metadata Batch API Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch contract metadata batch',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
