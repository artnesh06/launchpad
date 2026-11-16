# Create Launchpad - Database Storage Checklist

## ✅ Data yang Tersimpan ke Database

### 1. **Launchpad Table** (Main Collection Data)

| Field | Source | Status | Notes |
|-------|--------|--------|-------|
| `chainId` | selectedChainId | ✅ Saved | Blockchain network ID |
| `factoryId` | Auto-detected/created | ✅ Saved | LaunchpadFactory reference |
| `contractAddress` | From blockchain | ✅ Saved | Deployed contract address |
| `creator` | collectionData.treasury | ✅ Saved | Wallet address of creator |
| `name` | collectionData.name | ✅ Saved | Collection name |
| `symbol` | collectionData.symbol | ✅ Saved | Collection symbol |
| `description` | collectionData.description | ✅ Saved | Collection description |
| `baseURI` | finalBaseURI | ✅ Saved | IPFS URI for metadata |
| `unrevealedURI` | collectionData.unrevealedURI | ✅ Saved | Pre-reveal URI |
| `contractURI` | finalContractURI | ✅ Saved | Contract metadata URI |
| `externalLink` | collectionData.externalLink | ✅ Saved | Website URL |
| `totalMaxSupply` | collectionData.totalMaxSupply | ✅ Saved | Max NFT supply |
| `treasury` | collectionData.treasury | ✅ Saved | Treasury wallet |
| `royaltyRecipient` | collectionData.royaltyRecipient | ✅ Saved | Royalty recipient |
| `royaltyPercentage` | collectionData.royaltyPercentage | ✅ Saved | Royalty % |
| `deployTxHash` | createTxHash | ✅ Saved | Deployment transaction |
| `status` | 'ACTIVE' | ✅ Saved | Default status |

### 2. **LaunchpadMetadata Table** (Additional Info)

| Field | Source | Status | Notes |
|-------|--------|--------|-------|
| `launchpadId` | launchpad.id | ✅ Saved | Foreign key |
| `image` | coverImageUrl (IPFS) | ✅ Saved | Cover image 800×800px |
| `bannerImage` | bannerImageUrl (IPFS) | ✅ Saved | Banner image 1000×300px |
| `website` | collectionData.externalLink | ✅ Saved | Website URL |
| `twitter` | metadata.twitter | ✅ Saved | Twitter handle |
| `discord` | metadata.discord | ✅ Saved | Discord invite |
| `telegram` | metadata.telegram | ✅ Saved | Telegram link |
| `medium` | metadata.medium | ✅ Saved | Medium profile |
| `github` | metadata.github | ✅ Saved | GitHub repo |
| `tags` | metadata.tags | ✅ Saved | Category tags |
| `category` | metadata.category | ✅ Saved | Main category |
| `featured` | false | ✅ Saved | Default false |
| `verified` | false | ✅ Saved | Default false |

### 3. **LaunchpadPhase Table** (Mint Phases)

| Field | Source | Status | Notes |
|-------|--------|--------|-------|
| `launchpadId` | launchpad.id | ✅ Saved | Foreign key |
| `name` | phase.name | ✅ Saved | Phase name (e.g., "GTD Mint") |
| `phaseType` | 'WHITELIST' or 'PUBLIC' | ✅ Saved | Based on requiresWhitelist |
| `startTime` | phase.startDate | ✅ Saved | Converted to ISO string |
| `endTime` | phase.endDate | ✅ Saved | Converted to ISO string |
| `price` | phase.price | ✅ Saved | Converted from Wei to ETH |
| `maxMintPerWallet` | phase.maxPerWallet | ✅ Saved | Max per wallet |
| `totalLimit` | phase.maxSupply | ✅ Saved | Phase supply limit |
| `isActive` | true | ✅ Saved | Default active |
| `merkleRoot` | phase.merkleRoot | ✅ Saved | For whitelist verification |

### 4. **LaunchpadAnalytics Table** (Metrics)

