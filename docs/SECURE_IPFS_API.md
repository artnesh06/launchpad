# Secure IPFS Upload API

## Overview

API keys Pinata sekarang disimpan dengan aman di server-side dan tidak terekspos ke frontend/browser. Upload IPFS dilakukan melalui API endpoints yang aman.

## Perubahan Keamanan

### Sebelum (❌ Tidak Aman)
```env
# API keys terekspos di browser
NEXT_PUBLIC_PINATA_API_KEY=xxx
NEXT_PUBLIC_PINATA_SECRET_KEY=xxx
```

### Sesudah (✅ Aman)
```env
# API keys hanya di server, tidak terekspos
PINATA_API_KEY=xxx
PINATA_SECRET_KEY=xxx
```

## API Endpoints

### 1. Upload Single File
**Endpoint:** `POST /api/ipfs/upload`

**Request:**
```typescript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/ipfs/upload', {
  method: 'POST',
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "ipfsHash": "QmXxx...",
  "ipfsUrl": "ipfs://QmXxx...",
  "gatewayUrl": "https://eu.orbitor.dev/ipfs/QmXxx..."
}
```

### 2. Upload Folder (Multiple Files)
**Endpoint:** `POST /api/ipfs/upload-folder`

**Request:**
```typescript
const formData = new FormData();
files.forEach(file => {
  formData.append('files', file);
});
formData.append('folderName', 'My Folder');

const response = await fetch('/api/ipfs/upload-folder', {
  method: 'POST',
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "ipfsHash": "QmXxx...",
  "ipfsUrl": "ipfs://QmXxx.../",
  "gatewayUrl": "https://eu.orbitor.dev/ipfs/QmXxx.../",
  "fileCount": 10
}
```

### 3. Upload JSON Data
**Endpoint:** `POST /api/ipfs/upload-json`

**Request:**
```typescript
const response = await fetch('/api/ipfs/upload-json', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: { name: "NFT #1", description: "..." },
    filename: 'metadata.json'
  })
});
```

**Response:**
```json
{
  "success": true,
  "ipfsHash": "QmXxx...",
  "ipfsUrl": "ipfs://QmXxx...",
  "gatewayUrl": "https://eu.orbitor.dev/ipfs/QmXxx..."
}
```

## Penggunaan di Code

### IPFSService (Otomatis menggunakan API)

```typescript
import { ipfsService } from '@/lib/ipfs-service';

// Upload file
const result = await ipfsService.uploadFile(file);

// Upload JSON
const jsonResult = await ipfsService.uploadJSON(metadata);

// Upload folder
const folderResult = await ipfsService.uploadFolder(files, 'Folder Name');
```

## Setup

1. **Update .env file:**
```env
# Ganti NEXT_PUBLIC_ dengan tanpa prefix
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key
```

2. **Restart development server:**
```bash
npm run dev
```

3. **Test upload:**
- Buka create launchpad page
- Upload cover image atau metadata
- API keys tidak akan terlihat di Network tab browser

## Keuntungan

✅ **Keamanan:** API keys tidak terekspos di browser  
✅ **Rate Limiting:** Bisa ditambahkan di server-side  
✅ **Monitoring:** Semua upload bisa di-log di server  
✅ **Validation:** File validation di server sebelum upload  
✅ **Error Handling:** Better error messages  

## Migration Checklist

- [x] Buat API endpoints (`/api/ipfs/upload`, `/api/ipfs/upload-folder`, `/api/ipfs/upload-json`)
- [x] Update `ipfs-service.ts` untuk menggunakan API endpoints
- [x] Update `.env` (hapus `NEXT_PUBLIC_` prefix)
- [x] Update `.env.example` dengan dokumentasi
- [x] Test upload functionality
- [ ] Deploy ke production
- [ ] Update environment variables di hosting

## Troubleshooting

### Error: "Pinata credentials not configured on server"
**Solusi:** Pastikan `.env` file memiliki:
```env
PINATA_API_KEY=xxx
PINATA_SECRET_KEY=xxx
```

### Upload gagal dengan 500 error
**Solusi:** 
1. Check server logs
2. Verify API keys valid di Pinata dashboard
3. Restart development server

### File tidak muncul di IPFS
**Solusi:**
1. Check response dari API
2. Verify IPFS hash di Pinata dashboard
3. Try different IPFS gateway
