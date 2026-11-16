# Fix: Free Mint Terhitung ke Mint Revenue

## Masalah
Di halaman `/create`, Mint Revenue menampilkan total yang salah karena free mint tetap terhitung sebagai revenue. Seharusnya free mint (price = 0) tidak boleh menambah revenue.

## Penyebab
Ketika user melakukan mint, mereka membayar:
1. **Mint Price** - Harga NFT yang dibayar ke creator (bisa 0 untuk free mint)
2. **Platform Fee** - Fee yang dibayar ke platform (selalu ada, bahkan untuk free mint)

Masalahnya adalah kode sebelumnya menggunakan `tx.value` (total yang dibayar user) untuk menghitung revenue, padahal `tx.value` = `mintPrice + platformFee`.

Untuk free mint:
- `mintPrice` = 0 ETH
- `platformFee` = 0.0001 ETH (contoh)
- `tx.value` = 0.0001 ETH

Jadi free mint tetap terhitung sebagai revenue 0.0001 ETH, padahal seharusnya 0 ETH.

## Solusi

### 1. Decode Transaction untuk Mendapatkan Actual Mint Cost
Menggunakan contract ABI untuk decode transaction dan memanggil `calculateMintCost()` dari smart contract:

```typescript
// Decode the transaction input to get phaseId
const decodedData = iface.parseTransaction({ data: tx.data });
if (decodedData && decodedData.name === 'mint') {
  phaseId = Number(decodedData.args[0]);
  const quantity = Number(decodedData.args[1]);
  
  // Get actual mint cost from contract (excluding platform fee)
  const [mintCost, platformFee, totalCost, isFreeMint] = await contract.calculateMintCost(phaseId, quantity);
  actualMintCost = BigInt(mintCost.toString());
}
```

### 2. Simpan Actual Mint Price (Bukan tx.value)
Menyimpan `actualMintCost` (mint price saja) ke database, bukan `tx.value` (mint price + platform fee):

```typescript
const pricePerNFT = mintedNFTs.length > 0 
  ? actualMintCost / BigInt(mintedNFTs.length) 
  : actualMintCost;

await prisma.mint.create({
  data: {
    // ...
    price: pricePerNFT.toString(), // Actual mint price, not tx.value
  }
});
```

### 3. Hitung Volume Hanya dari Paid Mints
Menghitung average price hanya dari mint yang berbayar (price > 0):

```typescript
// Calculate total volume (sum of actual mint prices, excluding platform fees)
// Free mints have price = 0, so they won't contribute to volume
const totalVolumeSum = mints.reduce((sum, mint) => sum + BigInt(mint.price), BigInt(0));

// Calculate average price only from paid mints (price > 0)
const paidMints = mints.filter(m => BigInt(m.price) > BigInt(0));
const avgPrice = paidMints.length > 0 
  ? paidMints.reduce((sum, mint) => sum + BigInt(mint.price), BigInt(0)) / BigInt(paidMints.length)
  : BigInt(0);
```

### 4. Update Activity Metadata
Menyimpan informasi lengkap di activity metadata:

```typescript
metadata: {
  actualMintCost: actualMintCost.toString(), // Actual mint price (to creator)
  totalPaid: BigInt(tx.value.toString()).toString(), // Total including platform fee
  pricePerNFT: pricePerNFT.toString(), // Actual price per NFT (to creator)
  isFreeMint: actualMintCost === BigInt(0),
  // ...
}
```

## File yang Diubah

### 1. `src/app/api/admin/launchpads/sync-mint-tx/route.ts`
- Menambahkan logic untuk decode transaction dan get actual mint cost
- Mengubah cara menghitung `pricePerNFT` dari `tx.value` ke `actualMintCost`
- Mengubah cara menghitung average price (hanya dari paid mints)
- Menambahkan informasi `isFreeMint` di activity metadata

### 2. `scripts/fix-mint-revenue.ts` (NEW)
Script untuk memperbaiki data yang sudah ada di database:
- Recalculate volume untuk semua launchpads
- Update `launchpad.volume` dan `launchpadAnalytics.totalVolume`
- Hitung average price hanya dari paid mints

## Cara Menjalankan Fix

### 1. Deploy Kode Baru
```bash
# Commit dan deploy perubahan
git add .
git commit -m "fix: exclude platform fee from mint revenue calculation"
git push
```

### 2. Jalankan Script Fix untuk Data Lama
```bash
# Fix data yang sudah ada di database
npx tsx scripts/fix-mint-revenue.ts
```

Output script:
```
🔧 Starting mint revenue fix...

📊 Found 50 launchpads to process

[1/50] Processing: Cool NFT Collection (0x123...)
  ✅ Updated volume: 1000000000000000000 → 500000000000000000
  📊 Stats: 100 total mints, 50 paid mints, 50 free mints
  💰 Volume: 0.5000 ETH

[2/50] Processing: Another Collection (0x456...)
  ✓  Volume already correct (0.0000 ETH)

...

✅ Mint revenue fix completed!
📊 Summary:
  - Total launchpads: 50
  - Updated: 25
  - Skipped: 25
```

