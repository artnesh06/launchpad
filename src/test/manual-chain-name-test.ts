/**
 * Manual Test for Chain Name Mapping
 * 
 * Run with: npx tsx src/test/manual-chain-name-test.ts
 */

import { getChainName, SUPPORTED_CHAINS, getSupportedChainIds } from '../config/chains';

console.log('🧪 Testing Chain Name Mapping\n');

// Test 1: All supported chains
console.log('✅ Test 1: All supported chains should return correct names');
const supportedChainIds = getSupportedChainIds();
let allPassed = true;

supportedChainIds.forEach(chainId => {
  const chainName = getChainName(chainId);
  const expectedName = SUPPORTED_CHAINS[chainId].name;
  const passed = chainName === expectedName;
  
  if (!passed) {
    console.log(`   ❌ Chain ${chainId}: Expected "${expectedName}", got "${chainName}"`);
    allPassed = false;
  } else {
    console.log(`   ✓ Chain ${chainId}: ${chainName}`);
  }
});

if (allPassed) {
  console.log('   ✅ All supported chains passed\n');
} else {
  console.log('   ❌ Some supported chains failed\n');
}

// Test 2: Specific chains
console.log('✅ Test 2: Specific chain tests');
const specificTests = [
  { chainId: 6343, expected: 'MegaETH Testnet V2' },
  { chainId: 8453, expected: 'Base' },
  { chainId: 1, expected: 'Ethereum' },
  { chainId: 42170, expected: 'Abstract Testnet' },
  { chainId: 7171, expected: 'Hyperliquid Testnet' }
];

specificTests.forEach(({ chainId, expected }) => {
  const result = getChainName(chainId);
  const passed = result === expected;
  console.log(`   ${passed ? '✓' : '❌'} Chain ${chainId}: ${result} ${passed ? '' : `(expected: ${expected})`}`);
});

console.log('');

// Test 3: Unknown chains with graceful fallback
console.log('✅ Test 3: Unknown chains should return fallback with chainId');
const unknownTests = [99999, 12345, 54321];

unknownTests.forEach(chainId => {
  const result = getChainName(chainId);
  const expected = `Unknown Chain (${chainId})`;
  const passed = result === expected;
  console.log(`   ${passed ? '✓' : '❌'} Chain ${chainId}: ${result} ${passed ? '' : `(expected: ${expected})`}`);
});

console.log('\n🎉 Chain name mapping tests complete!');
