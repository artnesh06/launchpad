# Whitelist Single Address Issue

## Problem

When creating a launchpad with only **1 address** in the whitelist CSV, minting fails with error:
```
"Not whitelisted"
```

## Root Cause

1. **Merkle Tree with 1 element** generates an **empty proof array** `[]`
2. This is mathematically correct (root === leaf for single element)
3. However, the **smart contract** may not handle empty proof correctly
4. Contract expects at least 1 proof element for verification

## Solution

### Option 1: Add Dummy Address (Recommended)

Add a second dummy address to your whitelist CSV:

```csv
address,allocation
0x9a299b9aaa23198589e284f269bb3a546acfc137,10
0x0000000000000000000000000000000000000001,1
```

This ensures the merkle tree has 2+ elements and generates valid proofs.

### Option 2: Use Public Phase

If you only have 1 whitelisted address, consider using a **Public Phase** instead with `maxPerWallet` limit.

### Option 3: Update Smart Contract

Update the contract's merkle verification logic to handle empty proofs:

```solidity
function _verifyMerkleProof(
    bytes32[] memory proof,
    bytes32 root,
    bytes32 leaf
) internal pure returns (bool) {
    // Handle single element tree (empty proof)
    if (proof.length == 0) {
        return root == leaf;
    }
    
    // Standard merkle proof verification
    return MerkleProof.verify(proof, root, leaf);
}
```

## Testing

Test merkle tree behavior:
```bash
node test-merkle.js
```

This shows:
- Single element: proof length = 0 ✅
- Two elements: proof length = 1 ✅
- Verification works in both cases ✅

## Workaround Implementation

The system now:
1. ✅ Saves whitelist data to database
2. ✅ Generates merkle root correctly
3. ✅ Provides API to get merkle proof
4. ✅ Sends proof to smart contract

If you encounter "Not whitelisted" error with single address:
- Add a dummy address to your CSV
- Or use 2+ real addresses
- Or switch to Public phase
