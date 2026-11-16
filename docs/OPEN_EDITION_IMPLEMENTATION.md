# Open Edition Implementation

## Open Edition: Single Metadata for All Tokens

**Open Edition** = Semua NFT share gambar dan metadata yang sama

### Konsep

Untuk Open Edition, kita hanya perlu **1 metadata file** yang akan digunakan oleh semua tokens:

```
Upload ke IPFS (as folder):
└── metadata.json → { "name": "Collection Name", "image": "ipfs://QmImage" }

baseURI = "ipfs://QmMetadataHash/"
tokenURI(0) = "ipfs://QmMetadataHash/metadata.json" ✅
tokenURI(1) = "ipfs://QmMetadataHash/metadata.json" ✅
tokenURI(2) = "ipfs://QmMetadataHash/metadata.json" ✅
```

### Contract Modification Required

Smart contract perlu dimodifikasi untuk support Open Edition. Tambahkan flag `isOpenEdition`:

```solidity
struct CollectionConfig {
    // ... existing fields
    bool isOpenEdition;  // ← Add this field
}

function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    if (!_exists(tokenId)) revert OddsLaunchpad__TokenDoesNotExist(tokenId);
    
    if (!s_config.isRevealed) {
        return s_config.unrevealedURI;
    }
    
    // ✅ For Open Edition, return baseURI + "metadata.json" (same for all tokens)
    if (s_config.isOpenEdition) {
        return string(abi.encodePacked(s_config.baseURI, "metadata.json"));
    }
    
    // For Standard Edition, append tokenId + ".json"
    return string(abi.encodePacked(s_config.baseURI, _toString(tokenId), ".json"));
}
```

### ✅ Solusi yang Diimplementasikan (Frontend)

Frontend upload **1 metadata file** (`metadata.json`) ke IPFS sebagai folder:

```
Upload ke IPFS (as folder):
└── metadata.json → { 
      "name": "Collection Name",
      "symbol": "SYMBOL",
      "description": "Description",
      "image": "ipfs://QmImageHash",
      "seller_fee_basis_points": 500,
      "attributes": [],
      "properties": { ... }
    }

baseURI = "ipfs://QmMetadataHash/" (with trailing slash)
Full metadata URL = "ipfs://QmMetadataHash/metadata.json"
```

**Keuntungan:**
- ✅ **Efficient** - hanya 1 file untuk semua tokens
- ✅ **Fast upload** - tidak perlu upload ribuan file
- ✅ **Low storage cost** - minimal IPFS pinning
- ✅ **True Open Edition** - semua token benar-benar identical

## Implementasi

### 1. Generate Single Metadata (Frontend)

Di `src/components/admin/creator-studio.tsx`:

```typescript
// For Open Edition, generate single metadata with full format
const metadata = metadataProcessor.generateOpenEditionMetadata(
  collectionData.name,
  collectionData.description,
  imageResult.ipfsUrl, // Image IPFS URL
  collectionData.symbol,
  collectionData.externalLink,
  [], // attributes - can be customized
  collectionData.royaltyPercentage, // seller_fee_basis_points
  [{ address: creatorAddress, share: 100 }] // creators
);
```

### 2. Upload Metadata as Folder ke IPFS

```typescript
// Upload metadata.json as a folder (not single file)
// This creates URL: ipfs://QmHash/metadata.json instead of ipfs://bafkreigkspzm...
const jsonString = JSON.stringify(metadata, null, 2);
const blob = new Blob([jsonString], { type: 'application/json' });
const metadataFile = new File([blob], 'metadata.json', { type: 'application/json' });

const metadataResult = await ipfsService.uploadFolder(
  [metadataFile], 
  `${collectionData.symbol}-metadata`
);

// baseURI points to the folder with trailing slash
finalBaseURI = metadataResult.ipfsUrl; // "ipfs://QmMetadataHash/"
```

### 3. Deploy Contract dengan isOpenEdition Flag

```typescript
await contractService.createLaunchpadWithPhases(chainId, {
  // ...
  baseURI: finalBaseURI, // "ipfs://QmMetadataHash"
  isRevealed: true,
  isOpenEdition: true // ← Set this flag for Open Edition
}, phases);
```

### 4. Contract Returns Same Metadata for All Tokens

