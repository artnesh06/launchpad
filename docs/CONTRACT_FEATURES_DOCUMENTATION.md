# 📋 NFT Launchpad Contract - Dokumentasi Fitur

## 🎯 Overview
Dokumentasi ini menjelaskan fitur-fitur yang harus ada di smart contract berdasarkan analisis flow aplikasi dari Create Launchpad hingga Mint Page.

---

## 🏭 1. LAUNCHPAD FACTORY CONTRACT

### 1.1 Deployment & Configuration
**Fitur yang sudah ada:**
- ✅ `createLaunchpad()` - Deploy NFT collection baru
- ✅ `creationFee` - Biaya untuk membuat collection
- ✅ `platformFeePercentage` - Persentase fee platform (250 = 2.5%)
- ✅ `freeMintPlatformFee` - Fee untuk free mint
- ✅ `platformTreasury` - Address treasury platform

**Parameter yang dikirim saat create:**
```solidity
struct DeploymentRequest {
    string name;              // Nama collection
    string symbol;            // Symbol (e.g., "NFT")
    string description;       // Deskripsi collection
    string baseURI;           // IPFS URI untuk metadata
    string unrevealedURI;     // URI sebelum reveal
    string contractURI;       // Contract metadata (OpenSea)
    string externalLink;      // Website/social link
    uint256 totalMaxSupply;   // Total supply maksimal
    address payable treasury; // Address penerima mint income
    address payable royaltyRecipient; // Address penerima royalty
    uint96 royaltyPercentage; // Royalty % (500 = 5%)
}
```

### 1.2 Factory Management Functions
- ✅ `getAllLaunchpads()` - Get semua collection yang di-deploy
- ✅ `getLaunchpadInfo(address)` - Get info collection tertentu
- ✅ `getFactoryInfo()` - Get info factory (version, total collections, dll)
- ✅ `getPlatformFeeInfo()` - Get info platform fee

---

## 🎨 2. NFT COLLECTION CONTRACT

### 2.1 Collection Configuration
**Fitur yang sudah ada:**
```solidity
struct CollectionConfig {
    string name;
    string symbol;
    string baseURI;
    string unrevealedURI;
    string contractURI;
    uint256 totalMaxSupply;
    address payable treasury;
    address payable royaltyRecipient;
    uint96 royaltyPercentage;
    bool isRevealed;
    uint256 chainId;
}
```

### 2.2 Mint Phases System ⭐ FITUR UTAMA
**Struktur Phase:**
```solidity
struct MintPhase {
    string name;              // Nama phase (e.g., "Whitelist Mint", "Public Mint")
    uint256 startTime;        // Unix timestamp mulai
    uint256 endTime;          // Unix timestamp selesai
    uint256 price;            // Harga mint dalam Wei
    uint256 maxSupply;        // Max supply untuk phase ini
    uint256 maxPerWallet;     // Max mint per wallet
    uint256 maxPerTransaction; // Max mint per transaksi
    bytes32 merkleRoot;       // Merkle root untuk whitelist
    bool isActive;            // Status aktif/tidak
    bool requiresWhitelist;   // Apakah perlu whitelist
    uint256 currentSupply;    // Jumlah yang sudah di-mint
}
```

**Functions untuk Mint Phases:**
- ✅ `batchAddMintPhases(MintPhaseRequest[])` - Add multiple phases sekaligus
- ✅ `getMintPhase(uint256 phaseId)` - Get info phase tertentu
- ✅ `getMintPhasesCount()` - Get total jumlah phases
- ✅ `togglePhaseActive(uint256 phaseId)` - Aktifkan/nonaktifkan phase

### 2.3 Minting Functions
**Main Mint Function:**
```solidity
function mint(
    uint256 phaseId,        // ID phase yang digunakan
    uint256 quantity,       // Jumlah yang di-mint
    bytes32[] merkleProof   // Proof untuk whitelist (kosong jika public)
) external payable
```

