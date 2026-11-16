/**
 * Manual Test Runner for Integration Tests
 * 
 * This script runs the integration tests manually without requiring
 * a full test framework setup.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/launchpads/route';
import { POST } from '@/app/api/admin/launchpads/save/route';
import { prisma } from '@/lib/prisma';

// Test data
const TEST_CONTRACT_ADDRESS = '0xTestIntegration1234567890123456789012345678';
const INVALID_CONTRACT_ADDRESS = '0xInvalidAddress1234567890123456789012345678';

const mockLaunchpadData = {
  chainId: 6343,
  contractAddress: TEST_CONTRACT_ADDRESS,
  creator: '0xCreator1234567890123456789012345678901234',
  name: 'Integration Test Launchpad',
  symbol: 'ITL',
  description: 'Test launchpad for integration testing',
  baseURI: 'ipfs://test-integration',
  totalMaxSupply: 1000,
  treasury: '0xTreasury123456789012345678901234567890',
  royaltyRecipient: '0xRoyalty123456789012345678901234567890',
  royaltyPercentage: 500,
  deployTxHash: '0xTestIntegrationTxHash1234567890123456789',
  phases: [
    {
      name: 'Public Mint',
      phaseType: 'PUBLIC',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
      price: '0.01',
      maxMintPerWallet: 5,
      totalLimit: 1000,
      isActive: true
    }
  ]
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper functions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

async function runTest(name: string, testFn: () => Promise<void>) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    failedTests++;
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function cleanupTestData() {
  // No database cleanup - preserve test data
  console.log('ℹ️ Database cleanup disabled - test data preserved');
}

async function createTestLaunchpad() {
  const factory = await prisma.launchpadFactory.upsert({
    where: {
      contractAddress: '0xFactoryAddress1234567890123456789012345678'
    },
    create: {
      chainId: mockLaunchpadData.chainId,
      contractAddress: '0xFactoryAddress1234567890123456789012345678',
      version: '1.0.0',
      deployedChainId: mockLaunchpadData.chainId,
      owner: '0xOwner1234567890123456789012345678901234567',
      treasury: '0xTreasury123456789012345678901234567890',
      creationFee: '0',
      platformFeePercentage: 0,
      freeMintFee: '0',
      isActive: true
    },
    update: {}
  });

  await prisma.launchpad.create({
    data: {
      chainId: mockLaunchpadData.chainId,
      contractAddress: TEST_CONTRACT_ADDRESS,
      factoryId: factory.id,
      creator: mockLaunchpadData.creator,
      name: mockLaunchpadData.name,
      symbol: mockLaunchpadData.symbol,
      description: mockLaunchpadData.description,
      baseURI: mockLaunchpadData.baseURI,
      totalMaxSupply: mockLaunchpadData.totalMaxSupply,
      treasury: mockLaunchpadData.treasury,
      royaltyRecipient: mockLaunchpadData.royaltyRecipient,
      royaltyPercentage: mockLaunchpadData.royaltyPercentage,
      deployTxHash: mockLaunchpadData.deployTxHash,
      status: 'ACTIVE',
      metadata: {
        create: {
          image: 'ipfs://test-image',
          bannerImage: 'ipfs://test-banner',
          website: 'https://test.com'
        }
      },
      analytics: {
        create: {
          totalVolume: '0',
          totalMints: 0,
          uniqueHolders: 0,
          avgMintPrice: '0'
        }
      },
      phases: {
        create: mockLaunchpadData.phases.map(phase => ({
          name: phase.name,
          phaseType: phase.phaseType as 'PUBLIC' | 'PRESALE' | 'ALLOWLIST' | 'FREE',
          startTime: new Date(phase.startTime),
          endTime: new Date(phase.endTime),
          price: phase.price,
          maxMintPerWallet: phase.maxMintPerWallet,
          totalLimit: phase.totalLimit,
          isActive: phase.isActive
        }))
      }
    }
  });
}

// Test Suite
async function runIntegrationTests() {
  console.log('\n🧪 Running API Integration Tests\n');
  console.log('='.repeat(60));

  // Setup
  await cleanupTestData();

  // Test 1: GET with contractAddress - valid address
  await runTest('GET /api/admin/launchpads with valid contractAddress', async () => {
    await createTestLaunchpad();
    
    const url = `http://localhost:3000/api/admin/launchpads?contractAddress=${TEST_CONTRACT_ADDRESS}`;
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();
    
    assertEqual(response.status, 200, 'Response status should be 200');
    assert(data.success === true, 'Response should be successful');
    assert(Array.isArray(data.data.launchpads), 'Launchpads should be an array');
    assert(data.data.launchpads.length > 0, 'Should return at least one launchpad');
    assertEqual(data.data.launchpads[0].contractAddress, TEST_CONTRACT_ADDRESS, 'Should return correct contract address');
  });

  // Test 2: GET with contractAddress - invalid address
  await runTest('GET /api/admin/launchpads with invalid contractAddress', async () => {
    const url = `http://localhost:3000/api/admin/launchpads?contractAddress=${INVALID_CONTRACT_ADDRESS}`;
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();
    
    assertEqual(response.status, 200, 'Response status should be 200');
    assert(data.success === true, 'Response should be successful');
    assertEqual(data.data.launchpads.length, 0, 'Should return empty array');
  });

  // Test 3: GET prioritizes contractAddress over chainId
  await runTest('GET /api/admin/launchpads prioritizes contractAddress', async () => {
    const url = `http://localhost:3000/api/admin/launchpads?contractAddress=${TEST_CONTRACT_ADDRESS}&chainId=8453`;
    const request = new NextRequest(url);
    const response = await GET(request);
    const data = await response.json();
    
    assertEqual(response.status, 200, 'Response status should be 200');
    if (data.data.launchpads.length > 0) {
      assertEqual(data.data.launchpads[0].contractAddress, TEST_CONTRACT_ADDRESS, 'Should return launchpad by contractAddress');
    }
  });

  // Test 4: POST creates activity for new launchpad
  await runTest('POST /api/admin/launchpads/save creates activity', async () => {
    await cleanupTestData();
    
    const request = new NextRequest('http://localhost:3000/api/admin/launchpads/save', {
      method: 'POST',
      body: JSON.stringify(mockLaunchpadData)
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    assertEqual(response.status, 200, 'Response status should be 200');
    assert(data.success === true, 'Response should be successful');
    
    const activity = await prisma.activity.findFirst({
      where: { txHash: mockLaunchpadData.deployTxHash }
    });
    
    assert(activity !== null, 'Activity should be created');
    assertEqual(activity?.type, 'LAUNCHPAD_CREATED', 'Activity type should be LAUNCHPAD_CREATED');
    assertEqual(activity?.actor, mockLaunchpadData.creator, 'Activity actor should match creator');
  });

  // Test 5: POST does not create duplicate activity on update
  await runTest('POST /api/admin/launchpads/save no duplicate activity', async () => {
    await cleanupTestData();
    
    // Create launchpad
    const createRequest = new NextRequest('http://localhost:3000/api/admin/launchpads/save', {
      method: 'POST',
      body: JSON.stringify(mockLaunchpadData)
    });
    await POST(createRequest);
    
    const activitiesAfterCreate = await prisma.activity.findMany({
      where: { txHash: mockLaunchpadData.deployTxHash }
    });
    
    // Update launchpad
    const updateData = { ...mockLaunchpadData, name: 'Updated Name' };
    const updateRequest = new NextRequest('http://localhost:3000/api/admin/launchpads/save', {
      method: 'POST',
      body: JSON.stringify(updateData)
    });
    await POST(updateRequest);
    
    const activitiesAfterUpdate = await prisma.activity.findMany({
      where: { txHash: mockLaunchpadData.deployTxHash }
    });
    
    assertEqual(activitiesAfterCreate.length, 1, 'Should have 1 activity after create');
    assertEqual(activitiesAfterUpdate.length, 1, 'Should still have 1 activity after update');
  });

  // Test 6: Activity includes correct factoryId
  await runTest('POST /api/admin/launchpads/save includes factoryId', async () => {
    await cleanupTestData();
    
    const request = new NextRequest('http://localhost:3000/api/admin/launchpads/save', {
      method: 'POST',
      body: JSON.stringify(mockLaunchpadData)
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    assertEqual(response.status, 200, 'Response status should be 200');
    
    const activity = await prisma.activity.findFirst({
      where: { txHash: mockLaunchpadData.deployTxHash }
    });
    
    assert(activity !== null, 'Activity should exist');
    assert(activity?.factoryId !== null, 'Activity should have factoryId');
    
    if (activity?.factoryId) {
      const factory = await prisma.launchpadFactory.findUnique({
        where: { id: activity.factoryId }
      });
      assert(factory !== null, 'Factory should exist');
      assertEqual(factory?.chainId, mockLaunchpadData.chainId, 'Factory chainId should match');
    }
  });

  // Cleanup
  await cleanupTestData();
  await prisma.$disconnect();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total: ${totalTests}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (failedTests === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runIntegrationTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