```solidity
// Contract implementation
function tokenURI(uint256 tokenId) public view returns (string memory) {
    if (!_exists(tokenId)) revert OddsLaunchpad__TokenDoesNotExist(tokenId);
    
    if (!s_config.isRevealed) {
        return s_config.unrevealedURI;
    }
    
    // For Open Edition, return baseURI directly
    if (s_config.isOpenEdition) {
        return s_config.baseURI; // "ipfs://QmMetadataHash"
    }
    
    // For Standard Edition, append tokenId
    return string(abi.encodePacked(s_config.baseURI, _toString(tokenId), ".json"));
}
```

## Contoh Metadata

### Single metadata.json (Shared by All Tokens)

```json
{
  "name": "My Open Edition",
  "symbol": "OPEN",
  "description": "This is an open edition NFT - all tokens share the same image",
  "seller_fee_basis_points": 500,
  "image": "ipfs://QmImageHash",
  "external_url": "https://example.com",
  "attributes": [],
  "properties": {
    "files": [
      {
        "uri": "ipfs://QmImageHash",
        "type": "image/png"
      }
    ],
    "category": "image",
    "creators": [
      {
        "address": "0x1234...",
        "share": 100
      }
    ]
  }
}
```

**Result:**
- `tokenURI(0)` → `"ipfs://QmMetadataHash/metadata.json"` → Returns metadata above
- `tokenURI(1)` → `"ipfs://QmMetadataHash/metadata.json"` → Returns metadata above
- `tokenURI(999)` → `"ipfs://QmMetadataHash/metadata.json"` → Returns metadata above

All tokens return **exactly the same metadata URL**.

## Keuntungan Open Edition dengan Single Metadata

### Keuntungan
- ✅ **Efficient storage** - hanya 1 file untuk semua tokens
- ✅ **Fast upload** - upload selesai dalam hitungan detik
- ✅ **Low cost** - minimal IPFS pinning cost
- ✅ **True Open Edition** - semua token benar-benar identical
- ✅ **Easy to update** - update 1 file untuk update semua tokens (jika menggunakan mutable storage)
- ✅ **Works** dengan Alchemy, OpenSea, dan marketplace lain

### Persyaratan
- ⚠️ **Contract modification required** - perlu tambahkan `isOpenEdition` flag
- ⚠️ **Contract deployment** - perlu deploy contract baru atau upgrade

### Perbandingan

| Aspect | Standard Edition | Open Edition |
|--------|------------------|--------------|
| **Files** | N unique files | 1 shared file |
| **Upload time** | Medium (depends on N) | Fast (< 1 second) |
| **Storage** | High | Very Low |
| **IPFS cost** | High | Very Low |
| **Metadata** | Unique per token | Shared by all tokens |
| **Image** | Unique per token | Shared by all tokens |
| **Contract support** | ✅ Native | ✅ With `isOpenEdition` flag |

## Contract Modification Guide

### Step 1: Add isOpenEdition to CollectionConfig

```solidity
struct CollectionConfig {
    string name;
    string symbol;
    string baseURI;
    string unrevealedURI;
    string contractURI;
    string externalLink;
    uint256 totalMaxSupply;
    address payable treasury;
    address payable royaltyRecipient;
    uint96 royaltyPercentage;
    bool isRevealed;
    bool transfersEnabled;
    bool isOpenEdition;  // ← Add this field
    uint256 chainId;
}
```

### Step 2: Update tokenURI Function

```solidity
function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    if (!_exists(tokenId)) revert OddsLaunchpad__TokenDoesNotExist(tokenId);
    
    if (!s_config.isRevealed) {
        return s_config.unrevealedURI;
    }
    
    // ✅ For Open Edition, return baseURI + "metadata.json" (same for all tokens)
    if (s_config.isOpenEdition) {
        return string(abi.encodePacked(s_config.baseURI, "metadata.json"));
    }
    
    // For Standard Edition, append tokenId + ".json"
    return string(abi.encodePacked(s_config.baseURI, _toString(tokenId), ".json"));
}
```

### Step 3: Update Constructor

```solidity
constructor(
    CollectionConfig memory _config,
    address collectionOwner,
    MintPhase[] memory initialPhases
) ERC721A(_config.name, _config.symbol) Ownable(collectionOwner) {
    // ... existing validation
    
    s_config = _config; // This now includes isOpenEdition
    
    // ... rest of constructor
}
```

### Step 4: Add View Function (Optional)

```solidity
function isOpenEdition() external view returns (bool) {
    return s_config.isOpenEdition;
}
```

## Frontend Implementation (contract-service.ts)

Update `deployMasterContract` untuk pass `isOpenEdition` flag:

