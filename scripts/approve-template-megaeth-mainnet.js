/**
 * Script untuk approve BYTECODE HASH di MegaETH Mainnet (Chain ID: 4326)
 * 
 * PENTING: Anda TIDAK perlu deploy template contract lagi!
 * Script ini hanya approve bytecode hash baru di factory.
 * 
 * Workflow:
 * 1. Update code OddsLaunchpad (jika ada perubahan)
 * 2. Run: node update-bytecode-with-hash.js (update bytecode & hash)
 * 3. Run: node scripts/approve-template-megaeth-mainnet.js (approve hash baru)
 * 
 * Template address tetap sama: 0x8214c3755126f11Ad093BD491C3d3974A7244415
 * Factory Contract: 0x779E3426cCF433746c686caFf67e33B92A9b8B2c
 * 
 * Usage:
 *   node scripts/approve-template-megaeth-mainnet.js
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

// Load Factory ABI
const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');

// Load bytecode hash
const { ODDS_LAUNCHPAD_BYTECODE_HASH } = require('../abi/OddsLaunchpadBytecode.ts');

// Configuration untuk MegaETH Mainnet
const CONFIG = {
  chainId: 4326,
  chainName: 'MegaETH Mainnet',
  rpcUrl: (process.env.MEGAETH_MAINNET_RPC_URL || 'https://mainnet.megaeth.com/rpc'),
  factoryAddress: '0x779E3426cCF433746c686caFf67e33B92A9b8B2c',
  
  // Template address - OddsLaunchpad contract yang sudah di-deploy
  // Ini adalah contract yang sama dengan yang digunakan di testnet
  // Jika Anda ingin menggunakan template address yang berbeda, ganti di sini
  templateAddress: process.env.NEXT_PUBLIC_MEGAETH_MAINNET_ODDS_TEMPLATE_ADDRESS || '0xFDFeB928C2379444154250C22e6eE0c8d53e0DC1',
  
  // Bytecode hash dari OddsLaunchpadBytecode.ts
  bytecodeHash: ODDS_LAUNCHPAD_BYTECODE_HASH,
  
  // Seed phrase - HARDCODED (ganti manual sebelum run)
  seedPhrase: 'bacon online network blue thought bitter funny refuse fan switch pioneer waste'
};

async function approveTemplate() {
  console.log('🔄 Approving Bytecode Hash on MegaETH Mainnet');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chain:', CONFIG.chainName);
  console.log('Chain ID:', CONFIG.chainId);
  console.log('RPC URL:', CONFIG.rpcUrl.substring(0, 50) + '...');
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
  console.log('Bytecode Hash:', CONFIG.bytecodeHash);
  console.log('');
  console.log('ℹ️  Note: Template address tetap sama, hanya hash yang di-update');
  console.log('');

  // Validate configuration
  if (!CONFIG.templateAddress) {
    throw new Error(
      '❌ Template address not configured!\n' +
      'Default template: 0x8214c3755126f11Ad093BD491C3d3974A7244415\n' +
      'You can override by setting NEXT_PUBLIC_MEGAETH_MAINNET_ODDS_TEMPLATE_ADDRESS in .env\n' +
      'Or update CONFIG.templateAddress in this script'
    );
  }

  if (CONFIG.seedPhrase === 'YOUR_SEED_PHRASE_HERE_REPLACE_WITH_ACTUAL_12_OR_24_WORDS') {
    throw new Error(
      '❌ Seed phrase not configured!\n' +
      'Please update CONFIG.seedPhrase in this script with your actual seed phrase'
    );
  }

  // Connect to provider
  console.log('🔌 Connecting to MegaETH Mainnet...');
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  
  // Test connection
  try {
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name || 'Unknown');
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
  console.log('');

  // Check balance
  console.log('💰 Checking balance...');
  const balance = await provider.getBalance(wallet.address);
  console.log('   Balance:', ethers.formatEther(balance), 'ETH');
  
  if (balance === 0n) {
    console.warn('⚠️  Warning: Wallet has zero balance!');
    console.warn('   Make sure you have enough ETH for gas fees');
  }
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Check if already approved
  console.log('🔍 Checking current approval status...');
  try {
    const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
    
    if (isApproved) {
      const existingHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
      console.log('✅ Template already approved!');
      console.log('   Existing hash:', existingHash);
      console.log('');
      
      if (existingHash.toLowerCase() === CONFIG.bytecodeHash.toLowerCase()) {
        console.log('✅ Hash matches - no action needed!');
        console.log('   Template is ready to use!');
        return;
      } else {
        console.log('⚠️  Hash mismatch detected!');
        console.log('   Approved hash:', existingHash);
        console.log('   Current hash: ', CONFIG.bytecodeHash);
        console.log('');
        console.log('📝 Updating approval with new bytecode hash...');
      }
    } else {
      console.log('📝 Template not yet approved');
      console.log('   Proceeding with approval...');
    }
  } catch (error) {
    console.log('⚠️  Could not check approval status:', error.message);
    console.log('   Proceeding with approval anyway...');
  }
  console.log('');

  // Approve template
  console.log('📝 Submitting approval transaction...');
  console.log('   Template:', CONFIG.templateAddress);
  console.log('   Hash:', CONFIG.bytecodeHash);
  console.log('');

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
      console.log('✅ Template approved successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Transaction Details:');
      console.log('  Block:', receipt.blockNumber);
      console.log('  Gas used:', receipt.gasUsed.toString());
      console.log('  TX Hash:', receipt.hash);
      console.log('');
      console.log('Approved Configuration:');
      console.log('  Template:', CONFIG.templateAddress);
      console.log('  Bytecode Hash:', CONFIG.bytecodeHash);
      console.log('  Factory:', CONFIG.factoryAddress);
      console.log('  Chain:', CONFIG.chainName, '(Chain ID:', CONFIG.chainId + ')');
      console.log('');
      console.log('🎉 You can now deploy OddsLaunchpad collections on MegaETH Mainnet!');
    } else {
      throw new Error('Transaction failed with status 0');
    }
  } catch (error) {
    console.error('');
    console.error('❌ Transaction failed!');
    console.error('   Error:', error.message);
    
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    
    if (error.reason) {
      console.error('   Reason:', error.reason);
    }
    
    throw error;
  }
}

// Run
approveTemplate()
  .then(() => {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Script completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Next steps:');
    console.log('1. Create collection via Creator Studio');
    console.log('2. Factory will deploy using this approved template');
    console.log('3. Collection will appear in your dashboard');
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
    console.error('3. Verify template address is deployed');
    console.error('4. Check factory contract address is correct');
    console.error('5. Verify RPC URL is accessible');
    console.error('');
    process.exit(1);
  });
