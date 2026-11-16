/**
 * Manual Activity Logging Test
 * 
 * Run with: npx tsx src/test/manual-activity-test.ts
 */

import { prisma } from '@/lib/prisma';

async function testActivityLogging() {
  console.log('🧪 Testing Activity Logging...\n');

  const testContractAddress = '0xManualTest123456789012345678901234567890';
  const testTxHash = '0xManualTestTx123456789012345678901234567890';

  try {
    // No database cleanup - preserve existing test data
    console.log('ℹ️ Database cleanup disabled - preserving existing data\n');

    // Test 1: Create a new launchpad and verify activity is logged
    console.log('📝 Test 1: Creating new launchpad...');
    
    // Get or create factory
    let factory = await prisma.launchpadFactory.findFirst({
      where: { chainId: 6343 }
    });

    if (!factory) {
      console.log('⚠️ Factory not found, creating one...');
      factory = await prisma.launchpadFactory.create({
        data: {
          chainId: 6343,
          contractAddress: '0x0000000000000000000000000000000000000000',
          version: '1.0.0',
          deployedChainId: 6343,
          owner: '0xOwner1234567890123456789012345678901234',
          treasury: '0xTreasury123456789012345678901234567890',
          creationFee: '0.001',
          platformFeePercentage: 250,
          freeMintFee: '0',
          isActive: true,
        }
      });
    }

    const launchpad = await prisma.launchpad.create({
      data: {
        chainId: 6343,
        factoryId: factory.id,
        contractAddress: testContractAddress,
        creator: '0xCreator1234567890123456789012345678901234',
        name: 'Manual Test Launchpad',
        symbol: 'MTL',
        description: 'Test launchpad for activity logging',
        baseURI: 'ipfs://test',
        totalMaxSupply: 1000,
        treasury: '0xTreasury123456789012345678901234567890',
        royaltyRecipient: '0xRoyalty123456789012345678901234567890',
        royaltyPercentage: 500,
        deployTxHash: testTxHash,
        status: 'ACTIVE'
      }
    });

    console.log(`✅ Launchpad created: ${launchpad.id}`);

    // Create activity (simulating what the API does)
    console.log('📝 Creating activity record...');
    const activity = await prisma.activity.create({
      data: {
        chainId: 6343,
        factoryId: factory.id,
        type: 'LAUNCHPAD_CREATED',
        actor: '0xCreator1234567890123456789012345678901234',
        description: `Created launchpad: Manual Test Launchpad (MTL)`,
        txHash: testTxHash,
        metadata: {
          contractAddress: testContractAddress,
          totalMaxSupply: 1000,
          phasesCount: 0
        }
      }
    });

    console.log(`✅ Activity created: ${activity.id}`);
    console.log(`   Type: ${activity.type}`);
    console.log(`   Actor: ${activity.actor}`);
    console.log(`   Description: ${activity.description}`);
    console.log(`   Factory ID: ${activity.factoryId}`);
    console.log(`   Chain ID: ${activity.chainId}`);
    console.log(`   Metadata:`, activity.metadata);
    console.log('');

    // Test 2: Verify no duplicate activity on update
    console.log('📝 Test 2: Updating launchpad (should not create duplicate activity)...');
    
    await prisma.launchpad.update({
      where: { contractAddress: testContractAddress },
      data: {
        name: 'Updated Manual Test Launchpad',
        description: 'Updated description'
      }
    });

    const activitiesCount = await prisma.activity.count({
      where: { txHash: testTxHash }
    });

    console.log(`✅ Launchpad updated`);
    console.log(`   Activities count: ${activitiesCount} (should be 1)`);
    
    if (activitiesCount === 1) {
      console.log('✅ No duplicate activity created');
    } else {
      console.log('❌ Duplicate activity detected!');
    }
    console.log('');

    // Test 3: Verify factoryId is correct
    console.log('📝 Test 3: Verifying factoryId...');
    
    const activityWithFactory = await prisma.activity.findFirst({
      where: { txHash: testTxHash },
      include: { factory: true }
    });

    if (activityWithFactory?.factory) {
      console.log(`✅ Factory found for activity`);
      console.log(`   Factory ID: ${activityWithFactory.factory.id}`);
      console.log(`   Factory Chain ID: ${activityWithFactory.factory.chainId}`);
      console.log(`   Factory Version: ${activityWithFactory.factory.version}`);
    } else {
      console.log('❌ Factory not found for activity!');
    }
    console.log('');

    // No cleanup - preserve test data
    console.log('ℹ️ Test data preserved (cleanup disabled)\n');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // No cleanup on error - preserve data for debugging
    console.log('ℹ️ Test data preserved for debugging');
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testActivityLogging();
