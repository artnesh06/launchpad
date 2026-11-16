# Metadata Upload Implementation Guide

## Overview

Implementasi mekanisme upload metadata untuk 2 tipe NFT collection:
- **Standard Edition**: Collection dengan multiple NFTs (ada supply), menggunakan ZIP file
- **Open Edition**: Single NFT yang di-mint unlimited, menggunakan 1 image

## ✅ Changes Implemented

### 1. **New File: `src/lib/metadata-processor.ts`**

Service untuk handle extraction dan processing ZIP files:

**Key Features:**
- Extract ZIP files containing metadata JSON + images
- Validate metadata structure (name, description, image, attributes)
- Validate collection (sequential token IDs, matching supply)
- Update metadata dengan IPFS image URLs
- Generate metadata untuk Open Edition
- Create metadata preview untuk UI

**Main Methods:**
```typescript
// Extract dan process ZIP file
extractAndProcessZIP(zipFile: File): Promise<ProcessedCollection>

// Update metadata dengan IPFS URLs
updateMetadataWithIPFSImages(metadata, imageUrlMap): ProcessedMetadata[]

// Generate metadata untuk Open Edition
generateOpenEditionMetadata(name, desc, imageUrl): NFTMetadata

// Validate metadata structure
validateMetadata(metadata): { isValid, errors }

// Validate entire collection
validateCollection(collection, expectedSupply): { isValid, errors }
```

### 2. **Enhanced: `src/lib/ipfs-service.ts`**

Added new methods untuk batch upload:

**New Methods:**
```typescript
// Upload multiple images, return Map<filename, ipfsUrl>
uploadImages(images: Map<string, File>): Promise<Map<string, string>>

// Upload metadata folder dengan proper naming
uploadMetadataFolder(metadataFiles: File[], collectionName): Promise<IPFSUploadResult>

// Batch upload dengan progress callback
uploadCollectionBatch(images, metadataFiles, name, onProgress?): Promise<{
  imagesResult: Map<string, string>,
  metadataResult: IPFSUploadResult
}>
```

**Enhanced Features:**
- Upload folder dengan original filenames (bukan index)
- Progress tracking untuk batch uploads
- Better error handling

### 3. **Updated: `src/components/admin/creator-studio.tsx`**

Updated `handleSubmit()` function untuk handle 2 scenarios:

#### **Standard Edition Flow:**
```
1. Extract ZIP file → get metadata JSON + images
2. Validate collection structure
3. Upload all images to IPFS → get individual CIDs
4. Update metadata files dengan image IPFS URLs
5. Upload updated metadata folder to IPFS
6. Set baseURI = ipfs://[metadata-folder-CID]/
```

#### **Open Edition Flow:**
```
1. Upload single image to IPFS → get image CID
2. Auto-generate metadata JSON:
   {
     "name": "Collection Name",
     "description": "...",
     "image": "ipfs://[image-CID]"
   }
3. Upload metadata JSON to IPFS → get metadata CID
4. Set baseURI = ipfs://[metadata-CID]
```

**Enhanced Error Handling:**
- ZIP extraction errors
- Metadata validation errors
- IPFS upload errors
- Network errors
- Transaction errors

**Progress Updates:**
- 10-15%: Extracting ZIP
- 25-50%: Uploading images
- 50-65%: Processing metadata
- 65-75%: Uploading metadata
- 75-80%: Creating contract
- 80-85%: Waiting confirmation
- 90-95%: Adding mint phases
- 100%: Complete

## 📦 Dependencies Required

```bash
npm install jszip
```

**JSZip** is required for extracting ZIP files in the browser.

## 📁 File Structure Requirements

### Standard Edition ZIP Structure

Your ZIP file should contain:

```
collection.zip
├── 1.json          # Metadata for token #1
├── 1.png           # Image for token #1
├── 2.json          # Metadata for token #2
├── 2.png           # Image for token #2
├── 3.json
├── 3.png
...
└── 10000.json
    └── 10000.png
```

**Metadata JSON Format:**
```json
{
  "name": "NFT Name #1",
  "description": "Description of this NFT",
  "image": "1.png",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Eyes",
      "value": "Laser"
    }
  ]
}
```

**Important:**
- Token IDs must be sequential starting from 1
- Each token must have matching JSON + image file
- Image reference in JSON can be: `"1.png"`, `"image1.png"`, etc.
- Supported image formats: PNG, JPG, JPEG, GIF, WEBP

### Open Edition Structure

Simply upload **1 image file** (PNG, JPG, etc.)

The metadata will be auto-generated:
```json
{
  "name": "Your Collection Name",
  "description": "Your collection description",
  "image": "ipfs://QmXXX...",
  "external_url": "https://yoursite.com",
  "attributes": []
}
```

