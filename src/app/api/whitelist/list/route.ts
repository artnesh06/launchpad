import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

/**
 * GET /api/whitelist/list
 * Get whitelist addresses for a specific phase
 * 
 * Query params:
 * - contractAddress: The launchpad contract address
 * - phaseId: The mint phase ID (0-indexed)
 * - chainId: Chain ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('contractAddress');
    const phaseIdStr = searchParams.get('phaseId');

    // Validation
    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: 'Contract address is required' },
        { status: 400 }
      );
    }

    if (!phaseIdStr) {
      return NextResponse.json(
        { success: false, error: 'Phase ID is required' },
        { status: 400 }
      );
    }

    const phaseId = parseInt(phaseIdStr);

    // Generate cache key including contract address and phase parameters
    const cacheKey = getCacheKey('/api/whitelist/list', {
      contractAddress,
      phaseId: phaseId.toString(),
    });

    // Wrap whitelist query with cache (30 seconds TTL for semi-static data)
    return await cachedFetch(cacheKey, async () => {

    // Find launchpad (case-insensitive search)
    const launchpad = await prisma.launchpad.findFirst({
      where: { 
        contractAddress: {
          equals: contractAddress,
          mode: 'insensitive'
        }
      }
    });

    if (!launchpad) {
      return NextResponse.json(
        { success: false, error: 'Launchpad not found' },
        { status: 404 }
      );
    }

    // Get whitelist entries for this phase
    const whitelistEntries = await prisma.launchpadWhitelist.findMany({
      where: {
        launchpadId: launchpad.id,
        phaseId: phaseId
      },
      orderBy: {
        address: 'asc'
      }
    });

    const addresses = whitelistEntries.map(entry => entry.address);

    console.log(`📋 Found ${addresses.length} addresses for phase ${phaseId}`);

    return NextResponse.json({
      success: true,
      data: {
        addresses,
        count: addresses.length,
        phaseId,
        contractAddress
      }
    });
    }, 30); // 30 seconds TTL for semi-static whitelist data

  } catch (error: any) {
    console.error('❌ Failed to get whitelist addresses:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get whitelist addresses'
      },
      { status: 500 }
    );
  }
}
