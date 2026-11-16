# 📊 NFT Launchpad Contract - Summary & Quick Reference

## 🎯 FITUR UTAMA YANG WAJIB ADA

### 1️⃣ MULTI-PHASE MINTING SYSTEM
```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Whitelist Mint                                │
│  ├─ Start: 01/01/2025 7PM                              │
│  ├─ End: 07/01/2025 7PM                                │
│  ├─ Price: 0.05 ETH                                    │
│  ├─ Max Supply: 1,000                                  │
│  ├─ Max Per Wallet: 2                                  │
│  └─ Requires Whitelist: YES ✓                          │
├─────────────────────────────────────────────────────────┤
│  Phase 2: Public Mint                                   │
│  ├─ Start: 07/01/2025 7PM                              │
│  ├─ End: 30/01/2025 7PM                                │
│  ├─ Price: 0.08 ETH                                    │
│  ├─ Max Supply: 5,000                                  │
│  ├─ Max Per Wallet: 10                                 │
│  └─ Requires Whitelist: NO ✗                           │
└─────────────────────────────────────────────────────────┘
```

### 2️⃣ MERKLE TREE WHITELIST
```
CSV File → Frontend → Merkle Tree → Merkle Root → Contract
   ↓
0x123...,5
0x456...,3
0x789...,2
   ↓
Generate Tree
   ↓
Root: 0xabc...
   ↓
Store in Phase
   ↓
User Mint → Verify Proof → ✓ Allowed
```

### 3️⃣ PLATFORM FEE SYSTEM
```
Mint Price: 0.05 ETH × 2 NFTs = 0.10 ETH
Platform Fee: 0.10 ETH × 2.5% = 0.0025 ETH
─────────────────────────────────────────
Total Cost: 0.1025 ETH

Distribution:
├─ 0.10 ETH → Treasury (Creator)
└─ 0.0025 ETH → Platform Treasury
```


## 🔄 FLOW DIAGRAM

### CREATE LAUNCHPAD FLOW
```
┌──────────────┐
│   Creator    │
│  (Frontend)  │
└──────┬───────┘
       │
       ├─ 1. Fill Form (Name, Symbol, Supply, etc)
       │
       ├─ 2. Upload Files
       │    ├─ Cover Image (800×800)
       │    ├─ Banner Image (1000×300)
       │    └─ Metadata ZIP/Image
       │
       ├─ 3. Upload to IPFS
       │    ├─ Images → ipfs://hash1/
       │    └─ Metadata → ipfs://hash2/
       │
       ├─ 4. Setup Phases
       │    ├─ Whitelist Phase (CSV → Merkle Root)
       │    └─ Public Phase
       │
       ├─ 5. Deploy Contract
       │    └─ factoryContract.createLaunchpad()
       │         ├─ Pay Creation Fee
       │         └─ Get Collection Address
       │
       ├─ 6. Add Phases
       │    └─ collectionContract.batchAddMintPhases()
       │
       └─ 7. Save to Database
            └─ API: /api/admin/launchpads/sync
```

### MINT PAGE FLOW
```
┌──────────────┐
│     User     │
│  (Frontend)  │
└──────┬───────┘
       │
       ├─ 1. Load Collection Data
       │    └─ API: /api/admin/launchpads?contractAddress=0x...
       │
       ├─ 2. Select Phase
       │    ├─ View all phases
       │    ├─ Check countdown timer
       │    └─ Select active phase
       │
       ├─ 3. Enter Quantity
       │    └─ Calculate total cost
       │
       ├─ 4. Whitelist Check (if needed)
       │    └─ API: /api/whitelist/proof
       │         ├─ Get merkle proof
       │         └─ Verify eligibility
       │
       ├─ 5. Execute Mint
       │    └─ collectionContract.mint(phaseId, quantity, proof)
       │         ├─ Verify phase active
       │         ├─ Verify time range
       │         ├─ Verify supply
       │         ├─ Verify wallet limit
       │         ├─ Verify payment
       │         └─ Mint NFTs
       │
       └─ 6. Sync & Update
            ├─ API: /api/admin/launchpads/sync-mints
            └─ Reload page
```


## 📋 CONTRACT FUNCTIONS CHECKLIST

### LAUNCHPAD FACTORY
```
✅ createLaunchpad(DeploymentRequest) payable
   └─ Deploy new NFT collection

✅ getFactoryInfo() view
   └─ Get version, chainId, totalCollections, creationFee, treasury

✅ getAllLaunchpads() view
   └─ Get all deployed collection addresses

✅ getLaunchpadInfo(address) view
   └─ Get specific collection info

✅ getPlatformFeeInfo() view
   └─ Get percentage, freeMintFee, treasury

✅ setCreationFee(uint256) onlyOwner
   └─ Update creation fee

✅ setPlatformFee(uint256, uint256) onlyOwner
   └─ Update platform fee percentage & free mint fee
```

