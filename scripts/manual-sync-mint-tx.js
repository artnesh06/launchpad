/**
 * Script untuk manual sync mint transaction
 * Berguna ketika async queue sudah hilang atau server restart
 */

const { PrismaClient } = require('@prisma/client');
const { ethers } = require('ethers');

const prisma = new PrismaClient();

// Configuration
const TX_HASH = '0xa2b52470f38f89030d665dad52941ab95d1f1ddac598b82ad7d78b71fa9c9478';
const CONTRACT_ADDRESS = '0xB90D120Da012795D33B81CB67ec88183279C8f04'; // Everything's on record
const CHAIN_ID = 6343; // MegaETH Testnet V2
const RPC_URL = 'https://timothy.megaeth.com/rpc';

async function manualSyncMintTx() {
  try {
    console.log('🔄 Manual Sync Mint Transaction\n');
    console.log('TX Hash:', TX_HASH);
    console.log('Contract:', CONTRACT_ADDRESS);
    console.log('Chain ID:', CHAIN_ID);
    console.log('='.repeat(80));

    // 1. Check if launchpad exists
    console.log('\n📊 Step 1: Checking launchpad in database...');
    const launchpad = await prisma.launchpad.findFirst({
      where: {
        contractAddress: {
          equals: CONTRACT_ADDRESS,
          mode: 'insensitive'
        }
      },
      include: {
        phases: true
      }
    });

    if (!launchpad) {
      console.log('❌ Launchpad not found in database!');
      return;
    }

    console.log('✅ Launchpad found:', launchpad.name);
    console.log('   ID:', launchpad.id);
    console.log('   Current minted count:', launchpad.mintedCount);

    // 2. Check if mint already synced
    console.log('\n📋 Step 2: Checking if mint already synced...');
    const existingMints = await prisma.mint.findMany({
      where: {
        OR: [
          { txHash: TX_HASH },
          { txHash: { startsWith: TX_HASH } } // For batch mints with suffix
        ]
      }
    });

    if (existingMints.length > 0) {
      console.log(`✅ Mint already synced (${existingMints.length} NFTs)`);
      existingMints.forEach((mint, i) => {
        console.log(`   ${i + 1}. Token ID: ${mint.tokenId}, Minter: ${mint.minter}`);
      });
      console.log('\n⚠️  No need to sync again.');
      return;
    }

    console.log('❌ Mint not found in database, proceeding with sync...');

    // 3. Get transaction from blockchain
    console.log('\n🔗 Step 3: Fetching transaction from blockchain...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    let tx = null;
    let receipt = null;

    try {
      tx = await provider.getTransaction(TX_HASH);
      receipt = await provider.getTransactionReceipt(TX_HASH);
    } catch (error) {
      console.log('❌ Failed to fetch transaction:', error.message);
      console.log('\nPossible reasons:');
      console.log('1. Transaction hash is incorrect');
      console.log('2. Transaction is on different chain');
      console.log('3. RPC node is not synced');
      return;
    }

    if (!tx || !receipt) {
      console.log('❌ Transaction not found or not confirmed');
      return;
    }

    console.log('✅ Transaction found!');
    console.log('   From:', tx.from);
    console.log('   To:', tx.to);
    console.log('   Value:', ethers.formatEther(tx.value), 'ETH');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Status:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status !== 1) {
      console.log('❌ Transaction failed on blockchain!');
      return;
    }

    // 4. Check if transaction is for this contract
    if (tx.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
      console.log(`⚠️  WARNING: Transaction is to ${tx.to}, not ${CONTRACT_ADDRESS}`);
      console.log('   This might be a different contract or factory transaction.');
    }

    // 5. Parse Transfer events
    console.log('\n📦 Step 4: Parsing Transfer events...');
    const OddsLaunchpadABI = require('./abi/OddsLaunchpad.json');
    const iface = new ethers.Interface(OddsLaunchpadABI);
    
    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    const transferLogs = receipt.logs.filter(log => 
      log.topics[0] === transferTopic && 
      log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
    );

    if (transferLogs.length === 0) {
      console.log('❌ No Transfer events found for this contract');
      console.log('   This transaction might not be a mint transaction.');
      return;
    }

    console.log(`✅ Found ${transferLogs.length} Transfer events`);

    // Parse all Transfer events
    const mintedNFTs = [];
    for (const transferLog of transferLogs) {
      try {
        const parsedLog = iface.parseLog({
          topics: [...transferLog.topics],
          data: transferLog.data
        });

        if (parsedLog && parsedLog.args[0] === ethers.ZeroAddress) {
          const to = parsedLog.args[1];
          const tokenId = Number(parsedLog.args[2]);
          mintedNFTs.push({ to, tokenId });
          console.log(`   - Token ID ${tokenId} minted to ${to}`);
        }
      } catch (e) {
        console.log('   ⚠️  Failed to parse log:', e.message);
      }
    }

    if (mintedNFTs.length === 0) {
      console.log('❌ No mint events found (all transfers are between users)');
      return;
    }

    console.log(`\n🎫 Total minted NFTs: ${mintedNFTs.length}`);

    // 6. Get mint price
    console.log('\n💰 Step 5: Calculating mint price...');
    const actualMintCost = BigInt(tx.value.toString());
    const pricePerNFT = mintedNFTs.length > 0 ? actualMintCost / BigInt(mintedNFTs.length) : actualMintCost;
    
    console.log('   Total paid:', ethers.formatEther(actualMintCost), 'ETH');
    console.log('   Price per NFT:', ethers.formatEther(pricePerNFT), 'ETH');

    // 7. Get block timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    const mintTimestamp = block ? new Date(Number(block.timestamp) * 1000) : new Date();
    console.log('   Mint time:', mintTimestamp.toISOString());

    // 8. Create mint records
    console.log('\n💾 Step 6: Creating mint records in database...');
    
    const createdMints = [];
    for (let i = 0; i < mintedNFTs.length; i++) {
      const nft = mintedNFTs[i];
      const uniqueTxHash = mintedNFTs.length > 1 ? `${TX_HASH}-${i}` : TX_HASH;

      try {
        const mintRecord = await prisma.mint.create({
          data: {
            launchpadId: launchpad.id,
            phaseId: null, // Will be determined by active phase
            minter: nft.to,
            tokenId: nft.tokenId,
            quantity: 1,
            price: pricePerNFT.toString(),
            txHash: uniqueTxHash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            createdAt: mintTimestamp
          }
        });
        createdMints.push(mintRecord);
        console.log(`   ✅ Created mint record for token ${nft.tokenId}`);
      } catch (e) {
        console.log(`   ❌ Failed to create mint record for token ${nft.tokenId}:`, e.message);
      }
    }

    // 9. Update launchpad stats
    console.log('\n📊 Step 7: Updating launchpad stats...');
    
    const allMints = await prisma.mint.findMany({
      where: { launchpadId: launchpad.id },
      select: { price: true, minter: true }
    });

    const totalVolume = allMints.reduce((sum, mint) => sum + BigInt(mint.price), BigInt(0));
    const uniqueMinters = new Set(allMints.map(m => m.minter));

    await prisma.launchpad.update({
      where: { id: launchpad.id },
      data: {
        mintedCount: allMints.length,
        volume: totalVolume.toString(),
        lastMintAt: new Date()
      }
    });

    console.log('   ✅ Updated launchpad stats');
    console.log('   Total minted:', allMints.length);
    console.log('   Total volume:', ethers.formatEther(totalVolume), 'ETH');
    console.log('   Unique minters:', uniqueMinters.size);

    // 10. Create activity record
    console.log('\n📝 Step 8: Creating activity record...');
    try {
      const minter = mintedNFTs[0].to;
      const minterShort = `${minter.slice(0, 6)}...${minter.slice(-4)}`;

      // Get launchpad metadata for collection image
      const launchpadWithMetadata = await prisma.launchpad.findUnique({
        where: { id: launchpad.id },
        include: { metadata: true }
      });

      // Resolve collection image path
      let collectionImage = null;
      if (launchpadWithMetadata?.metadata?.image) {
        const image = launchpadWithMetadata.metadata.image;
        const baseUri = launchpadWithMetadata.metadata.baseUri;
        
        // Simple resolve logic (inline since we can't import from TypeScript)
        if (image.startsWith('./') || image.startsWith('../')) {
          // Relative path - combine with baseUri
          if (baseUri) {
            const base = baseUri.endsWith('/') ? baseUri.slice(0, -1) : baseUri;
            const path = image.startsWith('./') ? image.slice(2) : image;
            collectionImage = `${base}/${path}`;
          } else {
            collectionImage = image;
          }
        } else {
          collectionImage = image;
        }
      }

      await prisma.activity.create({
        data: {
          chainId: CHAIN_ID,
          factoryId: launchpad.factoryId,
          launchpadId: launchpad.id,
          type: 'MINT_OCCURRED',
          actor: minter,
          description: mintedNFTs.length > 1 
            ? `Minted ${mintedNFTs.length}x by ${minterShort}`
            : `Minted by ${minterShort}`,
          txHash: TX_HASH,
          blockNumber: receipt.blockNumber,
          metadata: {
            contractAddress: CONTRACT_ADDRESS,
            tokenIds: mintedNFTs.map(n => n.tokenId.toString()),
            quantity: mintedNFTs.length,
            pricePerNFT: pricePerNFT.toString(),
            totalPaid: actualMintCost.toString(),
            collectionName: launchpad.name,
            collectionSymbol: launchpad.symbol,
            collectionImage,
            minterShort
          },
          createdAt: mintTimestamp
        }
      });
      console.log('   ✅ Activity record created');
    } catch (e) {
      console.log('   ⚠️  Failed to create activity (non-critical):', e.message);
    }

    console.log('\n\n✅ SYNC COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`Synced ${mintedNFTs.length} NFTs from transaction ${TX_HASH}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualSyncMintTx();
