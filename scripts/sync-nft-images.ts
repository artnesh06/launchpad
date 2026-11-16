/**
 * Script to sync NFT images for a specific launchpad
 * This will trigger the backend to fetch and store individual NFT metadata
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const CONTRACT_ADDRESS = process.argv[2];
const CHAIN_ID = process.argv[3] || '6343'; // Default to MegaETH

if (!CONTRACT_ADDRESS) {
  console.error('❌ Usage: npm run sync-nft-images <contractAddress> [chainId]');
  console.error('   Example: npm run sync-nft-images 0xdcf8ed42169c9f87b9dd6554681a10a978fb4b56 6343');
  process.exit(1);
}

async function syncNFTImages() {
  console.log(`🔄 Syncing NFT images for launchpad: ${CONTRACT_ADDRESS}`);
  console.log(`   Chain ID: ${CHAIN_ID}`);
  console.log(`   Backend: ${BACKEND_URL}`);
  
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/indexer/sync/${CHAIN_ID}/${CONTRACT_ADDRESS}`,
      { method: 'POST' }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Sync failed:', error);
      process.exit(1);
    }
    
    const result = await response.json();
    console.log('✅ Sync completed:', result);
    console.log(`   Synced: ${result.synced} NFTs`);
    console.log(`   Errors: ${result.errors}`);
    
    // Wait a bit for indexing to complete
    console.log('\n⏳ Waiting 5 seconds for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test the latest-mints endpoint
    console.log('\n🔍 Testing latest-mints endpoint...');
    const testResponse = await fetch(
      `http://localhost:3000/api/admin/launchpads/${CONTRACT_ADDRESS}/latest-mints?limit=5`
    );
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Latest mints response:', JSON.stringify(testData, null, 2));
      
      if (testData.data?.debug) {
        console.log('\n📊 Debug Info:');
        console.log(`   Total NFTs found in DB: ${testData.data.debug.totalNftsFound}`);
        console.log(`   Total mints queried: ${testData.data.debug.totalMintsQueried}`);
        console.log(`   Collection image available: ${testData.data.debug.collectionImageAvailable}`);
        
        const mintsWithNftImage = testData.data.mints.filter((m: any) => m.hasNftImage).length;
        console.log(`   Mints with NFT image: ${mintsWithNftImage}/${testData.data.mints.length}`);
      }
    } else {
      console.error('❌ Failed to test latest-mints endpoint');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncNFTImages();