```typescript
const collectionConfig = {
  name: request.name,
  symbol: request.symbol,
  baseURI: request.baseURI,
  unrevealedURI: request.unrevealedURI,
  contractURI: request.contractURI,
  externalLink: request.externalLink,
  totalMaxSupply: request.totalMaxSupply,
  treasury: request.treasury,
  royaltyRecipient: request.royaltyRecipient,
  royaltyPercentage: request.royaltyPercentage,
  isRevealed: hasMetadata ? true : (request.isRevealed || false),
  transfersEnabled: request.transfersEnabled || true,
  isOpenEdition: request.isOpenEdition || false, // ← Add this
  chainId: chainId
};
```

## Testing

### 1. Deploy Open Edition Collection

```typescript
// In Creator Studio
collectionType = 'open'; // Select Open Edition
// Upload single image
// System will upload 1 metadata.json file
// Deploy with isOpenEdition = true
```

### 2. Verify tokenURI

```javascript
const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, provider);

// Check if Open Edition
const isOpenEdition = await contract.isOpenEdition();
console.log('Is Open Edition:', isOpenEdition); // Should be true

// Check tokenURI for different tokens
const uri0 = await contract.tokenURI(0);
const uri1 = await contract.tokenURI(1);
const uri999 = await contract.tokenURI(999);

console.log('Token 0 URI:', uri0);
console.log('Token 1 URI:', uri1);
console.log('Token 999 URI:', uri999);

// All should return the same URL: "ipfs://QmMetadataHash"
console.log('All same?', uri0 === uri1 && uri1 === uri999); // Should be true
```

### 3. Verify Metadata Content

```bash
# Fetch metadata via gateway
curl https://ipfs.io/ipfs/QmMetadataHash

# Should return:
{
  "name": "My Open Edition",
  "image": "ipfs://QmImageHash",
  ...
}
```

### 4. Verify on Alchemy

```bash
curl https://eth-sepolia.g.alchemy.com/nft/v3/YOUR_API_KEY/getNFTMetadata \
  -d '{"contractAddress":"0x...","tokenId":"0"}'

curl https://eth-sepolia.g.alchemy.com/nft/v3/YOUR_API_KEY/getNFTMetadata \
  -d '{"contractAddress":"0x...","tokenId":"1"}'

# Both should return the same metadata
```

## Best Practices

### ✅ DO

1. **Set isOpenEdition = true** untuk Open Edition collections
2. **Upload metadata.json as folder** (bukan single file)
3. **Set baseURI** ke folder URL dengan trailing slash (e.g., `ipfs://QmHash/`)
4. **Test tokenURI** untuk beberapa tokenId berbeda
5. **Verify** semua token return URL yang sama: `ipfs://QmHash/metadata.json`

### ❌ DON'T

1. **Jangan upload single file** - upload sebagai folder
2. **Jangan lupa trailing slash** di baseURI (harus ada `/` di akhir)
3. **Jangan lupa set isOpenEdition flag** di contract
4. **Jangan gunakan Standard Edition flow** untuk Open Edition

## Summary

**Implementation:**
- ✅ Upload **metadata.json as folder** (bukan single file)
- ✅ Set `isOpenEdition = true` di contract
- ✅ Contract returns `baseURI + "metadata.json"` (same for all tokens)
- ✅ All tokens share the same metadata and image
- ✅ Efficient storage and fast upload
- ✅ Low IPFS pinning cost

**Contract Changes Required:**
1. Add `isOpenEdition` field to `CollectionConfig` struct
2. Update `tokenURI()` function to check `isOpenEdition` flag
3. Return `baseURI + "metadata.json"` for Open Edition (same for all tokens)

**Frontend Changes:**
1. Upload `metadata.json` as folder (not single file) for Open Edition
2. Pass `isOpenEdition: true` when deploying Open Edition
3. Set `baseURI` to folder URL with trailing slash (e.g., `ipfs://QmHash/`)

**Benefits:**
- 🚀 **Fast** - upload 1 file instead of thousands
- 💰 **Cheap** - minimal IPFS storage cost
- ✅ **Efficient** - true Open Edition implementation
- 🎯 **Accurate** - all tokens truly identical

## Referensi

- Smart Contract: `contracts/OddsLaunchpad.sol`
- Implementation: `src/components/admin/creator-studio.tsx`
- Metadata Processor: `src/lib/metadata-processor.ts`
- IPFS Service: `src/lib/ipfs-service.ts`
