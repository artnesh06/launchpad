# Audit: API yang Mengambil Data dari Blockchain

## Overview

Dokumen ini berisi audit lengkap semua API dan service yang mengambil data dari blockchain, untuk memastikan semuanya menggunakan `new Date()` sebagai default jika `lastSync` belum ada.

## API yang Query Blockchain

### 1. ✅ `/api/admin/launchpads/sync` (POST)

**Status:** SUDAH DIPERBAIKI ✅

**Fungsi:** Sync collection dari blockchain ke database

**Default Behavior:**
- Jika `onlyNew: true` (default) → Hanya sync collection dari hari ini (00:00:00)
- Jika `fromDate` diberikan → Sync dari tanggal tersebut
- Jika `onlyNew: false` → Sync SEMUA data historical

**Parameter:**
```typescript
{
  chainId: number;
  onlyNew?: boolean;  // default: true
  fromDate?: string;  // ISO date string
  forceSync?: boolean;
}
```

**Implementasi:**
```typescript
let syncFromDate: Date | null = null;
if (fromDate) {
  syncFromDate = new Date(fromDate);
} else if (onlyNew) {
  // Default: only sync collections created today or later
  syncFromDate = new Date();
  syncFromDate.setHours(0, 0, 0, 0);
}
```

---

### 2. ✅ `/api/admin/launchpads/sync-mints` (POST)

**Status:** SUDAH DIPERBAIKI ✅

**Fungsi:** Sync mint events dari blockchain ke database

**Default Behavior:**
- Jika `fromDate` tidak diberikan → Sync dari hari ini (00:00:00)
- Jika `fromDate` diberikan → Sync dari tanggal tersebut

**Parameter:**
```typescript
{
  launchpadId: string;
  contractAddress: string;
  chainId: number;
  fromDate?: string;  // ISO date string
}
```

**Implementasi:**
```typescript
let syncFromDate: Date;
if (fromDate) {
  syncFromDate = new Date(fromDate);
} else {
  // Default: start of today (00:00:00)
  syncFromDate = new Date();
  syncFromDate.setHours(0, 0, 0, 0);
}
```

---

### 3. ⚠️ `/api/admin/launchpads` (POST) - Action: 'sync'

**Status:** PERLU PERHATIAN ⚠️

**Fungsi:** Legacy sync endpoint (hanya return count)

**Catatan:** 
- Endpoint ini hanya memanggil `getAllLaunchpads()` dan return count
- Tidak melakukan sync ke database
- Sebaiknya gunakan `/api/admin/launchpads/sync` untuk sync yang sebenarnya

**Rekomendasi:** Redirect atau deprecate endpoint ini

---

## Service Methods yang Query Blockchain

### 1. `BlockchainService.getAllLaunchpads(chainId)`

**Fungsi:** Mengambil semua alamat collection dari blockchain

**Behavior:** 
- Mengambil SEMUA alamat collection yang pernah dibuat
- Tidak ada filter tanggal
- Digunakan oleh `/api/admin/launchpads/sync` yang sudah ada filter

**Status:** OK - Filter dilakukan di level API ✅

---

### 2. `BlockchainService.getLaunchpadInfo(chainId, address)`

**Fungsi:** Mengambil info detail collection dari blockchain

**Behavior:**
- Query info untuk 1 collection spesifik
- Tidak ada filter tanggal (tidak perlu)

**Status:** OK - Tidak perlu filter ✅

---

### 3. `ActivityListener` (Real-time)

**Fungsi:** Listen event baru dari blockchain secara real-time

**Behavior:**
- Hanya listen event BARU dari block saat ini ke depan
- Tidak query historical data
- Sudah benar by design

**Status:** OK ✅

**Implementasi:**
```typescript
// Get current block to start listening from
const currentBlock = await this.provider.getBlockNumber();

// Only process events from current block onwards
if (event.blockNumber >= currentBlock) {
  await this.handleEvent(event);
}
```

---

## Scripts

### 1. ✅ `scripts/sync-all-launchpads.ts`

**Status:** SUDAH BENAR ✅

**Default Behavior:** Sync dari hari ini (00:00:00)

**Modes:**
```bash
# Default: sync dari hari ini
tsx scripts/sync-all-launchpads.ts

# Sync dari tanggal tertentu
tsx scripts/sync-all-launchpads.ts --from 2025-01-01

# Sync semua historical
tsx scripts/sync-all-launchpads.ts --all
```

---

### 2. ✅ `scripts/start-activity-listeners.ts`

**Status:** OK ✅

**Fungsi:** Start real-time listeners (tidak sync historical)

---

### 3. ✅ `scripts/start-listeners.ts`

**Status:** OK ✅

**Fungsi:** Start mint listeners (tidak sync historical)

---

## Summary

### ✅ Sudah Benar (No Action Needed)

1. `/api/admin/launchpads/sync` - Default sync dari hari ini
2. `/api/admin/launchpads/sync-mints` - Default sync dari hari ini
3. `ActivityListener` - Hanya listen event baru
4. `scripts/sync-all-launchpads.ts` - Default sync dari hari ini
5. `scripts/start-activity-listeners.ts` - Tidak sync historical
6. `scripts/start-listeners.ts` - Tidak sync historical

### ⚠️ Perlu Perhatian (Optional)

1. `/api/admin/launchpads` POST action 'sync' - Consider deprecating atau redirect ke `/api/admin/launchpads/sync`

---

## Best Practices

### Setelah Database Reset

**DO:**
```bash
# Start activity listeners untuk monitor event baru
npm run activity-listeners:start
```

**DON'T:**
```bash
# Jangan jalankan sync dengan --all
tsx scripts/sync-all-launchpads.ts --all
```

### Initial Setup (First Time)

**DO:**
```bash
# Sync semua data historical
tsx scripts/sync-all-launchpads.ts --all
```

### Recovery dari Downtime

**DO:**
```bash
# Sync dari tanggal terakhir listener mati
tsx scripts/sync-all-launchpads.ts --from 2025-11-09
```

---

## Testing Checklist

- [x] Reset database
- [x] Verify `/api/admin/launchpads/sync` default behavior
- [x] Verify `/api/admin/launchpads/sync-mints` default behavior
- [x] Verify activity listener hanya capture event baru
- [x] Verify script sync default behavior
- [x] Verify halaman `/create` hanya tampilkan collection baru

---

## Conclusion

✅ **Semua API dan service yang mengambil data dari blockchain sudah menggunakan `new Date()` sebagai default.**

Setelah database di-reset, sistem akan:
1. Hanya sync collection yang dibuat hari ini atau setelahnya (default)
2. Activity listener hanya capture event baru dari block saat ini
3. Tidak akan mengambil data lama kecuali explicitly diminta dengan parameter

Ini memastikan bahwa halaman `/create` hanya menampilkan collection yang benar-benar baru setelah database reset.
