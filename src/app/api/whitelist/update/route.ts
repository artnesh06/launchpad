import { authorizeCreatorOrAdmin } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearAllCache } from '@/lib/hybrid-cache';

/**
 * POST /api/whitelist/update
 * Add or update whitelist addresses for a specific phase
 * 
 * Body:
 * - contractAddress: The launchpad contract address
 * - phaseId: The mint phase ID (0-indexed)
 * - addresses: Array of wallet addresses to whitelist
 * - chainId: Chain ID (optional, defaults to 11155111)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress, phaseId, addresses, chainId = 11155111 } = body;

    // Validation
    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: 'Contract address is required' },
        { status: 400 }
      );
    }

    const denied = await authorizeCreatorOrAdmin(request, {
      action: 'whitelist:update',
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

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Addresses array is required and must not be empty' },
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

    // Validate that phaseId exists in database
    const phase = await prisma.launchpadPhase.findUnique({
      where: {
        launchpadId_phaseIndex: {
          launchpadId: launchpad.id,
          phaseIndex: phaseId
        }
      }
    });

    if (!phase) {
      console.error(`❌ Phase ${phaseId} not found for collection ${contractAddress}`);
      return NextResponse.json({
        success: false,
        error: `Phase ${phaseId} does not exist for this collection`,
        suggestion: 'The phase may not be synced from the contract. Try running phase sync: POST /api/admin/launchpads/sync-phases',
        details: {
          contractAddress,
          phaseId,
          chainId
        }
      }, { status: 404 });
    }

    // Normalize addresses (lowercase and remove duplicates)
    const normalizedAddresses = Array.from(new Set(
      addresses.map((addr: string) => addr.toLowerCase().trim())
    ));

    console.log(`📝 Adding ${normalizedAddresses.length} addresses to whitelist`);
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Phase ID: ${phaseId}`);
    console.log(`   Phase Name: ${phase.name}`);

    // Delete existing whitelist entries for this phase (replace mode)
    await prisma.launchpadWhitelist.deleteMany({
      where: {
        launchpadId: launchpad.id,
        phaseId: phaseId
      }
    });

    // Add new whitelist entries
    const whitelistEntries = normalizedAddresses.map((address: string) => ({
      launchpadId: launchpad.id,
      phaseId: phaseId,
      address: address,
      allocation: 1 // Default allocation is 1
    }));

    await prisma.launchpadWhitelist.createMany({
      data: whitelistEntries,
      skipDuplicates: true
    });

    console.log(`✅ Successfully added ${normalizedAddresses.length} addresses to whitelist`);

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
        addressesAdded: normalizedAddresses.length,
        phaseId,
        contractAddress
      }
    });

  } catch (error: any) {
    console.error('❌ Failed to update whitelist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update whitelist'
      },
      { status: 500 }
    );
  }
}