## 🔍 Validation Rules

### Metadata Validation
- ✅ Must have `name` field (string)
- ✅ Must have `description` field (string)
- ✅ Must have `image` field (string)
- ✅ `attributes` must be array (if present)

### Collection Validation (Standard Edition)
- ✅ Must have at least 1 metadata file
- ✅ Metadata count must match `totalMaxSupply`
- ✅ Token IDs must be unique
- ✅ Token IDs must be sequential (1, 2, 3, ...)
- ✅ All metadata files must pass validation

## 🎯 Usage Example

### For Users (Creator Studio UI)

1. **Select Collection Type:**
   - Choose "Standard Collection" for multiple unique NFTs
   - Choose "Open Edition" for single shared NFT

2. **Upload Files:**
   - **Standard**: Upload ZIP file containing metadata + images
   - **Open**: Upload single image file

3. **Fill Collection Info:**
   - Name, Symbol, Description
   - Max Supply
   - Royalty settings
   - Cover & Banner images

4. **Launch:**
   - System will process files automatically
   - Progress bar shows current step
   - Errors will be displayed with clear messages

### For Developers

```typescript
import { metadataProcessor } from '@/lib/metadata-processor';
import { ipfsService } from '@/lib/ipfs-service';

// Standard Edition
const collection = await metadataProcessor.extractAndProcessZIP(zipFile);
const validation = metadataProcessor.validateCollection(collection, 10000);

if (validation.isValid) {
  const imageUrls = await ipfsService.uploadImages(collection.imageFiles);
  const updatedMetadata = metadataProcessor.updateMetadataWithIPFSImages(
    collection.metadataFiles,
    imageUrls
  );
  const metadataFiles = metadataProcessor.createMetadataFiles(updatedMetadata);
  const result = await ipfsService.uploadMetadataFolder(metadataFiles, 'MyNFT');

  console.log('baseURI:', result.ipfsUrl); // ipfs://QmXXX/
}

// Open Edition
const metadata = metadataProcessor.generateOpenEditionMetadata(
  'My NFT',
  'Description',
  'ipfs://QmImageHash'
);
const result = await ipfsService.uploadJSON(metadata, 'metadata.json');

console.log('baseURI:', result.ipfsUrl); // ipfs://QmMetadataHash
```

## ⚠️ Important Notes

### Standard Edition baseURI
- Format: `ipfs://QmXXX/`
- Contract will append token ID: `ipfs://QmXXX/1`, `ipfs://QmXXX/2`, etc.
- Each metadata file must be named with token ID: `1.json`, `2.json`, etc.

### Open Edition baseURI
- Format: `ipfs://QmXXX` (no trailing slash)
- All tokens point to same metadata
- Unlimited supply (1155 token)

### Image Naming Conventions

The system will automatically match images to metadata using these patterns:
- Direct match: `1.png` for token #1
- With prefix: `image1.png`, `nft1.png`, `token_1.png`
- Extension variants: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

### IPFS Gateway

Default gateway: `https://eu.orbitor.dev/ipfs/`

You can change this in `ipfs-service.ts`:
```typescript
static toGatewayUrl(ipfsUrl: string, gateway = 'https://your-gateway.com')
```

## 🐛 Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "ZIP Processing Failed" | Invalid ZIP file | Use valid ZIP format |
| "Collection validation failed" | Mismatch in supply/IDs | Check metadata count and token IDs |
| "Metadata validation failed" | Missing required fields | Ensure all JSON has name, description, image |
| "File Upload Failed" | IPFS error | Check Pinata credentials |
| "No matching image found for token X" | Missing image file | Add matching image file for token |

## 📊 Testing

### Test Standard Edition:
1. Create ZIP with 10 metadata + 10 images (tokens 1-10)
2. Set Max Supply = 10
3. Upload and verify

### Test Open Edition:
1. Upload single PNG image
2. Check generated metadata
3. Verify baseURI points to metadata

## 🔐 Security

- ZIP files are processed client-side
- No file contents sent to backend
- All uploads go directly to IPFS via Pinata
- Validation prevents malformed metadata
- File size limits enforced by IPFS service

## 📝 Future Enhancements

- [ ] Support for animated/video NFTs
- [ ] Bulk metadata editor
- [ ] Metadata preview before upload
- [ ] Progress resume on failure
- [ ] Multiple IPFS providers support
- [ ] Metadata template generator

## 🤝 Support

For issues or questions:
1. Check validation error messages
2. Verify ZIP structure matches requirements
3. Test with small collection first (10 items)
4. Check console logs for detailed errors

---

**Implementation Date:** 2025-01-09
**Version:** 1.0.0
**Status:** ✅ Complete