**Validasi yang dilakukan:**
1. ✅ Phase harus aktif (`isActive = true`)
2. ✅ Waktu harus dalam range (`startTime <= now <= endTime`)
3. ✅ Supply phase belum habis (`currentSupply + quantity <= maxSupply`)
4. ✅ Tidak melebihi max per wallet
5. ✅ Tidak melebihi max per transaction
6. ✅ Jika whitelist: verify merkle proof
7. ✅ Payment harus sesuai (`msg.value >= price * quantity + platformFee`)

**Helper Functions:**
- ✅ `calculateMintCost(phaseId, quantity)` - Hitung total biaya mint
- ✅ `phaseUserMints(phaseId, address)` - Cek berapa sudah di-mint user


### 2.4 Whitelist System (Merkle Tree)
**Cara Kerja:**
1. Creator upload CSV dengan format: `address,allocation`
2. Frontend generate merkle tree dari addresses
3. Merkle root disimpan di contract saat add phase
4. Saat mint, user kirim merkle proof
5. Contract verify proof dengan merkle root

**Functions:**
- ✅ Merkle root disimpan di `MintPhase.merkleRoot`
- ✅ Verification dilakukan di `mint()` function
- ✅ Jika `requiresWhitelist = true`, proof wajib valid

**Example Flow:**
```javascript
// 1. Generate merkle tree (frontend)
const whitelistManager = new WhitelistManager();
whitelistManager.addAddress("0x123...", 5); // address, allocation
const merkleRoot = whitelistManager.generateMerkleTree();

// 2. Add phase dengan merkle root
await contract.batchAddMintPhases([{
    name: "Whitelist Mint",
    merkleRoot: merkleRoot,
    requiresWhitelist: true,
    // ... other params
}]);

// 3. User mint dengan proof
const proof = whitelistManager.getMerkleProof(userAddress, allocation);
await contract.mint(phaseId, quantity, proof, { value: totalCost });
```

### 2.5 Platform Fee System
**Fee Structure:**
- ✅ `platformFeePercentage` - Persentase dari mint price (default 2.5%)
- ✅ `freeMintPlatformFee` - Fixed fee untuk free mint (0 ETH price)
- ✅ `platformFeeEnabled` - Toggle untuk enable/disable fee

**Calculation:**
```solidity
// Jika price > 0:
platformFee = (price * quantity * platformFeePercentage) / 10000

// Jika price = 0 (free mint):
platformFee = freeMintPlatformFee

// Total yang harus dibayar:
totalCost = (price * quantity) + platformFee
```

**Distribution:**
- Mint price → `treasury` (collection creator)
- Platform fee → `platformTreasury` (platform)

### 2.6 Royalty System (ERC2981)
**Configuration:**
- ✅ `royaltyRecipient` - Address penerima royalty
- ✅ `royaltyPercentage` - Persentase royalty (500 = 5%)
- ✅ `royaltyInfo(tokenId, salePrice)` - Get royalty info

**Supported by:**
- OpenSea
- LooksRare
- Blur
- X2Y2


### 2.7 Access Control (Role-Based)
**Roles:**
- ✅ `DEFAULT_ADMIN_ROLE` - Full control (creator)
- ✅ `ADMIN_ROLE` - Can manage phases, pause, reveal
- ✅ `OPERATOR_ROLE` - Can manage specific operations

**Functions:**
- ✅ `grantRole(bytes32 role, address account)`
- ✅ `revokeRole(bytes32 role, address account)`
- ✅ `hasRole(bytes32 role, address account)`

### 2.8 Emergency Controls
**Pause System:**
- ✅ `pause()` - Pause semua minting
- ✅ `unpause()` - Resume minting
- ✅ `paused()` - Check status

**Use Cases:**
- Emergency stop jika ada bug
- Maintenance
- Security incident

### 2.9 Metadata & Reveal System
**Reveal Mechanism:**
- ✅ `isRevealed` - Status reveal
- ✅ `reveal(string newBaseURI)` - Reveal metadata
- ✅ `tokenURI(tokenId)` - Return metadata URI

**Behavior:**
- Sebelum reveal: return `unrevealedURI`
- Setelah reveal: return `baseURI + tokenId + .json`

