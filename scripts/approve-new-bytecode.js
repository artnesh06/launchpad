/**
 * Approve New Bytecode
 * Calculate hash dari bytecode baru dan approve di factory
 */

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

const MasterContractFactoryABI = require('./abi/OddsLaunchpadFactory.json');

// Configuration
const CONFIG = {
  chainId: 11155111,
  rpcUrl: process.env.SEPOLIA_RPC_URL || (process.env.INFURA_API_KEY ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` : 'https://ethereum-sepolia-rpc.publicnode.com'),
  factoryAddress: '0xB759B92CB8493342ABD53103E2Db5cd20E549975',
  templateAddress: '0x8214c3755126f11Ad093BD491C3d3974A7244415'
};

async function main() {
  console.log('🔄 Approve New Bytecode');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Read bytecode
  const bytecodeFileContent = fs.readFileSync('./abi/OddsLaunchpadBytecode.ts', 'utf8');
  const bytecodeMatch = bytecodeFileContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);
  
  if (!bytecodeMatch) {
    throw new Error('Could not extract bytecode');
  }
  
  const bytecode = bytecodeMatch[1];
  const bytecodeHash = ethers.keccak256(bytecode);
  
  console.log('Bytecode length:', bytecode.length);
  console.log('Bytecode hash:', bytecodeHash);
  console.log('');
  
  // Connect
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
  
  console.log('Wallet:', wallet.address);
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
  console.log('');
  
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );
  
  // Check current
  console.log('📋 Checking current approval...');
  try {
    const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
    console.log('Template approved:', isApproved);
    
    if (isApproved) {
      const currentHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
      console.log('Current hash:', currentHash);
      console.log('New hash:    ', bytecodeHash);
      console.log('Match:', currentHash.toLowerCase() === bytecodeHash.toLowerCase());
      
      if (currentHash.toLowerCase() === bytecodeHash.toLowerCase()) {
        console.log('');
        console.log('✅ Bytecode already approved!');
        console.log('No action needed.');
        return;
      }
    }
  } catch (error) {
    console.log('Error checking:', error.message);
  }
  
  console.log('');
  console.log('📝 Approving new bytecode...');
  
  const tx = await factory.approveTemplate(
    CONFIG.templateAddress,
    bytecodeHash
  );
  
  console.log('TX:', tx.hash);
  console.log('⏳ Waiting...');
  
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log('');
    console.log('✅ Bytecode approved!');
    console.log('Block:', receipt.blockNumber);
    console.log('');
    console.log('You can now deploy collections with the new bytecode.');
  } else {
    console.log('❌ Transaction failed');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('');
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
