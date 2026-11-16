import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { BlockchainService } from '@/lib/blockchain/blockchain-service';
import { prisma } from '@/lib/prisma';

const contractService = new BlockchainService();

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { chainId, forceSync = false, fromDate, onlyNew = true } = body;

    if (!chainId) {
      return NextResponse.json({
        success: false,
        error: 'Chain ID is required'
      }, { status: 400 });
    }

    // Parse fromDate if provided
    let syncFromDate: Date | null = null;
    if (fromDate) {
      syncFromDate = new Date(fromDate);
      if (isNaN(syncFromDate.getTime())) {
        return NextResponse.json({
          success: false,
          error: 'Invalid fromDate format'
        }, { status: 400 });
      }
    } else if (onlyNew) {
      // Default: only sync collections created today or later
      syncFromDate = new Date();
      syncFromDate.setHours(0, 0, 0, 0);
    }

    console.log(`🔄 Starting sync for chain ${chainId}${syncFromDate ? ` from ${syncFromDate.toISOString()}` : ' (all historical data)'}...`);

    // Get all launchpad addresses from blockchain
    const blockchainAddresses = await contractService.getAllLaunchpads(chainId);
    console.log(`📋 Found ${blockchainAddresses.length} launchpads on blockchain`);

    // Get existing launchpads from database
    const existingLaunchpads = await prisma.launchpad.findMany({
      where: { chainId },
      select: {
        contractAddress: true,
        updatedAt: true
      }
    });

    const existingAddresses = new Set(existingLaunchpads.map(lp => lp.contractAddress.toLowerCase()));
    console.log(`💾 Found ${existingAddresses.size} launchpads in database`);

    // Determine which launchpads need syncing
    let addressesToSync: string[] = [];

    if (forceSync) {
      // Force sync all launchpads
      addressesToSync = blockchainAddresses;
      console.log(`🔄 Force sync enabled - syncing all ${addressesToSync.length} launchpads`);
    } else {
      // Only sync new launchpads (not in database)
      addressesToSync = blockchainAddresses.filter(
        addr => !existingAddresses.has(addr.toLowerCase())
      );
      console.log(`✨ Found ${addressesToSync.length} new launchpads to sync`);
    }

    if (addressesToSync.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No new launchpads to sync',
          totalOnChain: blockchainAddresses.length,
          totalInDatabase: existingAddresses.size,
          newlySynced: 0
        }
      });
    }

    // Sync each new launchpad
    let syncedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const address of addressesToSync) {
      try {
        console.log(`📥 Syncing launchpad: ${address}`);

        // Get launchpad data from blockchain
        const launchpadData = await contractService.getLaunchpadInfo(chainId, address);

        if (!launchpadData) {
          console.warn(`⚠️ No data found for ${address}`);
          failedCount++;
          errors.push(`No data found for ${address}`);
          continue;
        }

        // Skip if collection was created before syncFromDate
        if (syncFromDate) {
          const collectionCreatedAt = new Date(launchpadData.createdAt);
          if (collectionCreatedAt < syncFromDate) {
            console.log(`⏭️ Skipping ${address} - created before ${syncFromDate.toISOString()}`);
            skippedCount++;
            continue;
          }
        }

        // Find factory for this chain
        const factory = await prisma.launchpadFactory.findFirst({
          where: { chainId }
        });

        if (!factory) {
          console.error(`❌ Factory not found for chain ${chainId}`);
          failedCount++;
          errors.push(`Factory not found for chain ${chainId}`);
          continue;
        }

        // Normalize address to lowercase
        const normalizedAddress = address.toLowerCase();

        // Save to database
        await prisma.launchpad.upsert({
          where: { contractAddress: normalizedAddress },
          update: {
            name: launchpadData.name,
            symbol: launchpadData.symbol,
            totalMaxSupply: launchpadData.totalSupply,
            updatedAt: new Date()
          },
          create: {
            chainId,
            factoryId: factory.id,
            contractAddress: normalizedAddress,
            creator: launchpadData.creator,
            name: launchpadData.name,
            symbol: launchpadData.symbol,
            totalMaxSupply: launchpadData.totalSupply,
            treasury: launchpadData.creator, // Default to creator
            status: 'ACTIVE',
            createdAt: new Date(launchpadData.createdAt)
          }
        });

        syncedCount++;
        console.log(`✅ Synced: ${launchpadData.name} (${address})`);

      } catch (error) {
        console.error(`❌ Failed to sync ${address}:`, error);
        failedCount++;
        errors.push(`Failed to sync ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`🎉 Sync completed: ${syncedCount} synced, ${skippedCount} skipped (old), ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      data: {
        message: `Sync completed: ${syncedCount} launchpads synced${skippedCount > 0 ? `, ${skippedCount} skipped (created before ${syncFromDate?.toISOString()})` : ''}`,
        totalOnChain: blockchainAddresses.length,
        totalInDatabase: existingAddresses.size + syncedCount,
        newlySynced: syncedCount,
        skipped: skippedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during sync'
    }, { status: 500 });
  }
}