### 2.10 Collection Management Functions
**Update Functions (Admin Only):**
- ✅ Update treasury address
- ✅ Update royalty recipient
- ✅ Update royalty percentage
- ✅ Update contract URI
- ✅ Update external link

---

## 🔄 3. FLOW LENGKAP: CREATE TO MINT

### 3.1 Create Launchpad Flow
**Step 1: Persiapan Data (Frontend)**
```javascript
// 1. Upload files ke IPFS
const coverImageUrl = await ipfsService.uploadFile(coverImage);
const bannerImageUrl = await ipfsService.uploadFile(bannerImage);

// 2. Process metadata
// - Standard Edition: Upload ZIP (images + metadata)
// - Open Edition: Upload single image + generate metadata

// 3. Generate merkle roots untuk whitelist phases
const whitelistManager = new WhitelistManager();
// ... add addresses from CSV
const merkleRoot = whitelistManager.generateMerkleTree();
```

**Step 2: Deploy Collection (Smart Contract)**
```javascript
// Call factory contract
const tx = await factoryContract.createLaunchpad({
    name: "My NFT Collection",
    symbol: "MNFT",
    description: "...",
    baseURI: "ipfs://...",
    unrevealedURI: "ipfs://...",
    contractURI: "ipfs://...",
    externalLink: "https://...",
    totalMaxSupply: 10000,
    treasury: "0x...",
    royaltyRecipient: "0x...",
    royaltyPercentage: 500 // 5%
}, { value: creationFee });

// Wait for transaction
await tx.wait();

// Get deployed collection address from event
const collectionAddress = parseEventLog(tx);
```

**Step 3: Setup Mint Phases**
```javascript
// Batch add phases (whitelist + public)
await collectionContract.batchAddMintPhases([
    {
        name: "Whitelist Mint",
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        price: ethers.parseEther("0.05"),
        maxSupply: 1000,
        maxPerWallet: 2,
        maxPerTransaction: 2,
        merkleRoot: "0x...",
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
        merkleRoot: "0x0000...",
        requiresWhitelist: false
    }
]);
```

**Step 4: Save to Database**
```javascript
// Sync data ke database untuk faster queries
await fetch('/api/admin/launchpads/sync', {
    method: 'POST',
    body: JSON.stringify({
        contractAddress,
        chainId,
        // ... other data
    })
});
```


### 3.2 Mint Page Flow
**Step 1: Load Collection Data**
```javascript
// Get collection info dari API (faster) atau blockchain
const collection = await fetch(`/api/admin/launchpads?contractAddress=${address}`);

// Data yang ditampilkan:
// - Name, symbol, description
// - Cover image, banner image
// - Total supply, minted count, mint percentage
// - All mint phases dengan status
// - Current active phase
```

**Step 2: Select Phase & Calculate Cost**
```javascript
// User pilih phase dari dropdown
const selectedPhase = collection.phases[selectedPhaseIndex];

// Calculate total cost
const { mintCost, platformFee, totalCost } = 
    await contract.calculateMintCost(phaseId, quantity);

// Display:
// - Mint price per NFT
// - Platform fee
// - Total cost
// - Max per wallet
// - Countdown timer (if has endTime)
```

**Step 3: Whitelist Verification (if needed)**
```javascript
if (selectedPhase.requiresWhitelist) {
    // Get merkle proof dari API
    const proofResponse = await fetch(
        `/api/whitelist/proof?contractAddress=${address}&phaseId=${phaseId}&address=${userAddress}`
    );
    
    const { isWhitelisted, proof, allocation } = proofResponse.data;
    
    if (!isWhitelisted) {
        throw new Error("You are not whitelisted");
    }
    
    // Use proof untuk mint
    merkleProof = proof;
}
```

**Step 4: Execute Mint**
```javascript
// Call mint function
const tx = await contract.mint(
    phaseId,
    quantity,
    merkleProof, // empty array [] jika public mint
    { value: totalCost }
);

// Wait for confirmation
await tx.wait();

// Auto-sync ke database
await fetch('/api/admin/launchpads/sync-mints', {
    method: 'POST',
    body: JSON.stringify({
        launchpadId,
        contractAddress,
        chainId
    })
});

// Reload page untuk update stats
window.location.reload();
```


