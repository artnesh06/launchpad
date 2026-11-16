# Alchemy totalSupply vs Database totalMaxSupply

## Masalah

Ketika menggunakan Alchemy API untuk mendapatkan data NFT, `contract.totalSupply` menunjukkan **jumlah token yang sudah di-mint**, bukan **max supply** yang di-set di Creator Studio.

### Contoh Response Alchemy:

```json
{
  "contract": {
    "address": "0x30d45E46715A4D91136970823702eB96E75Ec2fF",
    "name": "Test Metadata",
    "symbol": "TEST",
    "totalSupply": "4",  // ❌ Ini adalah jumlah yang sudah di-mint, bukan max supply!
    "tokenType": "ERC721"
  }
}
```

Jika di Creator Studio Anda set **Max Supply = 10,000**, tapi baru mint 4 NFT, maka:
- ❌ Alchemy `totalSupply` = `"4"` (jumlah yang sudah di-mint)
- ✅ Database `totalMaxSupply` = `10000` (max supply dari Creator Studio)

## Penyebab

### 1. ERC721 Standard Behavior

Di smart contract ERC721, fungsi `totalSupply()` mengembalikan **jumlah token yang sudah di-mint**:

```solidity
// ERC721Enumerable.sol
function totalSupply() public view returns (uint256) {
    return _allTokens.length; // Jumlah token yang sudah di-mint
}
```

Ini adalah **standard behavior** dari ERC721Enumerable, bukan bug.

### 2. Alchemy API Mengambil Data dari Contract

Alchemy API memanggil `contract.totalSupply()` untuk mendapatkan data, sehingga:

```javascript
// Alchemy internal logic (simplified)
const totalSupply = await contract.totalSupply(); // Returns minted count
```

### 3. Max Supply Tidak Ada di Standard ERC721

ERC721 standard **tidak memiliki** fungsi `maxSupply()`. Ini adalah custom function yang ditambahkan di OddsLaunchpad contract:

```solidity
// OddsLaunchpad.sol (custom)
uint256 public totalMaxSupply; // Max supply dari Creator Studio

function maxSupply() public view returns (uint256) {
    return totalMaxSupply;
}
```

Karena ini custom function, **Alchemy tidak tahu** tentang max supply.

## Solusi

### ✅ Gunakan Database untuk Max Supply

Untuk menampilkan max supply yang benar, **selalu gunakan data dari database Anda**, bukan dari Alchemy:

```typescript
// ❌ JANGAN gunakan Alchemy totalSupply untuk max supply
const alchemyData = await alchemyService.getNFTsForOwner(address);
const maxSupply = alchemyData.contract.totalSupply; // SALAH!

// ✅ GUNAKAN database untuk max supply
const launchpad = await prisma.launchpad.findUnique({
  where: { contractAddress }
});
const maxSupply = launchpad.totalMaxSupply; // BENAR!
const mintedCount = launchpad.mintedCount; // Jumlah yang sudah di-mint
```

### Implementasi di Code

#### 1. NFT Trending Table

Di `src/components/nft-trending-table.tsx`, data sudah benar karena menggunakan database:

```typescript
// ✅ BENAR - Menggunakan database
function mapLaunchpadToCollection(launchpad: LaunchpadData, index: number): NFTCollection {
  return {
    // ...
    minted: `${launchpad.mintedCount}/${launchpad.totalMaxSupply.toLocaleString()}`,
    // mintedCount = jumlah yang sudah di-mint (dari database)
    // totalMaxSupply = max supply dari Creator Studio (dari database)
  };
}
```

#### 2. Launchpad Detail Page

Di `src/app/(package)/l/[id]/page.tsx`, data juga sudah benar:

```typescript
// ✅ BENAR - Menggunakan database
const collectionData: CollectionData = {
  // ...
  totalSupply: launchpad.totalMaxSupply || 0, // Max supply dari Creator Studio
  totalMinted: launchpad.mintedCount || 0,    // Jumlah yang sudah di-mint
  walletLimit: `${launchpad.mintedCount}/${launchpad.totalMaxSupply}`,
};
```

#### 3. NFT Holding Grid (Jika Menggunakan Alchemy)

Jika Anda menggunakan Alchemy API di NFT Holding Grid, **jangan gunakan `contract.totalSupply`** untuk max supply:

```typescript
// ❌ JANGAN seperti ini
const nftData = await alchemyService.getNFTsForOwner(address);
const maxSupply = nftData.contract.totalSupply; // SALAH!

// ✅ LAKUKAN seperti ini
const nftData = await alchemyService.getNFTsForOwner(address);
const contractAddress = nftData.contract.address;

// Ambil max supply dari database
const launchpad = await prisma.launchpad.findUnique({
  where: { contractAddress }
});
const maxSupply = launchpad?.totalMaxSupply || 0; // BENAR!
const mintedCount = nftData.contract.totalSupply; // Ini untuk jumlah yang sudah di-mint
```

