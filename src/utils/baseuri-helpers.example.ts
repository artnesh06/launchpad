/**
 * BaseURI Helper Functions - Usage Examples
 * 
 * This file demonstrates how to use the baseURI helper functions
 * for Standard and Open Edition NFT collections.
 */

import {
  generateTemporaryBaseURI,
  resolveBaseURI,
  validateBaseURI,
  hasPlaceholder,
  isValidContractAddress,
  getAPIBaseURL,
  type CollectionType
} from './baseuri-helpers';

// ============================================================================
// Example 1: Standard Collection Deployment Flow
// ============================================================================

async function deployStandardCollection() {
  console.log('=== Standard Collection Deployment ===\n');

  // Step 1: Generate temporary baseURI for deployment
  const tempBaseURI = generateTemporaryBaseURI('standard');
  console.log('1. Temporary baseURI:', tempBaseURI);
  // Output: 'ipfs://temporary/'

  // Step 2: Deploy contract with temporary baseURI
  console.log('2. Deploying contract with temporary baseURI...');
  // ... deploy contract ...

  // Step 3: Get contract address from deployment
  const contractAddress = '0x1234567890123456789012345678901234567890';
  console.log('3. Contract deployed at:', contractAddress);

  // Step 4: Validate contract address
  if (!isValidContractAddress(contractAddress)) {
    throw new Error('Invalid contract address!');
  }
  console.log('4. Contract address validated ✓');

  // Step 5: Resolve final baseURI with actual contract address
  const apiBaseUrl = getAPIBaseURL();
  const finalBaseURI = resolveBaseURI('standard', contractAddress, apiBaseUrl);
  console.log('5. Final baseURI:', finalBaseURI);
  // Output: 'https://example.com/api/metadata/0x1234567890123456789012345678901234567890/'

  // Step 6: Validate final baseURI
  if (!validateBaseURI(finalBaseURI, contractAddress)) {
    throw new Error('Invalid final baseURI!');
  }
  console.log('6. Final baseURI validated ✓');

  // Step 7: Check for placeholders before saving
  if (hasPlaceholder(finalBaseURI)) {
    throw new Error('BaseURI still contains placeholder!');
  }
  console.log('7. No placeholders detected ✓');

  // Step 8: Update smart contract baseURI
  console.log('8. Updating smart contract baseURI...');
  // await contractService.setBaseURI(chainId, contractAddress, finalBaseURI);

  // Step 9: Save to database
  console.log('9. Saving to database...');
  // await saveToDatabase({ contractAddress, baseURI: finalBaseURI, ... });

  console.log('\n✅ Standard Collection deployed successfully!\n');
}

// ============================================================================
// Example 2: Open Edition Deployment Flow
// ============================================================================

async function deployOpenEdition() {
  console.log('=== Open Edition Deployment ===\n');

  // Step 1: Upload metadata to IPFS
  const metadataIpfsUrl = 'ipfs://QmHash123456789';
  console.log('1. Metadata uploaded to IPFS:', metadataIpfsUrl);

  // Step 2: Generate baseURI (same as IPFS URL for Open Edition)
  const baseURI = generateTemporaryBaseURI('open', metadataIpfsUrl);
  console.log('2. BaseURI:', baseURI);
  // Output: 'ipfs://QmHash123456789'

  // Step 3: Deploy contract with direct IPFS URL
  console.log('3. Deploying contract with IPFS baseURI...');
  // ... deploy contract ...

  // Step 4: Get contract address
  const contractAddress = '0x9876543210987654321098765432109876543210';
  console.log('4. Contract deployed at:', contractAddress);

  // Step 5: Validate baseURI
  if (!validateBaseURI(baseURI)) {
    throw new Error('Invalid baseURI!');
  }
  console.log('5. BaseURI validated ✓');

  // Step 6: Save to database (no baseURI update needed for Open Edition)
  console.log('6. Saving to database...');
  // await saveToDatabase({ contractAddress, baseURI, manifestHash: null, ... });

  console.log('\n✅ Open Edition deployed successfully!\n');
}

// ============================================================================
// Example 3: Validation Before Database Save
// ============================================================================

