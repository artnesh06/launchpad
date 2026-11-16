/**
 * Script to approve OddsLaunchpad template in MasterContractFactory
 * Run this ONCE before deploying collections via factory
 */

import { ethers } from 'ethers';
import MasterContractFactoryABI from '../abi/OddsLaunchpadFactory.json' assert { type: 'json' };
import { ODDS_LAUNCHPAD_BYTECODE } from '../abi/OddsLaunchpadBytecode.js';
import { getChainConfig } from '../src/config/chains.js';

async function approveTemplate() {
  // Configuration
  const chainId = 11155111; // Sepolia - change as needed
  const chainConfig = getChainConfig(chainId);
  
  if (!chainConfig) {
    throw new Error(`Chain ${chainId} not configured`);
  }

  const factoryAddress = chainConfig.launchpadFactoryAddress;
  const templateAddress = chainConfig.oddsTemplateAddress;

  if (!factoryAddress || !templateAddress) {
    throw new Error('Factory or template address not configured');
  }

  console.log('🔧 Approving OddsLaunchpad Template');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chain:', chainConfig.name);
  console.log('Factory:', factoryAddress);
  console.log('Template:', templateAddress);
  console.log('');

  // Connect to provider
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not set in environment');
  }

  const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log('Deployer:', wallet.address);
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Calculate bytecode hash
  const bytecodeHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
  console.log('Bytecode hash:', bytecodeHash);
  console.log('');

  // Check if already approved
  const isApproved = await factory.getTemplateApproved(templateAddress);
  if (isApproved) {
    const existingHash = await factory.getTemplateBytecodeHash(templateAddress);
    console.log('✅ Template already approved!');
    console.log('Existing hash:', existingHash);
    
    if (existingHash === bytecodeHash) {
      console.log('✅ Hash matches - no action needed');
      return;
    } else {
      console.log('⚠️  Hash mismatch - updating...');
    }
  }

  // Approve template
  console.log('📝 Approving template...');
  const tx = await factory.approveTemplate(templateAddress, bytecodeHash);
  console.log('Transaction:', tx.hash);
  
  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log('✅ Template approved successfully!');
    console.log('Block:', receipt.blockNumber);
  } else {
    console.log('❌ Transaction failed');
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
    process.exit(1);
  });
