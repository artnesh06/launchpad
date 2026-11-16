/**
 * Script untuk DEPLOY template OddsLaunchpad DAN approve di MegaETH Testnet V2
 * 
 * Script ini akan:
 * 1. Deploy OddsLaunchpad contract sebagai template
 * 2. Approve template + bytecode hash di factory
 * 
 * Chain ID: 6343 (MegaETH Testnet V2)
 * Factory: 0xC4488DB515E6FBAbB5de3a593FF65075afD17b53
 * 
 * Usage:
 *   node scripts/deploy-and-approve-megaeth-testnet.js
 */

const { ethers } = require('ethers');

// Load environment
require('dotenv').config();

// Load ABIs
const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');
const OddsLaunchpadABI = require('../abi/OddsLaunchpad.json');

// Load bytecode
const { ODDS_LAUNCHPAD_BYTECODE, ODDS_LAUNCHPAD_BYTECODE_HASH } = require('../abi/OddsLaunchpadBytecode.ts');

// Configuration untuk MegaETH Testnet V2
const CONFIG = {
  chainId: 6343,
  chainName: 'MegaETH Testnet V2',
  rpcUrl: 'https://timothy.megaeth.com/rpc',
  factoryAddress: '0xC4488DB515E6FBAbB5de3a593FF65075afD17b53',
  
  // Bytecode hash dari OddsLaunchpadBytecode.ts
  bytecodeHash: ODDS_LAUNCHPAD_BYTECODE_HASH,
  
  // Seed phrase - HARDCODED (ganti manual sebelum run)
  seedPhrase: 'YOUR_SEED_PHRASE_HERE_REPLACE_WITH_ACTUAL_12_OR_24_WORDS',

  // Platform fee receiver (treasury address)
  platformFeeReceiver: '0x84f6F5e3281Ee5E495dFFB1cd0978dD380e57596', // Default dari testnet
  
  // Royalty info untuk template (tidak akan digunakan, hanya untuk constructor)
  royaltyReceiver: '0x84f6f5e3281ee5e495dffb1cd0978dd380e57596',
  royaltyBps: 250 // 2.5%
};