---

## 🎯 4. FITUR-FITUR YANG HARUS ADA DI CONTRACT

### 4.1 CRITICAL FEATURES (Wajib Ada)

#### ✅ 1. Multi-Phase Minting System
**Kenapa penting:**
- Memungkinkan whitelist mint → public mint
- Flexible pricing per phase
- Time-based activation
- Supply allocation per phase

**Implementation:**
```solidity
mapping(uint256 => MintPhase) public mintPhases;
uint256 public mintPhasesCount;

function batchAddMintPhases(MintPhaseRequest[] memory phases) external onlyAdmin {
    for (uint i = 0; i < phases.length; i++) {
        mintPhases[mintPhasesCount] = MintPhase({
            name: phases[i].name,
            startTime: phases[i].startTime,
            endTime: phases[i].endTime,
            price: phases[i].price,
            maxSupply: phases[i].maxSupply,
            maxPerWallet: phases[i].maxPerWallet,
            maxPerTransaction: phases[i].maxPerTransaction,
            merkleRoot: phases[i].merkleRoot,
            isActive: true,
            requiresWhitelist: phases[i].requiresWhitelist,
            currentSupply: 0
        });
        mintPhasesCount++;
    }
}
```

#### ✅ 2. Merkle Tree Whitelist
**Kenapa penting:**
- Gas efficient untuk whitelist besar
- Privacy (tidak perlu store semua addresses on-chain)
- Flexible allocation per address

**Implementation:**
```solidity
function mint(
    uint256 phaseId,
    uint256 quantity,
    bytes32[] calldata merkleProof
) external payable {
    MintPhase storage phase = mintPhases[phaseId];
    
    if (phase.requiresWhitelist) {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, quantity));
        require(
            MerkleProof.verify(merkleProof, phase.merkleRoot, leaf),
            "Invalid merkle proof"
        );
    }
    
    // ... mint logic
}
```

#### ✅ 3. Platform Fee System
**Kenapa penting:**
- Revenue model untuk platform
- Support free mint dengan fixed fee
- Transparent fee calculation

**Implementation:**
```solidity
function calculateMintCost(uint256 phaseId, uint256 quantity) 
    public view returns (
        uint256 mintCost,
        uint256 platformFee,
        uint256 totalCost,
        bool isFreeMint
    ) 
{
    MintPhase storage phase = mintPhases[phaseId];
    mintCost = phase.price * quantity;
    
    if (phase.price == 0) {
        // Free mint
        platformFee = freeMintPlatformFee;
        isFreeMint = true;
    } else {
        // Paid mint
        platformFee = (mintCost * platformFeePercentage) / 10000;
        isFreeMint = false;
    }
    
    totalCost = mintCost + platformFee;
}
```


#### ✅ 4. Time-Based Phase Control
**Kenapa penting:**
- Auto-activate/deactivate phases
- Countdown timer di frontend
- Prevent early/late minting

**Implementation:**
```solidity
modifier phaseActive(uint256 phaseId) {
    MintPhase storage phase = mintPhases[phaseId];
    require(phase.isActive, "Phase not active");
    require(block.timestamp >= phase.startTime, "Phase not started");
    require(block.timestamp <= phase.endTime, "Phase ended");
    _;
}

function mint(uint256 phaseId, uint256 quantity, bytes32[] calldata merkleProof) 
    external 
    payable 
    phaseActive(phaseId) 
{
    // ... mint logic
}
```

#### ✅ 5. Supply Management
**Kenapa penting:**
- Prevent over-minting
- Track per-phase supply
- Track per-wallet mints

