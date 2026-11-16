# Alchemy NFT Service - Quick Start Guide

Panduan cepat untuk mulai menggunakan Alchemy NFT Service di project ini.

## 🚀 Setup Cepat

### 1. Dapatkan API Key

1. Buka https://dashboard.alchemy.com/
2. Sign up atau login
3. Create new app
4. Copy API key

### 2. Konfigurasi Environment

Tambahkan ke file `.env`:

```env
ALCHEMY_API_KEY=your_api_key_here
ALCHEMY_NETWORK=eth-mainnet
```

### 3. Import dan Gunakan

```typescript
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';

const alchemy = createAlchemyNFTService({
  apiKey: process.env.ALCHEMY_API_KEY!,
  network: 'eth-mainnet',
});
```

## 📖 Use Cases Umum

### 1. Cek NFT yang Dimiliki Wallet

```typescript
const nfts = await alchemy.getNFTsForOwner('0xWalletAddress', {
  excludeFilters: ['SPAM'],
  withMetadata: true,
});

console.log(`Total NFTs: ${nfts.totalCount}`);
```

### 2. Dapatkan Metadata NFT

```typescript
const metadata = await alchemy.getNFTMetadata(
  '0xContractAddress',
  '1' // tokenId
);

console.log('Name:', metadata.name);
console.log('Image:', metadata.image?.cachedUrl);
```

### 3. Cek Floor Price Collection

```typescript
const floorPrice = await alchemy.getFloorPrice('0xContractAddress');

console.log('OpenSea Floor:', floorPrice.openSea?.floorPrice, 'ETH');
```

### 4. Dapatkan Sales History

```typescript
const sales = await alchemy.getNFTSales({
  contractAddress: '0xContractAddress',
  limit: 100,
});

console.log(`Total sales: ${sales.nftSales.length}`);
```

### 5. Cek Spam Contract

```typescript
const result = await alchemy.isSpamContract('0xContractAddress');

if (result.isSpamContract) {
  console.log('⚠️ Ini spam contract!');
}
```

### 6. Dapatkan Rarity NFT

```typescript
const rarity = await alchemy.computeRarity('0xContractAddress', '1');

console.log('Rank:', rarity.rank, '/', rarity.maxRank);
console.log('Rarity Score:', rarity.rarityScore);
```

## 🎯 Contoh Praktis

### Build NFT Portfolio

```typescript
async function getPortfolio(wallet: string) {
  // Get semua NFT contracts
  const contracts = await alchemy.getContractsForOwner(wallet, {
    excludeFilters: ['SPAM'],
  });

  // Get floor price untuk setiap collection
  const portfolio = await Promise.all(
    contracts.contracts.map(async (contract) => {
      const floorPrice = await alchemy.getFloorPrice(contract.address);
      const balance = parseInt(contract.totalBalance);
      const floor = floorPrice.openSea?.floorPrice || 0;

      return {
        address: contract.address,
        balance,
        floorPrice: floor,
        value: floor * balance,
      };
    })
  );

  return portfolio;
}
```

### Track Collection Activity

```typescript
async function trackCollection(contractAddress: string) {
  // Get sales data
  const sales = await alchemy.getNFTSales({
    contractAddress,
    limit: 100,
  });

  // Get floor price
  const floorPrice = await alchemy.getFloorPrice(contractAddress);

  // Get total owners
  const owners = await alchemy.getOwnersForContract(contractAddress);

  return {
    recentSales: sales.nftSales.length,
    floorPrice: floorPrice.openSea?.floorPrice,
    totalOwners: owners.owners.length,
  };
}
```

## 🔌 API Routes

Project ini sudah include contoh API routes:

### 1. Portfolio API
```
GET /api/nft/portfolio?wallet=0x...
```

Response:
```json
{
  "success": true,
  "data": {
    "wallet": "0x...",
    "totalCollections": 5,
    "totalNFTs": 25,
    "totalValue": 12.5,
    "collections": [...]
  }
}
```

### 2. Metadata API
```
GET /api/nft/metadata?contract=0x...&tokenId=1
```

Response:
```json
{
  "success": true,
  "data": {
    "metadata": {...},
    "owners": [...],
    "rarity": {...},
    "collection": {...}
  }
}
```

### 3. Sales API
```
GET /api/nft/sales?contract=0x...&limit=100
```

Response:
```json
{
  "success": true,
  "data": {
    "sales": [...],
    "statistics": {
      "totalSales": 100,
      "totalVolume": 250.5,
      "avgPrice": 2.505
    }
  }
}
```

## 🌐 Supported Networks

- `eth-mainnet` - Ethereum Mainnet
- `eth-sepolia` - Ethereum Sepolia Testnet
- `polygon-mainnet` - Polygon Mainnet
- `polygon-amoy` - Polygon Amoy Testnet
- `base-mainnet` - Base Mainnet
- `base-sepolia` - Base Sepolia Testnet
- `arbitrum-mainnet` - Arbitrum One
- `optimism-mainnet` - Optimism Mainnet

## 💡 Tips

### 1. Selalu Filter Spam
```typescript
const nfts = await alchemy.getNFTsForOwner(wallet, {
  excludeFilters: ['SPAM'], // ✅ Penting!
});
```

### 2. Gunakan Batch untuk Multiple Items
```typescript
// ❌ Jangan seperti ini
for (const token of tokens) {
  await alchemy.getNFTMetadata(token.contract, token.id);
}

// ✅ Gunakan batch
await alchemy.getNFTMetadataBatch(tokens);
```

### 3. Handle Pagination
```typescript
let allNFTs = [];
let pageKey = undefined;

do {
  const result = await alchemy.getNFTsForContract(contract, { pageKey });
  allNFTs.push(...result.nfts);
  pageKey = result.pageKey;
} while (pageKey);
```

### 4. Error Handling
```typescript
try {
  const metadata = await alchemy.getNFTMetadata(contract, tokenId);
} catch (error) {
  console.error('Error:', error.message);
}
```

## 📚 Dokumentasi Lengkap

Lihat dokumentasi lengkap di:
- `docs/ALCHEMY_NFT_SERVICE.md` - Dokumentasi lengkap semua endpoint
- `src/lib/alchemy-nft-service.example.ts` - 25+ contoh penggunaan

## 🆘 Troubleshooting

### Error: "Alchemy API key not configured"
- Pastikan `ALCHEMY_API_KEY` sudah di set di `.env`
- Restart development server setelah update `.env`

### Error: "Invalid API key"
- Cek API key di Alchemy dashboard
- Pastikan tidak ada spasi atau karakter extra

### Error: "Network not supported"
- Cek list supported networks di atas
- Pastikan network name sesuai format Alchemy

### Rate Limit Error
- Alchemy free tier: 300 requests/second
- Implement rate limiting jika perlu
- Upgrade plan di Alchemy dashboard

## 🔗 Resources

- [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [Alchemy Docs](https://docs.alchemy.com/reference/nft-api-endpoints)
- [Supported Chains](https://dashboard.alchemy.com/chains)

## 📝 Next Steps

1. ✅ Setup API key
2. ✅ Test dengan contoh code
3. ✅ Explore API routes
4. ✅ Build fitur NFT di aplikasi
5. ✅ Deploy ke production

Selamat coding! 🚀
