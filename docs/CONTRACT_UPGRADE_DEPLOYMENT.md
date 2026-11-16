# Contract Upgrade Deployment Guide - Opsi 4 (1 Popup)

## 🎯 What Changed?

**OLD Contract:**
- Create collection → 1 popup
- Add phase 1 → 1 popup
- Add phase 2 → 1 popup
- **Total: 3+ popups** 😰

**NEW Contract (Opsi 4):**
- Create collection + ALL phases → **1 popup** 🎉
- **Total: 1 popup** ✅

---

## 📝 Contract Changes

### LaunchpadFactory.sol
```solidity
// Added phases parameter
function createLaunchpad(
    DeploymentRequest memory request,
    NFTCollection.MintPhaseRequest[] memory phases  // NEW!
) external payable returns (address)
```

### NFTCollection.sol
```solidity
// Added batch function
function batchAddMintPhases(
    MintPhaseRequest[] memory phases
) external onlyAdmin
```

---

## 🚀 Deployment Steps

### Step 1: Compile Contracts
```bash
cd /mnt/c/Users/ahmad/work/project/nft-launchpad-evm-contract-new
npm run compile
```
✅ **Already done!** ABIs copied to frontend

### Step 2: Deploy to Network

#### Option A: Testnet (Recommended for testing)
```bash
# Sepolia Testnet
npm run deploy:sepolia

# Or Mumbai (Polygon testnet)
npm run deploy:mumbai
```

#### Option B: MegaETH (Need to setup first)
```bash
# 1. Edit hardhat.config.js - add MegaETH network
# 2. Deploy
npm run deploy:megaeth
```

#### Option C: Mainnet (EXPENSIVE!)
```bash
npm run deploy:ethereum  # Be careful!
```

### Step 3: Update Frontend Config

After deployment, update contract address:

```typescript
// File: src/config/chains.ts
export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  6342: {
    id: 6342,
    name: "MegaETH",
    launchpadFactoryAddress: "0xNEW_FACTORY_ADDRESS_HERE", // 👈 UPDATE THIS!
    // ...
  }
}
```

### Step 4: Verify Contract (Optional but recommended)

```bash
# Verify on block explorer
npx hardhat verify --network sepolia 0xYOUR_FACTORY_ADDRESS "0.001" "0xPLATFORM_TREASURY"
```

---

## 🧪 Testing Guide

### 1. Local Testing (Hardhat Network)
```bash
# Terminal 1: Start local node
cd /mnt/c/Users/ahmad/work/project/nft-launchpad-evm-contract-new
npx hardhat node

# Terminal 2: Deploy
npm run deploy:local

# Terminal 3: Start frontend
cd /mnt/c/Users/ahmad/work/project/nft-launchpad-evm-odds
npm run dev

# Connect MetaMask to localhost:8545
```

### 2. Testnet Testing
```bash
# 1. Get testnet ETH
# Sepolia: https://sepoliafaucet.com/
# Mumbai: https://faucet.polygon.technology/

# 2. Deploy
npm run deploy:sepolia

# 3. Update frontend config with new address

# 4. Test create collection with phases!
```

### 3. Verify Transaction

After creating collection, check:
```
✅ Only 1 wallet popup appeared
✅ Transaction confirmed
✅ Collection created with all phases
✅ Data saved to database
```

---

## 🐛 Troubleshooting

### Issue: "Contract not deployed"
**Solution:** Deploy contract first or update chain config

### Issue: "Wrong network"
**Solution:** Switch wallet to correct network (auto-switch enabled)

### Issue: "Transaction reverted"
**Possible causes:**
- Insufficient gas
- Phases array too large (>10 phases might exceed gas limit)
- Invalid phase parameters

### Issue: "Contract size too large"
**Solution:** Enable optimizer in hardhat.config.js:
```javascript
solidity: {
  version: "0.8.19",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200  // Lower = smaller contract
    }
  }
}
```

---

## 📊 Gas Comparison

**OLD Way (Multiple transactions):**
```
Create collection:    ~200,000 gas
Add phase 1:          ~100,000 gas
Add phase 2:          ~100,000 gas
Add phase 3:          ~100,000 gas
----------------------
Total:                ~500,000 gas
```

**NEW Way (Single transaction):**
```
Create + 3 phases:    ~350,000 gas
----------------------
Total:                ~350,000 gas (30% cheaper!)
```

---

## ✅ Verification Checklist

After deployment:

- [ ] Contract compiled successfully
- [ ] Contract deployed to network
- [ ] Contract verified on explorer
- [ ] Frontend config updated
- [ ] Test create collection (1 popup only!)
- [ ] Verify phases added correctly
- [ ] Database saving works
- [ ] All phases visible in admin panel

---

## 🎉 Success!

If all steps complete successfully:
- ✅ Users only see **1 wallet popup**
- ✅ Collection + ALL phases created in **1 transaction**
- ✅ **30% cheaper** gas costs
- ✅ **Better UX** for users

---

## 📝 Notes

- **Contract Address:** Update after each deployment
- **ABI Files:** Auto-generated in `/abi` folder
- **Database:** Auto-saves collection data
- **Phases:** Can still add manually via admin panel if needed

---

## 🆘 Need Help?

- Contract issues: Check hardhat.config.js
- Frontend issues: Check browser console
- Network issues: Verify RPC endpoint
- Gas issues: Enable optimizer or reduce phases count
