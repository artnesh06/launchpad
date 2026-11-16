/**
 * Script to fix mint revenue by recalculating volume excluding platform fees
 * 
 * This script will:
 * 1. Get all launchpads
 * 2. For each launchpad, recalculate volume from mints (excluding free mints)
 * 3. Update launchpad.volume and analytics.totalVolume
 * 
 * Usage:
 *   npx tsx scripts/fix-mint-revenue.ts
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

async function fixMintRevenue() {
  console.log('🔧 Starting mint revenue fix...\n');

  try {
    // Get all launchpads
    const launchpads = await prisma.launchpad.findMany({
      select: {
        id: true,
        name: true,
        contractAddress: true,
        chainId: true,
      }
    });

    console.log(`📊 Found ${launchpads.length} launchpads to process\n`);

    let processedCount = 0;
    let updatedCount = 0;

    for (const launchpad of launchpads) {
      processedCount++;
      console.log(`[${processedCount}/${launchpads.length}] Processing: ${launchpad.name} (${launchpad.contractAddress})`);

      // Get all mints for this launchpad
      const mints = await prisma.mint.findMany({
        where: { launchpadId: launchpad.id },
        select: {
          price: true,
          minter: true
        }
      });

      if (mints.length === 0) {
        console.log(`  ⚠️  No mints found, skipping\n`);
        continue;
      }

      // Calculate total volume (sum of actual mint prices, excluding platform fees)
      // Free mints have price = 0, so they won't contribute to volume
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
      
      // Calculate average price only from paid mints (price > 0)
      const paidMints = mints.filter(m => {
        try {
          const priceWei = m.price.includes('.') 
            ? ethers.parseEther(m.price).toString() 
            : m.price;
          return BigInt(priceWei) > BigInt(0);
        } catch {
          return false;
        }
      });
      
      const avgPrice = paidMints.length > 0 
        ? paidMints.reduce((sum, mint) => {
            try {
              const priceWei = mint.price.includes('.') 
                ? ethers.parseEther(mint.price).toString() 
                : mint.price;
              return sum + BigInt(priceWei);
            } catch {
              return sum;
            }
          }, BigInt(0)) / BigInt(paidMints.length)
        : BigInt(0);

      // Get current volume
      const currentLaunchpad = await prisma.launchpad.findUnique({
        where: { id: launchpad.id },
        select: { volume: true }
      });

      const currentVolume = currentLaunchpad?.volume || '0';
      const newVolume = totalVolumeSum.toString();

      if (currentVolume !== newVolume) {
        // Update launchpad
        await prisma.launchpad.update({
          where: { id: launchpad.id },
          data: {
            volume: newVolume,
            mintedCount: mints.length
          }
        });

        // Update analytics
        await prisma.launchpadAnalytics.upsert({
          where: { launchpadId: launchpad.id },
          create: {
            launchpadId: launchpad.id,
            totalVolume: newVolume,
            totalMints: mints.length,
            uniqueHolders: uniqueMintersSet.size,
            avgMintPrice: avgPrice.toString(),
            calculatedAt: new Date()
          },
          update: {
            totalVolume: newVolume,
            totalMints: mints.length,
            uniqueHolders: uniqueMintersSet.size,
            avgMintPrice: avgPrice.toString(),
            calculatedAt: new Date()
          }
        });

        updatedCount++;
        console.log(`  ✅ Updated volume: ${currentVolume} → ${newVolume}`);
        console.log(`  📊 Stats: ${mints.length} total mints, ${paidMints.length} paid mints, ${mints.length - paidMints.length} free mints`);
        console.log(`  💰 Volume: ${(Number(totalVolumeSum) / 1e18).toFixed(4)} ETH\n`);
      } else {
        console.log(`  ✓  Volume already correct (${(Number(totalVolumeSum) / 1e18).toFixed(4)} ETH)\n`);
      }
    }

    console.log('\n✅ Mint revenue fix completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Total launchpads: ${launchpads.length}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Skipped: ${launchpads.length - updatedCount}`);

  } catch (error) {
    console.error('❌ Error fixing mint revenue:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixMintRevenue()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
