# Fix: Auto-set isRevealed = true Saat Metadata Sudah Di-upload

## Masalah

Ketika membuat collection di Creator Studio dengan metadata yang sudah di-upload ke IPFS, metadata NFT tidak terbaca oleh Alchemy API. Response menunjukkan:

```json
{
  "tokenUri": null,
  "metadata": {},
  "error": "Malformed token uri, do not retry"
}
```

Atau:

```json
{
  "tokenUri": "ipfs://bafkreial4sr6hnb4e2guvoxzz2qcy7ibozcjkzqcz27g3cwt5rhxd6nxaa0.json",
  "metadata": {},
  "error": "Token uri responded with a non 200 response code"
}
```

## Penyebab

Di `src/lib/contract-service.ts`, fungsi `createLaunchpad()` dan `createLaunchpadWithPhases()` **hardcode `isRevealed: false`** saat deployment:

```typescript
// ❌ SEBELUM FIX
async createLaunchpadWithPhases(...) {
  const txHash = await this.deployMasterContract(
    chainId,
    templateAddress,
    {
      // ...
      isRevealed: false,  // ❌ Hardcoded ke false!
      transfersEnabled: true
    },
    phases
  );
}
```

Ini menyebabkan:
1. **Contract tidak mengembalikan tokenURI yang benar** karena `isRevealed = false`
2. **Alchemy tidak bisa membaca metadata** karena tokenURI null atau salah
3. **NFT tidak muncul di marketplace** seperti OpenSea

## Solusi

### 1. Auto-detect Metadata dan Set isRevealed

Di `src/lib/contract-service.ts`, tambahkan logika untuk **auto-detect** apakah metadata sudah ada:

```typescript
// ✅ SETELAH FIX
async createLaunchpadWithPhases(...) {
  // IMPORTANT: Set isRevealed to true if baseURI is provided (metadata is ready)
  const hasMetadata = request.baseURI && request.baseURI.trim() !== '';
  
  const txHash = await this.deployMasterContract(
    chainId,
    templateAddress,
    {
      // ...
      isRevealed: hasMetadata, // ✅ Auto-set to true if metadata exists
      transfersEnabled: true
    },
    phases
  );
}
```

### 2. Logika di deployMasterContract

Fungsi `deployMasterContract` sudah memiliki logika yang benar (baris 1493-1495):

```typescript
const hasMetadata = request.baseURI && request.baseURI.trim() !== '';
const collectionConfig = {
  // ...
  isRevealed: hasMetadata ? true : (request.isRevealed || false),
  // ...
};
```

Tapi logika ini **tidak berfungsi** jika caller sudah pass `isRevealed: false` secara eksplisit.

## Cara Kerja Setelah Fix

### Standard Collection (ERC721)

1. **Upload metadata ZIP** → IPFS folder: `ipfs://QmHash/`
2. **Set baseURI** = `ipfs://QmHash/` (dengan trailing slash)
3. **Auto-detect**: `hasMetadata = true` (karena baseURI tidak kosong)
4. **Set isRevealed** = `true` ✅
5. **Deploy contract** dengan `isRevealed = true`
6. **tokenURI(0)** returns: `ipfs://QmHash/0.json` ✅
7. **Alchemy dapat membaca metadata** ✅

### Open Edition (ERC1155)

1. **Upload single image** → IPFS: `ipfs://QmImageHash`
2. **Generate metadata JSON** → IPFS: `ipfs://QmMetadataHash`
3. **Set baseURI** = `ipfs://QmMetadataHash`
4. **Auto-detect**: `hasMetadata = true`
5. **Set isRevealed** = `true` ✅
6. **Deploy contract** dengan `isRevealed = true`
7. **tokenURI(any)** returns: `ipfs://QmMetadataHash` ✅
8. **Alchemy dapat membaca metadata** ✅

## Testing

### 1. Cek isRevealed di Contract

Setelah deploy collection baru:

```javascript
const contract = new ethers.Contract(collectionAddress, OddsLaunchpadABI, provider);
const isRevealed = await contract.isRevealed();
console.log('Is Revealed:', isRevealed); // Should be true
```

### 2. Cek tokenURI

```javascript
const tokenUri = await contract.tokenURI(0);
console.log('Token URI:', tokenUri);
// Expected: ipfs://QmHash/0.json (Standard) atau ipfs://QmHash (Open Edition)
```

### 3. Cek via Alchemy API

```bash
curl https://eth-sepolia.g.alchemy.com/nft/v3/YOUR_API_KEY/getNFTMetadata \
  -d '{"contractAddress":"0x...","tokenId":"0"}'
```

Response seharusnya:
```json
{
  "tokenUri": "ipfs://QmHash/0.json",
  "metadata": {
    "name": "NFT Name #0",
    "description": "...",
    "image": "ipfs://..."
  }
}
```

## Catatan Penting

### Untuk Developer

- **Jangan hardcode `isRevealed: false`** saat metadata sudah ready
- **Gunakan auto-detection** berdasarkan `baseURI`
- **Validate baseURI** sebelum deployment

### Untuk Smart Contract

Pastikan implementasi `tokenURI()` di contract sudah benar:

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "Token does not exist");
    
    // If not revealed, return unrevealed URI
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

1. **Cek isRevealed di contract:**
   ```javascript
   const isRevealed = await contract.isRevealed();
   console.log('Is Revealed:', isRevealed); // Should be true
   ```

2. **Jika isRevealed = false, call reveal():**
   ```javascript
   const tx = await contract.reveal();
   await tx.wait();
   console.log('✅ Collection revealed!');
   ```

3. **Cek baseURI:**
   ```javascript
   const baseURI = await contract.baseURI();
   console.log('Base URI:', baseURI); // Should not be empty
   ```

4. **Cek IPFS accessibility:**
   - Pastikan file bisa diakses via public gateway
   - Gateway utama: `https://eu.orbitor.dev/ipfs/`
   - Gateway alternatif: gateway.pinata.cloud, ipfs.io, cloudflare-ipfs.com

### Jika Perlu Update Collection yang Sudah Deploy

Jika collection sudah di-deploy dengan `isRevealed = false`:

1. **Call `reveal()` function:**
   ```javascript
   const contract = new ethers.Contract(collectionAddress, OddsLaunchpadABI, signer);
   const tx = await contract.reveal();
   await tx.wait();
   console.log('✅ Collection revealed!');
   ```

2. **Atau via Etherscan:**
   - Buka contract di Etherscan
   - Go to "Write Contract"
   - Connect wallet
   - Call `reveal()` function

## Referensi

- [ERC721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [IPFS Best Practices](https://docs.ipfs.tech/concepts/best-practices/)
- [Alchemy NFT API](https://docs.alchemy.com/reference/nft-api-quickstart)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)

## Changelog

### 2025-11-21
- ✅ Fixed `createLaunchpad()` to auto-set `isRevealed = true` when metadata exists
- ✅ Fixed `createLaunchpadWithPhases()` to auto-set `isRevealed = true` when metadata exists
- ✅ Added auto-detection logic based on `baseURI`
- ✅ Removed hardcoded `isRevealed: false`
