/**
 * Script to check if phases exist in the smart contract
 * Run with: node scripts/check-contract-phases.js <contractAddress> <chainId>
 */

const { ethers } = require('ethers');
const OddsLaunchpadABI = require('../abi/OddsLaunchpad.json');

// Chain configurations - synced with src/config/chains.ts
const SUPPORTED_CHAINS = {
  6343: {
    id: 6343,
    name: "MegaETH",
    rpcUrl: "https://timothy.megaeth.com/rpc",
    blockExplorer: "https://explorer.megaeth.com",
    isTestnet: false
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    rpcUrl: (process.env.INFURA_API_KEY ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}` : 'https://ethereum-sepolia-rpc.publicnode.com'),
    blockExplorer: "https://sepolia.etherscan.io",
    isTestnet: true
  }
};

async function checkContractPhases(contractAddress, chainId = 11155111) {
  try {
    console.log('🔍 Checking contract phases...');
    console.log('Contract:', contractAddress);
    console.log('Chain ID:', chainId);
    console.log('');

    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) {
      console.error(`❌ Unsupported chain ID: ${chainId}`);
      console.log('');
      console.log('Supported chains:');
      Object.entries(SUPPORTED_CHAINS).forEach(([id, config]) => {
        console.log(`  ${id.padEnd(10)} - ${config.name}`);
      });
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    console.log('✅ Connected to', chain.name);

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, provider);

    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      console.log('❌ No contract found at this address!');
      return;
    }
    console.log('✅ Contract exists');
    console.log('');

    // Get collection info
    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      const totalSupply = await contract.totalSupply();
      
      console.log('📋 Collection Info:');
      console.log('  Name:', name);
      console.log('  Symbol:', symbol);
      console.log('  Total Supply:', totalSupply.toString());
      console.log('');
    } catch (error) {
      console.log('⚠️  Could not fetch collection info:', error.message);
    }

    // Get active mint phases
    try {
      console.log('🎯 Fetching active mint phases...');
      const phases = await contract.getActivePhases();
      
      if (phases.length === 0) {
        console.log('❌ NO PHASES FOUND IN CONTRACT!');
        console.log('');
        console.log('This is why minting fails with InvalidPhaseId error.');
        console.log('You need to add phases to the contract first.');
        console.log('');
        console.log('Solutions:');
        console.log('1. Add phases through the admin panel');
        console.log('2. Use the contract\'s addMintPhase function');
        console.log('3. Sync phases from database to contract');
        return;
      }

      console.log(`✅ Found ${phases.length} phase(s) in contract:`);
      console.log('');

      phases.forEach((phase, index) => {
        console.log(`Phase ${index}:`);
        console.log('  Name:', phase.name);
        console.log('  Price:', ethers.formatEther(phase.price), 'ETH');
        console.log('  Max Supply:', phase.maxSupply.toString());
        console.log('  Current Supply:', phase.currentSupply.toString());
        console.log('  Max Per Wallet:', phase.maxPerWallet.toString());
        console.log('  Is Active:', phase.isActive);
        console.log('  Requires Whitelist:', phase.requiresWhitelist);
        console.log('  Start Time:', new Date(Number(phase.startTime) * 1000).toISOString());
        console.log('  End Time:', new Date(Number(phase.endTime) * 1000).toISOString());
        console.log('');
      });

    } catch (error) {
      console.log('❌ Error fetching phases:', error.message);
      console.log('');
      console.log('This could mean:');
      console.log('1. The contract doesn\'t have the getActivePhases function');
      console.log('2. There\'s a network issue');
      console.log('3. The contract is not properly deployed');
      console.log('');
      console.log('Trying alternative method: getAllPhases()...');
      
      try {
        const allPhases = await contract.getAllPhases();
        if (allPhases.length === 0) {
          console.log('❌ NO PHASES FOUND IN CONTRACT!');
          console.log('');
          console.log('This is why minting fails with InvalidPhaseId error.');
          console.log('You need to add phases to the contract first.');
        } else {
          console.log(`✅ Found ${allPhases.length} phase(s) in contract (using getAllPhases):`);
          console.log('');
          allPhases.forEach((phase, index) => {
            console.log(`Phase ${index}:`);
            console.log('  Name:', phase.name);
            console.log('  Price:', ethers.formatEther(phase.price), 'ETH');
            console.log('  Max Supply:', phase.maxSupply.toString());
            console.log('  Current Supply:', phase.currentSupply.toString());
            console.log('  Max Per Wallet:', phase.maxPerWallet.toString());
            console.log('  Is Active:', phase.isActive);
            console.log('  Requires Whitelist:', phase.requiresWhitelist);
            console.log('  Start Time:', new Date(Number(phase.startTime) * 1000).toISOString());
            console.log('  End Time:', new Date(Number(phase.endTime) * 1000).toISOString());
            console.log('');
          });
        }
      } catch (altError) {
        console.log('❌ getAllPhases also failed:', altError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node scripts/check-contract-phases.js <contractAddress> [chainId]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/check-contract-phases.js 0x1234... 11155111  # Sepolia (default)');
  console.log('  node scripts/check-contract-phases.js 0x1234... 6343      # MegaETH');
  console.log('');
  console.log('Supported Chain IDs:');
  Object.entries(SUPPORTED_CHAINS).forEach(([id, config]) => {
    const testnetLabel = config.isTestnet ? '(Testnet)' : '(Mainnet)';
    console.log(`  ${id.padEnd(10)} - ${config.name} ${testnetLabel}`);
  });
  process.exit(1);
}

const contractAddress = args[0];
const chainId = args[1] ? parseInt(args[1]) : 11155111; // Default to Sepolia

checkContractPhases(contractAddress, chainId);