### NFT COLLECTION
```
✅ mint(phaseId, quantity, merkleProof[]) payable
   └─ Main minting function

✅ batchAddMintPhases(MintPhaseRequest[]) onlyAdmin
   └─ Add multiple phases at once

✅ getMintPhase(phaseId) view
   └─ Get phase details

✅ getMintPhasesCount() view
   └─ Get total number of phases

✅ togglePhaseActive(phaseId) onlyAdmin
   └─ Enable/disable phase

✅ calculateMintCost(phaseId, quantity) view
   └─ Calculate total cost (mint + platform fee)

✅ reveal(string newBaseURI) onlyAdmin
   └─ Reveal metadata

✅ pause() onlyAdmin
   └─ Pause all minting

✅ unpause() onlyAdmin
   └─ Resume minting

✅ royaltyInfo(tokenId, salePrice) view
   └─ Get royalty info (ERC2981)

✅ contractURI() view
   └─ Get contract metadata (OpenSea)

✅ tokenURI(tokenId) view
   └─ Get token metadata URI
```


## 🎨 DATA STRUCTURES

### MintPhase
```solidity
struct MintPhase {
    string name;              // "Whitelist Mint"
    uint256 startTime;        // 1704067200 (Unix timestamp)
    uint256 endTime;          // 1704672000
    uint256 price;            // 50000000000000000 (0.05 ETH in Wei)
    uint256 maxSupply;        // 1000
    uint256 maxPerWallet;     // 2
    uint256 maxPerTransaction; // 2
    bytes32 merkleRoot;       // 0xabc...
    bool isActive;            // true
    bool requiresWhitelist;   // true
    uint256 currentSupply;    // 0 (auto-increment)
}
```

### CollectionConfig
```solidity
struct CollectionConfig {
    string name;              // "My NFT Collection"
    string symbol;            // "MNFT"
    string baseURI;           // "ipfs://hash/"
    string unrevealedURI;     // "ipfs://unrevealed"
    string contractURI;       // "ipfs://contract-metadata"
    uint256 totalMaxSupply;   // 10000
    address payable treasury; // 0x123...
    address payable royaltyRecipient; // 0x456...
    uint96 royaltyPercentage; // 500 (5%)
    bool isRevealed;          // false
    uint256 chainId;          // 6342
}
```

## 🔐 SECURITY FEATURES

```
┌─────────────────────────────────────────┐
│  SECURITY LAYERS                        │
├─────────────────────────────────────────┤
│  1. ReentrancyGuard                     │
│     └─ Prevent reentrancy attacks       │
│                                         │
│  2. AccessControl (Roles)               │
│     ├─ DEFAULT_ADMIN_ROLE               │
│     ├─ ADMIN_ROLE                       │
│     └─ OPERATOR_ROLE                    │
│                                         │
│  3. Pausable                            │
│     └─ Emergency stop mechanism         │
│                                         │
│  4. Input Validation                    │
│     ├─ Check quantity > 0               │
│     ├─ Check phase exists               │
│     ├─ Check payment sufficient         │
│     └─ Check supply limits              │
│                                         │
│  5. Time-Based Controls                 │
│     ├─ Check startTime <= now           │
│     └─ Check now <= endTime             │
│                                         │
│  6. Supply Management                   │
│     ├─ Phase supply limit               │
│     ├─ Total supply limit               │
│     ├─ Per-wallet limit                 │
│     └─ Per-transaction limit            │
└─────────────────────────────────────────┘
```


## 💰 FEE CALCULATION EXAMPLES

### Example 1: Paid Mint
```
Phase Price: 0.05 ETH
Quantity: 2 NFTs
Platform Fee: 2.5%

Calculation:
├─ Mint Cost = 0.05 × 2 = 0.10 ETH
├─ Platform Fee = 0.10 × 2.5% = 0.0025 ETH
└─ Total Cost = 0.10 + 0.0025 = 0.1025 ETH

Distribution:
├─ Treasury (Creator): 0.10 ETH
└─ Platform Treasury: 0.0025 ETH
```

### Example 2: Free Mint
```
Phase Price: 0 ETH (Free)
Quantity: 1 NFT
Free Mint Platform Fee: 0.001 ETH (fixed)

Calculation:
├─ Mint Cost = 0 × 1 = 0 ETH
├─ Platform Fee = 0.001 ETH (fixed)
└─ Total Cost = 0 + 0.001 = 0.001 ETH

Distribution:
├─ Treasury (Creator): 0 ETH
└─ Platform Treasury: 0.001 ETH
```

