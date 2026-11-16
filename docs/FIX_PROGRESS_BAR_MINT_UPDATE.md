# Fix: Progress Bar Tidak Konsisten Update Setelah Mint

## Masalah
Progress bar di halaman collection detail (`/collection/[id]`) kadang-kadang tidak bertambah setelah user melakukan mint. Ini menyebabkan user bingung apakah mint mereka berhasil atau tidak.

## Penyebab
Ada beberapa faktor yang menyebabkan masalah ini:

1. **Race Condition**: Polling data setiap 15 detik bisa bertabrakan dengan update setelah mint
2. **Caching**: Next.js dan browser caching bisa menyebabkan data lama ditampilkan
3. **Timing Issue**: Sync mint ke database membutuhkan waktu, dan jika gagal, fallback tidak selalu bekerja dengan baik
4. **Silent Polling**: Polling menggunakan mode silent yang tidak menampilkan error jika gagal
5. **Optimistic Update**: Jika sync gagal, optimistic update hanya menambah `mintAmount` tanpa memperhitungkan batch mint atau mint dari user lain

## Solusi yang Diterapkan

### 1. Cache Busting
Menambahkan parameter timestamp dan `cache: 'no-store'` untuk memastikan data selalu fresh:

```typescript
const cacheBuster = Date.now();
const response = await fetch(`/api/admin/launchpads?contractAddress=${params.id}&_t=${cacheBuster}`, {
  cache: 'no-store'
});
```

### 2. Adaptive Polling
Mengubah polling interval menjadi adaptive:
- **3 detik** setelah mint (30 detik pertama)
- **15 detik** untuk polling normal

```typescript
const getPollingInterval = () => {
  const timeSinceLastMint = Date.now() - lastMintTime;
  return timeSinceLastMint < 30000 ? 3000 : 15000;
};
```

### 3. Improved Sync Logic
Menggunakan data `totalMinted` dari API response, bukan asumsi:

```typescript
if (collection && syncResult.data.totalMinted) {
  const newTotalMinted = syncResult.data.totalMinted; // Dari database, bukan asumsi
  const newMintedPercent = collection.totalSupply > 0
    ? parseFloat(((newTotalMinted / collection.totalSupply) * 100).toFixed(2))
    : 0;
  
  setCollection({
    ...collection,
    totalMinted: newTotalMinted,
    mintedPercent: newMintedPercent,
    walletLimit: `${newTotalMinted}/${collection.totalSupply}`
  });
}
```

### 4. Retry Mechanism
Menambahkan retry hingga 3 kali dengan exponential backoff:

```typescript
if (retryCount < 3) {
  console.log(`⏳ Retrying in ${(retryCount + 1) * 2} seconds...`);
  await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
  await syncMintData(retryCount + 1);
}
```

### 5. Verification Polling
Menambahkan polling tambahan 2 detik setelah sync berhasil untuk memastikan konsistensi:

```typescript
setTimeout(() => {
  console.log('🔄 Verifying data consistency...');
  fetchCollection(false, true);
}, 2000);
```

### 6. Visual Feedback
Menambahkan smooth transition pada progress bar:

```typescript
<div
  className="absolute top-0 left-0 h-full bg-[#0BFF75] rounded-[5px] transition-all duration-500 ease-out"
  style={{ width: `${collection.mintedPercent}%` }}
/>
```

### 7. Better Logging
Menambahkan logging yang lebih detail untuk debugging:

```typescript
console.log(`📊 Progress bar updated: ${newTotalMinted}/${collection.totalSupply} (${newMintedPercent}%)`);
console.log(`📊 Minted NFTs in this tx: ${syncResult.data.mintedNFTs || mintAmount}`);
```

### 8. Change Detection
Menambahkan deteksi perubahan data untuk debugging:

```typescript
if (collection && collection.totalMinted !== launchpad.mintedCount) {
  console.log(`🔄 Mint count changed: ${collection.totalMinted} → ${launchpad.mintedCount}`);
}
```

## Testing
Untuk memverifikasi fix ini bekerja:

1. Buka halaman collection: `http://localhost:3004/collection/[address]`
2. Connect wallet
3. Mint NFT (1 atau lebih)
4. Perhatikan console log:
   - `✅ Mint data synced successfully`
   - `📊 Progress bar updated: X/Y (Z%)`
   - `🔄 Verifying data consistency...`
5. Progress bar harus bertambah dalam 2-5 detik setelah mint
6. Jika ada masalah, akan ada retry otomatis hingga 3 kali

## Monitoring
Gunakan console log untuk monitoring:

```bash
# Mint berhasil
✅ Mint data synced successfully
📊 Progress bar updated: 150/1000 (15%)
📊 Minted NFTs in this tx: 1
🔄 Verifying data consistency...

# Mint count berubah
🔄 Mint count changed: 149 → 150

# Polling
🔄 Polling collection data...
```

## Known Issues
1. Jika network sangat lambat, mungkin perlu waktu lebih lama untuk sync
2. Jika ada banyak user mint bersamaan, angka bisa "melompat" karena mint dari user lain
3. Browser cache yang sangat agresif mungkin perlu hard refresh (Ctrl+Shift+R)

## Future Improvements
1. Implementasi WebSocket untuk real-time updates
2. Optimistic UI update dengan rollback jika gagal
3. Show loading indicator pada progress bar saat syncing
4. Add toast notification saat progress bar update
