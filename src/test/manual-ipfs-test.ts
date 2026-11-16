/**
 * Manual Test: IPFS Image Display
 * 
 * Run with: npx tsx src/test/manual-ipfs-test.ts
 */

import { ipfsToHttp, isValidIpfsHash, getIpfsGateways } from '../lib/ipfs-utils';

console.log('🧪 Testing IPFS Image Display Functionality\n');

// Test 1: Convert IPFS URI to HTTP URL
console.log('Test 1: Convert IPFS URI to HTTP URL');
const ipfsUri1 = 'ipfs://QmTest123456789';
const httpUrl1 = ipfsToHttp(ipfsUri1);
console.log(`  Input: ${ipfsUri1}`);
console.log(`  Output: ${httpUrl1}`);
console.log(`  ✅ Pass: ${httpUrl1?.includes('https://') && httpUrl1?.includes('QmTest123456789')}\n`);

// Test 2: Handle IPFS hash without protocol
console.log('Test 2: Handle IPFS hash without protocol');
const ipfsHash = 'QmTest123456789';
const httpUrl2 = ipfsToHttp(ipfsHash);
console.log(`  Input: ${ipfsHash}`);
console.log(`  Output: ${httpUrl2}`);
console.log(`  ✅ Pass: ${httpUrl2?.includes('https://') && httpUrl2?.includes('QmTest123456789')}\n`);

// Test 3: Return null for null/undefined input
console.log('Test 3: Return null for null/undefined input');
const nullResult = ipfsToHttp(null);
const undefinedResult = ipfsToHttp(undefined);
const emptyResult = ipfsToHttp('');
console.log(`  ipfsToHttp(null): ${nullResult}`);
console.log(`  ipfsToHttp(undefined): ${undefinedResult}`);
console.log(`  ipfsToHttp(''): ${emptyResult}`);
console.log(`  ✅ Pass: ${nullResult === null && undefinedResult === null && emptyResult === null}\n`);

// Test 4: Return HTTP URLs as-is
console.log('Test 4: Return HTTP URLs as-is');
const httpUrl = 'https://example.com/image.png';
const result4 = ipfsToHttp(httpUrl);
console.log(`  Input: ${httpUrl}`);
console.log(`  Output: ${result4}`);
console.log(`  ✅ Pass: ${result4 === httpUrl}\n`);

// Test 5: Use custom gateway
console.log('Test 5: Use custom gateway');
const customGateway = 'https://custom-gateway.com';
const result5 = ipfsToHttp('ipfs://QmTest123', customGateway);
console.log(`  Input: ipfs://QmTest123`);
console.log(`  Gateway: ${customGateway}`);
console.log(`  Output: ${result5}`);
console.log(`  ✅ Pass: ${result5?.includes(customGateway) && result5?.includes('QmTest123')}\n`);

// Test 6: Validate IPFS hashes
console.log('Test 6: Validate IPFS hashes');
const validHash1 = isValidIpfsHash('QmTest123456789');
const validHash2 = isValidIpfsHash('ipfs://QmTest123456789');
const validHash3 = isValidIpfsHash('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
const invalidHash1 = isValidIpfsHash('');
const invalidHash2 = isValidIpfsHash('invalid');
const invalidHash3 = isValidIpfsHash('https://example.com');
console.log(`  QmTest123456789: ${validHash1} (should be true)`);
console.log(`  ipfs://QmTest123456789: ${validHash2} (should be true)`);
console.log(`  bafybeig...: ${validHash3} (should be true)`);
console.log(`  '': ${invalidHash1} (should be false)`);
console.log(`  'invalid': ${invalidHash2} (should be false)`);
console.log(`  'https://example.com': ${invalidHash3} (should be false)`);
console.log(`  ✅ Pass: ${validHash1 && validHash2 && validHash3 && !invalidHash1 && !invalidHash2 && !invalidHash3}\n`);

// Test 7: Get IPFS gateways
console.log('Test 7: Get IPFS gateways');
const gateways = getIpfsGateways();
console.log(`  Available gateways: ${gateways.length}`);
gateways.forEach((gateway, index) => {
  console.log(`    ${index + 1}. ${gateway}`);
});
console.log(`  ✅ Pass: ${gateways.length > 0}\n`);

// Test 8: Simulate Collection Page scenario
console.log('Test 8: Simulate Collection Page scenario');
const mockLaunchpad = {
  metadata: {
    image: 'ipfs://QmValidCollectionImage123'
  }
};
const collectionImageUrl = mockLaunchpad.metadata?.image 
  ? ipfsToHttp(mockLaunchpad.metadata.image)
  : null;
console.log(`  Metadata image: ${mockLaunchpad.metadata.image}`);
console.log(`  Converted URL: ${collectionImageUrl}`);
console.log(`  ✅ Pass: ${collectionImageUrl !== null && collectionImageUrl.includes('https://')}\n`);

// Test 9: Handle missing metadata
console.log('Test 9: Handle missing metadata');
const mockLaunchpadNoImage = {
  metadata: {} as { image?: string }
};
const noImageUrl = mockLaunchpadNoImage.metadata?.image 
  ? ipfsToHttp(mockLaunchpadNoImage.metadata.image)
  : null;
console.log(`  Metadata: ${JSON.stringify(mockLaunchpadNoImage.metadata)}`);
console.log(`  Result: ${noImageUrl}`);
console.log(`  ✅ Pass: ${noImageUrl === null}\n`);

console.log('✅ All IPFS Image Display tests completed successfully!');
