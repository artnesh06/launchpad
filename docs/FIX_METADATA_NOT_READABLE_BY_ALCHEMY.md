# Fix: Metadata Tidak Terbaca oleh Alchemy

## Masalah

Ketika membuat collection di Creator Studio, metadata NFT tidak terbaca oleh Alchemy API. Response menunjukkan:

```json
{
  "tokenUri": null,
  "metadata": {},
  "error": "Malformed token uri, do not retry"
}
```

## Penyebab

Ada 3 penyebab utama:

### 1. **BaseURI Tidak Memiliki Trailing Slash**

Untuk ERC721 Standard Collection, `tokenURI(tokenId)` di smart contract biasanya menggabungkan:
```
baseURI + tokenId + ".json"
```

Jika `baseURI` tidak diakhiri dengan `/`, hasilnya akan salah:
- ❌ Salah: `ipfs://hash0.json` (tanpa slash)
- ✅ Benar: `ipfs://hash/0.json` (dengan slash)

### 2. **isRevealed = false**

Jika `isRevealed` di-set ke `false`, smart contract akan mengembalikan `unrevealedURI` untuk semua token, bukan `baseURI + tokenId`. Jika `unrevealedURI` kosong, maka `tokenURI()` akan return empty string atau null.

### 3. **BaseURI Kosong**

Jika upload IPFS gagal atau `baseURI` tidak di-set dengan benar, contract tidak akan memiliki metadata URL yang valid.

## Solusi yang Diterapkan

### 1. **Tambahkan Trailing Slash untuk Standard Collection**

Di `src/components/admin/creator-studio.tsx`:

```typescript
// Set baseURI to the metadata folder with trailing slash for ERC721
// This ensures tokenURI(0) returns ipfs://hash/0 or ipfs://hash/0.json
finalBaseURI = metadataResult.ipfsUrl.endsWith('/') 
  ? metadataResult.ipfsUrl 
  : metadataResult.ipfsUrl + '/';
```

### 2. **Auto-set isRevealed = true Saat Metadata Sudah Di-upload**

Di `src/lib/contract-service.ts`:

```typescript
// IMPORTANT: Set isRevealed to true if baseURI is provided (metadata is ready)
const hasMetadata = request.baseURI && request.baseURI.trim() !== '';
const collectionConfig = {
  // ...
  isRevealed: hasMetadata ? true : (request.isRevealed || false),
  // ...
};
```

### 3. **Validasi BaseURI Sebelum Deployment**

Di `src/components/admin/creator-studio.tsx`:

```typescript
// Validate baseURI before deployment
if (!finalBaseURI || finalBaseURI.trim() === '') {
  throw new Error('BaseURI is empty! Metadata upload may have failed. Please try again.');
}

console.log('📋 Final deployment configuration:');
console.log('  - baseURI:', finalBaseURI);
console.log('  - isRevealed: true (metadata is ready)');
```

## Cara Kerja Setelah Fix

### Standard Collection (ERC721)

1. **Upload metadata ZIP** → IPFS folder: `ipfs://QmHash/`
2. **Set baseURI** = `ipfs://QmHash/` (dengan trailing slash)
3. **Set isRevealed** = `true`
4. **tokenURI(0)** returns: `ipfs://QmHash/0.json` ✅
5. **tokenURI(1)** returns: `ipfs://QmHash/1.json` ✅

### Open Edition (ERC1155)

1. **Upload single image** → IPFS: `ipfs://QmImageHash`
2. **Generate metadata JSON** → IPFS: `ipfs://QmMetadataHash`
3. **Set baseURI** = `ipfs://QmMetadataHash` (tanpa trailing slash)
4. **Set isRevealed** = `true`
5. **tokenURI(any)** returns: `ipfs://QmMetadataHash` ✅

## Testing

Setelah deploy collection baru dengan fix ini:

1. **Cek tokenURI di contract:**
   ```javascript
   const tokenUri = await contract.tokenURI(0);
   console.log('Token URI:', tokenUri);
   // Expected: ipfs://QmHash/0.json (Standard) atau ipfs://QmHash (Open Edition)
   ```

2. **Cek via Alchemy API:**
   ```bash
   curl https://eth-sepolia.g.alchemy.com/nft/v3/YOUR_API_KEY/getNFTMetadata \
     -d '{"contractAddress":"0x...","tokenId":"0"}'
   ```

3. **Verify metadata accessible:**
   - Buka URL di browser: `https://eu.orbitor.dev/ipfs/QmHash/0.json`
   - Atau gunakan gateway lain: `https://eu.orbitor.dev/ipfs/QmHash/0.json`
   - Atau: `https://ipfs.io/ipfs/QmHash/0.json`

## Catatan Penting

### Untuk Developer

- **Selalu gunakan trailing slash** untuk baseURI di ERC721 collections
- **Set isRevealed = true** saat metadata sudah ready
- **Validate baseURI** sebelum deployment untuk menghindari error

### Untuk Smart Contract

Pastikan implementasi `tokenURI()` di contract sudah benar:

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "Token does not exist");
    
    if (!isRevealed) {
        return unrevealedURI;
    }
    
    // For Standard Collection: baseURI + tokenId + ".json"
    return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    
    // For Open Edition: just return baseURI (same for all tokens)
    // return baseURI;
}
```

## Troubleshooting

### Jika Metadata Masih Tidak Terbaca

1. **Cek baseURI di contract:**
   ```javascript
   const baseURI = await contract.baseURI();
   console.log('Base URI:', baseURI);
   ```

2. **Cek isRevealed:**
   ```javascript
   const isRevealed = await contract.isRevealed();
   console.log('Is Revealed:', isRevealed);
   ```

3. **Cek IPFS accessibility:**
   - Pastikan file bisa diakses via public gateway
   - Gateway utama: `https://eu.orbitor.dev/ipfs/`
   - Gateway alternatif: gateway.pinata.cloud, ipfs.io, cloudflare-ipfs.com

4. **Cek format metadata JSON:**
   ```json
   {
     "name": "NFT Name #0",
     "description": "Description",
     "image": "ipfs://QmImageHash",
     "attributes": []
   }
   ```

### Jika Perlu Update Collection yang Sudah Deploy

Jika collection sudah di-deploy dengan baseURI yang salah, Anda perlu:

1. **Call `setBaseURI()` function** (jika ada):
   ```javascript
   await contract.setBaseURI("ipfs://QmCorrectHash/");
   ```

2. **Call `reveal()` function** (jika ada):
   ```javascript
   await contract.reveal();
   ```

3. **Atau deploy ulang collection** dengan konfigurasi yang benar

## Referensi

- [ERC721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [IPFS Best Practices](https://docs.ipfs.tech/concepts/best-practices/)
- [Alchemy NFT API](https://docs.alchemy.com/reference/nft-api-quickstart)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)
