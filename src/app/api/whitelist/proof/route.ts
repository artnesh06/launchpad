import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhitelistManager } from '@/lib/contract-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

/**
 * GET /api/whitelist/proof
 * Get merkle proof for a specific address in a launchpad phase
 * 
 * Query params:
 * - contractAddress: The launchpad contract address
 * - phaseId: The mint phase ID (0-indexed)
 * - address: The wallet address to get proof for
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('contractAddress');
    const phaseIdStr = searchParams.get('phaseId');
    const address = searchParams.get('address');

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

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    const phaseId = parseInt(phaseIdStr);

    // Generate cache key
    const cacheKey = getCacheKey('/api/whitelist/proof', {
      contractAddress,
      phaseId,
      address
    });

    // Return cached response if available (30 seconds TTL - whitelist rarely changes)
    return await cachedFetch(cacheKey, async () => {

    // Find launchpad with phases (case-insensitive search, get most recent if duplicates)
    const launchpad = await prisma.launchpad.findFirst({
      where: { 
        contractAddress: {
          equals: contractAddress,
          mode: 'insensitive'
        }
      },
      include: {
        phases: {
          orderBy: { phaseIndex: 'asc' } as any  // Order by phaseIndex to match smart contract
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

    // Check if phase exists
    const phases = launchpad.phases;
    if (!phases || !phases[phaseId]) {
      return NextResponse.json(
        { success: false, error: 'Phase not found' },
        { status: 404 }
      );
    }

    const phase = phases[phaseId];
    
    // If phase doesn't require whitelist, return empty proof
    if (phase.phaseType !== 'ALLOWLIST') {
      return NextResponse.json({
        success: true,
        data: {
          proof: [],
          allocation: 0,
          requiresWhitelist: false,
          isWhitelisted: true
        }
      });
    }

    // Get whitelist entries for this phase
    const whitelistEntries = await prisma.launchpadWhitelist.findMany({
      where: {
        launchpadId: launchpad.id,
        phaseId: phaseId
      }
    });

    console.log(`📋 Found ${whitelistEntries.length} whitelist entries for phase ${phaseId}`);

    if (!whitelistEntries || whitelistEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No whitelist data found for this phase' },
        { status: 404 }
      );
    }

    // Rebuild merkle tree from whitelist data
    const whitelistManager = new WhitelistManager();
    
    whitelistEntries.forEach((entry: { address: string; allocation: number }) => {
      console.log(`  Adding to tree: ${entry.address} (${entry.allocation})`);
      whitelistManager.addAddress(entry.address, entry.allocation);
    });

    // Generate merkle tree (will automatically handle single address case)
    const merkleRoot = whitelistManager.generateMerkleTree();
    console.log(`🌳 Generated merkle root: ${merkleRoot}`);

    // Verify merkle root matches what's in the contract
    if (phase.merkleRoot && merkleRoot.toLowerCase() !== phase.merkleRoot.toLowerCase()) {
      console.warn('⚠️ Merkle root mismatch!');
      console.warn('  Database:', merkleRoot);
      console.warn('  Contract:', phase.merkleRoot);
    } else {
      console.log('✅ Merkle root matches!');
    }

    // Check if address is whitelisted
    const normalizedAddress = address.toLowerCase();
    console.log(`🔍 Looking for address: ${normalizedAddress}`);
    
    const whitelistEntry = whitelistEntries.find(
      (entry: { address: string }) => entry.address.toLowerCase() === normalizedAddress
    );

    if (!whitelistEntry) {
      console.log('❌ Address not found in whitelist');
      return NextResponse.json({
        success: true,
        data: {
          proof: [],
          allocation: 0,
          requiresWhitelist: true,
          isWhitelisted: false
        }
      });
    }

    console.log(`✅ Address found! Allocation: ${whitelistEntry.allocation}`);

    // Generate merkle proof for this address
    const proof = whitelistManager.getMerkleProof(
      whitelistEntry.address,
      whitelistEntry.allocation
    );

    console.log(`🎫 Generated proof with ${proof.length} elements`);
    console.log(`   Proof:`, proof);

    return NextResponse.json({
      success: true,
      data: {
        proof,
        allocation: whitelistEntry.allocation,
        requiresWhitelist: true,
        isWhitelisted: true,
        merkleRoot
      }
    });
    }, 30); // Cache for 30 seconds

  } catch (error: any) {
    console.error('❌ Failed to get merkle proof:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get merkle proof'
      },
      { status: 500 }
    );
  }
}
