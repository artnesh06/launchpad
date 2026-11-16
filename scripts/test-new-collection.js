/**
 * Test Script untuk Collection Baru (Standard & Open Edition)
 * 
 * Script ini akan:
 * 1. Deploy collection Standard Edition
 * 2. Deploy collection Open Edition
 * 3. Verify tokenURI format untuk kedua tipe
 * 4. Test mint functionality
 * 5. Verify metadata accessibility
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

// Load ABIs
const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');
const OddsLaunchpadABI = require('../abi/OddsLaunchpad.json');

// Read bytecode
const bytecodeFileContent = fs.readFileSync(path.join(__dirname, '../abi/OddsLaunchpadBytecode.ts'), 'utf8');
const bytecodeMatch = bytecodeFileContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);
if (!bytecodeMatch) {
  throw new Error('Could not extract bytecode from OddsLaunchpadBytecode.ts');
}
const ODDS_LAUNCHPAD_BYTECODE = bytecodeMatch[1];

// Configuration
const CONFIG = {
  chainId: 11155111, // Sepolia
  rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
  factoryAddress: process.env.SEPOLIA_FACTORY_ADDRESS || '0xd13EE800CDcedeA4F9c08eBA5E52876a6C1E3909',
  templateAddress: '0x8214c3755126f11Ad093BD491C3d3974A7244415'
};

// Test IPFS URIs (gunakan hash yang valid dari IPFS Anda)
const TEST_IPFS = {
  standardBaseURI: 'ipfs://QmTestStandardMetadata/', // Folder dengan 0.json, 1.json, dst
  openEditionBaseURI: 'ipfs://QmTestOpenEditionMetadata', // Single metadata file
  unrevealedURI: 'ipfs://QmTestUnrevealed/metadata.json',
  contractURI: 'ipfs://QmTestContract/metadata.json'
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

async function deployCollection(factory, wallet, config, phases, collectionType) {
  logSection(`🚀 Deploying ${collectionType} Collection`);
  
  console.log('Collection Config:');
  console.log('  Name:', config.name);
  console.log('  Symbol:', config.symbol);
  console.log('  Type:', collectionType);
  console.log('  isOpenEdition:', config.isOpenEdition);
  console.log('  baseURI:', config.baseURI);
  console.log('  Max Supply:', config.totalMaxSupply);
  console.log('');

  // Encode constructor arguments
  const iface = new ethers.Interface(OddsLaunchpadABI);
  const constructorArgsEncoded = iface.encodeDeploy([
    config,
    wallet.address,
    phases
  ]).slice(2); // Remove '0x' prefix

  const constructorArgsWithPrefix = '0x' + constructorArgsEncoded;

  // Estimate gas
  log('⛽ Estimating gas...', 'yellow');
  const gasEstimate = await factory.deployMasterContract.estimateGas(
    CONFIG.templateAddress,
    ODDS_LAUNCHPAD_BYTECODE,
    constructorArgsWithPrefix
  );
  log(`✅ Gas estimate: ${gasEstimate.toString()}`, 'green');

  // Deploy
  log('🚀 Deploying collection...', 'yellow');
  const tx = await factory.deployMasterContract(
    CONFIG.templateAddress,
    ODDS_LAUNCHPAD_BYTECODE,
    constructorArgsWithPrefix
  );

  log(`📝 Transaction: ${tx.hash}`, 'blue');
  log('⏳ Waiting for confirmation...', 'yellow');
  
  const receipt = await tx.wait();
  
  if (receipt.status !== 1) {
    throw new Error('Transaction failed');
  }

  log('✅ Collection deployed successfully!', 'green');
  console.log('  Block:', receipt.blockNumber);
  console.log('  Gas used:', receipt.gasUsed.toString());

  // Parse ContractDeployed event
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
  log(`📍 Contract Address: ${contractAddress}`, 'green');

  return contractAddress;
}

async function verifyCollection(provider, contractAddress, expectedType) {
  logSection(`🔍 Verifying ${expectedType} Collection`);
  
  const contract = new ethers.Contract(
    contractAddress,
    OddsLaunchpadABI,
    provider
  );

  // Get collection config
  log('📋 Reading collection config...', 'yellow');
  const config = await contract.getCollectionConfig();
  
  console.log('Collection Info:');
  console.log('  Name:', config.name);
  console.log('  Symbol:', config.symbol);
  console.log('  isOpenEdition:', config.isOpenEdition);
  console.log('  isRevealed:', config.isRevealed);
  console.log('  baseURI:', config.baseURI);
  console.log('  Total Max Supply:', config.totalMaxSupply.toString());
  console.log('');

  // Verify isOpenEdition flag
  const isOpenEdition = config.isOpenEdition;
  const expectedIsOpenEdition = expectedType === 'Open Edition';
  
  if (isOpenEdition === expectedIsOpenEdition) {
    log(`✅ isOpenEdition flag is correct: ${isOpenEdition}`, 'green');
  } else {
    log(`❌ isOpenEdition flag is WRONG! Expected: ${expectedIsOpenEdition}, Got: ${isOpenEdition}`, 'red');
    throw new Error('isOpenEdition flag mismatch');
  }

  // Get phases
  const phases = await contract.getAllPhases();
  console.log('Mint Phases:', phases.length);
  phases.forEach((phase, i) => {
    console.log(`  Phase ${i}: ${phase.name}`);
    console.log(`    Price: ${ethers.formatEther(phase.price)} ETH`);
    console.log(`    Max Supply: ${phase.maxSupply.toString()}`);
    console.log(`    Active: ${phase.isActive}`);
  });
  console.log('');

  return { contract, config };
}

async function testMint(contract, wallet, phaseId = 0, quantity = 1) {
  logSection('🎨 Testing Mint');
  
  console.log('Mint Parameters:');
  console.log('  Phase ID:', phaseId);
  console.log('  Quantity:', quantity);
  console.log('  Minter:', wallet.address);
  console.log('');

  // Get mint cost
  const [mintCost, platformFee, totalCost] = await contract.calculateMintCost(phaseId, quantity);
  
  console.log('Mint Cost:');
  console.log('  Mint Cost:', ethers.formatEther(mintCost), 'ETH');
  console.log('  Platform Fee:', ethers.formatEther(platformFee), 'ETH');
  console.log('  Total Cost:', ethers.formatEther(totalCost), 'ETH');
  console.log('');

  // Check eligibility
  const [canMint, reason] = await contract.canMint(phaseId, quantity, wallet.address, []);
  
  if (!canMint) {
    log(`❌ Cannot mint: ${reason}`, 'red');
    throw new Error(`Mint eligibility check failed: ${reason}`);
  }
  
  log('✅ Mint eligibility check passed', 'green');

  // Mint
  log('🎨 Minting NFT...', 'yellow');
  const tx = await contract.mint(phaseId, quantity, [], { value: totalCost });
  
  log(`📝 Transaction: ${tx.hash}`, 'blue');
  log('⏳ Waiting for confirmation...', 'yellow');
  
  const receipt = await tx.wait();
  
  if (receipt.status !== 1) {
    throw new Error('Mint transaction failed');
  }

  log('✅ Mint successful!', 'green');
  console.log('  Block:', receipt.blockNumber);
  console.log('  Gas used:', receipt.gasUsed.toString());
  console.log('');

  // Get current supply
  const currentSupply = await contract.currentSupply();
  console.log('Current Supply:', currentSupply.toString());
  
  return currentSupply;
}

async function verifyTokenURI(contract, tokenId, expectedType) {
  logSection(`🔗 Verifying Token URI (Token #${tokenId})`);
  
  console.log('Expected Type:', expectedType);
  console.log('Token ID:', tokenId);
  console.log('');

  // Get tokenURI
  log('📡 Calling tokenURI()...', 'yellow');
  const tokenURI = await contract.tokenURI(tokenId);
  
  console.log('Token URI:', tokenURI);
  console.log('');

  // Verify format based on type
  if (expectedType === 'Standard Edition') {
    // Standard Edition should have tokenId in URI
    // Format: ipfs://hash/0.json or ipfs://hash/1.json
    const hasTokenId = tokenURI.includes(`/${tokenId}.json`) || tokenURI.includes(`${tokenId}.json`);
    
    if (hasTokenId) {
      log('✅ Standard Edition URI format is CORRECT', 'green');
      log(`   URI contains tokenId: /${tokenId}.json`, 'green');
    } else {
      log('❌ Standard Edition URI format is WRONG', 'red');
      log(`   Expected to contain: /${tokenId}.json`, 'red');
      log(`   Got: ${tokenURI}`, 'red');
      throw new Error('Standard Edition tokenURI format incorrect');
    }
  } else if (expectedType === 'Open Edition') {
    // Open Edition should NOT have tokenId in URI
    // Should be the same for all tokens
    const hasTokenId = tokenURI.includes(`/${tokenId}.json`) || tokenURI.includes(`${tokenId}.json`);
    
    if (!hasTokenId) {
      log('✅ Open Edition URI format is CORRECT', 'green');
      log('   URI does NOT contain tokenId (same for all tokens)', 'green');
      log(`   URI: ${tokenURI}`, 'green');
    } else {
      log('❌ Open Edition URI format is WRONG', 'red');
      log(`   URI should NOT contain tokenId`, 'red');
      log(`   Got: ${tokenURI}`, 'red');
      throw new Error('Open Edition tokenURI format incorrect - contains tokenId!');
    }
  }

  return tokenURI;
}

async function testMultipleTokenURIs(contract, expectedType, count = 3) {
  logSection(`🔗 Testing Multiple Token URIs (${expectedType})`);
  
  const uris = [];
  
  for (let i = 0; i < count; i++) {
    const uri = await contract.tokenURI(i);
    uris.push(uri);
    console.log(`Token ${i}: ${uri}`);
  }
  console.log('');

  if (expectedType === 'Open Edition') {
    // All URIs should be the same
    const allSame = uris.every(uri => uri === uris[0]);
    
    if (allSame) {
      log('✅ All token URIs are IDENTICAL (correct for Open Edition)', 'green');
    } else {
      log('❌ Token URIs are DIFFERENT (wrong for Open Edition)', 'red');
      throw new Error('Open Edition tokens should have identical URIs');
    }
  } else {
    // All URIs should be different
    const allDifferent = new Set(uris).size === uris.length;
    
    if (allDifferent) {
      log('✅ All token URIs are UNIQUE (correct for Standard Edition)', 'green');
    } else {
      log('❌ Some token URIs are IDENTICAL (wrong for Standard Edition)', 'red');
      throw new Error('Standard Edition tokens should have unique URIs');
    }
  }
}

async function runTests() {
  logSection('🧪 NFT Collection Test Suite');
  
  console.log('Configuration:');
  console.log('  Chain ID:', CONFIG.chainId);
  console.log('  RPC URL:', CONFIG.rpcUrl);
  console.log('  Factory:', CONFIG.factoryAddress);
  console.log('  Template:', CONFIG.templateAddress);
  console.log('');

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  
  // Create wallet
  let wallet;
  if (process.env.PRIVATE_KEY) {
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else if (process.env.SEED_PHRASE || process.env.MNEMONIC) {
    const seedPhrase = process.env.SEED_PHRASE || process.env.MNEMONIC;
    wallet = ethers.Wallet.fromPhrase(seedPhrase, provider);
  } else {
    throw new Error('No wallet credentials found in .env');
  }
  
  log(`Deployer: ${wallet.address}`, 'blue');

  // Get factory contract
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Check template approval
  logSection('🔍 Checking Template Approval');
  const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
  console.log('Template approved:', isApproved);
  
  if (!isApproved) {
    log('❌ Template not approved!', 'red');
    log('Run: node scripts/approve-current-bytecode.js', 'yellow');
    process.exit(1);
  }

  const approvedHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
  const currentHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
  
  console.log('Approved hash:', approvedHash);
  console.log('Current hash: ', currentHash);
  console.log('Hashes match:', approvedHash === currentHash);
  
  if (approvedHash !== currentHash) {
    log('❌ Bytecode hash mismatch!', 'red');
    log('Run: node scripts/approve-current-bytecode.js', 'yellow');
    process.exit(1);
  }
  
  log('✅ Template approved and hash matches', 'green');

  // Prepare phases
  const now = Math.floor(Date.now() / 1000);
  const testPhases = [{
    name: 'Public Sale',
    startTime: now,
    endTime: now + 86400 * 7, // 7 days
    price: ethers.parseEther('0.001'), // 0.001 ETH for testing
    maxSupply: 100,
    maxPerWallet: 10,
    maxPerTransaction: 5,
    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    isActive: true,
    requiresWhitelist: false,
    currentSupply: 0
  }];

  // ========================================
  // TEST 1: Standard Edition Collection
  // ========================================
  
  const standardConfig = {
    name: 'Test Standard Collection',
    symbol: 'TSTD',
    baseURI: TEST_IPFS.standardBaseURI,
    unrevealedURI: TEST_IPFS.unrevealedURI,
    contractURI: TEST_IPFS.contractURI,
    externalLink: 'https://test-standard.com',
    totalMaxSupply: 100,
    treasury: wallet.address,
    royaltyRecipient: wallet.address,
    royaltyPercentage: 500, // 5%
    isRevealed: true,
    transfersEnabled: true,
    isOpenEdition: false, // ← Standard Edition
    chainId: CONFIG.chainId
  };

  const standardAddress = await deployCollection(
    factory,
    wallet,
    standardConfig,
    testPhases,
    'Standard Edition'
  );

  const { contract: standardContract } = await verifyCollection(
    provider,
    standardAddress,
    'Standard Edition'
  );

  // Mint 3 NFTs for Standard Edition
  await testMint(standardContract, wallet, 0, 3);

  // Verify tokenURI for Standard Edition
  await verifyTokenURI(standardContract, 0, 'Standard Edition');
  await verifyTokenURI(standardContract, 1, 'Standard Edition');
  await verifyTokenURI(standardContract, 2, 'Standard Edition');

  // Test multiple URIs
  await testMultipleTokenURIs(standardContract, 'Standard Edition', 3);

  // ========================================
  // TEST 2: Open Edition Collection
  // ========================================
  
  const openConfig = {
    name: 'Test Open Edition',
    symbol: 'TOPE',
    baseURI: TEST_IPFS.openEditionBaseURI,
    unrevealedURI: TEST_IPFS.unrevealedURI,
    contractURI: TEST_IPFS.contractURI,
    externalLink: 'https://test-open.com',
    totalMaxSupply: 1000,
    treasury: wallet.address,
    royaltyRecipient: wallet.address,
    royaltyPercentage: 500, // 5%
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

  const { contract: openContract } = await verifyCollection(
    provider,
    openAddress,
    'Open Edition'
  );

  // Mint 3 NFTs for Open Edition
  await testMint(openContract, wallet, 0, 3);

  // Verify tokenURI for Open Edition
  await verifyTokenURI(openContract, 0, 'Open Edition');
  await verifyTokenURI(openContract, 1, 'Open Edition');
  await verifyTokenURI(openContract, 2, 'Open Edition');

  // Test multiple URIs
  await testMultipleTokenURIs(openContract, 'Open Edition', 3);

  // ========================================
  // Summary
  // ========================================
  
  logSection('📊 Test Summary');
  
  log('✅ All tests passed!', 'green');
  console.log('');
  console.log('Deployed Collections:');
  console.log('');
  log(`Standard Edition: ${standardAddress}`, 'blue');
  console.log('  - tokenURI(0) includes tokenId: /0.json');
  console.log('  - tokenURI(1) includes tokenId: /1.json');
  console.log('  - Each token has unique metadata');
  console.log('');
  log(`Open Edition: ${openAddress}`, 'blue');
  console.log('  - tokenURI(0) = tokenURI(1) = tokenURI(2)');
  console.log('  - All tokens share the same metadata');
  console.log('  - No tokenId in URI');
  console.log('');
  log('🎉 Both collection types work correctly!', 'green');
}

// Run tests
runTests()
  .then(() => {
    console.log('');
    log('✅ Test suite completed successfully!', 'green');
    process.exit(0);
  })
  .catch((error) => {
    console.log('');
    log(`❌ Test suite failed: ${error.message}`, 'red');
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  });
