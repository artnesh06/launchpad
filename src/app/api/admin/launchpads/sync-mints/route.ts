import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { getChainConfig } from '@/config/chains';
import OddsLaunchpadABI from '@/../abi/OddsLaunchpad.json';
import { resolveImagePath } from '@/lib/ipfs-utils';

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { launchpadId, contractAddress, chainId, fromDate } = body;

    if (!launchpadId || !contractAddress || !chainId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: launchpadId, contractAddress, chainId'
      }, { status: 400 });
    }

    // Normalize contract address to lowercase to prevent duplicates
    const normalizedContractAddress = contractAddress.toLowerCase();

    // Default: hanya sync data yang dibuat hari ini atau setelahnya
    let syncFromDate: Date;
    if (fromDate) {
      syncFromDate = new Date(fromDate);
    } else {
      // Default: start of today (00:00:00)
      syncFromDate = new Date();
      syncFromDate.setHours(0, 0, 0, 0);
    }
    console.log(`🔄 Syncing mints for launchpad: ${normalizedContractAddress} from ${syncFromDate.toISOString()}`);

    // Get chain config
    const chain = getChainConfig(chainId);
    if (!chain) {
      return NextResponse.json({
        success: false,
        error: `Chain ${chainId} not supported`
      }, { status: 400 });
    }

    // Add launchpad to activity listener for real-time mint tracking
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/activity/listener`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          chainId,
          launchpadAddress: normalizedContractAddress
        })
      });
      console.log(`✅ Added launchpad to activity listener`);
    } catch (listenerError) {
      console.warn(`⚠️ Failed to add launchpad to listener (non-critical):`, listenerError);
      // Don't fail the sync if listener add fails
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    const contract = new ethers.Contract(normalizedContractAddress, OddsLaunchpadABI, provider);

    // Get total minted from contract (use totalSupply for ERC721)
    const totalSupply = await contract.totalSupply();
    const totalMintedNumber = Number(totalSupply);

    console.log(`📊 Total minted on contract: ${totalMintedNumber}`);

    // Get current minted count from database
    const currentMints = await prisma.mint.count({
      where: { launchpadId }
    });

    console.log(`📊 Current mints in database: ${currentMints}`);

    if (totalMintedNumber === currentMints) {
      console.log(`✅ Already in sync, no action needed`);
      return NextResponse.json({
        success: true,
        message: 'Already in sync',
        data: {
          totalMinted: totalMintedNumber,
          synced: 0
        }
      });
    }

    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    
    // Calculate fromBlock based on syncFromDate
    // Use chain-specific block time or default to 12 seconds
    const blockTimeSeconds = chain.blockTime || 12;
    const secondsSinceSync = Math.floor((Date.now() - syncFromDate.getTime()) / 1000);
    const estimatedBlocksSinceSync = Math.floor(secondsSinceSync / blockTimeSeconds);
    
    // Add buffer of 100 blocks to ensure we don't miss any mints
    const fromBlock = Math.max(0, currentBlock - estimatedBlocksSinceSync - 100);

    console.log(`📊 Syncing from block ${fromBlock} to ${currentBlock} (estimated ${estimatedBlocksSinceSync} blocks + 100 buffer)`);

    // Get mint events from blockchain starting from calculated block
    const filter = contract.filters.Transfer(ethers.ZeroAddress, null, null);
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);

    console.log(`📋 Found ${events.length} mint events on blockchain since ${syncFromDate.toISOString()}`);

    let syncedCount = 0;
    let skippedCount = 0;

    // Process each mint event
    for (const event of events) {
      const txHash = event.transactionHash;
      
      // Check if already exists
      const existing = await prisma.mint.findUnique({
        where: { txHash }
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Get transaction details
      const tx = await provider.getTransaction(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!tx || !receipt) {
        console.warn(`⚠️ Could not get transaction details for ${txHash}`);
        continue;
      }

      // Parse event args - check if it's an EventLog
      const eventLog = event as any;
      const to = eventLog.args?.[1] as string;
      const tokenId = eventLog.args?.[2] ? Number(eventLog.args[2]) : null;

      // Calculate price from transaction value
      const price = tx.value.toString();

      // Get block timestamp for accurate createdAt
      const block = await provider.getBlock(receipt.blockNumber);
      const mintTimestamp = block ? new Date(Number(block.timestamp) * 1000) : new Date();

      // Only sync if mint is after syncFromDate
      if (mintTimestamp >= syncFromDate) {
        // Get launchpad with phases to determine active phase
        const launchpadWithPhases = await prisma.launchpad.findUnique({
          where: { id: launchpadId },
          include: {
            phases: {
              orderBy: { phaseIndex: 'asc' } as any  // Order by phaseIndex to match smart contract
            }
          }
        });

        // Determine active phase at mint time
        let activePhaseId: string | null = null;
        if (launchpadWithPhases?.phases && launchpadWithPhases.phases.length > 0) {
          const activePhase = launchpadWithPhases.phases.find(phase => {
            const startTime = new Date(phase.startTime);
            const endTime = phase.endTime ? new Date(phase.endTime) : new Date('2099-12-31');
            return mintTimestamp >= startTime && mintTimestamp <= endTime;
          });
          
          if (activePhase) {
            activePhaseId = activePhase.id;
          }
        }

        // Create mint record
        await prisma.mint.create({
          data: {
            launchpadId,
            phaseId: activePhaseId,
            minter: to,
            tokenId,
            quantity: 1,
            price,
            txHash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            createdAt: mintTimestamp
          }
        });

        // Also create activity record for real-time feed
        try {
          const launchpad = await prisma.launchpad.findUnique({
            where: { id: launchpadId },
            include: { metadata: true, factory: true }
          });

          if (launchpad) {
            const minterShort = `${to.slice(0, 6)}...${to.slice(-4)}`;
            
            // Check if activity already exists
            const existingActivity = await prisma.activity.findFirst({
              where: {
                txHash,
                type: 'MINT_OCCURRED'
              }
            });

            if (!existingActivity) {
              // Resolve collection image path
              const collectionImage = launchpad.metadata?.image 
                ? resolveImagePath(launchpad.metadata.image, launchpad.metadata.baseUri)
                : null;

              await prisma.activity.create({
                data: {
                  chainId,
                  factoryId: launchpad.factoryId,
                  launchpadId,
                  type: 'MINT_OCCURRED',
                  actor: to,
                  description: `Minted by ${minterShort}`,
                  txHash,
                  blockNumber: receipt.blockNumber,
                  metadata: {
                    contractAddress: launchpad.contractAddress, // Add contract address to metadata
                    tokenId: tokenId?.toString() || '0',
                    quantity: 1,
                    price,
                    collectionName: launchpad.name,
                    collectionSymbol: launchpad.symbol,
                    collectionImage,
                    minterShort
                  },
                  createdAt: mintTimestamp
                }
              });
            }
          }
        } catch (activityError) {
          console.warn(`⚠️ Failed to create activity record (non-critical):`, activityError);
          // Don't fail the sync if activity creation fails
        }

        syncedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ Synced ${syncedCount} new mints, skipped ${skippedCount} existing`);

    // Update launchpad stats
    const mints = await prisma.mint.findMany({
      where: { launchpadId },
      select: {
        price: true,
        minter: true
      }
    });

    // Convert price from string (Wei) to BigInt safely
    const totalVolumeSum = mints.reduce((sum, mint) => {
      try {
        const priceWei = mint.price.includes('.') 
          ? ethers.parseEther(mint.price).toString() 
          : mint.price;
        return sum + BigInt(priceWei);
      } catch (error) {
        console.warn(`⚠️ Invalid price format: ${mint.price}, skipping`);
        return sum;
      }
    }, BigInt(0));
    
    const uniqueMintersSet = new Set(mints.map(m => m.minter));
    const avgPrice = mints.length > 0 ? totalVolumeSum / BigInt(mints.length) : BigInt(0);

    await prisma.launchpad.update({
      where: { id: launchpadId },
      data: {
        mintedCount: mints.length,
        volume: totalVolumeSum.toString(),
        lastMintAt: new Date()
      }
    });

    // Update analytics
    await prisma.launchpadAnalytics.update({
      where: { launchpadId },
      data: {
        totalVolume: totalVolumeSum.toString(),
        totalMints: mints.length,
        uniqueHolders: uniqueMintersSet.size,
        avgMintPrice: avgPrice.toString(),
        calculatedAt: new Date()
      }
    });

    console.log(`✅ Updated launchpad and analytics`);

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} new mints`,
      data: {
        totalMinted: totalMintedNumber,
        synced: syncedCount,
        skipped: skippedCount,
        totalVolume: totalVolumeSum.toString(),
        uniqueHolders: uniqueMintersSet.size
      }
    });

  } catch (error) {
    console.error('❌ Error syncing mints:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync mints',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
