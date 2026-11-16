/**
 * Debug Transaction Revert Reason
 * 
 * This script attempts to get the revert reason from a failed transaction
 */

const { ethers } = require('ethers');
require('dotenv').config();

const OddsLaunchpadFactoryABI = require('../abi/OddsLaunchpadFactory.json');

// Configuration
const TX_HASH = process.argv[2] || '0xf8968e8d36d24341e8fddad7ce73d150d6a42bc7d71f4e330fb7f691b47223ad';
const RPC_URL = process.env.MEGAETH_RPC_URL || 'https://timothy.megaeth.com/rpc';
const FACTORY_ADDRESS = process.env.MEGAETH_FACTORY_ADDRESS || '0xC4488DB515E6FBAbB5de3a593FF65075afD17b53';

async function debugTransaction() {
  console.log('🔍 Debugging Transaction Revert\n');
  console.log('Transaction Hash:', TX_HASH);
  console.log('RPC URL:', RPC_URL);
  console.log('Factory Address:', FACTORY_ADDRESS);
  console.log('');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  try {
    // Get transaction receipt
    console.log('1️⃣ Fetching transaction receipt...');
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    
    if (!receipt) {
      console.log('❌ Transaction not found');
      return;
    }
    
    console.log('   Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas Used:', receipt.gasUsed.toString());
    console.log('   Gas Price:', receipt.gasPrice?.toString());
    console.log('   From:', receipt.from);
    console.log('   To:', receipt.to);
    
    if (receipt.status === 1) {
      console.log('\n✅ Transaction succeeded!');
      return;
    }
    
    // Get transaction data
    console.log('\n2️⃣ Fetching transaction data...');
    const tx = await provider.getTransaction(TX_HASH);
    
    if (!tx) {
      console.log('❌ Transaction data not found');
      return;
    }
    
    console.log('   Data length:', tx.data.length);
    
    // Try to replay transaction to get revert reason
    console.log('\n3️⃣ Attempting to replay transaction...');
    try {
      await provider.call({
        to: tx.to,
        from: tx.from,
        data: tx.data,
        gasLimit: tx.gasLimit,
        gasPrice: tx.gasPrice,
        value: tx.value
      }, receipt.blockNumber);
      
      console.log('   ⚠️  Replay succeeded (unexpected)');
    } catch (error) {
      console.log('   ❌ Replay failed (expected)');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
      
      // Try to decode error
      if (error.data) {
        console.log('\n4️⃣ Attempting to decode error data...');
        console.log('   Error data:', error.data);
        
        try {
          const iface = new ethers.Interface(OddsLaunchpadFactoryABI);
          
          // Try to parse as custom error
          const errorFragment = iface.parseError(error.data);
          if (errorFragment) {
            console.log('   ✅ Decoded custom error:');
            console.log('   Error name:', errorFragment.name);
            console.log('   Error args:', errorFragment.args);
          }
        } catch (decodeError) {
          console.log('   ⚠️  Could not decode error data');
          
          // Check for known error signatures
          const errorSignatures = {
            '0x': 'No error data (generic revert)',
            '0x08c379a0': 'Error(string) - revert with message',
            '0x4e487b71': 'Panic(uint256)',
          };
          
          const sig = error.data.slice(0, 10);
          if (errorSignatures[sig]) {
            console.log('   Known error signature:', errorSignatures[sig]);
            
            if (sig === '0x08c379a0') {
              // Decode revert message
              try {
                const reason = ethers.AbiCoder.defaultAbiCoder().decode(
                  ['string'],
                  '0x' + error.data.slice(10)
                )[0];
                console.log('   Revert message:', reason);
              } catch (e) {
                console.log('   Could not decode revert message');
              }
            }
          }
        }
      }
      
      // Check for specific error patterns
      console.log('\n5️⃣ Checking for common issues...');
      
      if (error.message.includes('insufficient funds')) {
        console.log('   ❌ Insufficient funds for gas');
      } else if (error.message.includes('nonce')) {
        console.log('   ❌ Nonce issue');
      } else if (error.message.includes('gas')) {
        console.log('   ❌ Gas-related issue');
      } else {
        console.log('   ⚠️  Unknown revert reason');
      }
    }
    
    // Check logs
    console.log('\n6️⃣ Checking transaction logs...');
    console.log('   Number of logs:', receipt.logs.length);
    
    if (receipt.logs.length === 0) {
      console.log('   ⚠️  No logs emitted (transaction reverted early)');
    }
    
    // Possible causes
    console.log('\n📋 Possible Causes:');
    console.log('   1. Template not approved (but we verified it is)');
    console.log('   2. Bytecode hash mismatch (but we verified it matches)');
    console.log('   3. Invalid constructor parameters');
    console.log('   4. Insufficient gas (gas used: ' + receipt.gasUsed.toString() + ')');
    console.log('   5. Contract deployment failed internally');
    console.log('   6. Access control issue (not trusted deployer)');
    console.log('   7. Invalid bytecode format');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

debugTransaction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
