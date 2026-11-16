/**
 * Test IPFS Gateway Optimization
 * 
 * Manual test untuk verify gateway racing dan caching
 */

import { 
  getFastestGateway, 
  initializeGatewayCache,
  retestGateways,
  ipfsToHttp,
  ipfsToHttpOptimized,
  getIpfsGateways
} from '@/lib/ipfs-utils';

async function testGatewayRacing() {
  console.log('='.repeat(60));
  console.log('TEST 1: Gateway Racing');
  console.log('='.repeat(60));
  
  // Clear cache untuk test fresh
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ipfs_fastest_gateway');
    localStorage.removeItem('ipfs_gateway_timestamp');
  }
  
  console.log('Starting gateway race...');
  const startTime = performance.now();
  
  const fastestGateway = await getFastestGateway();
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`\n✅ Test completed in ${duration.toFixed(0)}ms`);
  console.log(`🏆 Fastest gateway: ${fastestGateway}`);
  
  // Verify cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('ipfs_fastest_gateway');
    const timestamp = localStorage.getItem('ipfs_gateway_timestamp');
    console.log(`📦 Cached: ${cached}`);
    console.log(`⏰ Timestamp: ${timestamp}`);
  }
  
  return fastestGateway;
}

async function testCachedPerformance(fastestGateway: string) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Cached Performance');
  console.log('='.repeat(60));
  
  console.log('Testing with cache...');
  const startTime = performance.now();
  
  const gateway = await getFastestGateway();
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`\n✅ Retrieved from cache in ${duration.toFixed(2)}ms`);
  console.log(`🏆 Gateway: ${gateway}`);
  console.log(`✓ Should be instant (< 1ms)`);
  
  if (gateway !== fastestGateway) {
    console.error('❌ Gateway mismatch!');
  } else {
    console.log('✓ Gateway matches previous result');
  }
}

async function testIpfsConversion() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: IPFS to HTTP Conversion');
  console.log('='.repeat(60));
  
  const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
  const testUri = `ipfs://${testHash}`;
  
  // Test sync conversion
  console.log('\n📝 Testing sync conversion (ipfsToHttp)...');
  const syncUrl = ipfsToHttp(testUri);
  console.log(`Input:  ${testUri}`);
  console.log(`Output: ${syncUrl}`);
  
  // Test async optimized conversion
  console.log('\n📝 Testing async conversion (ipfsToHttpOptimized)...');
  const asyncUrl = await ipfsToHttpOptimized(testUri);
  console.log(`Input:  ${testUri}`);
  console.log(`Output: ${asyncUrl}`);
  
  // Verify both use same gateway
  if (syncUrl === asyncUrl) {
    console.log('✓ Both methods use same gateway');
  } else {
    console.error('❌ Gateway mismatch between methods!');
  }
}

async function testRetest() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Force Retest');
  console.log('='.repeat(60));
  
  console.log('Forcing gateway retest...');
  const startTime = performance.now();
  
  const newGateway = await retestGateways();
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`\n✅ Retest completed in ${duration.toFixed(0)}ms`);
  console.log(`🏆 New fastest gateway: ${newGateway}`);
}

async function testMultipleConversions() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Multiple Conversions Performance');
  console.log('='.repeat(60));
  
  const testHashes = [
    'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
    'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
    'QmZULkCELmmk5XNfCgTnCyFgAVxBRBXyDHGGMVoLFLiXEN',
    'QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX',
  ];
  
  console.log(`Converting ${testHashes.length} IPFS URIs...`);
  const startTime = performance.now();
  
  const urls = testHashes.map(hash => ipfsToHttp(`ipfs://${hash}`));
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`\n✅ Converted ${urls.length} URIs in ${duration.toFixed(2)}ms`);
  console.log(`⚡ Average: ${(duration / urls.length).toFixed(2)}ms per conversion`);
  
  // Show results
  urls.forEach((url, i) => {
    console.log(`${i + 1}. ${url}`);
  });
}

async function testGatewayList() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: Gateway List');
  console.log('='.repeat(60));
  
  const gateways = getIpfsGateways();
  console.log(`Total gateways: ${gateways.length}`);
  console.log('\nGateway list:');
  gateways.forEach((gateway, i) => {
    console.log(`${i + 1}. ${gateway}`);
  });
}

// Main test runner
export async function runIpfsGatewayTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(10) + 'IPFS GATEWAY OPTIMIZATION TESTS' + ' '.repeat(16) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log('\n');
  
  try {
    // Test 1: Gateway Racing
    const fastestGateway = await testGatewayRacing();
    
    // Test 2: Cached Performance
    await testCachedPerformance(fastestGateway);
    
    // Test 3: IPFS Conversion
    await testIpfsConversion();
    
    // Test 4: Multiple Conversions
    await testMultipleConversions();
    
    // Test 5: Gateway List
    await testGatewayList();
    
    // Test 6: Force Retest (optional, uncomment to test)
    // await testRetest();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  }
}

// Export for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testIpfsGateway = runIpfsGatewayTests;
  console.log('💡 Run tests in console: testIpfsGateway()');
}
