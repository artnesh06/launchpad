/**
 * Verify Merkle Proof Locally
 * 
 * This script verifies if the merkle proof is valid
 */

const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');
const { keccak256 } = require('ethers');

const userAddress = '0x9a299b9aaa23198589e284f269bb3a546acfc137';
const allocation = 1;

// Create merkle tree with dummy address (same as WhitelistManager)
const whitelistEntries = [
  { address: userAddress, allocation: allocation },
  { address: '0x0000000000000000000000000000000000000000', allocation: 0 }
];

console.log('🌳 Creating merkle tree...');
console.log('Entries:', whitelistEntries);

const leaves = whitelistEntries.map(entry => {
  const leaf = keccak256(
    ethers.solidityPacked(
      ['address', 'uint256'],
      [entry.address, entry.allocation]
    )
  );
  console.log(`Leaf for ${entry.address} (${entry.allocation}):`, leaf);
  return leaf;
});

const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const merkleRoot = merkleTree.getHexRoot();

console.log('\n📋 Merkle Root:', merkleRoot);
console.log('Expected:', '0xefe8b1403d2dd055421d124011d6d1ac85717e01edced8443e1e65104c1ff0de');
console.log('Match:', merkleRoot.toLowerCase() === '0xefe8b1403d2dd055421d124011d6d1ac85717e01edced8443e1e65104c1ff0de');

// Get proof for user address
const userLeaf = keccak256(
  ethers.solidityPacked(
    ['address', 'uint256'],
    [userAddress, allocation]
  )
);

console.log('\n🔍 User Leaf:', userLeaf);

const proof = merkleTree.getHexProof(userLeaf);
console.log('Proof:', proof);
console.log('Proof length:', proof.length);

// Verify proof
const isValid = merkleTree.verify(proof, userLeaf, merkleRoot);
console.log('\n✅ Proof valid:', isValid);

// Try to manually verify like the contract would
console.log('\n🔧 Manual verification (simulating contract):');
let computedHash = userLeaf;
console.log('Starting with leaf:', computedHash);

for (let i = 0; i < proof.length; i++) {
  const proofElement = proof[i];
  console.log(`\nStep ${i + 1}:`);
  console.log('  Current hash:', computedHash);
  console.log('  Proof element:', proofElement);
  
  // Sort pair (same as contract)
  if (computedHash < proofElement) {
    computedHash = keccak256(ethers.concat([computedHash, proofElement]));
    console.log('  Combined (hash < proof):', computedHash);
  } else {
    computedHash = keccak256(ethers.concat([proofElement, computedHash]));
    console.log('  Combined (proof < hash):', computedHash);
  }
}

console.log('\n📊 Final computed root:', computedHash);
console.log('Expected root:', merkleRoot);
console.log('Match:', computedHash.toLowerCase() === merkleRoot.toLowerCase());
