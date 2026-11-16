# Sync Data Terbaru Saja

## Overview

Sistem sync telah diupdate untuk hanya mengambil data terbaru saja secara default. Ini mencegah sync ulang data lama yang sudah ada dan menghemat resource.

## Fitur Utama

### 1. Activity Listener (Real-time)
Activity listener sekarang hanya mendengarkan event BARU dari block saat ini dan seterusnya:

- ✅ Tidak akan sync collection lama yang sudah dibuat sebelumnya
- ✅ Hanya menangkap event baru mulai dari block saat listener dijalankan
- ✅ Mencegah duplikasi data dari collection lama

**Cara Kerja:**
```typescript
// Listener mendapatkan current block saat start
const currentBlock = await provider.getBlockNumber();

// Hanya process event dari block tersebut ke depan
if (event.blockNumber >= currentBlock) {
  // Process event
}
```

### 2. Manual Sync API
API `/api/admin/launchpads/sync-mints` sekarang mendukung parameter `fromDate`:

**Default Behavior:**
```typescript
// Tanpa parameter fromDate = sync dari hari ini
POST /api/admin/launchpads/sync-mints
{
  "launchpadId": "xxx",
  "contractAddress": "0x...",
  "chainId": 6342
}
```

**Custom Date:**
```typescript
// Sync dari tanggal tertentu
POST /api/admin/launchpads/sync-mints
{
  "launchpadId": "xxx",
  "contractAddress": "0x...",
  "chainId": 6342,
  "fromDate": "2025-01-01T00:00:00.000Z"
}
```

**Sync All Historical Data:**
```typescript
// Sync semua data dari awal (genesis)
POST /api/admin/launchpads/sync-mints
{
  "launchpadId": "xxx",
  "contractAddress": "0x...",
  "chainId": 6342,
  "fromDate": "1970-01-01T00:00:00.000Z"
}
```

### 3. Sync All Launchpads Script
Script `sync-all-launchpads.ts` sekarang mendukung 3 mode:

#### Mode 1: Sync Data Baru Saja (Default)
```bash
# Hanya sync data dari hari ini
tsx scripts/sync-all-launchpads.ts
```

#### Mode 2: Sync dari Tanggal Tertentu
```bash
# Sync dari tanggal tertentu
tsx scripts/sync-all-launchpads.ts --from 2025-01-01
```

#### Mode 3: Sync Semua Data Historical
```bash
# Sync semua data dari awal (untuk initial setup)
tsx scripts/sync-all-launchpads.ts --all
```

## Keuntungan

### 1. Efisiensi Resource
- ⚡ Lebih cepat karena tidak perlu query semua block dari awal
- 💾 Menghemat bandwidth RPC
- 🔋 Mengurangi beban database

### 2. Mencegah Duplikasi
- ✅ Tidak akan sync ulang collection lama
- ✅ Hanya process data yang belum ada
- ✅ Skip data yang sudah tersimpan

### 3. Fleksibilitas
- 🎯 Default: sync data baru saja
- 📅 Custom: sync dari tanggal tertentu
- 📚 All: sync semua data historical (untuk initial setup)

## Implementasi Detail

### Block Estimation
Sistem menggunakan estimasi block berdasarkan waktu:

```typescript
// Estimate: ~12 seconds per block (Ethereum average)
const secondsSinceSync = Math.floor((Date.now() - syncFromDate.getTime()) / 1000);
const estimatedBlocksSinceSync = Math.floor(secondsSinceSync / 12);
const fromBlock = Math.max(0, currentBlock - estimatedBlocksSinceSync);
```

**Note:** Untuk chain lain, sesuaikan block time:
- Ethereum: ~12 seconds
- BSC: ~3 seconds
- Polygon: ~2 seconds
- Arbitrum: ~0.25 seconds

### Timestamp Accuracy
Sistem menggunakan block timestamp untuk akurasi:

```typescript
// Get block timestamp untuk createdAt yang akurat
const block = await provider.getBlock(receipt.blockNumber);
const mintTimestamp = block ? new Date(Number(block.timestamp) * 1000) : new Date();
```

## Migration Guide

### Untuk Collection Lama
Jika Anda memiliki collection lama yang belum di-sync:

1. **Sync Semua Data Historical (One-time)**
   ```bash
   tsx scripts/sync-all-launchpads.ts --all
   ```

2. **Atau Sync dari Tanggal Tertentu**
   ```bash
   tsx scripts/sync-all-launchpads.ts --from 2024-01-01
   ```

### Untuk Collection Baru
Tidak perlu action khusus. Activity listener akan otomatis menangkap:
- ✅ Collection baru yang dibuat
- ✅ Mint baru yang terjadi

## Best Practices

### 1. Initial Setup
Saat pertama kali setup project:
```bash
# Sync semua data historical
tsx scripts/sync-all-launchpads.ts --all
```

### 2. Daily Operation
Untuk operasi harian, jalankan activity listener:
```bash
# Start listener untuk real-time monitoring
npm run activity-listeners:start
```

### 3. Recovery dari Downtime
Jika listener mati untuk beberapa waktu:
```bash
# Sync dari tanggal terakhir listener mati
tsx scripts/sync-all-launchpads.ts --from 2025-11-09
```

### 4. Monitoring
Check status listener:
```typescript
const manager = getMultiChainListenerManager();
const statuses = await manager.getStatus();
console.log(statuses);
```

## Troubleshooting

### Issue: Data Lama Tidak Muncul
**Solution:** Jalankan sync dengan `--all` atau `--from` dengan tanggal yang sesuai

### Issue: Listener Tidak Menangkap Event
**Solution:** 
1. Check RPC connection
2. Restart listener
3. Verify contract address

### Issue: Duplikasi Data
**Solution:** Sistem sudah handle duplikasi dengan check `txHash`. Jika masih terjadi, check database constraint.

## Configuration

### Custom Block Time
Edit `src/app/api/admin/launchpads/sync-mints/route.ts`:

```typescript
// Sesuaikan dengan chain Anda
const BLOCK_TIME_SECONDS = 12; // Default Ethereum
// const BLOCK_TIME_SECONDS = 3; // BSC
// const BLOCK_TIME_SECONDS = 2; // Polygon

const estimatedBlocksSinceSync = Math.floor(secondsSinceSync / BLOCK_TIME_SECONDS);
```

### Custom Default Date
Edit `scripts/sync-all-launchpads.ts`:

```typescript
// Default: sync dari hari ini
fromDate = new Date();
fromDate.setHours(0, 0, 0, 0);

// Atau custom default, misal 7 hari terakhir
fromDate = new Date();
fromDate.setDate(fromDate.getDate() - 7);
```

## Summary

Sistem sync sekarang lebih efisien dan fleksibel:
- 🎯 Default: hanya sync data baru
- 📅 Fleksibel: bisa sync dari tanggal tertentu
- 📚 Complete: bisa sync semua data historical jika diperlukan
- ⚡ Efisien: tidak waste resource untuk data lama
- ✅ Aman: mencegah duplikasi data
