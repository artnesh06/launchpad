/**
 * Re-approve template with current bytecode
 * Run this when you get "Bytecode hash mismatch" error
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load ABIs and bytecode
const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');

// Read bytecode from TypeScript file
const bytecodeFileContent = fs.readFileSync(path.join(__dirname, '../abi/OddsLaunchpadBytecode.ts'), 'utf8');
const bytecodeMatch = bytecodeFileContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);
if (!bytecodeMatch) {
  throw new Error('Could not extract bytecode from OddsLaunchpadBytecode.ts');
}
const ODDS_LAUNCHPAD_BYTECODE = bytecodeMatch[1];

// Load environment variables
require('dotenv').config();

// Configuration
const CONFIG = {
  chainId: 11155111, // Sepolia
  rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
  factoryAddress: '0xB759B92CB8493342ABD53103E2Db5cd20E549975',
  templateAddress: '0x8214c3755126f11Ad093BD491C3d3974A7244415',
  privateKey: process.env.PRIVATE_KEY || '',
  seedPhrase: process.env.SEED_PHRASE || process.env.MNEMONIC || ''
};

async function reApproveTemplate() {
  console.log('🔄 Re-approving OddsLaunchpad Template');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chain ID:', CONFIG.chainId);
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
  console.log('');

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  
  // Create wallet from private key or seed phrase
  let wallet;
  if (CONFIG.privateKey) {
    console.log('Using PRIVATE_KEY from environment');
    wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  } else if (CONFIG.seedPhrase) {
    console.log('Using SEED_PHRASE from environment');
    wallet = ethers.Wallet.fromPhrase(CONFIG.seedPhrase, provider);
  } else {
    throw new Error(
      'No wallet credentials found!\n' +
      'Please set one of:\n' +
      '  - PRIVATE_KEY="0x..." in .env\n' +
      '  - SEED_PHRASE="word1 word2 ..." in .env\n' +
      '  - MNEMONIC="word1 word2 ..." in .env'
    );
  }
  
  console.log('Deployer:', wallet.address);
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Calculate current bytecode hash
  const currentHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
  console.log('Current bytecode hash:', currentHash);
  console.log('Bytecode length:', ODDS_LAUNCHPAD_BYTECODE.length);
  console.log('');

  // Check existing approval
  try {
    const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
    if (isApproved) {
      const existingHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
      console.log('Existing approved hash:', existingHash);
      console.log('');
      
      if (existingHash === currentHash) {
        console.log('✅ Hash already matches - no action needed');
        return;
      } else {
        console.log('⚠️  Hash mismatch detected!');
        console.log('   Approved:', existingHash);
        console.log('   Current: ', currentHash);
        console.log('');
        console.log('📝 Updating approval with new bytecode hash...');
      }
    }
  } catch (error) {
    console.log('Checking approval status...');
  }

  // Re-approve template with current bytecode
  console.log('📝 Approving template with current bytecode...');
  console.log('');

  const tx = await factory.approveTemplate(CONFIG.templateAddress, currentHash);
  console.log('Transaction:', tx.hash);
  
  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log('✅ Template re-approved successfully!');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('');
    console.log('New approved hash:', currentHash);
  } else {
    console.log('❌ Transaction failed');
    process.exit(1);
  }
}

// Run
reApproveTemplate()
  .then(() => {
    console.log('');
    console.log('✅ Done! You can now deploy collections.');
    console.log('The bytecode hash now matches.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  });