**Implementation:**
```solidity
mapping(uint256 => mapping(address => uint256)) public phaseUserMints;

function mint(uint256 phaseId, uint256 quantity, bytes32[] calldata merkleProof) 
    external payable 
{
    MintPhase storage phase = mintPhases[phaseId];
    
    // Check phase supply
    require(
        phase.currentSupply + quantity <= phase.maxSupply,
        "Phase supply exceeded"
    );
    
    // Check total supply
    require(
        currentTokenId + quantity <= config.totalMaxSupply,
        "Total supply exceeded"
    );
    
    // Check per-wallet limit
    require(
        phaseUserMints[phaseId][msg.sender] + quantity <= phase.maxPerWallet,
        "Wallet limit exceeded"
    );
    
    // Check per-transaction limit
    require(
        quantity <= phase.maxPerTransaction,
        "Transaction limit exceeded"
    );
    
    // Update counters
    phase.currentSupply += quantity;
    phaseUserMints[phaseId][msg.sender] += quantity;
    
    // ... mint NFTs
}
```

#### ✅ 6. Royalty Standard (ERC2981)
**Kenapa penting:**
- Automatic royalty di marketplaces
- Standard yang diakui semua platform
- Configurable percentage

**Implementation:**
```solidity
function royaltyInfo(uint256 tokenId, uint256 salePrice)
    external
    view
    override
    returns (address receiver, uint256 royaltyAmount)
{
    receiver = config.royaltyRecipient;
    royaltyAmount = (salePrice * config.royaltyPercentage) / 10000;
}
```


### 4.2 IMPORTANT FEATURES (Sangat Direkomendasikan)

#### ⭐ 7. Reveal Mechanism
**Kenapa penting:**
- Prevent sniping rare NFTs
- Build hype
- Fair distribution

**Implementation:**
```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "Token does not exist");
    
    if (!config.isRevealed) {
        return config.unrevealedURI;
    }
    
    return string(abi.encodePacked(config.baseURI, tokenId.toString(), ".json"));
}

function reveal(string memory newBaseURI) external onlyAdmin {
    config.baseURI = newBaseURI;
    config.isRevealed = true;
    emit Revealed(newBaseURI);
}
```

#### ⭐ 8. Pause/Unpause
**Kenapa penting:**
- Emergency stop
- Maintenance
- Security

**Implementation:**
```solidity
function pause() external onlyAdmin {
    _pause();
}

function unpause() external onlyAdmin {
    _unpause();
}

function mint(...) external payable whenNotPaused {
    // ... mint logic
}
```

#### ⭐ 9. Role-Based Access Control
**Kenapa penting:**
- Delegate management
- Security
- Team collaboration

**Implementation:**
```solidity
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ADMIN_ROLE, msg.sender);
}

function addMintPhase(...) external onlyRole(ADMIN_ROLE) {
    // ...
}
```

#### ⭐ 10. Contract Metadata (OpenSea)
**Kenapa penting:**
- Collection info di OpenSea
- Royalty enforcement
- Branding

**Implementation:**
```solidity
function contractURI() public view returns (string memory) {
    return config.contractURI;
}

// Contract metadata format (JSON):
{
    "name": "My NFT Collection",
    "description": "...",
    "image": "ipfs://...",
    "external_link": "https://...",
    "seller_fee_basis_points": 500,
    "fee_recipient": "0x..."
}
```


### 4.3 OPTIONAL FEATURES (Nice to Have)

#### 💡 11. Batch Minting (Admin)
**Use case:** Airdrop, team allocation, giveaway

```solidity
function batchMint(
    uint256 phaseId,
    address[] calldata recipients,
    uint256[] calldata quantities
) external onlyRole(ADMIN_ROLE) {
    require(recipients.length == quantities.length, "Length mismatch");
    
    for (uint i = 0; i < recipients.length; i++) {
        _mintTo(recipients[i], quantities[i]);
    }
}
```

#### 💡 12. Burn Mechanism
**Use case:** Reduce supply, gamification

```solidity
function burn(uint256 tokenId) external {
    require(ownerOf(tokenId) == msg.sender, "Not owner");
    _burn(tokenId);
}
```

#### 💡 13. Transfer Lock
**Use case:** Prevent trading before reveal

