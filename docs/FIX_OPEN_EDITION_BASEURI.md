# Fix: Open Edition BaseURI Issue

## Problem
Ketika deploy contract master untuk Open Edition di Creator Studio, `tokenURI` yang dihasilkan salah formatnya:
- **Sebelum**: `ipfs://folder/0.json` (placeholder literal "folder")
- **Seharusnya**: `ipfs://bafkrei.../` (hash IPFS yang sebenarnya)

## Root Cause
1. **ipfs-service.ts**: Fungsi `uploadFolder()` mengembalikan placeholder `ipfsHash: 'folder'` untuk multiple file uploads
2. **creator-studio.tsx**: Untuk Open Edition, metadata.json di-upload sebagai single file tapi tetap menggunakan `uploadFolder()`
3. **contract-service.ts**: Parameter `isOpenEdition` tidak diteruskan dari `createLaunchpadWithPhases()` ke `deployMasterContract()`

## Solution

### 1. Fix ipfs-service.ts
Deteksi single file upload dan return hash yang sebenarnya:

```typescript
// For single file uploads (like Open Edition metadata.json), return the actual hash
if (files.length === 1 && fileMapping[files[0].name]) {
  const singleFileHash = fileMapping[files[0].name];
  return {
    ipfsHash: singleFileHash,
    ipfsUrl: `ipfs://${singleFileHash}`,
    gatewayUrl: `https://eu.orbitor.dev/ipfs/${singleFileHash}`,
    fileMapping
  };
}
```

### 2. Update creator-studio.tsx
Perbaiki komentar dan log untuk Open Edition:

```typescript
// For Open Edition, baseURI should be the direct IPFS hash of metadata.json
// Contract will use this exact URL for all tokens (no appending)
finalBaseURI = metadataResult.ipfsUrl;
```

### 3. Fix contract-service.ts
Tambahkan parameter `isOpenEdition` ke interface dan pass ke `deployMasterContract()`:

```typescript
async createLaunchpadWithPhases(
  chainId: number,
  request: {
    // ... existing fields
    isOpenEdition?: boolean;  // Added
  },
  phases: any[]
): Promise<string> {
  // ...
  const txHash = await this.deployMasterContract(
    chainId,
    templateAddress,
    {
      // ... existing fields
      isOpenEdition: request.isOpenEdition || false  // Added
    },
    phases
  );
}
```

## Result
Setelah fix ini, Open Edition akan memiliki baseURI yang benar:
- `ipfs://bafkreigkspzm2aafetecgpfct6mq2xoxwvx657ywpigh7lpxkkpo7eg66a` (hash file metadata.json)
- Contract akan menggunakan URL ini untuk semua token
- Metadata dapat diakses dengan benar oleh marketplace seperti OpenSea

## Testing
1. Deploy Open Edition collection baru via Creator Studio
2. Verify `baseURI` di contract menggunakan hash IPFS yang valid
3. Check `tokenURI(0)` returns valid IPFS URL
4. Verify metadata dapat diakses via IPFS gateway

## Files Changed
- `src/lib/ipfs-service.ts`
- `src/components/admin/creator-studio.tsx`
- `src/lib/contract-service.ts`