async function deployAndApprove() {
  console.log('🚀 Deploy & Approve Template on MegaETH Testnet V2');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chain:', CONFIG.chainName);
  console.log('Chain ID:', CONFIG.chainId);
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Bytecode Hash:', CONFIG.bytecodeHash);
  console.log('');

  // Validate seed phrase
  if (CONFIG.seedPhrase === 'YOUR_SEED_PHRASE_HERE_REPLACE_WITH_ACTUAL_12_OR_24_WORDS') {
    throw new Error(
      '❌ Seed phrase not configured!\n' +
      'Please update CONFIG.seedPhrase in this script with your actual seed phrase'
    );
  }

  // Connect to provider
  console.log('🔌 Connecting to MegaETH Testnet V2...');
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  
  // Test connection
  try {
    const network = await provider.getNetwork();
    console.log('✅ Connected to network');
    console.log('   Chain ID:', network.chainId.toString());
  } catch (error) {
    throw new Error(`Failed to connect to RPC: ${error.message}`);
  }
  console.log('');

  // Create wallet from seed phrase (using index 1)
  console.log('👛 Creating wallet from seed phrase...');
  const mnemonic = ethers.Mnemonic.fromPhrase(CONFIG.seedPhrase);
  const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/1"); // Index 1
  const wallet = hdNode.connect(provider);
  console.log('✅ Wallet address:', wallet.address);
  console.log('   Derivation path: m/44\'/60\'/0\'/0/1 (index 1)');
  console.log('   Expected address: 0xbbD4fedbF4b3F0dfFa7DE8c0BF3C87Bcbfdc4207');
  console.log('');

  // Check balance
  console.log('💰 Checking balance...');
  const balance = await provider.getBalance(wallet.address);
  console.log('   Balance:', ethers.formatEther(balance), 'ETH');
  
  if (balance === 0n) {
    throw new Error('❌ Wallet has zero balance! Need ETH for deployment and approval.');
  }
  console.log('');

  // ============================================================
  // STEP 1: DEPLOY TEMPLATE CONTRACT
  // ============================================================
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 STEP 1: Deploying OddsLaunchpad Template Contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Prepare constructor arguments for template
  // Template contract needs minimal config, actual collections will have their own config
  const templateConfig = {
    name: 'OddsLaunchpad Template',
    symbol: 'TEMPLATE',
    baseURI: 'ipfs://template/',
    unrevealedURI: 'ipfs://template/unrevealed',
    contractURI: 'ipfs://template/contract',
    externalLink: 'https://oddslaunchpad.com/', // External link
    totalMaxSupply: 10000, // Default max supply
    treasury: wallet.address, // Temporary treasury
    royaltyRecipient: wallet.address, // Royalty recipient
    royaltyPercentage: CONFIG.royaltyBps, // Royalty in basis points
    isRevealed: false,
    transfersEnabled: true,
    isOpenEdition: false,
    isShuffleEnabled: false,
    chainId: CONFIG.chainId
  };

  const phases = []; // No phases for template

  console.log('📝 Template Configuration:');
  console.log('   Name:', templateConfig.name);
  console.log('   Symbol:', templateConfig.symbol);
  console.log('   Max Supply:', templateConfig.totalMaxSupply);
  console.log('   Treasury:', templateConfig.treasury);
  console.log('   Royalty:', CONFIG.royaltyBps / 100, '%');
  console.log('   External Link:', templateConfig.externalLink);
  console.log('');

  // Create contract factory
  const ContractFactory = new ethers.ContractFactory(
    OddsLaunchpadABI,
    ODDS_LAUNCHPAD_BYTECODE,
    wallet
  );

  console.log('🚀 Deploying contract...');
  console.log('   This may take 1-2 minutes...');
  console.log('');

  let templateContract;
  try {
    // Deploy with constructor arguments
    templateContract = await ContractFactory.deploy(
      templateConfig,
      CONFIG.platformFeeReceiver,
      phases
    );

    console.log('✅ Transaction submitted!');
    console.log('   TX Hash:', templateContract.deploymentTransaction().hash);
    console.log('');

    console.log('⏳ Waiting for deployment confirmation...');
    await templateContract.waitForDeployment();

    const templateAddress = await templateContract.getAddress();
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Template Contract Deployed Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📍 Template Address:', templateAddress);
    console.log('');

    // Save template address to config for approval step
    CONFIG.templateAddress = templateAddress;

  } catch (error) {
    console.error('');
    console.error('❌ Deployment failed!');
    console.error('   Error:', error.message);
    throw error;
  }

  // Wait a bit before approval
  console.log('⏳ Waiting 5 seconds before approval...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('');

  // ============================================================
  // STEP 2: APPROVE TEMPLATE IN FACTORY
  // ============================================================

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ STEP 2: Approving Template in Factory');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  console.log('📝 Approval Configuration:');
  console.log('   Factory:', CONFIG.factoryAddress);
  console.log('   Template:', CONFIG.templateAddress);
  console.log('   Bytecode Hash:', CONFIG.bytecodeHash);
  console.log('');

  // Check if already approved (shouldn't be, but just in case)
  try {
    const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
    if (isApproved) {
      console.log('⚠️  Template already approved (unexpected for new deployment)');
      const existingHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
      console.log('   Existing hash:', existingHash);
      
      if (existingHash.toLowerCase() === CONFIG.bytecodeHash.toLowerCase()) {
        console.log('✅ Hash already matches - no action needed!');
        return;
      }
    }
  } catch (error) {
    // Expected for new template
    console.log('📝 Template not yet approved (as expected)');
  }

  console.log('');
  console.log('🚀 Submitting approval transaction...');

  try {
    const tx = await factory.approveTemplate(
      CONFIG.templateAddress,
      CONFIG.bytecodeHash
    );
    
    console.log('✅ Transaction submitted!');
    console.log('   TX Hash:', tx.hash);
    console.log('');
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 DEPLOYMENT & APPROVAL COMPLETED SUCCESSFULLY!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📊 Summary:');
      console.log('');
      console.log('Template Contract:');
      console.log('  Address:', CONFIG.templateAddress);
      console.log('  Name:', templateConfig.name);
      console.log('  Symbol:', templateConfig.symbol);
      console.log('');
      console.log('Factory Approval:');
      console.log('  Factory:', CONFIG.factoryAddress);
      console.log('  Bytecode Hash:', CONFIG.bytecodeHash);
      console.log('  Block:', receipt.blockNumber);
      console.log('  Gas used:', receipt.gasUsed.toString());
      console.log('');
      console.log('Network:');
      console.log('  Chain:', CONFIG.chainName);
      console.log('  Chain ID:', CONFIG.chainId);
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📝 IMPORTANT: Save this template address!');
      console.log('');
      console.log('Add to your .env file:');
      console.log(`NEXT_PUBLIC_MEGAETH_TESTNET_ODDS_TEMPLATE_ADDRESS=${CONFIG.templateAddress}`);
      console.log('');
      console.log('Or update src/config/chains.ts:');
      console.log(`oddsTemplateAddress: "${CONFIG.templateAddress}"`);
      console.log('');
      console.log('🎉 You can now deploy collections on MegaETH Testnet V2!');
      console.log('');
    } else {
      throw new Error('Approval transaction failed with status 0');
    }
  } catch (error) {
    console.error('');
    console.error('❌ Approval failed!');
    console.error('   Error:', error.message);
    console.error('');
    console.error('⚠️  Template was deployed but approval failed!');
    console.error('   Template Address:', CONFIG.templateAddress);
    console.error('');
    console.error('You can manually approve later with:');
    console.error(`   node scripts/approve-template-megaeth-testnet.js`);
    console.error('');
    console.error('Make sure to set the template address first:');
    console.error(`   NEXT_PUBLIC_MEGAETH_TESTNET_ODDS_TEMPLATE_ADDRESS=${CONFIG.templateAddress}`);
    console.error('');
    throw error;
  }
}

// Run
deployAndApprove()
  .then(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Script completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Script failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('Error:', error.message);
    
    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check your seed phrase is correct');
    console.error('2. Ensure wallet has enough ETH for gas');
    console.error('3. Verify RPC URL is accessible');
    console.error('4. Check factory contract address is correct');
    console.error('');
    process.exit(1);
  });