## Testing

### Test Free Mint
1. Buat collection dengan free mint phase (price = 0)
2. Mint beberapa NFT
3. Cek console log:
   ```
   💰 Mint cost breakdown:
     - Mint cost (to creator): 0.0 ETH
     - Platform fee: 0.0001 ETH
     - Total paid: 0.0001 ETH
     - Is free mint: true
   ```
4. Cek database:
   ```sql
   SELECT price FROM mints WHERE launchpadId = 'xxx';
   -- Should be '0' for free mints
   ```
5. Cek `/create` page - Mint Revenue harus 0 ETH

### Test Paid Mint
1. Buat collection dengan paid mint phase (price = 0.01 ETH)
2. Mint beberapa NFT
3. Cek console log:
   ```
   💰 Mint cost breakdown:
     - Mint cost (to creator): 0.01 ETH
     - Platform fee: 0.0001 ETH
     - Total paid: 0.0101 ETH
     - Is free mint: false
   ```
4. Cek database:
   ```sql
   SELECT price FROM mints WHERE launchpadId = 'xxx';
   -- Should be '10000000000000000' (0.01 ETH in wei)
   ```
5. Cek `/create` page - Mint Revenue harus menampilkan total dari mint price saja

### Test Mixed (Free + Paid)
1. Buat collection dengan 2 phases:
   - Phase 1: Free mint (price = 0)
   - Phase 2: Paid mint (price = 0.01 ETH)
2. Mint 10 NFT di phase 1 (free)
3. Mint 10 NFT di phase 2 (paid)
4. Cek `/create` page:
   - Total mints: 20
   - Mint Revenue: 0.1 ETH (hanya dari 10 paid mints)

## Monitoring

### Query untuk Cek Volume
```sql
-- Cek launchpad dengan volume
SELECT 
  name,
  contractAddress,
  volume,
  mintedCount,
  (CAST(volume AS NUMERIC) / 1e18) as volume_eth
FROM launchpads
WHERE volume != '0'
ORDER BY CAST(volume AS NUMERIC) DESC
LIMIT 10;
```

### Query untuk Cek Free Mints
```sql
-- Cek berapa banyak free mints
SELECT 
  l.name,
  COUNT(*) as total_mints,
  COUNT(CASE WHEN m.price = '0' THEN 1 END) as free_mints,
  COUNT(CASE WHEN m.price != '0' THEN 1 END) as paid_mints,
  SUM(CAST(m.price AS NUMERIC)) / 1e18 as total_revenue_eth
FROM mints m
JOIN launchpads l ON m.launchpadId = l.id
GROUP BY l.id, l.name
ORDER BY total_mints DESC;
```

### Query untuk Cek Inconsistency
```sql
-- Cek launchpad dengan volume tidak sesuai dengan sum of mints
SELECT 
  l.name,
  l.volume as launchpad_volume,
  SUM(CAST(m.price AS NUMERIC)) as calculated_volume,
  (CAST(l.volume AS NUMERIC) - SUM(CAST(m.price AS NUMERIC))) as difference
FROM launchpads l
LEFT JOIN mints m ON m.launchpadId = l.id
GROUP BY l.id, l.name, l.volume
HAVING CAST(l.volume AS NUMERIC) != COALESCE(SUM(CAST(m.price AS NUMERIC)), 0)
ORDER BY ABS(CAST(l.volume AS NUMERIC) - COALESCE(SUM(CAST(m.price AS NUMERIC)), 0)) DESC;
```

## Known Issues

### 1. Fallback ke tx.value
Jika decode transaction gagal, kode akan fallback ke `tx.value`:
```typescript
catch (decodeError) {
  console.warn('⚠️ Could not decode transaction data, using tx.value as fallback');
  actualMintCost = BigInt(tx.value.toString());
}
```

**Impact**: Untuk transaksi yang gagal di-decode, free mint masih akan terhitung sebagai revenue.

**Mitigation**: Monitor console log untuk warning ini dan investigate kenapa decode gagal.

### 2. Old Transactions
Transaksi yang sudah di-sync sebelum fix ini akan memiliki price yang salah (termasuk platform fee).

**Solution**: Jalankan script `fix-mint-revenue.ts` untuk memperbaiki data lama.

### 3. Platform Fee Changes
Jika platform fee berubah di masa depan, perlu update logic untuk handle multiple fee structures.

## Future Improvements

1. **Store Platform Fee Separately**: Simpan platform fee di field terpisah di database untuk tracking yang lebih baik
2. **Add Revenue Analytics**: Tambahkan analytics untuk track:
   - Total platform fees collected
   - Total creator revenue
   - Free mint vs paid mint ratio
3. **Add Revenue Chart**: Tampilkan chart revenue over time di dashboard
4. **Add Fee Configuration**: Allow admin to configure platform fee percentage
