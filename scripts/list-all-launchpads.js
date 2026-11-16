/**
 * Script untuk list semua launchpad di database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllLaunchpads() {
  try {
    console.log('📋 Listing all launchpads in database...\n');

    const launchpads = await prisma.launchpad.findMany({
      select: {
        id: true,
        name: true,
        contractAddress: true,
        chainId: true,
        totalMaxSupply: true,
        mintedCount: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (launchpads.length === 0) {
      console.log('❌ No launchpads found in database!');
      return;
    }

    console.log(`✅ Found ${launchpads.length} launchpad(s):\n`);
    console.log('='.repeat(100));

    launchpads.forEach((lp, index) => {
      console.log(`\n${index + 1}. ${lp.name || 'Unnamed'}`);
      console.log(`   Contract: ${lp.contractAddress}`);
      console.log(`   Chain ID: ${lp.chainId}`);
      console.log(`   Supply: ${lp.mintedCount}/${lp.totalMaxSupply}`);
      console.log(`   Status: ${lp.status}`);
      console.log(`   Created: ${lp.createdAt.toISOString()}`);
      
      // Check if minted out
      if (lp.mintedCount >= lp.totalMaxSupply) {
        console.log(`   ⚠️  MINTED OUT! (${lp.mintedCount} >= ${lp.totalMaxSupply})`);
      }
    });

    console.log('\n' + '='.repeat(100));

    // Check for the specific address
    const targetAddress = '0xB90D120Da012795D33B81CB67ec88183279C8f040';
    const found = launchpads.find(lp => 
      lp.contractAddress.toLowerCase() === targetAddress.toLowerCase()
    );

    if (found) {
      console.log(`\n✅ Target address found: ${found.name}`);
    } else {
      console.log(`\n❌ Target address NOT found: ${targetAddress}`);
      console.log('\nPossible reasons:');
      console.log('1. Address belum di-deploy atau di-sync');
      console.log('2. Typo di URL');
      console.log('3. Launchpad di chain yang berbeda');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllLaunchpads();
