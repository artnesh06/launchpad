/**
 * Update Merkle Root in Contract
 * 
 * This script updates the merkle root for a phase directly in the contract
 * 
 * Usage: node update-merkle-root.js <contractAddress> <phaseId> <privateKey>
 */

const { ethers } = require('ethers');
const OddsLaunchpadABI = require('./abi/OddsLaunchpad.json');

const contractAddress = process.argv[2];
const phaseId = parseInt(process.argv[3]);
const privateKey = process.argv[4];

if (!contractAddress || isNaN(phaseId)) {
  console.error('Usage: node update-merkle-root.js <contractAddress> <phaseId> <privateKey>');
  console.error('Example: node update-merkle-root.js 0xf9b4... 1 0xYourPrivateKey');
  process.exit(1);
}

const NEW_MERKLE_ROOT = '0xefe8b1403d2dd055421d124011d6d1ac85717e01edced8443e1e65104c1ff0de';

async function updateMerkleRoot() {
  try {
    console.log('🔧 Updating merkle root in contract...');
    console.log('   Contract:', contractAddress);
    console.log('   Phase ID:', phaseId);
    console.log('   New Merkle Root:', NEW_MERKLE_ROOT);
    
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
    
    if (!privateKey) {
      console.error('\n❌ Private key required!');
      console.error('Usage: node update-merkle-root.js <contractAddress> <phaseId> <privateKey>');
      console.error('\nOr use MetaMask through the UI at:');
      console.error('http://localhost:3000/l/' + contractAddress);
      process.exit(1);
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('   Wallet:', wallet.address);
    
    const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, wallet);
    
    // Check current merkle root
    console.log('\n📞 Checking current merkle root...');
    const phase = await contract.getMintPhase(phaseId);
    console.log('   Current:', phase.merkleRoot);
    
    if (phase.merkleRoot.toLowerCase() === NEW_MERKLE_ROOT.toLowerCase()) {
      console.log('\n✅ Merkle root is already correct! No update needed.');
      return;
    }
    
    // Update merkle root
    console.log('\n📝 Sending transaction to update merkle root...');
    const tx = await contract.updateMintPhaseMerkleRoot(phaseId, NEW_MERKLE_ROOT);
    console.log('   Transaction hash:', tx.hash);
    
    console.log('\n⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    
    // Verify
    console.log('\n🔍 Verifying update...');
    const updatedPhase = await contract.getMintPhase(phaseId);
    console.log('   New merkle root:', updatedPhase.merkleRoot);
    
    if (updatedPhase.merkleRoot.toLowerCase() === NEW_MERKLE_ROOT.toLowerCase()) {
      console.log('\n✅ SUCCESS! Merkle root updated correctly.');
      console.log('\n🎉 You can now mint NFTs!');
      console.log('   Go to: http://localhost:3000/l/' + contractAddress);
    } else {
      console.log('\n❌ Something went wrong. Merkle root not updated.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'CALL_EXCEPTION') {
      console.error('\nPossible reasons:');
      console.error('- You are not the owner/admin of the contract');
      console.error('- The phase ID is invalid');
      console.error('- The contract is paused');
    }
    process.exit(1);
  }
}

updateMerkleRoot();
