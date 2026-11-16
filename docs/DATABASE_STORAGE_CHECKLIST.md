# Database Storage Checklist - Launchpad Creation

## ✅ Data yang Disimpan Saat Create Launchpad

### 1. **Tabel `launchpads`** (Main Data)
```typescript
{
  id: string (cuid)
  chainId: number ✅
  factoryId: string ✅
  contractAddress: string ✅ (unique)
  creator: string ✅
  name: string ✅
  symbol: string ✅
  description: string? ✅
  baseURI: string? ✅
  unrevealedURI: string? ✅
  contractURI: string? ✅
  externalLink: string? ✅
  totalMaxSupply: number ✅
  mintedCount: number (default: 0) ✅
  treasury: string ✅
  royaltyRecipient: string? ✅
  royaltyPercentage: number ✅
  status: LaunchpadStatus (default: ACTIVE) ✅
  volume: Decimal (default: 0) ✅
  lastMintAt: DateTime? ⚠️ (updated on mint)
  deployTxHash: string? ✅
  createdAt: DateTime ✅
  updatedAt: DateTime ✅
}
```

### 2. **Tabel `launchpad_metadata`** (Metadata)
```typescript
{
  id: string (cuid)
  launchpadId: string ✅
  image: string? ⚠️ (needs to be added)
  bannerImage: string? ⚠️ (needs to be added)
  website: string? ✅ (from externalLink)
  twitter: string? ⚠️ (needs to be added)
  discord: string? ⚠️ (needs to be added)
  telegram: string? ⚠️ (needs to be added)
  medium: string? ⚠️ (needs to be added)
  github: string? ⚠️ (needs to be added)
  tags: string[] ⚠️ (needs to be added)
  category: string? ⚠️ (needs to be added)
  featured: boolean (default: false) ✅
  verified: boolean (default: false) ✅
  createdAt: DateTime ✅
  updatedAt: DateTime ✅
}
```

### 3. **Tabel `launchpad_analytics`** (Analytics)
```typescript
{
  id: string (cuid)
  launchpadId: string ✅
  totalVolume: Decimal (default: 0) ✅
  totalMints: number (default: 0) ✅
  uniqueHolders: number (default: 0) ✅
  avgMintPrice: Decimal (default: 0) ✅
  floorPrice: Decimal? ⚠️ (updated later)
  lastSalePrice: Decimal? ⚠️ (updated later)
  views: number (default: 0) ✅
  likes: number (default: 0) ✅
  calculatedAt: DateTime ✅
  createdAt: DateTime ✅
  updatedAt: DateTime ✅
}
```

### 4. **Tabel `activities`** (Activity Log)
```typescript
{
  id: string (cuid)
  chainId: number ✅
  factoryId: string ✅
  launchpadId: string? ⚠️ (not set on creation)
  type: 'LAUNCHPAD_CREATED' ✅
  actor: string (creator) ✅
  description: string ✅
  txHash: string? ✅
  blockNumber: number? ⚠️ (needs to be added)
  metadata: Json ✅ {
    contractAddress: string
    totalMaxSupply: number
  }
  createdAt: DateTime ✅
}
```

### 5. **Tabel `launchpad_phases`** (Mint Phases)
```typescript
⚠️ NOT created automatically on launchpad creation
✅ Created separately via addMintPhase() or during creation with phases

{
  id: string (cuid)
  launchpadId: string
  name: string
  phaseType: PhaseType (PRESALE, PUBLIC, ALLOWLIST, FREE)
  startTime: DateTime
  endTime: DateTime?
  price: string (in wei)
  maxMintPerWallet: number?
  totalLimit: number?
  mintedCount: number (default: 0)
  isActive: boolean (default: true)
  merkleRoot: string?
  createdAt: DateTime
  updatedAt: DateTime
}
```

## ⚠️ Data yang Perlu Ditambahkan

### Missing Fields in Save API:
1. **Social Media Links** (metadata)
   - twitter
   - discord
   - telegram
   - medium
   - github

2. **Images** (metadata)
   - image (collection thumbnail)
   - bannerImage (collection banner)

3. **Categorization** (metadata)
   - tags (array of strings)
   - category (string)

4. **Mint Phases**
   - Should be created during launchpad creation
   - Or added immediately after

## 📊 Data Flow

### Create Launchpad Flow:
```
1. Frontend calls ContractService.createLaunchpad()
   ↓
2. Smart contract deploys NFT collection
   ↓
3. Transaction mined, get contract address
   ↓
4. Frontend calls /api/admin/launchpads/save
   ↓
5. Backend saves to database:
   - launchpads table ✅
   - launchpad_metadata table ✅
   - launchpad_analytics table ✅
   - activities table ✅
   ↓
6. (Optional) Add mint phases
   ↓
7. Launchpad ready for minting
```

