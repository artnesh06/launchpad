/**
 * Test Script for Alchemy NFT Service
 * 
 * Run: npx tsx scripts/test-alchemy-service.ts
 */

import { createAlchemyNFTService } from '../src/lib/alchemy-nft-service';

// Test wallet addresses (public addresses for testing)
const TEST_WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // vitalik.eth
const TEST_CONTRACT = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'; // BAYC
const TEST_TOKEN_ID = '1';

async function testAlchemyService() {
  console.log('🧪 Testing Alchemy NFT Service\n');

  // Check if API key is configured
  if (!process.env.ALCHEMY_API_KEY) {
    console.error('❌ ALCHEMY_API_KEY not found in environment variables');
    console.log('Please add ALCHEMY_API_KEY to your .env file');
    process.exit(1);
  }

  // Initialize service
  const alchemy = createAlchemyNFTService({
    apiKey: process.env.ALCHEMY_API_KEY,
    network: process.env.ALCHEMY_NETWORK || 'eth-mainnet',
  });

  console.log('✅ Service initialized');
  console.log(`Network: ${alchemy.getNetwork()}\n`);

  try {
    // Test 1: Get NFTs for owner
    console.log('📝 Test 1: Get NFTs for owner');
    console.log(`Wallet: ${TEST_WALLET}`);
    const nfts = await alchemy.getNFTsForOwner(TEST_WALLET, {
      pageSize: 5,
      excludeFilters: ['SPAM'],
    });
    console.log(`✅ Found ${nfts.totalCount} NFTs (showing first 5)`);
    if (nfts.ownedNfts.length > 0) {
      console.log(`   First NFT: ${nfts.ownedNfts[0].name || 'Unnamed'}`);
    }
    console.log('');

    // Test 2: Get contract metadata
    console.log('📝 Test 2: Get contract metadata');
    console.log(`Contract: ${TEST_CONTRACT}`);
    const contractMetadata = await alchemy.getContractMetadata(TEST_CONTRACT);
    console.log(`✅ Collection: ${contractMetadata.name}`);
    console.log(`   Symbol: ${contractMetadata.symbol}`);
    console.log(`   Total Supply: ${contractMetadata.totalSupply}`);
    if (contractMetadata.openSeaMetadata?.floorPrice) {
      console.log(`   Floor Price: ${contractMetadata.openSeaMetadata.floorPrice} ETH`);
    }
    console.log('');

    // Test 3: Get NFT metadata
    console.log('📝 Test 3: Get NFT metadata');
    console.log(`Contract: ${TEST_CONTRACT}`);
    console.log(`Token ID: ${TEST_TOKEN_ID}`);
    const nftMetadata = await alchemy.getNFTMetadata(TEST_CONTRACT, TEST_TOKEN_ID);
    console.log(`✅ NFT: ${nftMetadata.name || 'Unnamed'}`);
    console.log(`   Description: ${nftMetadata.description?.substring(0, 50)}...`);
    console.log(`   Token Type: ${nftMetadata.tokenType}`);
    console.log('');

    // Test 4: Get owners for NFT
    console.log('📝 Test 4: Get owners for NFT');
    const owners = await alchemy.getOwnersForNFT(TEST_CONTRACT, TEST_TOKEN_ID);
    console.log(`✅ Found ${owners.owners.length} owner(s)`);
    if (owners.owners.length > 0) {
      console.log(`   Owner: ${owners.owners[0]}`);
    }
    console.log('');

    // Test 5: Check if spam
    console.log('📝 Test 5: Check if contract is spam');
    const spamCheck = await alchemy.isSpamContract(TEST_CONTRACT);
    console.log(`✅ Is spam: ${spamCheck.isSpamContract ? '⚠️ Yes' : '✅ No'}`);
    console.log('');

    // Test 6: Get floor price
    console.log('📝 Test 6: Get floor price');
    const floorPrice = await alchemy.getFloorPrice(TEST_CONTRACT);
    if (floorPrice.openSea) {
      console.log(`✅ OpenSea Floor: ${floorPrice.openSea.floorPrice} ${floorPrice.openSea.priceCurrency}`);
      console.log(`   Collection URL: ${floorPrice.openSea.collectionUrl}`);
    }
    if (floorPrice.looksRare) {
      console.log(`✅ LooksRare Floor: ${floorPrice.looksRare.floorPrice} ${floorPrice.looksRare.priceCurrency}`);
    }
    console.log('');

    // Test 7: Get recent sales
    console.log('📝 Test 7: Get recent sales');
    const sales = await alchemy.getNFTSales({
      contractAddress: TEST_CONTRACT,
      limit: 5,
      order: 'desc',
    });
    console.log(`✅ Found ${sales.nftSales.length} recent sales`);
    if (sales.nftSales.length > 0) {
      const latestSale = sales.nftSales[0];
      console.log(`   Latest sale:`);
      console.log(`   - Token ID: ${latestSale.tokenId}`);
      console.log(`   - Marketplace: ${latestSale.marketplace}`);
      console.log(`   - Price: ${latestSale.sellerFee.amount} ${latestSale.sellerFee.symbol}`);
    }
    console.log('');

    // Test 8: Get contracts for owner
    console.log('📝 Test 8: Get contracts for owner');
    const contracts = await alchemy.getContractsForOwner(TEST_WALLET, {
      pageSize: 5,
      excludeFilters: ['SPAM'],
    });
    console.log(`✅ Found ${contracts.totalCount} contracts (showing first 5)`);
    if (contracts.contracts.length > 0) {
      console.log(`   First contract: ${contracts.contracts[0].address}`);
      console.log(`   Balance: ${contracts.contracts[0].totalBalance}`);
    }
    console.log('');

    // Test 9: Check holder status
    console.log('📝 Test 9: Check if wallet holds NFT from collection');
    const isHolder = await alchemy.isHolderOfContract(TEST_WALLET, TEST_CONTRACT);
    console.log(`✅ Is holder: ${isHolder.isHolderOfContract ? '✅ Yes' : '❌ No'}`);
    console.log('');

    // Test 10: Search contracts
    console.log('📝 Test 10: Search contract metadata');
    const searchResults = await alchemy.searchContractMetadata('Bored Ape');
    console.log(`✅ Found ${searchResults.contracts.length} results`);
    if (searchResults.contracts.length > 0) {
      console.log(`   First result: ${searchResults.contracts[0].name}`);
    }
    console.log('');

    console.log('🎉 All tests passed!\n');
    console.log('✅ Alchemy NFT Service is working correctly');
    console.log('📚 Check docs/ALCHEMY_NFT_SERVICE.md for full documentation');
    console.log('💡 Check src/lib/alchemy-nft-service.example.ts for more examples');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

// Run tests
testAlchemyService();
