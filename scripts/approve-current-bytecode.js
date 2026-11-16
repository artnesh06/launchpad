/**
 * Simple script to approve current bytecode hash
 * No complex imports - just approve the hash directly
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

// Load Factory ABI
const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');

// Configuration
const CONFIG = {
  chainId: 6343,
  rpcUrl: process.env.MEGAETH_RPC_URL || 'https://timothy.megaeth.com/rpc',
  factoryAddress: '0xC4488DB515E6FBAbB5de3a593FF65075afD17b53',
  templateAddress: '0xCC99E1Fda81a63CED1A8cEB7A579825eDF0F750b',
  
  // CURRENT BYTECODE HASH (from error message)
  // Update this if you get a different hash in error
  // Hash dari aplikasi yang sedang running di Vercel
  currentBytecodeHash: '0x9fa52f3fe183754a0d408b103bc80b0b7d8bd5461c316e0e3cca5634cc37df07'
};

async function approveCurrentBytecode() {
  console.log('🔄 Approving Current Bytecode Hash');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chain ID:', CONFIG.chainId);
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
  console.log('Hash to approve:', CONFIG.currentBytecodeHash);
  console.log('');

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  
  // Create wallet from seed phrase (using index 1)
  let wallet;
  if (process.env.PRIVATE_KEY) {
    console.log('✅ Using PRIVATE_KEY from .env');
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else if (process.env.SEED_PHRASE || process.env.MNEMONIC) {
    const seedPhrase = process.env.SEED_PHRASE || process.env.MNEMONIC;
    console.log('✅ Using SEED_PHRASE from .env (index 1)');
    const mnemonic = ethers.Mnemonic.fromPhrase(seedPhrase);
    const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0/1"); // Index 1
    wallet = hdNode.connect(provider);
  } else {
    throw new Error(
      '❌ No wallet credentials found in .env!\n' +
      'Add one of:\n' +
      '  PRIVATE_KEY="0x..."\n' +
      '  SEED_PHRASE="word1 word2 ..."\n' +
      '  MNEMONIC="word1 word2 ..."'
    );
  }
  
  console.log('Wallet address:', wallet.address);
  console.log('   Derivation path: m/44\'/60\'/0\'/0/1 (index 1)');
  console.log('   Expected address: 0xbbD4fedbF4b3F0dfFa7DE8c0BF3C87Bcbfdc4207');
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Check current approval
  try {
    const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
    if (isApproved) {
      const existingHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
      console.log('Current approved hash:', existingHash);
      
      if (existingHash.toLowerCase() === CONFIG.currentBytecodeHash.toLowerCase()) {
        console.log('✅ Hash already matches - no action needed!');
        return;
      } else {
        console.log('⚠️  Hash mismatch - updating...');
        console.log('   Old:', existingHash);
        console.log('   New:', CONFIG.currentBytecodeHash);
      }
    }
  } catch (error) {
    console.log('Checking current approval...');
  }

  console.log('');
  console.log('📝 Approving template with hash:', CONFIG.currentBytecodeHash);
  console.log('');

  // Approve
  const tx = await factory.approveTemplate(
    CONFIG.templateAddress,
    CONFIG.currentBytecodeHash
  );
  
  console.log('Transaction:', tx.hash);
  console.log('⏳ Waiting for confirmation...');
  
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log('');
    console.log('✅ Template approved successfully!');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('');
    console.log('Approved hash:', CONFIG.currentBytecodeHash);
  } else {
    throw new Error('Transaction failed');
  }
}

// Run
approveCurrentBytecode()
  .then(() => {
    console.log('');
    console.log('✅ Done! You can now deploy collections.');
    console.log('The bytecode hash is now approved.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    process.exit(1);
  });