### Data Retrieved by API:
```typescript
GET /api/admin/launchpads

Returns:
{
  ...launchpad,
  mintedCount: number,        // from _count.mints
  volume: number,             // from analytics.totalVolume
  mintPrice: number,          // from phases[0].price or analytics.avgMintPrice
  chartData24h: Array<...>,   // from mints table (aggregated)
  volumeChange24h: number,    // calculated from chartData24h
  mintPercentage: number,     // calculated
  isComplete: boolean,        // calculated
  daysSinceCreated: number    // calculated
}
```

## 🔧 Recommendations

### 1. Enhance Save API
Add support for additional metadata fields:

```typescript
// src/app/api/admin/launchpads/save/route.ts
await prisma.launchpadMetadata.create({
  data: {
    launchpadId: launchpad.id,
    image: body.image,           // ADD
    bannerImage: body.bannerImage, // ADD
    website: externalLink,
    twitter: body.twitter,       // ADD
    discord: body.discord,       // ADD
    telegram: body.telegram,     // ADD
    tags: body.tags || [],       // ADD
    category: body.category,     // ADD
    featured: false,
    verified: false
  }
});
```

### 2. Create Phases During Launchpad Creation
```typescript
// After creating launchpad
if (body.phases && body.phases.length > 0) {
  await prisma.launchpadPhase.createMany({
    data: body.phases.map(phase => ({
      launchpadId: launchpad.id,
      name: phase.name,
      phaseType: phase.phaseType,
      startTime: new Date(phase.startTime),
      endTime: phase.endTime ? new Date(phase.endTime) : null,
      price: phase.price,
      maxMintPerWallet: phase.maxMintPerWallet,
      totalLimit: phase.totalLimit,
      isActive: true,
      merkleRoot: phase.merkleRoot
    }))
  });
}
```

### 3. Update Analytics on Mint
```typescript
// When mint occurs, update:
- launchpad.mintedCount
- launchpad.volume
- launchpad.lastMintAt
- analytics.totalVolume
- analytics.totalMints
- analytics.uniqueHolders
- analytics.avgMintPrice
- analytics.lastSalePrice
```

### 4. Add Sync Service
Create a background service to sync blockchain data:
```typescript
// Periodically sync:
- Mint events from blockchain
- Update mintedCount
- Update volume
- Update analytics
- Create mint records in database
```

## ✅ Current Status (UPDATED)

### What's Working:
- ✅ Basic launchpad data saved
- ✅ Metadata entry created (with social media & images)
- ✅ Analytics entry created
- ✅ Activity logged
- ✅ Chart data retrieved from mints
- ✅ Mint price retrieved from phases
- ✅ **NEW: Social media links saved**
- ✅ **NEW: Images (thumbnail & banner) saved**
- ✅ **NEW: Tags and category saved**
- ✅ **NEW: Mint phases created automatically**
- ✅ **NEW: Sync mints API endpoint**
- ✅ **NEW: Real-time mint listener**
- ✅ **NEW: Auto-update analytics on mint**

### What's Complete:
- ✅ All core data fields
- ✅ All metadata fields
- ✅ Automatic phase creation
- ✅ Blockchain sync capability
- ✅ Real-time event listening
- ✅ Analytics auto-update

## 🎯 Completed Actions ✅

1. **High Priority** ✅
   - ✅ Add mint phases creation during launchpad creation
   - ✅ Implement mint event listener/sync
   - ✅ Update analytics on mint

2. **Medium Priority** ✅
   - ✅ Add social media fields to save API
   - ✅ Add image fields to save API
   - ✅ Add tags and categorization

3. **Additional Features** ✅
   - ✅ Real-time mint listener service
   - ✅ Manual sync API endpoint
   - ✅ Listener management API
   - ✅ Auto-update stats on mint

## 📚 New API Endpoints

### 1. Sync Mints (Manual)
```typescript
POST /api/admin/launchpads/sync-mints
Body: {
  launchpadId: string,
  contractAddress: string,
  chainId: number
}
```

### 2. Manage Listeners
```typescript
GET /api/admin/launchpads/listeners
// Returns active listeners

POST /api/admin/launchpads/listeners
Body: {
  action: 'start' | 'stop' | 'start-all' | 'stop-all',
  launchpadId?: string,
  contractAddress?: string,
  chainId?: number
}
```

## 🔧 New Services

### MintListener Service
```typescript
import { getMintListener } from '@/lib/mint-listener';

const listener = getMintListener();

// Start listening for a launchpad
await listener.startListening(launchpadId, contractAddress, chainId);

// Stop listening
await listener.stopListening(contractAddress);

// Stop all
await listener.stopAll();
```
