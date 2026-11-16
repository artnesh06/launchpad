/**
 * Approve OddsLaunchpad template on Monad Testnet
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

// Load ABIs
const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');

// Read bytecode
const bytecodeFileContent = fs.readFileSync(path.join(__dirname, '../abi/OddsLaunchpadBytecode.ts'), 'utf8');
const bytecodeMatch = bytecodeFileContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);
if (!bytecodeMatch) {
  throw new Error('Could not extract bytecode from OddsLaunchpadBytecode.ts');
}
const ODDS_LAUNCHPAD_BYTECODE = bytecodeMatch[1];

// Configuration
const CONFIG = {
  chainId: 10143,
  chainName: 'Monad Testnet',
  rpcUrl: process.env.MONAD_TESTNET_RPC_URL || (process.env.ALCHEMY_API_KEY ? `https://monad-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : 'https://testnet-rpc.monad.xyz'),
  factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
  templateAddress: '0x8214c3755126f11Ad093BD491C3d3974A7244415'
};

async function approveTemplate() {
  console.log('🔄 Approving OddsLaunchpad Template on Monad Testnet');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chain:', CONFIG.chainName);
  console.log('Chain ID:', CONFIG.chainId);
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
  console.log('');

  // Connect to provider
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  
  // Create wallet
  let wallet;
  if (process.env.PRIVATE_KEY) {
    console.log('Using PRIVATE_KEY from environment');
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else if (process.env.SEED_PHRASE || process.env.MNEMONIC) {
    console.log('Using SEED_PHRASE from environment');
    const seedPhrase = process.env.SEED_PHRASE || process.env.MNEMONIC;
    wallet = ethers.Wallet.fromPhrase(seedPhrase, provider);
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
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'MON');
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Calculate bytecode hash
  const bytecodeHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
  console.log('Bytecode hash:', bytecodeHash);
  console.log('Bytecode length:', ODDS_LAUNCHPAD_BYTECODE.length);
  console.log('');

  // Check existing approval
  try {
    const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
    if (isApproved) {
      const existingHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
      console.log('Existing approved hash:', existingHash);
      console.log('');
      
      if (existingHash === bytecodeHash) {
        console.log('✅ Template already approved with matching hash');
        console.log('No action needed!');
        return;
      } else {
        console.log('⚠️  Hash mismatch detected!');
        console.log('   Approved:', existingHash);
        console.log('   Current: ', bytecodeHash);
        console.log('');
        console.log('📝 Updating approval with new bytecode hash...');
      }
    } else {
      console.log('📝 Template not yet approved, approving now...');
    }
  } catch (error) {
    console.log('Checking approval status...');
  }

  console.log('');

  // Approve template
  console.log('📝 Approving template...');
  const tx = await factory.approveTemplate(CONFIG.templateAddress, bytecodeHash);
  console.log('Transaction:', tx.hash);
  
  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log('');
    console.log('✅ Template approved successfully!');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('');
    console.log('Approved hash:', bytecodeHash);
    console.log('');
    console.log('🎉 You can now deploy OddsLaunchpad collections on Monad Testnet!');
  } else {
    console.log('❌ Transaction failed');
    process.exit(1);
  }
}

// Run
approveTemplate()
  .then(() => {
    console.log('');
    console.log('✅ Done!');
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
