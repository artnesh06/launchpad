# Fix: Open Edition Metadata URL

## Masalah

Ketika membuat Open Edition collection di Creator Studio, metadata URL yang dihasilkan adalah:

```
https://ipfs.io/ipfs/bafkreigkspzm2aafetecgpfct6mq2xoxwvx657ywpigh7lpxkkpo7eg66a0.json
```

Seharusnya:

```
https://ipfs.io/ipfs/QmHash/metadata.json
```

### Penyebab

1. **Upload method salah**: Metadata di-upload sebagai **single file** menggunakan `uploadJSON()`, yang menghasilkan hash langsung ke file tersebut
2. **Missing isOpenEdition flag**: Contract tidak tahu bahwa ini adalah Open Edition, sehingga tidak bisa menangani metadata URL dengan benar
3. **Contract tidak support**: Smart contract belum memiliki logic untuk menangani Open Edition dengan benar

## Solusi yang Diterapkan

### 1. Upload Metadata sebagai Folder (bukan Single File)

**Sebelum:**
```typescript
// ❌ Upload single file - menghasilkan hash langsung
const metadataResult = await ipfsService.uploadJSON(metadata, 'metadata.json');
// Result: ipfs://bafkreigkspzm... (hash langsung ke file)
```

**Sesudah:**
```typescript
// ✅ Upload sebagai folder - menghasilkan folder hash
const jsonString = JSON.stringify(metadata, null, 2);
const blob = new Blob([jsonString], { type: 'application/json' });
const metadataFile = new File([blob], 'metadata.json', { type: 'application/json' });

const metadataResult = await ipfsService.uploadFolder(
  [metadataFile], 
  `${collectionData.symbol}-metadata`
);
// Result: ipfs://QmHash/ (folder hash dengan trailing slash)
```

### 2. Tambahkan isOpenEdition Flag ke Contract Service

**File:** `src/lib/contract-service.ts`

```typescript
async deployMasterContract(
  chainId: number,
  templateAddress: string,
  request: {
    // ... existing fields
    isOpenEdition?: boolean; // ← Add this
  },
  phases?: any[]
): Promise<string> {
  // ...
  
  const collectionConfig = {
    // ... existing fields
    isOpenEdition: request.isOpenEdition || false, // ← Add this
    chainId: chainId
  };
  
  // ...
}
```

### 3. Pass isOpenEdition dari Creator Studio

**File:** `src/components/admin/creator-studio.tsx`

```typescript
const createTxHash = await contractService.createLaunchpadWithPhases(selectedChainId, {
  name: collectionData.name,
  symbol: collectionData.symbol,
  // ... other fields
  isOpenEdition: collectionType === 'open' // ← Add this
}, phasesForContract);
```

### 4. Update Smart Contract (Required)

Smart contract perlu dimodifikasi untuk support `isOpenEdition` flag:

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
    
    // ✅ For Open Edition, return baseURI + "metadata.json"
    if (s_config.isOpenEdition) {
        return string(abi.encodePacked(s_config.baseURI, "metadata.json"));
    }
    
    // For Standard Edition, append tokenId + ".json"
    return string(abi.encodePacked(s_config.baseURI, _toString(tokenId), ".json"));
}
```

## Hasil

### Sebelum Fix

```
Upload: Single file → ipfs://bafkreigkspzm...
baseURI: ipfs://bafkreigkspzm...
tokenURI(0): ipfs://bafkreigkspzm... ❌ (hash langsung)
tokenURI(1): ipfs://bafkreigkspzm... ❌ (hash langsung)
```

### Sesudah Fix

```
Upload: Folder → ipfs://QmHash/
baseURI: ipfs://QmHash/
tokenURI(0): ipfs://QmHash/metadata.json ✅
tokenURI(1): ipfs://QmHash/metadata.json ✅
tokenURI(999): ipfs://QmHash/metadata.json ✅
```

Semua token menunjuk ke URL yang sama: `ipfs://QmHash/metadata.json`

## Testing

### 1. Deploy Open Edition Collection

```typescript
// In Creator Studio
collectionType = 'open'; // Select Open Edition
// Upload single image
// System will:
// 1. Upload image to IPFS
// 2. Generate metadata.json
// 3. Upload metadata.json as folder (not single file)
// 4. Deploy with isOpenEdition = true
```

### 2. Verify Console Output

```
🎉 OPEN EDITION - 2 IPFS HASHES:
   1. Image File:    ipfs://QmImageHash
   2. Metadata Folder: ipfs://QmMetadataHash/

📝 Open Edition: All tokens will share the same metadata
   Full metadata URL: ipfs://QmMetadataHash/metadata.json
```

### 3. Verify tokenURI

```javascript
const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, provider);

// Check if Open Edition
const isOpenEdition = await contract.isOpenEdition();
console.log('Is Open Edition:', isOpenEdition); // Should be true

// Check tokenURI for different tokens
const uri0 = await contract.tokenURI(0);
const uri1 = await contract.tokenURI(1);

console.log('Token 0 URI:', uri0); // ipfs://QmHash/metadata.json
console.log('Token 1 URI:', uri1); // ipfs://QmHash/metadata.json

// All should return the same URL
console.log('All same?', uri0 === uri1); // Should be true
```

### 4. Verify Metadata Content

```bash
# Fetch metadata via gateway
curl https://ipfs.io/ipfs/QmMetadataHash/metadata.json

# Should return:
{
  "name": "My Open Edition",
  "image": "ipfs://QmImageHash",
  "description": "...",
  "attributes": [],
  ...
}
```

## Checklist

- [x] Update `uploadFolder` call di creator-studio.tsx
- [x] Add `isOpenEdition` field ke request type di contract-service.ts
- [x] Add `isOpenEdition` ke collectionConfig
- [x] Pass `isOpenEdition: true` dari creator-studio
- [x] Update console logs untuk debugging
- [x] Update dokumentasi OPEN_EDITION_IMPLEMENTATION.md
- [ ] **Update smart contract** untuk support `isOpenEdition` flag
- [ ] **Deploy new contract** dengan isOpenEdition support
- [ ] **Approve new template** di MasterContractFactory
- [ ] Test deployment dengan Open Edition

## Next Steps

1. **Update Smart Contract:**
   - Add `isOpenEdition` field to `CollectionConfig` struct
   - Update `tokenURI()` function to handle Open Edition
   - Deploy new contract version

2. **Approve New Template:**
   ```bash
   node scripts/approve-current-bytecode.js
   ```

3. **Test Open Edition:**
   - Create new Open Edition collection
   - Verify metadata URL format
   - Check tokenURI for multiple tokens
   - Verify on Alchemy/OpenSea

## Referensi

- Smart Contract: `contracts/OddsLaunchpad.sol`
- Contract Service: `src/lib/contract-service.ts`
- Creator Studio: `src/components/admin/creator-studio.tsx`
- IPFS Service: `src/lib/ipfs-service.ts`
- Documentation: `docs/OPEN_EDITION_IMPLEMENTATION.md`
