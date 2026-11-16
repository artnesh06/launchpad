# Fix: Sync Hanya Data Baru

## Masalah

Setelah database di-reset, ketika halaman `/create` dibuka, muncul SEMUA collection lama padahal seharusnya hanya menampilkan collection yang baru dibuat setelah reset.

## Penyebab

Ada 2 API yang menyebabkan masalah ini:

### 1. `/api/admin/launchpads/sync` 
API ini mengambil SEMUA collection dari blockchain dan sync ke database tanpa filter tanggal. Jadi meskipun database sudah di-reset, kalau API ini dipanggil, semua collection lama akan masuk lagi.

### 2. `/api/admin/launchpads/sync-mints`
Default `syncFromDate` tidak di-set ke awal hari (00:00:00), sehingga bisa mengambil data yang tidak diinginkan.

## Solusi

### 1. Update `/api/admin/launchpads/sync`

Menambahkan parameter baru:
- `onlyNew` (default: `true`) - Hanya sync collection yang dibuat hari ini atau setelahnya
- `fromDate` (optional) - Sync collection dari tanggal tertentu
- Jika `onlyNew: false` dan tidak ada `fromDate`, akan sync SEMUA data historical

**Behavior Baru:**

```typescript
// Default: hanya sync collection baru (dari hari ini)
POST /api/admin/launchpads/sync
{
  "chainId": 6342
}

// Sync dari tanggal tertentu
POST /api/admin/launchpads/sync
{
  "chainId": 6342,
  "fromDate": "2025-01-01T00:00:00.000Z"
}

// Sync SEMUA data historical (untuk initial setup)
POST /api/admin/launchpads/sync
{
  "chainId": 6342,
  "onlyNew": false
}
```

### 2. Update `/api/admin/launchpads/sync-mints`

Memperbaiki default `syncFromDate` menjadi awal hari (00:00:00):

```typescript
// Sebelum:
const syncFromDate = fromDate ? new Date(fromDate) : new Date();

// Sesudah:
let syncFromDate: Date;
if (fromDate) {
  syncFromDate = new Date(fromDate);
} else {
  // Default: start of today (00:00:00)
  syncFromDate = new Date();
  syncFromDate.setHours(0, 0, 0, 0);
}
```

## Cara Menggunakan

### Setelah Reset Database

1. **Jangan panggil API sync** - Biarkan activity listener yang handle collection baru
2. **Atau panggil dengan default** - Akan hanya sync collection hari ini:
   ```bash
   curl -X POST http://localhost:3000/api/admin/launchpads/sync \
     -H "Content-Type: application/json" \
     -d '{"chainId": 6342}'
   ```

### Untuk Initial Setup (Sync Semua Data)

```bash
curl -X POST http://localhost:3000/api/admin/launchpads/sync \
  -H "Content-Type: application/json" \
  -d '{"chainId": 6342, "onlyNew": false}'
```

### Untuk Recovery dari Downtime

```bash
curl -X POST http://localhost:3000/api/admin/launchpads/sync \
  -H "Content-Type: application/json" \
  -d '{"chainId": 6342, "fromDate": "2025-11-09T00:00:00.000Z"}'
```

## Testing

1. Reset database
2. Buka halaman `/create` - Seharusnya kosong atau hanya collection baru
3. Create collection baru - Seharusnya muncul di halaman `/create`
4. Collection lama tidak akan muncul kecuali di-sync manual dengan `onlyNew: false`

## Summary

Sekarang sistem sync memiliki 3 mode:

| Mode | Parameter | Behavior |
|------|-----------|----------|
| **Default** | `{}` | Hanya sync collection dari hari ini (00:00:00) |
| **Custom Date** | `{"fromDate": "..."}` | Sync dari tanggal tertentu |
| **All Historical** | `{"onlyNew": false}` | Sync SEMUA collection dari awal |

Ini memastikan bahwa setelah database reset, hanya data baru yang akan di-sync secara default.
