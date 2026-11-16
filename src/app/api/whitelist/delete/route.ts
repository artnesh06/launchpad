import { authorizeCreatorOrAdmin } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearAllCache } from '@/lib/hybrid-cache';

/**
 * POST /api/whitelist/delete
 * Delete whitelist addresses for a specific phase
 * 
 * Body:
 * - contractAddress: The launchpad contract address
 * - phaseId: The mint phase ID (0-indexed)
 * - chainId: Chain ID (optional, defaults to 11155111)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress, phaseId, chainId = 11155111 } = body;

    // Validation
    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: 'Contract address is required' },
        { status: 400 }
      );
    }

    const denied = await authorizeCreatorOrAdmin(request, {
      action: 'whitelist:delete',
      target: contractAddress,
      chainId: Number(chainId),
    });
    if (denied) return denied;

    if (phaseId === undefined || phaseId === null) {
      return NextResponse.json(
        { success: false, error: 'Phase ID is required' },
        { status: 400 }
      );
    }

    // Find launchpad (case-insensitive search, get most recent if duplicates)
    const launchpad = await prisma.launchpad.findFirst({
      where: { 
        contractAddress: {
          equals: contractAddress,
          mode: 'insensitive'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!launchpad) {
      return NextResponse.json(
        { success: false, error: 'Launchpad not found' },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deleting whitelist addresses for phase ${phaseId}`);
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Launchpad ID: ${launchpad.id}`);

    // Delete whitelist entries for this phase
    const result = await prisma.launchpadWhitelist.deleteMany({
      where: {
        launchpadId: launchpad.id,
        phaseId: phaseId
      }
    });

    console.log(`✅ Deleted ${result.count} whitelist entries for phase ${phaseId}`);

    // Invalidate whitelist cache (non-blocking)
    try {
      await clearAllCache('/api/whitelist/*');
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      // Don't fail the mutation if cache invalidation fails
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count,
        phaseId,
        contractAddress
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to delete whitelist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete whitelist'
      },
      { status: 500 }
    );
  }
}
