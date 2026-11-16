/**
 * Script to check if a contract is deployed at a specific address
 * Usage: node scripts/check-contract-deployment.js
 */

const { ethers } = require('ethers');

async function checkContractDeployment() {
  // Configuration
  const contractAddress = '0x3b11d7966b4206ccd01f10d7691e00b3d46f60a7';
  const rpcUrl = (process.env.MEGAETH_MAINNET_RPC_URL || 'https://mainnet.megaeth.com/rpc');

  console.log('🔍 Checking contract deployment...');
  console.log('📍 Contract Address:', contractAddress);
  console.log('🌐 RPC URL:', rpcUrl.substring(0, 50) + '...');
  console.log('');

  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Check network connection
    console.log('⏳ Connecting to network...');
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, '(Chain ID:', network.chainId.toString() + ')');
    console.log('');

    // Get contract code
    console.log('⏳ Fetching contract bytecode...');
    const code = await provider.getCode(contractAddress);

    // Check if contract is deployed
    if (code === '0x') {
      console.log('❌ CONTRACT NOT DEPLOYED');
      console.log('⚠️  No bytecode found at this address');
      console.log('');
      console.log('Possible reasons:');
      console.log('  1. Contract has not been deployed yet');
      console.log('  2. Wrong contract address');
      console.log('  3. Wrong network/chain');
      return false;
    } else {
      console.log('✅ CONTRACT IS DEPLOYED');
      console.log('📦 Bytecode length:', code.length, 'characters');
      console.log('📦 Bytecode size:', Math.floor(code.length / 2), 'bytes');
      console.log('');
      console.log('First 100 characters of bytecode:');
      console.log(code.substring(0, 100) + '...');
      return true;
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Full error:', error);
    return false;
  }
}

// Run the check
checkContractDeployment()
  .then((isDeployed) => {
    console.log('');
    console.log('='.repeat(50));
    console.log('Result:', isDeployed ? '✅ Deployed' : '❌ Not Deployed');
    console.log('='.repeat(50));
    process.exit(isDeployed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
