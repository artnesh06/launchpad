/**
 * NFT Collection Attributes API Route
 * 
 * Get attribute summary for a collection (trait types and values with prevalence)
 * GET /api/nft/collection/[address]/attributes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    // Validate contract address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid contract address format' 
        },
        { status: 400 }
      );
    }

    // Generate cache key including contract address
    const cacheKey = getCacheKey(`/api/nft/collection/${address}/attributes`, {});

    // Wrap database query with cache (TTL: 10 seconds for moderate updates)
    return await cachedFetch(cacheKey, async () => {
      // Normalize address to lowercase for consistent querying
      const normalizedAddress = address.toLowerCase();

      // Get total supply from NFT contract
      const contract = await prisma.nFTContract.findFirst({
        where: {
          address: normalizedAddress,
        },
        select: {
          totalSupply: true,
        },
      });

      // Get all attributes for this collection with aggregation
      const attributes = await prisma.nFTAttribute.findMany({
        where: {
          nft: {
            contractAddress: normalizedAddress,
          },
        },
        select: {
          traitType: true,
          value: true,
          count: true,
          prevalence: true,
        },
      });

      // Build summary object grouped by trait type
      const summary: Record<string, Array<{ value: string; count: number; prevalence: number }>> = {};
      
      for (const attr of attributes) {
        if (!summary[attr.traitType]) {
          summary[attr.traitType] = [];
        }
        
        summary[attr.traitType].push({
          value: attr.value,
          count: attr.count || 0,
          prevalence: attr.prevalence || 0,
        });
      }

      // Sort values by count (descending)
      for (const traitType in summary) {
        summary[traitType].sort((a, b) => b.count - a.count);
      }

      return NextResponse.json({
        success: true,
        data: {
          contractAddress: address,
          totalSupply: contract?.totalSupply ? parseInt(contract.totalSupply) : 0,
          summary,
        },
      });
    }, 10); // TTL: 10 seconds (moderate updates for collection attributes)
  } catch (error) {
    console.error('Attributes API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch collection attributes',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
