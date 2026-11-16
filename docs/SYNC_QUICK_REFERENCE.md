# Quick Reference: Sync Data Terbaru

## TL;DR

✅ **Semua API dan service yang mengambil data dari blockchain sudah menggunakan `new Date()` sebagai default.**

Semua sync sekarang **default hanya mengambil data baru** (dari hari ini jam 00:00:00). Collection lama yang sudah dibuat tidak akan di-sync ulang.

## Command Cheat Sheet

```bash
# Sync data baru saja (default)
tsx scripts/sync-all-launchpads.ts

# Sync dari tanggal tertentu
tsx scripts/sync-all-launchpads.ts --from 2025-01-01

# Sync semua data historical (initial setup)
tsx scripts/sync-all-launchpads.ts --all

# Start real-time listener (untuk data baru)
npm run activity-listeners:start
```

## API Usage

```typescript
// Default: sync dari hari ini
POST /api/admin/launchpads/sync-mints
{
  "launchpadId": "xxx",
  "contractAddress": "0x...",
  "chainId": 6342
}

// Custom: sync dari tanggal tertentu
POST /api/admin/launchpads/sync-mints
{
  "launchpadId": "xxx",
  "contractAddress": "0x...",
  "chainId": 6342,
  "fromDate": "2025-01-01T00:00:00.000Z"
}
```

## Behavior

| Component | Default Behavior | Custom Options |
|-----------|------------------|----------------|
| Activity Listener | Hanya listen event dari block saat ini ke depan | N/A (by design) |
| `/api/admin/launchpads/sync` | Sync dari hari ini (00:00:00) | `fromDate`, `onlyNew: false` |
| `/api/admin/launchpads/sync-mints` | Sync dari hari ini (00:00:00) | `fromDate` |
| Sync Script | Sync dari hari ini (00:00:00) | `--from`, `--all` |

## When to Use What

| Scenario | Command |
|----------|---------|
| Initial setup | `tsx scripts/sync-all-launchpads.ts --all` |
| Daily operation | `npm run activity-listeners:start` |
| Recovery dari downtime | `tsx scripts/sync-all-launchpads.ts --from YYYY-MM-DD` |
| Sync collection tertentu | API call dengan `fromDate` parameter |

## Dokumentasi Lengkap

- [SYNC_NEW_DATA_ONLY.md](./SYNC_NEW_DATA_ONLY.md) - Dokumentasi lengkap fitur sync
- [SYNC_FIX_ONLY_NEW_DATA.md](./SYNC_FIX_ONLY_NEW_DATA.md) - Fix untuk masalah sync data lama
- [API_SYNC_AUDIT.md](./API_SYNC_AUDIT.md) - Audit lengkap semua API yang query blockchain