```solidity
bool public transfersEnabled = false;

function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
) internal override {
    if (from != address(0) && to != address(0)) {
        require(transfersEnabled, "Transfers locked");
    }
    super._beforeTokenTransfer(from, to, tokenId);
}
```

#### 💡 14. Snapshot Holders
**Use case:** Airdrop, governance

```solidity
function getHolders() external view returns (address[] memory) {
    // Return all unique holders
}

function getHolderBalance(address holder) external view returns (uint256) {
    return balanceOf(holder);
}
```

---

## 📊 5. EVENTS (Untuk Tracking & Analytics)

### 5.1 Factory Events
```solidity
event LaunchpadCreated(
    address indexed launchpadAddress,
    address indexed creator,
    string name,
    string symbol,
    uint256 totalSupply,
    uint256 indexed timestamp
);

event CreationFeeUpdated(uint256 newFee);
event PlatformFeeUpdated(uint256 percentage, uint256 freeMintFee);
```

### 5.2 Collection Events
```solidity
event Minted(
    address indexed to,
    uint256 indexed tokenId,
    uint256 phaseId
);

event PhaseAdded(
    uint256 indexed phaseId,
    string name
);

event PhaseUpdated(uint256 indexed phaseId);

event Revealed(string newBaseURI);

event Paused(address account);
event Unpaused(address account);
```

**Kenapa Events Penting:**
- Real-time tracking di frontend
- Analytics & statistics
- Activity feed
- Indexing untuk database sync

---

## 🔐 6. SECURITY CONSIDERATIONS

### 6.1 Reentrancy Protection
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function mint(...) external payable nonReentrant {
    // ... mint logic
}
```

### 6.2 Integer Overflow Protection
```solidity
// Use Solidity 0.8+ (built-in overflow checks)
pragma solidity ^0.8.0;
```

### 6.3 Access Control
```solidity
// Use OpenZeppelin AccessControl
import "@openzeppelin/contracts/access/AccessControl.sol";

modifier onlyAdmin() {
    require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
    _;
}
```

### 6.4 Input Validation
```solidity
function mint(uint256 phaseId, uint256 quantity, ...) external payable {
    require(quantity > 0, "Invalid quantity");
    require(phaseId < mintPhasesCount, "Invalid phase");
    require(msg.value >= totalCost, "Insufficient payment");
    // ...
}
```

### 6.5 Emergency Withdrawal
```solidity
function emergencyWithdraw() external onlyOwner {
    payable(owner()).transfer(address(this).balance);
}
```

---

## 🎨 7. INTEGRATION DENGAN FRONTEND

### 7.1 Create Launchpad Integration
**Frontend Flow:**
```javascript
// 1. Collect form data
const collectionData = {
    name: "My Collection",
    symbol: "MC",
    totalMaxSupply: 10000,
    // ...
};

// 2. Upload files to IPFS
const coverImageUrl = await ipfsService.uploadFile(coverImage);
const metadataUrl = await ipfsService.uploadMetadata(metadata);

// 3. Generate merkle roots
const whitelistManager = new WhitelistManager();
// ... add addresses
const merkleRoot = whitelistManager.generateMerkleTree();

// 4. Prepare phases
const phases = [
    {
        name: "Whitelist",
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        price: ethers.parseEther("0.05"),
        maxSupply: 1000,
        maxPerWallet: 2,
        maxPerTransaction: 2,
        merkleRoot: merkleRoot,
        requiresWhitelist: true
    },
    // ... public phase
];

// 5. Deploy collection
const tx = await factoryContract.createLaunchpad(
    collectionData,
    { value: creationFee }
);

// 6. Wait and get address
const receipt = await tx.wait();
const collectionAddress = parseEventLog(receipt);

// 7. Add phases
await collectionContract.batchAddMintPhases(phases);

// 8. Save to database
await syncToDatabase(collectionAddress, collectionData, phases);
```

### 7.2 Mint Page Integration
**Frontend Flow:**
```javascript
// 1. Load collection data
const collection = await loadCollection(contractAddress);

// 2. Display phases
collection.phases.forEach(phase => {
    // Show phase info, countdown, status
});