## Mapping Data yang Benar

### Alchemy API Response

```json
{
  "contract": {
    "totalSupply": "4"  // Jumlah yang sudah di-mint
  }
}
```

### Database Schema

```prisma
model Launchpad {
  totalMaxSupply  Int  // Max supply dari Creator Studio (10000)
  mintedCount     Int  // Jumlah yang sudah di-mint (4)
}
```

### Mapping yang Benar

| Data | Source | Value | Keterangan |
|------|--------|-------|------------|
| **Max Supply** | Database `totalMaxSupply` | 10,000 | Dari Creator Studio |
| **Minted Count** | Database `mintedCount` atau Alchemy `totalSupply` | 4 | Jumlah yang sudah di-mint |
| **Available** | Calculated | 9,996 | `maxSupply - mintedCount` |
| **Progress** | Calculated | 0.04% | `(mintedCount / maxSupply) * 100` |

## Best Practices

### 1. Selalu Gunakan Database untuk Max Supply

```typescript
// ✅ BEST PRACTICE
const getCollectionData = async (contractAddress: string) => {
  // Get from database
  const launchpad = await prisma.launchpad.findUnique({
    where: { contractAddress }
  });

  return {
    maxSupply: launchpad.totalMaxSupply,      // Dari database
    mintedCount: launchpad.mintedCount,       // Dari database (di-sync dari contract)
    available: launchpad.totalMaxSupply - launchpad.mintedCount
  };
};
```

### 2. Sync Minted Count dari Contract

Untuk memastikan `mintedCount` di database selalu akurat, gunakan sync API:

```bash
# Sync mint count dari contract ke database
POST /api/admin/launchpads/sync-mints
```

### 3. Jangan Campur Data Alchemy dengan Database

```typescript
// ❌ JANGAN seperti ini
const alchemyData = await alchemyService.getNFTsForOwner(address);
const dbData = await prisma.launchpad.findUnique({ where: { contractAddress } });

const mixedData = {
  maxSupply: alchemyData.contract.totalSupply,  // SALAH! Ini bukan max supply
  mintedCount: dbData.mintedCount
};

// ✅ LAKUKAN seperti ini
const dbData = await prisma.launchpad.findUnique({ where: { contractAddress } });

const correctData = {
  maxSupply: dbData.totalMaxSupply,    // BENAR! Dari database
  mintedCount: dbData.mintedCount      // BENAR! Dari database
};
```

## Troubleshooting

### Jika Max Supply Salah di UI

1. **Cek sumber data:**
   ```typescript
   console.log('Data source:', {
     fromAlchemy: alchemyData.contract.totalSupply,
     fromDatabase: launchpad.totalMaxSupply
   });
   ```

2. **Pastikan menggunakan database:**
   ```typescript
   // ✅ Harus dari database
   const maxSupply = launchpad.totalMaxSupply;
   ```

3. **Cek database value:**
   ```sql
   SELECT contractAddress, totalMaxSupply, mintedCount 
   FROM Launchpad 
   WHERE contractAddress = '0x...';
   ```

### Jika Minted Count Tidak Update

1. **Sync dari contract:**
   ```bash
   POST /api/admin/launchpads/sync-mints
   ```

2. **Cek activity listener:**
   ```bash
   GET /api/admin/launchpads/listeners
   ```

3. **Manual sync via script:**
   ```bash
   node scripts/sync-mint-counts.js
   ```

## Summary

| Metric | Source | API/Field | Keterangan |
|--------|--------|-----------|------------|
| **Max Supply** | Database | `totalMaxSupply` | Dari Creator Studio, tidak berubah |
| **Minted Count** | Database (synced from contract) | `mintedCount` | Jumlah yang sudah di-mint, bertambah saat mint |
| **Alchemy totalSupply** | Alchemy API | `contract.totalSupply` | **BUKAN max supply!** Ini adalah minted count |

**Key Takeaway:**
- ✅ **Max Supply** → Selalu dari **database** (`totalMaxSupply`)
- ✅ **Minted Count** → Dari **database** (`mintedCount`) yang di-sync dari contract
- ❌ **Alchemy `totalSupply`** → **JANGAN** gunakan untuk max supply!

## Referensi

- [ERC721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [ERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Enumerable)
- [Alchemy NFT API](https://docs.alchemy.com/reference/nft-api-quickstart)
- Database Schema: `prisma/schema.prisma`
- Sync API: `src/app/api/admin/launchpads/sync-mints/route.ts`
