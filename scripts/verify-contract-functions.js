/**
 * Script untuk verifikasi fungsi-fungsi di smart contract
 */

const { ethers } = require('ethers');

const CONTRACT_ADDRESS = '0xB90D120Da012795D33B81CB67ec88183279C8f04';
const CHAIN_ID = 6343; // MegaETH Testnet V2

async function verifyContractFunctions() {
  try {
    console.log('🔍 Verifying Contract Functions...\n');
    console.log('Contract Address:', CONTRACT_ADDRESS);
    console.log('Chain ID:', CHAIN_ID, '(MegaETH Testnet V2)');
    console.log('='.repeat(60));

    // Setup provider - Use MegaETH RPC
    const rpcUrl = 'https://timothy.megaeth.com/rpc';
    console.log('\n🔗 Connecting to RPC:', rpcUrl);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Check if contract exists
    console.log('\n📋 Checking if contract exists...');
    const code = await provider.getCode(CONTRACT_ADDRESS);
    
    if (code === '0x') {
      console.log('❌ CONTRACT NOT DEPLOYED!');
      console.log('\nThis address has no contract code.');
      console.log('Possible reasons:');
      console.log('1. Contract belum di-deploy');
      console.log('2. Address salah');
      console.log('3. Wrong chain/network');
      return;
    }
    
    console.log('✅ Contract exists! Code length:', code.length, 'bytes');

    // Load ABI
    const OddsLaunchpadABI = require('./abi/OddsLaunchpad.json');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, OddsLaunchpadABI, provider);

    console.log('\n📊 Testing Contract Functions...\n');

    // Test 1: Basic read functions
    try {
      console.log('1. Testing name()...');
      const name = await contract.name();
      console.log('   ✅ Name:', name);
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

    try {
      console.log('\n2. Testing symbol()...');
      const symbol = await contract.symbol();
      console.log('   ✅ Symbol:', symbol);
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

    try {
      console.log('\n3. Testing totalSupply()...');
      const totalSupply = await contract.totalSupply();
      console.log('   ✅ Total Supply:', totalSupply.toString());
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

    try {
      console.log('\n4. Testing maxSupply()...');
      const maxSupply = await contract.maxSupply();
      console.log('   ✅ Max Supply:', maxSupply.toString());
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

    // Test 5: getAllPhases
    try {
      console.log('\n5. Testing getAllPhases()...');
      const phases = await contract.getAllPhases();
      console.log('   ✅ Phases count:', phases.length);
      
      if (phases.length === 0) {
        console.log('   ⚠️  WARNING: No phases configured in contract!');
        console.log('   This is why minting fails with InvalidPhaseId error.');
      } else {
        phases.forEach((phase, index) => {
          console.log(`\n   Phase ${index}:`);
          console.log(`     - Name: ${phase.name}`);
          console.log(`     - Price: ${ethers.formatEther(phase.price)} ETH`);
          console.log(`     - Max Supply: ${phase.maxSupply.toString()}`);
          console.log(`     - Current Supply: ${phase.currentSupply.toString()}`);
          console.log(`     - Is Active: ${phase.isActive}`);
          console.log(`     - Requires Whitelist: ${phase.requiresWhitelist}`);
        });
      }
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

    // Test 6: getUserMintedInPhase (the problematic function)
    try {
      console.log('\n6. Testing getUserMintedInPhase()...');
      const testAddress = '0x0000000000000000000000000000000000000001';
      const phaseId = 0;
      
      const userMinted = await contract.getUserMintedInPhase(phaseId, testAddress);
      console.log('   ✅ Function exists! User minted:', userMinted.toString());
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
      
      if (e.message.includes('could not decode result data')) {
        console.log('\n   🔍 DIAGNOSIS:');
        console.log('   This error means the function signature exists in ABI');
        console.log('   but the contract returned empty data (0x).');
        console.log('\n   Possible causes:');
        console.log('   1. Function does not exist in deployed contract');
        console.log('   2. Contract was deployed with old ABI');
        console.log('   3. Function reverted without error message');
        console.log('   4. Phase ID does not exist (no phases configured)');
      }
    }

    // Test 7: Check contract version/implementation
    try {
      console.log('\n7. Checking contract implementation...');
      
      // Try to get contract owner
      const owner = await contract.owner();
      console.log('   ✅ Owner:', owner);
      
    } catch (e) {
      console.log('   ❌ Failed to get owner:', e.message);
    }

    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('='.repeat(60));
    console.log('\nIf getUserMintedInPhase fails:');
    console.log('1. Contract might be deployed with old version');
    console.log('2. Need to redeploy contract with updated code');
    console.log('3. Or update frontend to not call this function');
    console.log('4. Check if phases are configured in contract');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyContractFunctions();