// 3. User selects phase and quantity
const selectedPhase = collection.phases[phaseIndex];
const quantity = 2;

// 4. Calculate cost
const { totalCost } = await contract.calculateMintCost(
    phaseIndex,
    quantity
);

// 5. Get merkle proof (if whitelist)
let merkleProof = [];
if (selectedPhase.requiresWhitelist) {
    const response = await fetch(
        `/api/whitelist/proof?address=${userAddress}&phaseId=${phaseIndex}`
    );
    merkleProof = response.data.proof;
}

// 6. Execute mint
const tx = await contract.mint(
    phaseIndex,
    quantity,
    merkleProof,
    { value: totalCost }
);

// 7. Wait for confirmation
await tx.wait();

// 8. Update UI
await syncMintData();
showSuccessMessage();
```


### 7.3 Creator Studio (Management) Integration
**Action Popover Features:**

1. **Get Featured**
   - Submit collection untuk featured listing
   - API call, tidak perlu contract interaction

2. **Update Collection Page**
   - Update treasury address
   - Update royalty recipient
   - Update royalty percentage
   ```javascript
   await contract.updateTreasury(newAddress);
   await contract.updateRoyalty(recipient, percentage);
   ```

3. **Update Whitelist Mint**
   - Update phase parameters
   - Update merkle root
   - Toggle phase active/inactive
   ```javascript
   await contract.updateMintPhase(phaseId, {
       startTime: newStartTime,
       endTime: newEndTime,
       maxPerWallet: newMax,
       merkleRoot: newMerkleRoot
   });
   ```

4. **Update Public Mint**
   - Similar to whitelist update
   - No merkle root needed

5. **Send NFT**
   - Transfer NFT to another address
   ```javascript
   await contract.transferFrom(from, to, tokenId);
   ```

6. **Burn NFT**
   - Burn owned NFT
   ```javascript
   await contract.burn(tokenId);
   ```

7. **Snapshot Holders**
   - Get list of all holders
   - Export to CSV
   ```javascript
   const holders = await contract.getHolders();
   ```

---

## 📈 8. ANALYTICS & MONITORING

### 8.1 On-Chain Data
**Data yang bisa diambil dari contract:**
- Total minted per phase
- Total revenue per phase
- Unique minters count
- Mint distribution (per wallet)
- Phase performance

### 8.2 Events Tracking
**Listen to events untuk real-time updates:**
```javascript
contract.on("Minted", (to, tokenId, phaseId) => {
    console.log(`New mint: ${to} got token ${tokenId} from phase ${phaseId}`);
    updateStats();
});

