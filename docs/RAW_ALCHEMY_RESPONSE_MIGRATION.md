# Raw Alchemy Response Migration

## Overview
All `/nft` API routes have been updated to return **raw, unmodified** responses from Alchemy API instead of transformed/simplified data.

## Why This Change?

### Before (Transformed Response)
```json
{
  "success": true,
  "data": {
    "nfts": [...],
    "pageKey": "...",
    "totalCount": 100
  }
}
```

### After (Raw Alchemy Response)
```json
{
  "success": true,
  "data": {
    "ownedNfts": [...],
    "pageKey": "...",
    "totalCount": 100
  }
}
```

### Benefits
1. **Transparency** - Direct mapping to Alchemy documentation
2. **No Data Loss** - All fields from Alchemy are preserved
3. **Easier Debugging** - Response matches Alchemy docs exactly
4. **Flexibility** - Frontend can transform data as needed
5. **Maintainability** - Less code in API routes

## Updated API Routes

All routes now return raw Alchemy responses:

### `/api/nft/owner`
**Before:**
```json
{
  "success": true,
  "data": {
    "nfts": [
      {
        "contractAddress": "0x...",
        "tokenId": "123",
        "name": "NFT Name",
        "image": "https://...",
        "floorPrice": 0.5,
        "collection": { "name": "...", "symbol": "..." }
      }
    ]
  }
}
```

**After (Raw Alchemy):**
```json
{
  "success": true,
  "data": {
    "ownedNfts": [
      {
        "contract": {
          "address": "0x...",
          "name": "Collection Name",
          "symbol": "SYMBOL"
        },
        "tokenId": "123",
        "name": "NFT Name",
        "image": {
          "cachedUrl": "https://...",
          "thumbnailUrl": "https://...",
          "originalUrl": "https://..."
        },
        "tokenType": "ERC721",
        "description": "...",
        "timeLastUpdated": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pageKey": "...",
    "totalCount": 100
  }
}
```

### `/api/nft/metadata`
Returns raw `NFTMetadata` object from Alchemy

### `/api/nft/floor-price`
Returns raw `FloorPrice` object from Alchemy

### `/api/nft/sales`
Returns raw `{ nftSales: [...], pageKey: "..." }` from Alchemy

### `/api/nft/collections`
Returns raw `{ collections: [...], pageKey: "..." }` from Alchemy

### `/api/nft/portfolio`
Returns raw `{ contracts: [...], pageKey: "...", totalCount: ... }` from Alchemy

### All Other Routes
All other `/nft` routes now return raw Alchemy responses

## Frontend Migration

### NFTHoldingGrid Component

**Before:**
```typescript
const result = await response.json();
if (result.success && result.data) {
  setNfts(result.data.nfts);
}
```

**After:**
```typescript
const result = await response.json();
if (result.success && result.data) {
  // Handle raw Alchemy response
  const ownedNfts = result.data.ownedNfts || [];
  setNfts(ownedNfts);
}
```

### NFTHoldingCard Component

**Before:**
```typescript
<NFTHoldingCard
  contractAddress={nft.contractAddress}
  tokenId={nft.tokenId}
  name={nft.name}
  image={nft.image}
/>
```

**After:**
```typescript
<NFTHoldingCard
  contractAddress={nft.contract.address}
  tokenId={nft.tokenId}
  name={nft.name || nft.contract.name}
  image={nft.image?.cachedUrl || nft.image?.thumbnailUrl}
/>
```

## Alchemy Response Structures

### NFTMetadata (from getNFTsForOwner)
```typescript
{
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType?: string;
  };
  tokenId: string;
  tokenType?: string;
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  raw?: {
    metadata?: any;
    tokenUri?: string;
  };
  tokenUri?: string;
  timeLastUpdated?: string;
  balance?: string;
}
```

### FloorPrice
```typescript
{
  openSea?: {
    floorPrice: number;
    priceCurrency: string;
    collectionUrl: string;
    retrievedAt: string;
  };
  looksRare?: {
    floorPrice: number;
    priceCurrency: string;
    collectionUrl: string;
    retrievedAt: string;
  };
}
```

### NFTSale
```typescript
{
  marketplace: string;
  contractAddress: string;
  tokenId: string;
  quantity: string;
  buyerAddress: string;
  sellerAddress: string;
  sellerFee: {
    amount: string;
    tokenAddress: string;
    symbol: string;
    decimals: number;
  };
  blockNumber: number;
  transactionHash: string;
}
```

## Testing

Test all endpoints to ensure they return raw Alchemy responses:

```bash
# Test owner endpoint
curl "http://localhost:3000/api/nft/owner?address=0x..."

# Expected: { success: true, data: { ownedNfts: [...], pageKey, totalCount } }

# Test floor price
curl "http://localhost:3000/api/nft/floor-price?contract=0x..."

# Expected: { success: true, data: { openSea: { floorPrice: ... } } }

# Test metadata
curl "http://localhost:3000/api/nft/metadata?contract=0x...&tokenId=1"

# Expected: { success: true, data: { contract: {...}, tokenId, name, image: {...} } }
```

## Documentation References

All responses now match Alchemy's official documentation:
- [Alchemy NFT API Docs](https://docs.alchemy.com/reference/nft-api-endpoints)
- [getNFTsForOwner](https://docs.alchemy.com/reference/getnftsforowner-v3)
- [getFloorPrice](https://docs.alchemy.com/reference/getfloorprice-v3)
- [getNFTMetadata](https://docs.alchemy.com/reference/getnftmetadata-v3)

## Summary

✅ All `/nft` API routes now return raw Alchemy responses
✅ Frontend components updated to handle raw responses
✅ No data transformation in API layer
✅ Direct compatibility with Alchemy documentation
✅ Easier debugging and maintenance