| Field | Source | Status | Notes |
|-------|--------|--------|-------|
| `launchpadId` | launchpad.id | ✅ Saved | Foreign key |
| `totalVolume` | '0' | ✅ Saved | Initial value |
| `totalMints` | 0 | ✅ Saved | Initial value |
| `uniqueHolders` | 0 | ✅ Saved | Initial value |
| `avgMintPrice` | '0' | ✅ Saved | Initial value |
| `floorPrice` | null | ✅ Saved | Initial value |
| `lastSalePrice` | null | ✅ Saved | Initial value |
| `views` | 0 | ✅ Saved | Initial value |
| `likes` | 0 | ✅ Saved | Initial value |

### 5. **Activity Table** (Audit Log)

| Field | Source | Status | Notes |
|-------|--------|--------|-------|
| `chainId` | selectedChainId | ✅ Saved | Network ID |
| `factoryId` | factory.id | ✅ Saved | Factory reference |
| `type` | 'LAUNCHPAD_CREATED' | ✅ Saved | Activity type |
| `actor` | creator | ✅ Saved | Creator wallet |
| `description` | Generated | ✅ Saved | Human-readable |
| `txHash` | deployTxHash | ✅ Saved | Transaction hash |
| `metadata` | Object | ✅ Saved | Additional info |

## 📋 Data Flow

```
Creator Studio Form
    ↓
1. Upload Files to IPFS
   - Cover Image → coverImageUrl
   - Banner Image → bannerImageUrl
   - Metadata ZIP → baseURI
   - Contract Metadata → contractURI
    ↓
2. Process Whitelist CSV
   - Generate Merkle Root
   - Count addresses
    ↓
3. Deploy to Blockchain
   - Create collection + phases
   - Get contract address
   - Get transaction hash
    ↓
4. Save to Database
   - Launchpad (main data)
   - LaunchpadMetadata (images, socials)
   - LaunchpadPhase (mint phases)
   - LaunchpadAnalytics (initial metrics)
   - Activity (audit log)
```

## 🔍 Verification Steps

### After Creating Launchpad:

1. **Check Launchpad Table:**
   ```sql
   SELECT * FROM Launchpad WHERE contractAddress = '0x...';
   ```
   ✅ Should have all basic collection data

2. **Check Metadata Table:**
   ```sql
   SELECT * FROM LaunchpadMetadata WHERE launchpadId = '...';
   ```
   ✅ Should have `image` (IPFS URL) and `bannerImage`

3. **Check Phases Table:**
   ```sql
   SELECT * FROM LaunchpadPhase WHERE launchpadId = '...';
   ```
   ✅ Should have all whitelist + public phases

4. **Check Analytics Table:**
   ```sql
   SELECT * FROM LaunchpadAnalytics WHERE launchpadId = '...';
   ```
   ✅ Should exist with initial values

5. **Check Activity Table:**
   ```sql
   SELECT * FROM Activity WHERE type = 'LAUNCHPAD_CREATED' ORDER BY createdAt DESC LIMIT 1;
   ```
   ✅ Should have creation activity log

## 🎯 API Response Example

```json
{
  "success": true,
  "data": {
    "launchpads": [{
      "id": "...",
      "contractAddress": "0x...",
      "name": "Odds NFT",
      "symbol": "ODDS",
      "description": "...",
      "totalMaxSupply": 10000,
      "metadata": {
        "image": "ipfs://Qm...",        // ✅ Cover image
        "bannerImage": "ipfs://Qm...",  // ✅ Banner image
        "website": "https://..."
      },
      "phases": [                        // ✅ Mint phases
        {
          "name": "GTD Mint",
          "phaseType": "WHITELIST",
          "startTime": "2025-11-03T...",
          "price": "0.001",
          "merkleRoot": "0x..."
        },
        {
          "name": "Public Mint",
          "phaseType": "PUBLIC",
          "startTime": "2025-11-04T...",
          "price": "0.002"
        }
      ]
    }]
  }
}
```

## ✅ Summary

**All data from Creator Studio is now saved to database:**
- ✅ Basic collection info (name, symbol, description, etc.)
- ✅ Cover image & banner image (IPFS URLs)
- ✅ Mint phases (whitelist + public)
- ✅ Metadata (website, socials)
- ✅ Analytics (initial values)
- ✅ Activity log (audit trail)

**Nothing is missing!** 🎉