## 📊 EVENTS TRACKING

### Factory Events
```javascript
// Listen to new collection deployments
factoryContract.on("LaunchpadCreated", (
    launchpadAddress,
    creator,
    name,
    symbol,
    totalSupply,
    timestamp
) => {
    console.log(`New collection: ${name} at ${launchpadAddress}`);
    // Save to database
    syncToDatabase(launchpadAddress, creator, name, symbol);
});
```

### Collection Events
```javascript
// Listen to mints
collectionContract.on("Minted", (to, tokenId, phaseId) => {
    console.log(`Token ${tokenId} minted to ${to} from phase ${phaseId}`);
    // Update stats
    updateMintStats(tokenId, to, phaseId);
});

// Listen to phase additions
collectionContract.on("PhaseAdded", (phaseId, name) => {
    console.log(`New phase added: ${name}`);
    // Refresh phase list
    refreshPhases();
});

// Listen to reveals
collectionContract.on("Revealed", (newBaseURI) => {
    console.log(`Collection revealed: ${newBaseURI}`);
    // Update metadata
    refreshMetadata();
});
```


## 🎯 INTEGRATION EXAMPLES

### Create Collection (Frontend)
```javascript
// 1. Prepare data
const deploymentRequest = {
    name: "My NFT Collection",
    symbol: "MNFT",
    description: "Amazing NFT collection",
    baseURI: "ipfs://Qm.../",
    unrevealedURI: "ipfs://Qm.../unrevealed.json",
    contractURI: "ipfs://Qm.../contract.json",
    externalLink: "https://myproject.com",
    totalMaxSupply: 10000,
    treasury: "0x123...",
    royaltyRecipient: "0x456...",
    royaltyPercentage: 500 // 5%
};

// 2. Get creation fee
const creationFee = await factoryContract.creationFee();

// 3. Deploy
const tx = await factoryContract.createLaunchpad(
    deploymentRequest,
    { value: creationFee }
);

// 4. Wait for confirmation
const receipt = await tx.wait();

// 5. Get collection address from event
const event = receipt.events.find(e => e.event === 'LaunchpadCreated');
const collectionAddress = event.args.launchpadAddress;

console.log(`Collection deployed at: ${collectionAddress}`);
```

### Add Phases (Frontend)
```javascript
// 1. Prepare phases
const phases = [
    {
        name: "Whitelist Mint",
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        price: ethers.parseEther("0.05"),
        maxSupply: 1000,
        maxPerWallet: 2,
        maxPerTransaction: 2,
        merkleRoot: "0xabc...", // From whitelist CSV
        requiresWhitelist: true
    },
    {
        name: "Public Mint",
        startTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        endTime: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        price: ethers.parseEther("0.08"),
        maxSupply: 5000,
        maxPerWallet: 10,
        maxPerTransaction: 5,
        merkleRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
        requiresWhitelist: false
    }
];

// 2. Add phases
const tx = await collectionContract.batchAddMintPhases(phases);
await tx.wait();

console.log("Phases added successfully!");
```

### Mint NFT (Frontend)
```javascript
// 1. Select phase and quantity
const phaseId = 0; // Whitelist phase
const quantity = 2;

// 2. Calculate cost
const { totalCost } = await collectionContract.calculateMintCost(
    phaseId,
    quantity
);

// 3. Get merkle proof (if whitelist)
const response = await fetch(
    `/api/whitelist/proof?address=${userAddress}&phaseId=${phaseId}`
);
const { proof } = await response.json();

// 4. Mint
const tx = await collectionContract.mint(
    phaseId,
    quantity,
    proof,
    { value: totalCost }
);

// 5. Wait for confirmation
await tx.wait();

console.log("Minted successfully!");
```


## ⚡ GAS OPTIMIZATION TIPS

```
1. Batch Operations
   ├─ Use batchAddMintPhases() instead of multiple addMintPhase()
   └─ Save ~50% gas on multiple phase additions

2. Struct Packing
   ├─ Order struct variables by size
   └─ Pack multiple small variables in one slot

3. Use uint256
   ├─ Avoid uint8, uint16, etc (costs more gas)
   └─ Use uint256 for all counters

4. Events vs Storage
   ├─ Use events for historical data
   └─ Don't store unnecessary data on-chain

5. View Functions
   ├─ Mark read-only functions as view
   └─ No gas cost for external calls
```

## 🔍 TESTING CHECKLIST