contract.on("PhaseAdded", (phaseId, name) => {
    console.log(`New phase added: ${name}`);
    refreshPhases();
});
```

### 8.3 Database Sync
**Sync contract data ke database:**
```javascript
// Periodic sync
setInterval(async () => {
    const totalMinted = await contract.totalMinted();
    const phases = await contract.getAllPhases();
    
    await database.update({
        contractAddress,
        totalMinted,
        phases,
        lastSyncedAt: new Date()
    });
}, 60000); // Every minute
```

---

## ✅ 9. CHECKLIST IMPLEMENTASI CONTRACT

### 9.1 Core Features (MUST HAVE)
- [ ] **LaunchpadFactory Contract**
  - [ ] `createLaunchpad()` function
  - [ ] Creation fee system
  - [ ] Platform fee configuration
  - [ ] Get all launchpads
  - [ ] Get launchpad info

- [ ] **NFT Collection Contract**
  - [ ] ERC721 standard implementation
  - [ ] Multi-phase minting system
  - [ ] Merkle tree whitelist
  - [ ] Time-based phase control
  - [ ] Supply management (per-phase & total)
  - [ ] Per-wallet mint limits
  - [ ] Per-transaction mint limits
  - [ ] Platform fee calculation & distribution
  - [ ] ERC2981 royalty standard

### 9.2 Management Features
- [ ] **Phase Management**
  - [ ] Add single phase
  - [ ] Batch add phases
  - [ ] Update phase parameters
  - [ ] Toggle phase active/inactive
  - [ ] Get phase info
  - [ ] Get all phases

- [ ] **Access Control**
  - [ ] Role-based permissions (Admin, Operator)
  - [ ] Grant/revoke roles
  - [ ] Check role membership

- [ ] **Collection Settings**
  - [ ] Update treasury address
  - [ ] Update royalty recipient
  - [ ] Update royalty percentage
  - [ ] Update contract URI
  - [ ] Update external link

### 9.3 Security Features
- [ ] **Emergency Controls**
  - [ ] Pause/unpause minting
  - [ ] Emergency withdrawal
  - [ ] Reentrancy protection
  - [ ] Input validation

- [ ] **Reveal System**
  - [ ] Unrevealed URI
  - [ ] Reveal function
  - [ ] Token URI logic

### 9.4 Events & Monitoring
- [ ] **Factory Events**
  - [ ] LaunchpadCreated
  - [ ] CreationFeeUpdated
  - [ ] PlatformFeeUpdated

- [ ] **Collection Events**
  - [ ] Minted
  - [ ] PhaseAdded
  - [ ] PhaseUpdated
  - [ ] Revealed
  - [ ] Paused/Unpaused

### 9.5 Integration Points
- [ ] **Frontend Integration**
  - [ ] Create launchpad flow
  - [ ] Mint page flow
  - [ ] Creator studio management
  - [ ] Whitelist proof generation
  - [ ] Cost calculation

- [ ] **Database Sync**
  - [ ] Event listeners
  - [ ] Periodic sync
  - [ ] Real-time updates

---

## 🚀 10. DEPLOYMENT CHECKLIST

### 10.1 Pre-Deployment
- [ ] Audit smart contracts
- [ ] Test all functions
- [ ] Test gas optimization
- [ ] Verify security measures
- [ ] Test on testnet (Sepolia)

### 10.2 Deployment Steps
1. [ ] Deploy LaunchpadFactory
2. [ ] Set creation fee
3. [ ] Set platform fee percentage
4. [ ] Set platform treasury
5. [ ] Verify contract on block explorer
6. [ ] Update frontend config dengan factory address

### 10.3 Post-Deployment
- [ ] Test create launchpad
- [ ] Test mint flow
- [ ] Test whitelist verification
- [ ] Test phase management
- [ ] Monitor events
- [ ] Setup database sync

---

## 📚 11. REFERENSI

### 11.1 Standards
- **ERC721**: NFT Standard
- **ERC2981**: Royalty Standard
- **ERC165**: Interface Detection
- **AccessControl**: Role-based permissions

### 11.2 Libraries
- **OpenZeppelin Contracts**: Security & standards
- **MerkleTreeJS**: Whitelist generation
- **Ethers.js**: Contract interaction

### 11.3 Tools
- **Hardhat**: Development & testing
- **IPFS**: Metadata storage
- **Pinata**: IPFS pinning service

---

## 💡 12. BEST PRACTICES

1. **Gas Optimization**
   - Use `uint256` instead of smaller types
   - Pack struct variables efficiently
   - Use events instead of storage when possible
   - Batch operations when possible

2. **Security**
   - Always use latest OpenZeppelin contracts
   - Implement reentrancy guards
   - Validate all inputs
   - Use modifiers for access control
   - Test edge cases

3. **User Experience**
   - Clear error messages
   - Gas estimation before transactions
   - Progress indicators
   - Transaction confirmations

4. **Maintenance**
   - Upgradeable contracts (if needed)
   - Emergency pause mechanism
   - Admin functions for updates
   - Event logging for debugging

---

**Dokumentasi ini dibuat berdasarkan analisis lengkap dari:**
- ✅ Create Launchpad flow (`/create/add`)
- ✅ Mint Page flow (`/collection/[id]`)
- ✅ Creator Studio management (`/create`)
- ✅ Smart contract ABIs (Factory & Collection)
- ✅ Frontend integration code
- ✅ Database sync mechanisms

**Last Updated:** 2025-01-18
