/**
 * Script to approve OddsLaunchpad template in MasterContractFactory
 * Run this ONCE before deploying collections via factory
 * 
 * Usage: 
 *   node scripts/approve-template.js              # MegaETH (default - 6343)
 *   node scripts/approve-template.js 6343         # MegaETH (new factory)
 *   node scripts/approve-template.js 11155111     # Sepolia
 *   node scripts/approve-template.js 10143        # Monad Testnet
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

// Load ABIs and bytecode
const MasterContractFactoryABI = require('../abi/OddsLaunchpadFactory.json');

// Read bytecode from file
const bytecodeFileContent = fs.readFileSync(path.join(__dirname, '../abi/OddsLaunchpadBytecode.ts'), 'utf8');
const bytecodeMatch = bytecodeFileContent.match(/export const ODDS_LAUNCHPAD_BYTECODE = '(0x[a-fA-F0-9]+)'/);
if (!bytecodeMatch) {
  throw new Error('Could not extract bytecode from OddsLaunchpadBytecode.ts');
}
const ODDS_LAUNCHPAD_BYTECODE = bytecodeMatch[1];

// Chain configurations
const CHAIN_CONFIGS = {
  6343: {
    chainId: 6343,
    chainName: 'MegaETH',
    rpcUrl: process.env.NEXT_PUBLIC_MEGAETH_RPC_URL || 'https://timothy.megaeth.com/rpc',
    factoryAddress: process.env.NEXT_PUBLIC_MEGAETH_FACTORY_ADDRESS || '0x41bBbCCcbc34dDe370593aBD3102327B299315b1',
    templateAddress: process.env.NEXT_PUBLIC_MEGAETH_ODDS_TEMPLATE_ADDRESS || '', // Will be set after deployment
    nativeCurrency: 'ETH'
  },
  6343: {
    chainId: 6343,
    chainName: 'MegaETH',
    rpcUrl: process.env.NEXT_PUBLIC_MEGAETH_RPC_URL || 'https://timothy.megaeth.com/rpc',
    factoryAddress: process.env.NEXT_PUBLIC_MEGAETH_6343_FACTORY_ADDRESS || '0x142913cBaa155F35d063e99e03Dcb191219Db3c1',
    templateAddress: process.env.NEXT_PUBLIC_MEGAETH_6343_ODDS_TEMPLATE_ADDRESS || '', // Will be set after deployment
    nativeCurrency: 'ETH'
  },
  11155111: {
    chainId: 11155111,
    chainName: 'Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || (process.env.INFURA_API_KEY ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` : 'https://ethereum-sepolia-rpc.publicnode.com'),
    factoryAddress: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS || '0xB759B92CB8493342ABD53103E2Db5cd20E549975',
    templateAddress: process.env.NEXT_PUBLIC_SEPOLIA_ODDS_TEMPLATE_ADDRESS || '0x8214c3755126f11Ad093BD491C3d3974A7244415',
    nativeCurrency: 'ETH'
  },
  10143: {
    chainId: 10143,
    chainName: 'Monad Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || (process.env.ALCHEMY_API_KEY ? `https://monad-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : 'https://testnet-rpc.monad.xyz'),
    factoryAddress: process.env.NEXT_PUBLIC_MONAD_FACTORY_ADDRESS || '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    templateAddress: process.env.NEXT_PUBLIC_MONAD_ODDS_TEMPLATE_ADDRESS || '0x8214c3755126f11Ad093BD491C3d3974A7244415',
    nativeCurrency: 'MON'
  }
};

// Get chain ID from command line argument or default to MegaETH
const chainId = process.argv[2] ? parseInt(process.argv[2]) : 6343;
const CONFIG = CHAIN_CONFIGS[chainId];

if (!CONFIG) {
  console.error('❌ Unsupported chain ID:', chainId);
  console.error('Supported chains:', Object.keys(CHAIN_CONFIGS).join(', '));
  process.exit(1);
}

async function approveTemplate() {
  console.log('🔧 Approving OddsLaunchpad Template');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chain:', CONFIG.chainName);
  console.log('Chain ID:', CONFIG.chainId);
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
  console.log('');

  // Validate configuration
  if (!CONFIG.templateAddress) {
    throw new Error(
      `Template address not configured for ${CONFIG.chainName}!\n` +
      `Please set NEXT_PUBLIC_${CONFIG.chainName.toUpperCase().replace(/\s+/g, '_')}_ODDS_TEMPLATE_ADDRESS in .env`
    );
  }

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
  console.log('Balance:', ethers.formatEther(balance), CONFIG.nativeCurrency);
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Calculate bytecode hash
  const bytecodeHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
  console.log('📦 Bytecode Info:');
  console.log('Hash:', bytecodeHash);
  console.log('Length:', ODDS_LAUNCHPAD_BYTECODE.length, 'bytes');
  console.log('');

  // Check if already approved
  try {
    const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
    if (isApproved) {
      const existingHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
      console.log('✅ Template already approved!');
      console.log('Existing hash:', existingHash);
      console.log('');
      
      if (existingHash === bytecodeHash) {
        console.log('✅ Hash matches - no action needed');
        console.log('Template is ready to use!');
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
  console.log('Please confirm the transaction in your wallet.');
  console.log('');

  const tx = await factory.approveTemplate(CONFIG.templateAddress, bytecodeHash);
  console.log('✅ Transaction submitted!');
  console.log('Hash:', tx.hash);
  console.log('');
  
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
    console.log(`🎉 You can now deploy OddsLaunchpad collections on ${CONFIG.chainName}!`);
  } else {
    console.log('❌ Transaction failed');
    process.exit(1);
  }
}

// Run
approveTemplate()
  .then(() => {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Done!');
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
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    console.error('');
    process.exit(1);
  });