```
□ Factory Tests
  □ Deploy factory
  □ Create launchpad with fee
  □ Create launchpad without fee (should fail)
  □ Get factory info
  □ Get all launchpads
  □ Update creation fee (owner only)
  □ Update platform fee (owner only)

□ Collection Tests
  □ Deploy collection via factory
  □ Add single phase
  □ Add multiple phases (batch)
  □ Mint with valid phase
  □ Mint with inactive phase (should fail)
  □ Mint before start time (should fail)
  □ Mint after end time (should fail)
  □ Mint exceeding phase supply (should fail)
  □ Mint exceeding wallet limit (should fail)
  □ Mint with insufficient payment (should fail)

□ Whitelist Tests
  □ Generate merkle tree
  □ Add whitelist phase
  □ Mint with valid proof
  □ Mint with invalid proof (should fail)
  □ Mint without proof when required (should fail)

□ Fee Tests
  □ Calculate mint cost (paid mint)
  □ Calculate mint cost (free mint)
  □ Verify fee distribution
  □ Verify treasury receives mint price
  □ Verify platform receives platform fee

□ Access Control Tests
  □ Admin functions (only admin)
  □ Operator functions (only operator)
  □ Owner functions (only owner)
  □ Unauthorized access (should fail)

□ Emergency Tests
  □ Pause minting
  □ Mint while paused (should fail)
  □ Unpause minting
  □ Emergency withdrawal
```


## 📱 FRONTEND COMPONENTS MAPPING

```
┌─────────────────────────────────────────────────────────────┐
│  /create/add (Creator Studio)                               │
├─────────────────────────────────────────────────────────────┤
│  Contract Functions Used:                                   │
│  ├─ factoryContract.getFactoryInfo()                        │
│  ├─ factoryContract.creationFee()                           │
│  ├─ factoryContract.createLaunchpad()                       │
│  └─ collectionContract.batchAddMintPhases()                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  /collection/[id] (Mint Page)                               │
├─────────────────────────────────────────────────────────────┤
│  Contract Functions Used:                                   │
│  ├─ collectionContract.getMintPhasesCount()                 │
│  ├─ collectionContract.getMintPhase(phaseId)                │
│  ├─ collectionContract.calculateMintCost()                  │
│  ├─ collectionContract.phaseUserMints()                     │
│  └─ collectionContract.mint()                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  /create (Creator Dashboard)                                │
├─────────────────────────────────────────────────────────────┤
│  Contract Functions Used:                                   │
│  ├─ factoryContract.getAllLaunchpads()                      │
│  ├─ factoryContract.getLaunchpadInfo()                      │
│  └─ collectionContract.getCollectionInfo()                  │
│                                                             │
│  Action Popover Functions:                                  │
│  ├─ Update Collection                                       │
│  │   ├─ collectionContract.updateTreasury()                │
│  │   └─ collectionContract.updateRoyalty()                 │
│  ├─ Update Whitelist Mint                                   │
│  │   └─ collectionContract.updateMintPhase()               │
│  ├─ Update Public Mint                                      │
│  │   └─ collectionContract.updateMintPhase()               │
│  ├─ Send NFT                                                │
│  │   └─ collectionContract.transferFrom()                  │
│  ├─ Burn NFT                                                │
│  │   └─ collectionContract.burn()                          │
│  └─ Snapshot Holders                                        │
│      └─ collectionContract.getHolders()                     │
└─────────────────────────────────────────────────────────────┘
```

## 🎓 QUICK START GUIDE

### For Developers
```bash
# 1. Clone repository
git clone <repo-url>

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your values

# 4. Compile contracts
npx hardhat compile

# 5. Run tests
npx hardhat test

# 6. Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia

# 7. Verify contract
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### For Creators
```
1. Connect Wallet
   └─ MetaMask, WalletConnect, etc.

2. Go to /create/add
   └─ Fill collection details

3. Upload Files
   ├─ Cover Image (800×800px)
   ├─ Banner Image (1000×300px)
   └─ Metadata ZIP or Single Image

4. Setup Phases
   ├─ Whitelist Phase (optional)
   │   └─ Upload CSV with addresses
   └─ Public Phase

5. Deploy Collection
   └─ Pay creation fee

6. Share Mint Link
   └─ /collection/[your-contract-address]
```

---

**📚 Full Documentation:** See `CONTRACT_FEATURES_DOCUMENTATION.md`

**🔗 Quick Links:**
- Factory ABI: `abi/LaunchpadFactory.abi.json`
- Collection ABI: `abi/NFTCollection.abi.json`
- Contract Service: `src/lib/contract-service.ts`
- Creator Studio: `src/components/admin/creator-studio.tsx`
- Mint Page: `src/app/(package)/collection/[id]/page.tsx`

**Last Updated:** 2025-01-18
