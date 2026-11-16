/**
 * Quick Test Token URI
 * 
 * Script sederhana untuk cek tokenURI collection dengan cepat
 */

const { ethers } = require('ethers');
require('dotenv').config();

const OddsLaunchpadABI = require('../abi/OddsLaunchpad.json');

// Configuration
const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';

async function quickTest(contractAddress) {
  console.log('🔍 Quick Token URI Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Contract:', contractAddress);
  console.log('');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, provider);

  try {
    // Get config
    const config = await contract.getCollectionConfig();
    const currentSupply = await contract.currentSupply();

    console.log('📋 Collection Info:');
    console.log('  Name:', config.name);
    console.log('  Symbol:', config.symbol);
    console.log('  Type:', config.isOpenEdition ? '🎨 Open Edition' : '📦 Standard Edition');
    console.log('  Supply:', currentSupply.toString(), '/', config.totalMaxSupply.toString());
    console.log('  Base URI:', config.baseURI);
    console.log('');

    if (currentSupply > 0) {
      console.log('🔗 Token URIs:');
      
      const count = Math.min(Number(currentSupply), 5);
      const uris = [];
      
      for (let i = 0; i < count; i++) {
        const uri = await contract.tokenURI(i);
        uris.push(uri);
        console.log(`  Token ${i}: ${uri}`);
      }
      console.log('');

      // Quick analysis
      if (uris.length > 1) {
        const allSame = uris.every(uri => uri === uris[0]);
        
        console.log('📊 Analysis:');
        if (config.isOpenEdition) {
          if (allSame) {
            console.log('  ✅ CORRECT: All URIs identical (Open Edition)');
          } else {
            console.log('  ❌ WRONG: URIs should be identical (Open Edition)');
            console.log('  💡 Collection deployed with old contract version');
          }
        } else {
          if (!allSame) {
            console.log('  ✅ CORRECT: All URIs unique (Standard Edition)');
          } else {
            console.log('  ❌ WRONG: URIs should be unique (Standard Edition)');
          }
        }
      }
    } else {
      console.log('⚠️  No tokens minted yet');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/quick-test-tokenuri.js <CONTRACT_ADDRESS>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/quick-test-tokenuri.js 0x1234...5678');
  process.exit(1);
}

const address = args[0];
if (!ethers.isAddress(address)) {
  console.error('❌ Invalid address');
  process.exit(1);
}

quickTest(address)
  .then(() => {
    console.log('');
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
