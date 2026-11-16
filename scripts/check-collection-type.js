/**
 * Check Collection Type Script
 * 
 * Script ini untuk mengecek tipe collection yang sudah di-deploy:
 * - Apakah Standard Edition atau Open Edition
 * - Verify tokenURI format
 * - Check isOpenEdition flag
 */

const { ethers } = require('ethers');
require('dotenv').config();

const OddsLaunchpadABI = require('../abi/OddsLaunchpad.json');

// Configuration
const CONFIG = {
  chainId: 11155111, // Sepolia
  rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log(title, 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
}

async function checkCollection(contractAddress) {
  logSection('🔍 Checking Collection Type');
  
  console.log('Contract Address:', contractAddress);
  console.log('Chain ID:', CONFIG.chainId);
  console.log('');

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  
  // Get contract
  const contract = new ethers.Contract(
    contractAddress,
    OddsLaunchpadABI,
    provider
  );

  // Check if contract exists
  log('📡 Checking if contract exists...', 'yellow');
  const code = await provider.getCode(contractAddress);
  if (code === '0x') {
    log('❌ No contract found at this address!', 'red');
    process.exit(1);
  }
  log('✅ Contract exists', 'green');
  console.log('');

  // Get collection config
  logSection('📋 Collection Configuration');
  
  try {
    const config = await contract.getCollectionConfig();
    
    console.log('Basic Info:');
    console.log('  Name:', config.name);
    console.log('  Symbol:', config.symbol);
    console.log('  Chain ID:', config.chainId.toString());
    console.log('');
    
    console.log('Supply:');
    const currentSupply = await contract.currentSupply();
    console.log('  Current Supply:', currentSupply.toString());
    console.log('  Max Supply:', config.totalMaxSupply.toString());
    console.log('');
    
    console.log('Metadata:');
    console.log('  Base URI:', config.baseURI);
    console.log('  Contract URI:', config.contractURI);
    console.log('  External Link:', config.externalLink);
    console.log('  Is Revealed:', config.isRevealed);
    console.log('');
    
    console.log('Collection Type:');
    const isOpenEdition = config.isOpenEdition;
    if (isOpenEdition) {
      log('  Type: Open Edition', 'blue');
      log('  isOpenEdition: true', 'blue');
    } else {
      log('  Type: Standard Edition', 'blue');
      log('  isOpenEdition: false', 'blue');
    }
    console.log('');
    
    console.log('Financial:');
    console.log('  Treasury:', config.treasury);
    console.log('  Royalty Recipient:', config.royaltyRecipient);
    console.log('  Royalty Percentage:', config.royaltyPercentage.toString(), 'basis points');
    console.log('');
    
    console.log('Settings:');
    console.log('  Transfers Enabled:', config.transfersEnabled);
    console.log('');

    // Check if any tokens have been minted
    if (currentSupply > 0) {
      logSection('🔗 Token URI Analysis');
      
      const tokensToCheck = Math.min(Number(currentSupply), 5);
      console.log(`Checking first ${tokensToCheck} token(s)...`);
      console.log('');
      
      const uris = [];
      for (let i = 0; i < tokensToCheck; i++) {
        try {
          const uri = await contract.tokenURI(i);
          uris.push(uri);
          console.log(`Token ${i}:`);
          console.log(`  URI: ${uri}`);
          
          // Check if URI contains tokenId
          const hasTokenId = uri.includes(`/${i}.json`) || uri.includes(`${i}.json`);
          if (hasTokenId) {
            log(`  Contains tokenId: YES (/${i}.json)`, 'yellow');
          } else {
            log(`  Contains tokenId: NO`, 'yellow');
          }
          console.log('');
        } catch (error) {
          log(`  Error: ${error.message}`, 'red');
          console.log('');
        }
      }

      // Analyze URI pattern
      logSection('📊 URI Pattern Analysis');
      
      if (uris.length > 1) {
        const allSame = uris.every(uri => uri === uris[0]);
        const allDifferent = new Set(uris).size === uris.length;
        
        console.log('Pattern:');
        if (allSame) {
          log('  All URIs are IDENTICAL', 'blue');
          log('  → This is correct for Open Edition', 'green');
        } else if (allDifferent) {
          log('  All URIs are UNIQUE', 'blue');
          log('  → This is correct for Standard Edition', 'green');
        } else {
          log('  URIs have mixed pattern', 'yellow');
          log('  → This might indicate an issue', 'yellow');
        }
        console.log('');
      }

      // Verify consistency
      logSection('✅ Verification');
      
      const expectedType = isOpenEdition ? 'Open Edition' : 'Standard Edition';
      console.log('Expected Type:', expectedType);
      console.log('');
      
      if (uris.length > 1) {
        const allSame = uris.every(uri => uri === uris[0]);
        
        if (isOpenEdition) {
          if (allSame) {
            log('✅ CORRECT: Open Edition has identical URIs for all tokens', 'green');
          } else {
            log('❌ WRONG: Open Edition should have identical URIs for all tokens', 'red');
            log('   This collection was likely deployed with old contract version', 'red');
          }
        } else {
          if (!allSame) {
            log('✅ CORRECT: Standard Edition has unique URIs for each token', 'green');
          } else {
            log('❌ WRONG: Standard Edition should have unique URIs for each token', 'red');
          }
        }
      } else {
        log('⚠️  Only 1 token minted, cannot verify URI pattern', 'yellow');
      }
    } else {
      log('⚠️  No tokens minted yet, cannot check tokenURI', 'yellow');
    }

    // Get phases info
    logSection('📅 Mint Phases');
    
    const phases = await contract.getAllPhases();
    console.log('Total Phases:', phases.length);
    console.log('');
    
    phases.forEach((phase, i) => {
      console.log(`Phase ${i}: ${phase.name}`);
      console.log('  Price:', ethers.formatEther(phase.price), 'ETH');
      console.log('  Supply:', phase.currentSupply.toString(), '/', phase.maxSupply.toString());
      console.log('  Max Per Wallet:', phase.maxPerWallet.toString());
      console.log('  Active:', phase.isActive);
      console.log('  Requires Whitelist:', phase.requiresWhitelist);
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = Number(phase.startTime);
      const endTime = Number(phase.endTime);
      
      if (now < startTime) {
        log('  Status: Not Started', 'yellow');
      } else if (now > endTime) {
        log('  Status: Ended', 'red');
      } else {
        log('  Status: Active', 'green');
      }
      
      console.log('  Start:', new Date(startTime * 1000).toLocaleString());
      console.log('  End:', new Date(endTime * 1000).toLocaleString());
      console.log('');
    });

  } catch (error) {
    log('❌ Error reading collection:', 'red');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/check-collection-type.js <CONTRACT_ADDRESS>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/check-collection-type.js 0x1234567890abcdef1234567890abcdef12345678');
    process.exit(1);
  }

  const contractAddress = args[0];
  
  if (!ethers.isAddress(contractAddress)) {
    log('❌ Invalid contract address!', 'red');
    process.exit(1);
  }

  await checkCollection(contractAddress);
  
  console.log('');
  log('✅ Check completed!', 'green');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('');
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
