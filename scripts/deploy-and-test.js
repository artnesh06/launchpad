/**
 * Deploy Collection Baru dan Test Token URI
 * 
 * Script ini akan:
 * 1. Deploy Standard Edition collection
 * 2. Deploy Open Edition collection
 * 3. Mint beberapa NFT
 * 4. Test tokenURI untuk verify format
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load ABIs
const MasterContractFactoryABI = require('./abi/OddsLaunchpadFactory.json');
const OddsLaunchpadABI = require('./abi/OddsLaunchpad.json');

// Read bytecode
const bytecodeFileContent = fs.readFileSync(path.join(__dirname, 'abi/OddsLaunchpadBytecode.ts'), 'utf8');
const bytecodeMatch = bytecodeFileContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);
if (!bytecodeMatch) {
  throw new Error('Could not extract bytecode from OddsLaunchpadBytecode.ts');
}
const ODDS_LAUNCHPAD_BYTECODE = bytecodeMatch[1];

// Configuration - Sepolia Testnet
const CONFIG = {
  chainId: 11155111,
  rpcUrl: process.env.SEPOLIA_RPC_URL || (process.env.INFURA_API_KEY ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` : 'https://ethereum-sepolia-rpc.publicnode.com'),
  factoryAddress: '0xB759B92CB8493342ABD53103E2Db5cd20E549975',
  templateAddress: '0x8214c3755126f11Ad093BD491C3d3974A7244415'
};

// Test IPFS URIs
const TEST_IPFS = {
  standardBaseURI: 'ipfs://QmTestStandard/',
  openEditionBaseURI: 'ipfs://QmTestOpenEdition',
  unrevealedURI: 'ipfs://QmUnrevealed',
  contractURI: 'ipfs://QmContract'
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
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

async function deployCollection(factory, wallet, config, phases, collectionType) {
  logSection(`🚀 Deploying ${collectionType} Collection`);
  
  console.log('Config:');
  console.log('  Name:', config.name);
  console.log('  Symbol:', config.symbol);
  console.log('  isOpenEdition:', config.isOpenEdition);
  console.log('  baseURI:', config.baseURI);
  console.log('');

  // Encode constructor arguments
  const iface = new ethers.Interface(OddsLaunchpadABI);
  const constructorArgsEncoded = iface.encodeDeploy([
    config,
    wallet.address,
    phases
  ]).slice(2);

  const constructorArgsWithPrefix = '0x' + constructorArgsEncoded;

  log('🚀 Deploying...', 'yellow');
  const tx = await factory.deployMasterContract(
    CONFIG.templateAddress,
    ODDS_LAUNCHPAD_BYTECODE,
    constructorArgsWithPrefix
  );

  log(`📝 TX: ${tx.hash}`, 'blue');
  log('⏳ Waiting...', 'yellow');
  
  const receipt = await tx.wait();
  
  if (receipt.status !== 1) {
    throw new Error('Transaction failed');
  }

  log('✅ Deployed!', 'green');

  // Get contract address from event
  const deployedEvent = receipt.logs.find(log => {
    try {
      const parsed = factory.interface.parseLog({
        topics: [...log.topics],
        data: log.data
      });
      return parsed && parsed.name === 'ContractDeployed';
    } catch (e) {
      return false;
    }
  });

  if (!deployedEvent) {
    throw new Error('ContractDeployed event not found');
  }

  const parsed = factory.interface.parseLog({
    topics: [...deployedEvent.topics],
    data: deployedEvent.data
  });

  const contractAddress = parsed.args.contractAddress;
  log(`📍 Address: ${contractAddress}`, 'green');

  return contractAddress;
}

async function mintNFT(contract, wallet, quantity = 1) {
  logSection('🎨 Minting NFT');
  
  console.log('Quantity:', quantity);
  
  // Get mint cost
  const [mintCost, platformFee, totalCost] = await contract.calculateMintCost(0, quantity);
  
  console.log('Cost:', ethers.formatEther(totalCost), 'ETH');
  console.log('');

  log('🎨 Minting...', 'yellow');
  const tx = await contract.mint(0, quantity, [], { value: totalCost });
  
  log(`📝 TX: ${tx.hash}`, 'blue');
  log('⏳ Waiting...', 'yellow');
  
  const receipt = await tx.wait();
  
  if (receipt.status !== 1) {
    throw new Error('Mint failed');
  }

  log('✅ Minted!', 'green');
  
  const currentSupply = await contract.currentSupply();
  console.log('Supply:', currentSupply.toString());
  console.log('');

  return currentSupply;
}

async function testTokenURI(contract, tokenId, expectedType) {
  logSection(`🔗 Testing Token URI #${tokenId}`);
  
  console.log('Expected:', expectedType);
  console.log('Token ID:', tokenId);
  console.log('');

  const tokenURI = await contract.tokenURI(tokenId);
  
  console.log('Token URI:', tokenURI);
  console.log('');

  // Verify format
  if (expectedType === 'Standard Edition') {
    const hasTokenId = tokenURI.includes(`/${tokenId}.json`) || tokenURI.includes(`${tokenId}.json`);
    
    if (hasTokenId) {
      log('✅ CORRECT: URI contains tokenId', 'green');
      return true;
    } else {
      log('❌ WRONG: URI should contain tokenId', 'red');
      return false;
    }
  } else if (expectedType === 'Open Edition') {
    const hasTokenId = tokenURI.includes(`/${tokenId}.json`) || tokenURI.includes(`${tokenId}.json`);
    
    if (!hasTokenId) {
      log('✅ CORRECT: URI does NOT contain tokenId', 'green');
      return true;
    } else {
      log('❌ WRONG: URI should NOT contain tokenId', 'red');
      log('   Got:', tokenURI, 'red');
      return false;
    }
  }
}

async function testMultipleURIs(contract, expectedType, count = 3) {
  logSection(`🔗 Testing Multiple URIs (${expectedType})`);
  
  const uris = [];
  
  for (let i = 0; i < count; i++) {
    const uri = await contract.tokenURI(i);
    uris.push(uri);
    console.log(`Token ${i}: ${uri}`);
  }
  console.log('');

  if (expectedType === 'Open Edition') {
    const allSame = uris.every(uri => uri === uris[0]);
    
    if (allSame) {
      log('✅ CORRECT: All URIs are IDENTICAL', 'green');
      return true;
    } else {
      log('❌ WRONG: URIs should be IDENTICAL', 'red');
      return false;
    }
  } else {
    const allDifferent = new Set(uris).size === uris.length;
    
    if (allDifferent) {
      log('✅ CORRECT: All URIs are UNIQUE', 'green');
      return true;
    } else {
      log('❌ WRONG: URIs should be UNIQUE', 'red');
      return false;
    }
  }
}

async function main() {
  logSection('🧪 Deploy & Test Collection');
  
  console.log('Chain:', 'Sepolia');
  console.log('Chain ID:', CONFIG.chainId);
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
  console.log('');

  // Setup wallet
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  
  let wallet;
  if (process.env.PRIVATE_KEY) {
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else if (process.env.SEED_PHRASE || process.env.MNEMONIC) {
    const seedPhrase = process.env.SEED_PHRASE || process.env.MNEMONIC;
    wallet = ethers.Wallet.fromPhrase(seedPhrase, provider);
  } else {
    throw new Error('No wallet credentials in .env');
  }
  
  log(`Wallet: ${wallet.address}`, 'blue');
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');
  console.log('');

  // Get factory
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Prepare phases
  const now = Math.floor(Date.now() / 1000);
  const testPhases = [{
    name: 'Public Sale',
    startTime: now,
    endTime: now + 86400 * 7,
    price: ethers.parseEther('0.0001'),
    maxSupply: 100,
    maxPerWallet: 10,
    maxPerTransaction: 5,
    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    isActive: true,
    requiresWhitelist: false,
    currentSupply: 0
  }];

  let standardPassed = false;
  let openPassed = false;

  // ========================================
  // TEST 1: Standard Edition
  // ========================================
  
  try {
    const standardConfig = {
      name: 'Test Standard',
      symbol: 'TSTD',
      baseURI: TEST_IPFS.standardBaseURI,
      unrevealedURI: TEST_IPFS.unrevealedURI,
      contractURI: TEST_IPFS.contractURI,
      externalLink: 'https://test.com',
      totalMaxSupply: 100,
      treasury: wallet.address,
      royaltyRecipient: wallet.address,
      royaltyPercentage: 500,
      isRevealed: true,
      transfersEnabled: true,
      isOpenEdition: false, // ← Standard
      chainId: CONFIG.chainId
    };

    const standardAddress = await deployCollection(
      factory,
      wallet,
      standardConfig,
      testPhases,
      'Standard Edition'
    );

    const standardContract = new ethers.Contract(
      standardAddress,
      OddsLaunchpadABI,
      wallet
    );

    // Mint 3 NFTs
    await mintNFT(standardContract, wallet, 3);

    // Test URIs
    const test1 = await testTokenURI(standardContract, 0, 'Standard Edition');
    const test2 = await testTokenURI(standardContract, 1, 'Standard Edition');
    const test3 = await testMultipleURIs(standardContract, 'Standard Edition', 3);

    standardPassed = test1 && test2 && test3;

  } catch (error) {
    log(`❌ Standard Edition failed: ${error.message}`, 'red');
  }

  // ========================================
  // TEST 2: Open Edition
  // ========================================
  
  try {
    const openConfig = {
      name: 'Test Open',
      symbol: 'TOPE',
      baseURI: TEST_IPFS.openEditionBaseURI,
      unrevealedURI: TEST_IPFS.unrevealedURI,
      contractURI: TEST_IPFS.contractURI,
      externalLink: 'https://test.com',
      totalMaxSupply: 1000,
      treasury: wallet.address,
      royaltyRecipient: wallet.address,
      royaltyPercentage: 500,
      isRevealed: true,
      transfersEnabled: true,
      isOpenEdition: true, // ← Open Edition
      chainId: CONFIG.chainId
    };

    const openAddress = await deployCollection(
      factory,
      wallet,
      openConfig,
      testPhases,
      'Open Edition'
    );

    const openContract = new ethers.Contract(
      openAddress,
      OddsLaunchpadABI,
      wallet
    );

    // Mint 3 NFTs
    await mintNFT(openContract, wallet, 3);

    // Test URIs
    const test1 = await testTokenURI(openContract, 0, 'Open Edition');
    const test2 = await testTokenURI(openContract, 1, 'Open Edition');
    const test3 = await testMultipleURIs(openContract, 'Open Edition', 3);

    openPassed = test1 && test2 && test3;

  } catch (error) {
    log(`❌ Open Edition failed: ${error.message}`, 'red');
  }

  // ========================================
  // Summary
  // ========================================
  
  logSection('📊 Test Results');
  
  console.log('Standard Edition:', standardPassed ? '✅ PASSED' : '❌ FAILED');
  console.log('Open Edition:', openPassed ? '✅ PASSED' : '❌ FAILED');
  console.log('');

  if (standardPassed && openPassed) {
    log('🎉 All tests PASSED!', 'green');
    log('Contract bytecode is correct!', 'green');
  } else {
    log('⚠️  Some tests FAILED', 'yellow');
    if (!openPassed) {
      log('Open Edition tokenURI masih salah - bytecode perlu diupdate', 'yellow');
    }
  }
}

main()
  .then(() => {
    console.log('');
    log('✅ Done!', 'green');
    process.exit(0);
  })
  .catch(error => {
    console.log('');
    log(`❌ Error: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
