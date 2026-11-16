# Alchemy NFT Service Documentation

Comprehensive service untuk berinteraksi dengan Alchemy NFT API. Service ini menyediakan akses ke semua endpoint NFT API dari Alchemy termasuk ownership, metadata, spam detection, dan sales data.

## 📋 Daftar Isi

- [Setup](#setup)
- [Fitur Utama](#fitur-utama)
- [Endpoint Categories](#endpoint-categories)
- [Penggunaan Dasar](#penggunaan-dasar)
- [Contoh Lengkap](#contoh-lengkap)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## 🚀 Setup

### 1. Install Dependencies

Dependencies sudah terinstall di project (axios sudah ada di package.json).

### 2. Konfigurasi Environment Variables

Tambahkan ke file `.env`:

```env
ALCHEMY_API_KEY=your_alchemy_api_key_here
ALCHEMY_NETWORK=eth-mainnet
```

Dapatkan API key dari: https://dashboard.alchemy.com/

### 3. Import Service

```typescript
import { createAlchemyNFTService } from '@/lib/alchemy-nft-service';

const alchemyService = createAlchemyNFTService({
  apiKey: process.env.ALCHEMY_API_KEY || '',
  network: 'eth-mainnet',
});
```

## ✨ Fitur Utama

### NFT Ownership (7 Endpoints)
- ✅ Get NFTs owned by wallet
- ✅ Get owners of specific NFT
- ✅ Get all owners of contract
- ✅ Check if wallet holds NFT from collection
- ✅ Get NFT contracts owned by wallet
- ✅ Get NFT collections owned by wallet
- ✅ NFT Activity Webhook support

### NFT Metadata (9 Endpoints)
- ✅ Get all NFTs in collection
- ✅ Get metadata for specific NFT
- ✅ Batch get NFT metadata
- ✅ Get contract metadata
- ✅ Batch get contract metadata
- ✅ Compute NFT rarity
- ✅ Refresh collection metadata
- ✅ Refresh single NFT metadata
- ✅ Summarize NFT attributes
- ✅ Search contract metadata

### NFT Spam Detection (4 Endpoints)
- ✅ Get spam contracts list
- ✅ Check if contract is spam
- ✅ Check if NFT is airdrop
- ✅ Report spam contract

### NFT Sales & Pricing (2 Endpoints)
- ✅ Get floor price by marketplace
- ✅ Get NFT sales data across marketplaces

## 📚 Endpoint Categories

### 1. NFT Ownership Endpoints

#### `getNFTsForOwner()`
Mendapatkan semua NFT yang dimiliki oleh wallet address.

```typescript
const result = await alchemyService.getNFTsForOwner('0x...', {
  pageSize: 100,
  withMetadata: true,
  excludeFilters: ['SPAM'],
  contractAddresses: ['0x...'], // Optional: filter by contracts
});

console.log(`Total NFTs: ${result.totalCount}`);
console.log('NFTs:', result.ownedNfts);
```

#### `getOwnersForNFT()`
Mendapatkan semua owner dari token tertentu.

```typescript
const result = await alchemyService.getOwnersForNFT(
  '0xContractAddress',
  '1' // tokenId
);

console.log('Owners:', result.owners);
```

#### `getOwnersForContract()`
Mendapatkan semua owner dari sebuah NFT contract.

```typescript
const result = await alchemyService.getOwnersForContract('0x...', {
  withTokenBalances: true,
});

result.owners.forEach(owner => {
  console.log(`${owner.ownerAddress}: ${owner.tokenBalances.length} tokens`);
});
```

#### `isHolderOfContract()`
Cek apakah wallet memiliki NFT dari collection tertentu.

```typescript
const result = await alchemyService.isHolderOfContract(
  '0xWalletAddress',
  '0xContractAddress'
);

if (result.isHolderOfContract) {
  console.log('✅ Wallet owns NFT from this collection');
}
```

#### `getContractsForOwner()`
Mendapatkan list semua NFT contract yang dimiliki wallet.

```typescript
const result = await alchemyService.getContractsForOwner('0x...', {
  excludeFilters: ['SPAM'],
  pageSize: 100,
});

console.log(`Total contracts: ${result.totalCount}`);
```

#### `getCollectionsForOwner()`
Mendapatkan semua NFT collection yang dimiliki wallet dengan metadata lengkap.

```typescript
const result = await alchemyService.getCollectionsForOwner('0x...', {
  excludeFilters: ['SPAM'],
});

result.collections.forEach(collection => {
  console.log(`${collection.name} - ${collection.contractAddress}`);
});
```

### 2. NFT Metadata Endpoints

#### `getNFTsForContract()`
Mendapatkan semua NFT dalam sebuah collection.

```typescript
const result = await alchemyService.getNFTsForContract('0x...', {
  withMetadata: true,
  pageSize: 100,
});

console.log('NFTs:', result.nfts);

// Handle pagination
if (result.pageKey) {
  const nextPage = await alchemyService.getNFTsForContract('0x...', {
    pageKey: result.pageKey,
  });
}
```

#### `getNFTMetadata()`
Mendapatkan metadata untuk NFT tertentu.

```typescript
const metadata = await alchemyService.getNFTMetadata(
  '0xContractAddress',
  '1', // tokenId
  {
    refreshCache: false,
  }
);

console.log('Name:', metadata.name);
console.log('Description:', metadata.description);
console.log('Image:', metadata.image?.cachedUrl);
```

#### `getNFTMetadataBatch()`
Mendapatkan metadata untuk multiple NFT sekaligus.

```typescript
const tokens = [
  { contractAddress: '0x...', tokenId: '1' },
  { contractAddress: '0x...', tokenId: '2' },
  { contractAddress: '0x...', tokenId: '3' },
];

const result = await alchemyService.getNFTMetadataBatch(tokens);

result.nfts.forEach(nft => {
  console.log(`${nft.name} - Token ${nft.tokenId}`);
});
```

#### `getContractMetadata()`
Mendapatkan metadata untuk NFT contract/collection.

```typescript
const metadata = await alchemyService.getContractMetadata('0x...');

console.log('Collection:', metadata.name);
console.log('Symbol:', metadata.symbol);
console.log('Total Supply:', metadata.totalSupply);
console.log('Floor Price:', metadata.openSeaMetadata?.floorPrice);
```

#### `getContractMetadataBatch()`
Mendapatkan metadata untuk multiple contracts sekaligus.

```typescript
const contracts = ['0x...', '0x...', '0x...'];
const result = await alchemyService.getContractMetadataBatch(contracts);

result.contracts.forEach(contract => {
  console.log(`${contract.name}: ${contract.totalSupply} supply`);
});
```

#### `computeRarity()`
Menghitung rarity untuk sebuah NFT.

```typescript
const rarity = await alchemyService.computeRarity('0x...', '1');

console.log('Rank:', rarity.rank);
console.log('Rarity Score:', rarity.rarityScore);
console.log('Max Rank:', rarity.maxRank);
```

#### `summarizeNFTAttributes()`
Mendapatkan summary dari semua attribute dalam collection.

```typescript
const summary = await alchemyService.summarizeNFTAttributes('0x...');

Object.entries(summary.summary).forEach(([trait, values]) => {
  console.log(`\nTrait: ${trait}`);
  values.forEach(value => {
    const percentage = (value.prevalence * 100).toFixed(2);
    console.log(`  ${value.value}: ${value.count} (${percentage}%)`);
  });
});
```

#### `refreshNFTMetadata()`
Refresh metadata untuk NFT tertentu (berguna setelah reveal).

```typescript
const result = await alchemyService.refreshNFTMetadata('0x...', '1');
console.log('Refresh result:', result.message);
```

#### `invalidateContract()`
Refresh metadata untuk seluruh collection.

```typescript
const result = await alchemyService.invalidateContract('0x...');
console.log('Collection refresh:', result.message);
```

#### `searchContractMetadata()`
Search NFT collections berdasarkan keyword.

```typescript
const result = await alchemyService.searchContractMetadata('Bored Ape');

result.contracts.forEach(contract => {
  console.log(`${contract.name} - ${contract.address}`);
});
```

### 3. NFT Spam Detection Endpoints

#### `isSpamContract()`
Cek apakah contract adalah spam.

```typescript
const result = await alchemyService.isSpamContract('0x...');

if (result.isSpamContract) {
  console.log('⚠️ This is a spam contract');
}
```

#### `isAirdropNFT()`
Cek apakah NFT adalah airdrop.

```typescript
const result = await alchemyService.isAirdropNFT('0x...', '1');

if (result.isAirdrop) {
  console.log('🎁 This is an airdrop NFT');
}
```

#### `getSpamContracts()`
Mendapatkan list semua spam contracts.

```typescript
const result = await alchemyService.getSpamContracts();
console.log(`Total spam contracts: ${result.spamContracts.length}`);
```

#### `reportSpam()`
Report contract sebagai spam.

```typescript
const result = await alchemyService.reportSpam('0x...');
console.log('Report result:', result.message);
```

### 4. NFT Sales & Pricing Endpoints

#### `getFloorPrice()`
Mendapatkan floor price dari collection di berbagai marketplace.

```typescript
const floorPrice = await alchemyService.getFloorPrice('0x...');

if (floorPrice.openSea) {
  console.log('OpenSea Floor:', floorPrice.openSea.floorPrice, 'ETH');
  console.log('URL:', floorPrice.openSea.collectionUrl);
}

if (floorPrice.looksRare) {
  console.log('LooksRare Floor:', floorPrice.looksRare.floorPrice, 'ETH');
}
```

#### `getNFTSales()`
Mendapatkan data sales NFT dari berbagai marketplace.

```typescript
// Get recent sales for a collection
const result = await alchemyService.getNFTSales({
  contractAddress: '0x...',
  order: 'desc',
  limit: 100,
});

result.nftSales.forEach(sale => {
  console.log(`Token ${sale.tokenId} sold on ${sale.marketplace}`);
  console.log(`Price: ${sale.sellerFee.amount} ${sale.sellerFee.symbol}`);
  console.log(`Buyer: ${sale.buyerAddress}`);
  console.log(`Seller: ${sale.sellerAddress}`);
});

// Get sales for specific token
const tokenSales = await alchemyService.getNFTSales({
  contractAddress: '0x...',
  tokenId: '1',
});

// Get sales by wallet
const purchases = await alchemyService.getNFTSales({
  buyerAddress: '0x...',
});

const sales = await alchemyService.getNFTSales({
  sellerAddress: '0x...',
});
```

## 💡 Contoh Lengkap

### Example 1: Build NFT Portfolio Dashboard

```typescript
async function buildPortfolio(walletAddress: string) {
  // Get all NFT contracts owned
  const contracts = await alchemyService.getContractsForOwner(walletAddress, {
    excludeFilters: ['SPAM'],
  });
  
  // Get floor prices for each collection
  const portfolio = await Promise.all(
    contracts.contracts.map(async (contract) => {
      try {
        const [floorPrice, metadata] = await Promise.all([
          alchemyService.getFloorPrice(contract.address),
          alchemyService.getContractMetadata(contract.address),
        ]);
        
        const balance = parseInt(contract.totalBalance);
        const floor = floorPrice.openSea?.floorPrice || 0;
        
        return {
          address: contract.address,
          name: metadata.name,
          balance,
          floorPrice: floor,
          estimatedValue: floor * balance,
        };
      } catch (error) {
        return null;
      }
    })
  );
  
  const validPortfolio = portfolio.filter(Boolean);
  const totalValue = validPortfolio.reduce(
    (sum, item) => sum + (item?.estimatedValue || 0), 
    0
  );
  
  return {
    collections: validPortfolio,
    totalValue,
    totalCollections: validPortfolio.length,
  };
}
```

### Example 2: Track Collection Activity

```typescript
async function trackCollectionActivity(contractAddress: string) {
  // Get recent sales
  const sales = await alchemyService.getNFTSales({
    contractAddress,
    order: 'desc',
    limit: 100,
  });
  
  // Calculate statistics
  const totalVolume = sales.nftSales.reduce((sum, sale) => {
    return sum + parseFloat(sale.sellerFee.amount);
  }, 0);
  
  const avgPrice = totalVolume / sales.nftSales.length;
  
  // Get floor price and owners
  const [floorPrice, owners] = await Promise.all([
    alchemyService.getFloorPrice(contractAddress),
    alchemyService.getOwnersForContract(contractAddress),
  ]);
  
  return {
    recentSales: sales.nftSales.length,
    totalVolume,
    avgPrice,
    floorPrice: floorPrice.openSea?.floorPrice || 0,
    totalOwners: owners.owners.length,
  };
}
```

### Example 3: Multi-Chain NFT Lookup

```typescript
async function getMultiChainNFTs(walletAddress: string) {
  const chains = ['eth-mainnet', 'polygon-mainnet', 'base-mainnet'];
  
  const results = await Promise.all(
    chains.map(async (network) => {
      const service = createAlchemyNFTService({
        apiKey: process.env.ALCHEMY_API_KEY || '',
        network,
      });
      
      const nfts = await service.getNFTsForOwner(walletAddress, {
        excludeFilters: ['SPAM'],
      });
      
      return {
        network,
        count: nfts.totalCount,
        nfts: nfts.ownedNfts,
      };
    })
  );
  
  return results;
}
```

### Example 4: NFT Rarity Checker

```typescript
async function checkNFTRarity(contractAddress: string, tokenId: string) {
  // Get rarity data
  const rarity = await alchemyService.computeRarity(contractAddress, tokenId);
  
  // Get attribute summary for context
  const summary = await alchemyService.summarizeNFTAttributes(contractAddress);
  
  // Get metadata
  const metadata = await alchemyService.getNFTMetadata(contractAddress, tokenId);
  
  return {
    tokenId,
    name: metadata.name,
    rank: rarity.rank,
    maxRank: rarity.maxRank,
    rarityScore: rarity.rarityScore,
    percentile: ((rarity.maxRank - rarity.rank) / rarity.maxRank) * 100,
    totalSupply: summary.totalSupply,
  };
}
```

## 🛡️ Error Handling

Service ini sudah include error handling. Semua error akan di-throw dengan format yang jelas:

```typescript
try {
  const result = await alchemyService.getNFTMetadata('0x...', '1');
  console.log(result);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    // Error format: "Alchemy API Error [methodName]: error details"
  }
}
```

## 📝 Best Practices

### 1. Pagination
Selalu handle pagination untuk dataset besar:

```typescript
async function getAllNFTs(contractAddress: string) {
  let allNFTs: NFTMetadata[] = [];
  let pageKey: string | undefined;
  
  do {
    const result = await alchemyService.getNFTsForContract(contractAddress, {
      pageKey,
      pageSize: 100,
    });
    
    allNFTs = [...allNFTs, ...result.nfts];
    pageKey = result.pageKey;
  } while (pageKey);
  
  return allNFTs;
}
```

### 2. Batch Requests
Gunakan batch endpoints untuk multiple items:

```typescript
// ❌ Bad - Multiple single requests
for (const token of tokens) {
  const metadata = await alchemyService.getNFTMetadata(
    token.contract, 
    token.tokenId
  );
}

// ✅ Good - Single batch request
const result = await alchemyService.getNFTMetadataBatch(tokens);
```

### 3. Filter Spam
Selalu filter spam NFTs:

```typescript
const result = await alchemyService.getNFTsForOwner(walletAddress, {
  excludeFilters: ['SPAM'],
});
```

### 4. Cache Management
Gunakan `refreshCache: false` untuk data yang tidak sering berubah:

```typescript
const metadata = await alchemyService.getNFTMetadata(
  contractAddress,
  tokenId,
  { refreshCache: false }
);
```

### 5. Rate Limiting
Implement rate limiting untuk production:

```typescript
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent requests

const results = await Promise.all(
  items.map(item => 
    limit(() => alchemyService.getNFTMetadata(item.contract, item.tokenId))
  )
);
```

### 6. Multi-Network Support
Buat service instance per network:

```typescript
const services = {
  ethereum: createAlchemyNFTService({
    apiKey: process.env.ALCHEMY_API_KEY!,
    network: 'eth-mainnet',
  }),
  polygon: createAlchemyNFTService({
    apiKey: process.env.ALCHEMY_API_KEY!,
    network: 'polygon-mainnet',
  }),
  base: createAlchemyNFTService({
    apiKey: process.env.ALCHEMY_API_KEY!,
    network: 'base-mainnet',
  }),
};
```

## 🔗 Resources

- [Alchemy NFT API Documentation](https://docs.alchemy.com/reference/nft-api-endpoints)
- [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [Supported Chains](https://dashboard.alchemy.com/chains)
- [API Rate Limits](https://docs.alchemy.com/reference/throughput)

## 📄 File Locations

- Service: `src/lib/alchemy-nft-service.ts`
- Examples: `src/lib/alchemy-nft-service.example.ts`
- Documentation: `docs/ALCHEMY_NFT_SERVICE.md`

## 🎯 Supported Networks

- Ethereum Mainnet (`eth-mainnet`)
- Ethereum Sepolia (`eth-sepolia`)
- Polygon Mainnet (`polygon-mainnet`)
- Polygon Amoy (`polygon-amoy`)
- Base Mainnet (`base-mainnet`)
- Base Sepolia (`base-sepolia`)
- Arbitrum Mainnet (`arbitrum-mainnet`)
- Optimism Mainnet (`optimism-mainnet`)
- Dan network lainnya yang didukung Alchemy

## 🤝 Contributing

Jika ada bug atau feature request, silakan buat issue atau pull request.
