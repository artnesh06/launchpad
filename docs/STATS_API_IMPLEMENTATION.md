# Stats API Implementation

## Overview
Implementasi API baru khusus untuk menghitung statistik di halaman Creator Studio (`/create`).

## Problem
- Perhitungan stats sebelumnya salah karena menggunakan data dari pagination (hanya 100 data pertama)
- Volume masih dalam format Wei/Gwei, belum dikonversi ke ETH

## Solution
Membuat endpoint API baru `/api/admin/stats` yang:
1. Mengambil semua data launchpad tanpa pagination untuk perhitungan akurat
2. Mengkonversi volume dari Wei ke ETH (1 ETH = 10^18 Wei)
3. Menghitung stats berdasarkan status yang benar (ACTIVE, COMPLETED)

## API Endpoint

### GET `/api/admin/stats`

**Query Parameters:**
- `chainId` (optional): Filter berdasarkan chain ID

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "active": 5,
    "mintOut": 3,
    "volume": 1.234567890123456
  }
}
```

**Fields:**
- `total`: Total semua collection
- `active`: Collection dengan status ACTIVE
- `mintOut`: Collection dengan status COMPLETED (mint out)
- `volume`: Total volume dalam ETH (sudah dikonversi dari Wei)

## Frontend Changes

### `/src/app/create/page.tsx`
1. Menambah state `stats` dan `statsLoading`
2. Menambah fungsi `fetchStats()` untuk fetch dari API baru
3. Stats di-fetch terpisah dari list launchpads
4. Stats di-refresh saat chain berubah atau tombol refresh diklik

## Technical Details

### Volume Conversion
```typescript
// Convert Wei to ETH
const volumeInWei = launchpads.reduce((acc, lp) => {
  const volume = lp.volume ? BigInt(lp.volume) : BigInt(0);
  return acc + volume;
}, BigInt(0));

const volumeInEth = Number(volumeInWei) / 1e18;
```

### Status Mapping
Database menggunakan enum `LaunchpadStatus`:
- `ACTIVE` → Active/Live
- `COMPLETED` → Mint Out
- `PAUSED` → Paused
- `CANCELLED` → Cancelled

## Files Modified
- `src/app/api/admin/stats/route.ts` (new)
- `src/app/create/page.tsx`

## Testing
1. Buka halaman `/create`
2. Pastikan stats menampilkan angka yang benar
3. Pastikan volume dalam format ETH (bukan Wei)
4. Test dengan chain yang berbeda
5. Test refresh button
