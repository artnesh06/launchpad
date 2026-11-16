# Fix: Cover Image Not Saving to Database

## Problem
Cover image yang di-upload saat create launchpad tidak tersimpan ke database, sehingga `metadata.image` selalu `null` di API response.

## Root Cause
1. **Creator Studio**: Cover image di-upload ke IPFS dan URL-nya disimpan di variable `coverImageUrl`, tapi tidak dikirim ke API saat save to database
2. **API Route**: API sudah support field `image` dan `bannerImage`, tapi tidak support format `metadata` object

## Solution

### 1. Creator Studio (`src/components/admin/creator-studio.tsx`)

**Sebelum:**
```typescript
body: JSON.stringify({
  chainId: selectedChainId,
  contractAddress: collectionAddress,
  // ... other fields
  deployTxHash: createTxHash,
  // ❌ coverImageUrl dan bannerImageUrl tidak dikirim
}),
```

**Sesudah:**
```typescript
body: JSON.stringify({
  chainId: selectedChainId,
  contractAddress: collectionAddress,
  // ... other fields
  deployTxHash: createTxHash,
  // ✅ Menambahkan metadata object dengan cover image
  metadata: {
    image: coverImageUrl || null,
    bannerImage: bannerImageUrl || null,
    website: collectionData.externalLink || '',
  },
}),
```

### 2. API Route (`src/app/api/admin/launchpads/save/route.ts`)

**Perubahan:**

1. **Extract metadata dari request body:**
```typescript
const {
  // ... existing fields
  metadata,  // NEW: Support metadata object
  // ... other fields
} = body;

// Extract metadata fields (support both formats)
const metadataImage = metadata?.image || image || null;
const metadataBannerImage = metadata?.bannerImage || bannerImage || null;
const metadataWebsite = metadata?.website || externalLink || null;
// ... other metadata fields
```

2. **Save metadata dengan field yang benar:**
```typescript
await prisma.launchpadMetadata.create({
  data: {
    launchpadId: launchpad.id,
    image: metadataImage,           // ✅ Menggunakan extracted value
    bannerImage: metadataBannerImage, // ✅ Menggunakan extracted value
    website: metadataWebsite,
    // ... other fields
  }
});
```

## Benefits

✅ **Backward Compatible**: Masih support format lama (individual fields) dan format baru (metadata object)
✅ **Cover Image Saved**: Cover image URL dari IPFS sekarang tersimpan ke database
✅ **Banner Image Saved**: Banner image URL juga tersimpan
✅ **NFT Trending Table**: Sekarang bisa menampilkan cover image dari `metadata.image`

## Testing Steps

1. **Create New Launchpad:**
   - Upload cover image (800×800px)
   - Upload banner image (1000×300px)
   - Deploy launchpad
   - ✅ Check database: `metadata.image` should have IPFS URL

2. **Verify API Response:**
   ```bash
   GET /api/admin/launchpads?chainId=6342&limit=1
   ```
   Response should include:
   ```json
   {
     "metadata": {
       "image": "ipfs://Qm...",
       "bannerImage": "ipfs://Qm...",
       "website": "https://..."
     }
   }
   ```

3. **Check NFT Trending Table:**
   - ✅ Cover image should display in avatar
   - ✅ Fallback to letter avatar if no image

## Files Changed

1. `src/components/admin/creator-studio.tsx`
   - Added `metadata` object to save API request
   - Includes `coverImageUrl` and `bannerImageUrl`

2. `src/app/api/admin/launchpads/save/route.ts`
   - Added support for `metadata` object in request body
   - Extract metadata fields with fallback to individual fields
   - Save extracted values to database

3. `src/components/nft-trending-table.tsx` (already fixed)
   - Display cover image from `metadata.image`
   - Fallback to avatar letter if no image

## Next Steps

- [ ] Test create new launchpad with cover image
- [ ] Verify image appears in NFT Trending Table
- [ ] Test backward compatibility with old format
- [ ] Update existing launchpads to add cover images (optional)