function validateBeforeSave(
  collectionType: CollectionType,
  contractAddress: string,
  baseURI: string,
  manifestHash?: string
) {
  console.log('=== Validating Before Database Save ===\n');

  // Check 1: Contract address format
  if (!isValidContractAddress(contractAddress)) {
    throw new Error(`Invalid contract address format: ${contractAddress}`);
  }
  console.log('✓ Contract address format valid');

  // Check 2: No placeholders in baseURI
  if (hasPlaceholder(baseURI)) {
    throw new Error('BaseURI contains unresolved placeholder');
  }
  console.log('✓ No placeholders in baseURI');

  // Check 3: BaseURI validation
  if (!validateBaseURI(baseURI, contractAddress)) {
    throw new Error('BaseURI validation failed');
  }
  console.log('✓ BaseURI validated');

  // Check 4: ManifestHash required for Standard Collections
  if (collectionType === 'standard' && !manifestHash) {
    throw new Error('ManifestHash required for Standard Collection');
  }
  console.log('✓ ManifestHash check passed');

  console.log('\n✅ All validations passed!\n');
}

// ============================================================================
// Example 4: Error Handling
// ============================================================================

function demonstrateErrorHandling() {
  console.log('=== Error Handling Examples ===\n');

  // Example 1: Invalid contract address
  try {
    resolveBaseURI('standard', 'invalid-address', 'https://example.com');
  } catch (error) {
    console.log('❌ Caught error:', (error as Error).message);
    // Output: 'Invalid contract address format: invalid-address'
  }

  // Example 2: Placeholder detection
  const badBaseURI = 'https://example.com/api/metadata/CONTRACT_ADDRESS/';
  if (hasPlaceholder(badBaseURI)) {
    console.log('❌ Detected placeholder in baseURI:', badBaseURI);
  }

  // Example 3: Missing required parameter
  try {
    generateTemporaryBaseURI('open'); // Missing IPFS URL
  } catch (error) {
    console.log('❌ Caught error:', (error as Error).message);
    // Output: 'IPFS URL is required for Open Edition collections'
  }

  console.log('\n✅ Error handling demonstrated!\n');
}

// ============================================================================
// Example 5: Integration with Creator Studio
// ============================================================================

async function creatorStudioIntegration() {
  console.log('=== Creator Studio Integration ===\n');

  const collectionType: CollectionType = 'standard';
  const manifestHash = 'QmManifestHash123';

  // Step 1: Generate temporary baseURI for deployment
  const deploymentBaseURI = generateTemporaryBaseURI(collectionType);
  console.log('Deployment baseURI:', deploymentBaseURI);

  // Step 2: Deploy contract
  console.log('Deploying contract...');
  // const txHash = await contractService.createLaunchpad({ baseURI: deploymentBaseURI, ... });

  // Step 3: Get contract address from transaction
  const contractAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
  console.log('Contract address:', contractAddress);

  // Step 4: Resolve final baseURI
  const apiBaseUrl = getAPIBaseURL();
  const finalBaseURI = resolveBaseURI(collectionType, contractAddress, apiBaseUrl);
  console.log('Final baseURI:', finalBaseURI);

  // Step 5: Validate before updating contract
  if (!validateBaseURI(finalBaseURI, contractAddress)) {
    throw new Error('BaseURI validation failed before contract update');
  }

  // Step 6: Update smart contract baseURI
  console.log('Updating smart contract baseURI...');
  // await contractService.setBaseURI(chainId, contractAddress, finalBaseURI);

  // Step 7: Validate before database save
  validateBeforeSave(collectionType, contractAddress, finalBaseURI, manifestHash);

  // Step 8: Save to database
  console.log('Saving to database...');
  // await saveToDatabase({ contractAddress, baseURI: finalBaseURI, manifestHash, ... });

  console.log('\n✅ Integration complete!\n');
}

// ============================================================================
// Run Examples (uncomment to test)
// ============================================================================

// Uncomment to run examples:
// deployStandardCollection();
// deployOpenEdition();
// validateBeforeSave('standard', '0x1234567890123456789012345678901234567890', 'https://example.com/api/metadata/0x1234567890123456789012345678901234567890/', 'QmHash');
// demonstrateErrorHandling();
// creatorStudioIntegration();

export {
  deployStandardCollection,
  deployOpenEdition,
  validateBeforeSave,
  demonstrateErrorHandling,
  creatorStudioIntegration
};
