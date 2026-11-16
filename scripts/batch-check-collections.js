/**
 * Batch Check Collections
 * 
 * Script untuk check multiple collections sekaligus
 * Berguna untuk audit atau verify multiple deployments
 */

const { ethers } = require('ethers');
require('dotenv').config();

const OddsLaunchpadABI = require('../abi/OddsLaunchpad.json');

// Configuration
const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkCollection(provider, address, index, total) {
  console.log('');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
  log(`Collection ${index + 1}/${total}: ${address}`, 'cyan');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');

  const contract = new ethers.Contract(address, OddsLaunchpadABI, provider);

  try {
    // Check if contract exists
    const code = await provider.getCode(address);
    if (code === '0x') {
      log('❌ No contract at this address', 'red');
      return {
        address,
        exists: false,
        error: 'No contract found'
      };
    }

    // Get config
    const config = await contract.getCollectionConfig();
    const currentSupply = await contract.currentSupply();

    console.log('Name:', config.name);
    console.log('Symbol:', config.symbol);
    console.log('Type:', config.isOpenEdition ? 'Open Edition' : 'Standard Edition');
    console.log('Supply:', currentSupply.toString(), '/', config.totalMaxSupply.toString());
    console.log('Base URI:', config.baseURI);

    let uriStatus = 'N/A';
    let uriCorrect = null;

    if (currentSupply > 0) {
      // Check token URIs
      const count = Math.min(Number(currentSupply), 3);
      const uris = [];

      for (let i = 0; i < count; i++) {
        const uri = await contract.tokenURI(i);
        uris.push(uri);
      }

      if (uris.length > 1) {
        const allSame = uris.every(uri => uri === uris[0]);

        if (config.isOpenEdition) {
          uriCorrect = allSame;
          uriStatus = allSame ? 'CORRECT (identical)' : 'WRONG (should be identical)';
        } else {
          uriCorrect = !allSame;
          uriStatus = !allSame ? 'CORRECT (unique)' : 'WRONG (should be unique)';
        }

        if (uriCorrect) {
          log(`✅ Token URI: ${uriStatus}`, 'green');
        } else {
          log(`❌ Token URI: ${uriStatus}`, 'red');
        }
      } else {
        uriStatus = 'Only 1 token';
        log(`⚠️  Token URI: ${uriStatus}`, 'yellow');
      }
    } else {
      uriStatus = 'No tokens minted';
      log(`⚠️  Token URI: ${uriStatus}`, 'yellow');
    }

    return {
      address,
      exists: true,
      name: config.name,
      symbol: config.symbol,
      type: config.isOpenEdition ? 'Open Edition' : 'Standard Edition',
      isOpenEdition: config.isOpenEdition,
      supply: currentSupply.toString(),
      maxSupply: config.totalMaxSupply.toString(),
      baseURI: config.baseURI,
      uriStatus,
      uriCorrect
    };

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return {
      address,
      exists: true,
      error: error.message
    };
  }
}

async function batchCheck(addresses) {
  log('🔍 Batch Collection Check', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('Total Collections:', addresses.length);
  console.log('RPC URL:', RPC_URL);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const results = [];

  // Check each collection
  for (let i = 0; i < addresses.length; i++) {
    const result = await checkCollection(provider, addresses[i], i, addresses.length);
    results.push(result);
  }

  // Summary
  console.log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📊 Summary', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('');

  const validCollections = results.filter(r => r.exists && !r.error);
  const errorCollections = results.filter(r => r.error);
  const correctURI = results.filter(r => r.uriCorrect === true);
  const wrongURI = results.filter(r => r.uriCorrect === false);
  const unknownURI = results.filter(r => r.uriCorrect === null);

  console.log('Total Checked:', results.length);
  console.log('Valid Collections:', validCollections.length);
  console.log('Errors:', errorCollections.length);
  console.log('');

  if (validCollections.length > 0) {
    console.log('Token URI Status:');
    log(`  ✅ Correct: ${correctURI.length}`, 'green');
    log(`  ❌ Wrong: ${wrongURI.length}`, 'red');
    log(`  ⚠️  Unknown: ${unknownURI.length}`, 'yellow');
    console.log('');
  }

  // List collections by type
  const standardCollections = validCollections.filter(r => !r.isOpenEdition);
  const openCollections = validCollections.filter(r => r.isOpenEdition);

  if (standardCollections.length > 0) {
    log('📦 Standard Edition Collections:', 'blue');
    standardCollections.forEach(r => {
      const status = r.uriCorrect === true ? '✅' : r.uriCorrect === false ? '❌' : '⚠️';
      console.log(`  ${status} ${r.name} (${r.symbol})`);
      console.log(`     ${r.address}`);
    });
    console.log('');
  }

  if (openCollections.length > 0) {
    log('🎨 Open Edition Collections:', 'blue');
    openCollections.forEach(r => {
      const status = r.uriCorrect === true ? '✅' : r.uriCorrect === false ? '❌' : '⚠️';
      console.log(`  ${status} ${r.name} (${r.symbol})`);
      console.log(`     ${r.address}`);
    });
    console.log('');
  }

  // List errors
  if (errorCollections.length > 0) {
    log('❌ Collections with Errors:', 'red');
    errorCollections.forEach(r => {
      console.log(`  ${r.address}`);
      console.log(`     Error: ${r.error}`);
    });
    console.log('');
  }

  // List wrong URI collections
  if (wrongURI.length > 0) {
    log('⚠️  Collections with Wrong Token URI Format:', 'yellow');
    wrongURI.forEach(r => {
      console.log(`  ${r.name} (${r.type})`);
      console.log(`     ${r.address}`);
      console.log(`     Status: ${r.uriStatus}`);
      if (r.isOpenEdition) {
        console.log(`     💡 Likely deployed with old contract version`);
      }
    });
    console.log('');
  }

  // Recommendations
  if (wrongURI.length > 0) {
    log('💡 Recommendations:', 'yellow');
    console.log('');
    console.log('For collections with wrong URI format:');
    console.log('1. These collections cannot be fixed (immutable)');
    console.log('2. Deploy new collections with updated template');
    console.log('3. Ensure template is approved with latest bytecode:');
    console.log('   node scripts/approve-current-bytecode.js');
    console.log('');
  }

  return results;
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/batch-check-collections.js <ADDRESS1> <ADDRESS2> ...');
    console.log('');
    console.log('Or provide addresses in a file (one per line):');
    console.log('  node scripts/batch-check-collections.js --file addresses.txt');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/batch-check-collections.js 0x123... 0x456... 0x789...');
    process.exit(1);
  }

  let addresses = [];

  // Check if reading from file
  if (args[0] === '--file' && args[1]) {
    const fs = require('fs');
    const filePath = args[1];
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      addresses = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .filter(addr => ethers.isAddress(addr));
      
      console.log(`Loaded ${addresses.length} addresses from ${filePath}`);
    } catch (error) {
      console.error('❌ Error reading file:', error.message);
      process.exit(1);
    }
  } else {
    addresses = args;
  }

  // Validate addresses
  const invalidAddresses = addresses.filter(addr => !ethers.isAddress(addr));
  if (invalidAddresses.length > 0) {
    console.error('❌ Invalid addresses found:');
    invalidAddresses.forEach(addr => console.error('  ', addr));
    process.exit(1);
  }

  if (addresses.length === 0) {
    console.error('❌ No valid addresses provided');
    process.exit(1);
  }

  await batchCheck(addresses);
  
  console.log('');
  log('✅ Batch check completed!', 'green');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('');
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
