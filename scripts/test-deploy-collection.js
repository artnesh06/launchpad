/**
 * Test deployment of OddsLaunchpad via MasterContractFactory
 * This script helps debug the bytecode hash mismatch issue
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
  chainId: 11155111,
  rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
  factoryAddress: '0xB759B92CB8493342ABD53103E2Db5cd20E549975',
  templateAddress: '0x8214c3755126f11Ad093BD491C3d3974A7244415'
};

async function testDeploy() {
  console.log('🧪 Testing OddsLaunchpad Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Chain ID:', CONFIG.chainId);
  console.log('Factory:', CONFIG.factoryAddress);
  console.log('Template:', CONFIG.templateAddress);
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
  
  console.log('Deployer:', wallet.address);
  console.log('');

  // Get factory contract
  const factory = new ethers.Contract(
    CONFIG.factoryAddress,
    MasterContractFactoryABI,
    wallet
  );

  // Check template approval
  console.log('🔍 Checking template approval...');
  const isApproved = await factory.getTemplateApproved(CONFIG.templateAddress);
  console.log('Template approved:', isApproved);
  
  if (!isApproved) {
    console.log('❌ Template not approved!');
    console.log('Run: node scripts/approve-current-bytecode.js');
    process.exit(1);
  }

  const approvedHash = await factory.getTemplateBytecodeHash(CONFIG.templateAddress);
  const currentHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
  
  console.log('Approved hash:', approvedHash);
  console.log('Current hash: ', currentHash);
  console.log('Hashes match:', approvedHash === currentHash);
  console.log('');

  if (approvedHash !== currentHash) {
    console.log('❌ Bytecode hash mismatch!');
    console.log('Run: node scripts/approve-current-bytecode.js');
    process.exit(1);
  }

  // Prepare collection config
  const collectionConfig = {
    name: 'Test Collection',
    symbol: 'TEST',
    baseURI: 'ipfs://test/',
    unrevealedURI: 'ipfs://unrevealed/',
    contractURI: 'ipfs://contract/',
    externalLink: 'https://test.com',
    totalMaxSupply: 1000,
    treasury: wallet.address,
    royaltyRecipient: wallet.address,
    royaltyPercentage: 500, // 5%
    isRevealed: false,
    transfersEnabled: true,
    chainId: CONFIG.chainId
  };

  // Prepare phases
  const now = Math.floor(Date.now() / 1000);
  const phases = [{
    name: 'Public Sale',
    startTime: now,
    endTime: now + 86400 * 7, // 7 days
    price: ethers.parseEther('0.01'),
    maxSupply: 1000,
    maxPerWallet: 10,
    maxPerTransaction: 5,
    merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    isActive: true,
    requiresWhitelist: false,
    currentSupply: 0
  }];

  console.log('📦 Collection Config:');
  console.log('  Name:', collectionConfig.name);
  console.log('  Symbol:', collectionConfig.symbol);
  console.log('  Max Supply:', collectionConfig.totalMaxSupply);
  console.log('  Treasury:', collectionConfig.treasury);
  console.log('');
  console.log('📦 Phases:');
  console.log('  Count:', phases.length);
  console.log('  Phase 0:', phases[0].name);
  console.log('  Price:', ethers.formatEther(phases[0].price), 'ETH');
  console.log('  Max Supply:', phases[0].maxSupply);
  console.log('');

  // Get constructor ABI
  const constructorAbi = OddsLaunchpadABI.find(item => item.type === 'constructor');
  if (!constructorAbi) {
    throw new Error('Constructor not found in ABI');
  }

  console.log('📝 Constructor parameter types:');
  constructorAbi.inputs.forEach((input, i) => {
    console.log(`  ${i}: ${input.type} (${input.name})`);
  });
  console.log('');

  // Encode constructor arguments
  console.log('📝 Encoding constructor arguments...');
  
  try {
    // Use Interface to encode constructor arguments properly
    const iface = new ethers.Interface(OddsLaunchpadABI);
    const constructorArgsEncoded = iface.encodeDeploy([
      collectionConfig,
      wallet.address,
      phases
    ]).slice(2); // Remove '0x' prefix

    // Add '0x' prefix back
    const constructorArgsWithPrefix = '0x' + constructorArgsEncoded;
    
    console.log('✅ Constructor args encoded successfully');
    console.log('Encoded length:', constructorArgsWithPrefix.length);
    console.log('Encoded (first 100 chars):', constructorArgsWithPrefix.substring(0, 100) + '...');
    console.log('');

    // Estimate gas
    console.log('⛽ Estimating gas...');
    try {
      const gasEstimate = await factory.deployMasterContract.estimateGas(
        CONFIG.templateAddress,
        ODDS_LAUNCHPAD_BYTECODE,
        constructorArgsWithPrefix
      );
      console.log('✅ Gas estimate:', gasEstimate.toString());
      console.log('');

      // Deploy
      console.log('🚀 Deploying collection...');
      const tx = await factory.deployMasterContract(
        CONFIG.templateAddress,
        ODDS_LAUNCHPAD_BYTECODE,
        constructorArgsWithPrefix
      );

      console.log('Transaction:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('');
        console.log('✅ Collection deployed successfully!');
        console.log('Block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        
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

        if (deployedEvent) {
          const parsed = factory.interface.parseLog({
            topics: [...deployedEvent.topics],
            data: deployedEvent.data
          });
          console.log('');
          console.log('📍 Deployed contract address:', parsed.args.contractAddress);
        }
      } else {
        console.log('❌ Transaction failed');
        process.exit(1);
      }
    } catch (gasError) {
      console.error('');
      console.error('❌ Gas estimation failed!');
      console.error('Error:', gasError.message);
      
      if (gasError.data) {
        console.error('Error data:', gasError.data);
        
        // Try to decode error
        try {
          const errorData = gasError.data;
          console.error('');
          console.error('🔍 Decoding error...');
          
          // Check for known errors
          const errors = {
            '0x3386c01f': 'MasterContractFactory__InvalidBytecode',
            '0x5f15d672': 'MasterContractFactory__TemplateNotApproved',
            '0x1988bc51': 'MasterContractFactory__ZeroAddress',
            '0x0b921d43': 'MasterContractFactory__DeploymentFailed'
          };
          
          const errorSelector = errorData.substring(0, 10);
          const errorName = errors[errorSelector];
          
          if (errorName) {
            console.error('Error name:', errorName);
            
            if (errorName === 'MasterContractFactory__InvalidBytecode') {
              console.error('');
              console.error('💡 This means the bytecode hash verification failed in the factory.');
              console.error('   The factory calculates: keccak256(abi.encodePacked(_creationCodeWithoutArgs, _constructorArgs))');
              console.error('   And compares it with the approved hash.');
              console.error('');
              console.error('   Current bytecode hash:', currentHash);
              console.error('   Approved hash:        ', approvedHash);
              console.error('');
              console.error('   Possible causes:');
              console.error('   1. Bytecode includes constructor args (should be pure creation code)');
              console.error('   2. Constructor args encoding is incorrect');
              console.error('   3. Approved hash was calculated differently');
            }
          } else {
            console.error('Unknown error selector:', errorSelector);
          }
        } catch (decodeError) {
          console.error('Could not decode error');
        }
      }
      
      process.exit(1);
    }
  } catch (encodeError) {
    console.error('');
    console.error('❌ Failed to encode constructor arguments!');
    console.error('Error:', encodeError.message);
    process.exit(1);
  }
}

// Run
testDeploy()
  .then(() => {
    console.log('');
    console.log('✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  });
