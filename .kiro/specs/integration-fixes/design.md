# Design Document

## Overview

This design document outlines the technical approach to fix integration issues in the NFT Launchpad platform. The fixes focus on three main areas:
1. Collection detail page data fetching
2. Activity logging verification and fixes
3. Chain selector state synchronization

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Collection Detail Page    │    Creator Studio               │
│  (/collection/[id])        │    (/create/add)                │
│                            │                                  │
│  - Fetch by contractAddress│    - Chain Selector             │
│  - Display collection data │    - Form submission            │
│  - Show mint phases        │    - Activity tracking          │
└──────────────┬─────────────┴──────────────┬─────────────────┘
               │                            │
               ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
├─────────────────────────────────────────────────────────────┤
│  GET /api/admin/launchpads                                   │
│  - Add contractAddress query support                         │
│  - Filter by contractAddress when provided                   │
│                                                              │
│  POST /api/admin/launchpads/save                            │
│  - Verify activity logging                                   │
│  - Ensure activity created after launchpad                   │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer (Prisma)                    │
├─────────────────────────────────────────────────────────────┤
│  Launchpad Table                                             │
│  - Query by contractAddress (unique field)                   │
│  - Include metadata, analytics, phases                       │
│                                                              │
│  Activity Table                                              │
│  - Log LAUNCHPAD_CREATED events                             │
│  - Store metadata JSON                                       │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Collection Detail Page Component

**File:** `src/app/collection/[id]/page.tsx`

**Current Issue:**
- Uses `params.id` as contractAddress but API doesn't support filtering by it
- Falls back to mock data when API doesn't return results

**Design Changes:**

```typescript
// Current (broken)
const response = await fetch(`/api/admin/launchpads?contractAddress=${params.id}`);

// After fix
const response = await fetch(`/api/admin/launchpads?contractAddress=${params.id}`);
// API will now properly support this parameter
```

**Component Flow:**
1. Extract `id` (contractAddress) from URL params
2. Fetch collection data using contractAddress parameter
3. If found, display collection with proper chain name mapping
4. If not found, show "Collection not found" message (remove mock data fallback)
5. Display IPFS images using `ipfsToHttp` utility
6. Show active mint phases with countdown timer

### 2. Launchpads API Endpoint

**File:** `src/app/api/admin/launchpads/route.ts`

**Current Issue:**
- GET endpoint doesn't support `contractAddress` query parameter
- Only supports: chainId, page, limit, search, status, sortBy, sortOrder

**Design Changes:**

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Existing parameters
  const chainId = parseInt(searchParams.get('chainId') || '6343');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  // NEW: Add contractAddress parameter
  const contractAddress = searchParams.get('contractAddress') || '';

  // Build where clause
  const where: any = {};
  
  // NEW: Priority to contractAddress if provided
  if (contractAddress) {
    where.contractAddress = contractAddress;
    // When querying by contractAddress, ignore pagination
    // and return single result
  } else {
    // Existing logic for chainId filtering
    where.chainId = chainId;
  }

  // Rest of existing logic...
}
```

**Query Logic:**
- If `contractAddress` is provided: Query by contractAddress (unique field)
- If only `chainId` is provided: Query by chainId with pagination
- If both provided: Query by both (contractAddress takes priority)

### 3. Activity Logging in Save API

**File:** `src/app/api/admin/launchpads/save/route.ts`

**Current Status:**
- Code already exists to create activity record (line 209-223)
- Need to verify it's working correctly

**Design Verification:**

```typescript
// Existing code (lines 209-223)
await prisma.activity.create({
  data: {
    chainId,
    factoryId: factory.id,
    type: 'LAUNCHPAD_CREATED',
    actor: creator,
    description: `Created launchpad: ${name} (${symbol})`,
    txHash: deployTxHash,
    metadata: {
      contractAddress,
      totalMaxSupply,
      phasesCount: phases?.length || 0
    }
  }
});
```

**Verification Steps:**
1. Ensure activity is only created for NEW launchpads (not updates)
2. Verify factoryId is correctly retrieved
3. Confirm metadata JSON is properly formatted
4. Add error handling to prevent blocking launchpad creation
5. Add console logging for debugging

**Enhanced Error Handling:**

```typescript
// Log activity with error handling
try {
  await prisma.activity.create({
    data: {
      chainId,
      factoryId: factory.id,
      type: 'LAUNCHPAD_CREATED',
      actor: creator,
      description: `Created launchpad: ${name} (${symbol})`,
      txHash: deployTxHash,
      metadata: {
        contractAddress,
        totalMaxSupply,
        phasesCount: phases?.length || 0
      }
    }
  });
  console.log(`✅ Activity logged for launchpad: ${contractAddress}`);
} catch (activityError) {
  console.error('❌ Failed to log activity:', activityError);
  // Don't throw - activity logging should not block launchpad creation
}
```

### 4. Creator Studio Chain Selector

**File:** `src/components/admin/creator-studio.tsx`

**Current Issue:**
- `selectedChainId` state exists but `collectionData.chainId` may not sync
- When user changes chain, collectionData might still have old chainId

**Design Changes:**

```typescript
// Current chain selector
<CustomSelect
  value={selectedChainId.toString()}
  onValueChange={(value) => setSelectedChainId(parseInt(value))}
  options={chainOptions}
  placeholder="Select a blockchain"
/>

// After fix - sync collectionData.chainId
<CustomSelect
  value={selectedChainId.toString()}
  onValueChange={(value) => {
    const newChainId = parseInt(value);
    setSelectedChainId(newChainId);
    // Sync collectionData
    setCollectionData(prev => ({ ...prev, chainId: newChainId }));
  }}
  options={chainOptions}
  placeholder="Select a blockchain"
/>
```

**State Synchronization:**
1. When `selectedChainId` changes, update `collectionData.chainId`
2. When form submits, use `selectedChainId` for deployment
3. Ensure both states are always in sync

## Data Models

### Launchpad Query Response

```typescript
interface LaunchpadResponse {
  success: boolean;
  data: {
    launchpads: Array<{
      id: string;
      chainId: number;
      contractAddress: string;
      creator: string;
      name: string;
      symbol: string;
      description: string;
      totalMaxSupply: number;
      mintedCount: number;
      mintPrice: number;
      status: string;
      metadata: {
        image: string;
        bannerImage: string;
        website: string;
      };
      phases: Array<{
        name: string;
        startTime: Date;
        endTime: Date;
        price: string;
        isActive: boolean;
      }>;
      analytics: {
        totalVolume: number;
        totalMints: number;
        minted24h: number;
      };
    }>;
    pagination: {
      current: number;
      total: number;
      count: number;
      limit: number;
    };
  };
}
```

### Activity Record

```typescript
interface ActivityRecord {
  id: string;
  chainId: number;
  factoryId: string;
  launchpadId?: string;
  type: 'LAUNCHPAD_CREATED';
  actor: string; // Creator wallet address
  description: string; // "Created launchpad: {name} ({symbol})"
  txHash: string; // Deployment transaction hash
  blockNumber?: number;
  metadata: {
    contractAddress: string;
    totalMaxSupply: number;
    phasesCount: number;
  };
  createdAt: Date;
}
```

## Error Handling

### Collection Page Error States

1. **Collection Not Found**
   - Display: "Collection not found" message
   - Action: Show link to browse all collections

2. **API Error**
   - Display: "Failed to load collection data"
   - Action: Show retry button

3. **IPFS Image Load Failure**
   - Display: Fallback placeholder image
   - Action: Continue showing other collection data

### Activity Logging Errors

1. **Activity Creation Fails**
   - Log error to console
   - Continue with launchpad creation (don't block)
   - Return success response to user

2. **Factory Not Found**
   - Create placeholder factory
   - Log warning
   - Continue with activity creation

### Chain Selector Errors

1. **Invalid Chain Selected**
   - Display: Warning message
   - Action: Prevent form submission

2. **Network Switch Fails**
   - Display: Error toast
   - Action: Prompt user to switch manually

## Testing Strategy

### Unit Tests

1. **API Endpoint Tests**
   ```typescript
   describe('GET /api/admin/launchpads', () => {
     it('should filter by contractAddress when provided', async () => {
       const response = await fetch('/api/admin/launchpads?contractAddress=0x123...');
       expect(response.data.launchpads).toHaveLength(1);
       expect(response.data.launchpads[0].contractAddress).toBe('0x123...');
     });

     it('should return empty array when contractAddress not found', async () => {
       const response = await fetch('/api/admin/launchpads?contractAddress=0xInvalid');
       expect(response.data.launchpads).toHaveLength(0);
     });
   });
   ```

2. **Activity Logging Tests**
   ```typescript
   describe('POST /api/admin/launchpads/save', () => {
     it('should create activity record for new launchpad', async () => {
       const response = await saveNewLaunchpad(mockData);
       const activity = await prisma.activity.findFirst({
         where: { txHash: mockData.deployTxHash }
       });
       expect(activity).toBeDefined();
       expect(activity.type).toBe('LAUNCHPAD_CREATED');
     });

     it('should not create duplicate activity for existing launchpad', async () => {
       await saveNewLaunchpad(mockData);
       await saveNewLaunchpad(mockData); // Update
       const activities = await prisma.activity.findMany({
         where: { txHash: mockData.deployTxHash }
       });
       expect(activities).toHaveLength(1);
     });
   });
   ```

3. **Chain Selector Tests**
   ```typescript
   describe('Creator Studio Chain Selector', () => {
     it('should sync collectionData.chainId when selectedChainId changes', () => {
       const { result } = renderHook(() => useCreatorStudio());
       act(() => {
         result.current.setSelectedChainId(8453); // Base
       });
       expect(result.current.collectionData.chainId).toBe(8453);
     });
   });
   ```

### Integration Tests

1. **Collection Page Flow**
   - Navigate to `/collection/0x123...`
   - Verify API called with correct contractAddress
   - Verify collection data displayed
   - Verify IPFS images loaded
   - Verify mint phases shown

2. **Launchpad Creation Flow**
   - Fill Creator Studio form
   - Select different chain
   - Submit form
   - Verify activity logged in database
   - Verify launchpad created with correct chainId

### Manual Testing Checklist

- [ ] Collection page loads with valid contractAddress
- [ ] Collection page shows "not found" for invalid contractAddress
- [ ] IPFS images display correctly
- [ ] Mint phases show correct countdown
- [ ] Chain selector updates collectionData.chainId
- [ ] Activity logged when creating new launchpad
- [ ] No duplicate activities for updates
- [ ] Activity includes correct metadata

## Performance Considerations

### Database Query Optimization

1. **Single Collection Query**
   ```typescript
   // Optimized query with includes
   const launchpad = await prisma.launchpad.findUnique({
     where: { contractAddress },
     include: {
       metadata: true,
       analytics: true,
       phases: {
         where: { isActive: true },
         orderBy: { startTime: 'asc' }
       }
     }
   });
   ```

2. **Index Usage**
   - `contractAddress` is already unique index
   - Query by contractAddress is O(1) lookup
   - No additional indexes needed

### IPFS Image Loading

1. **Lazy Loading**
   - Use Next.js Image component with lazy loading
   - Load images only when in viewport

2. **Caching**
   - Browser caches IPFS gateway responses
   - Use CDN for IPFS gateway (e.g., cloudflare-ipfs.com)

3. **Fallback Strategy**
   ```typescript
   const imageUrl = launchpad.metadata?.image 
     ? (ipfsToHttp(launchpad.metadata.image) || fallbackImage)
     : fallbackImage;
   ```

## Security Considerations

1. **Input Validation**
   - Validate contractAddress format (0x + 40 hex chars)
   - Sanitize all user inputs
   - Prevent SQL injection via Prisma parameterized queries

2. **Activity Logging**
   - Don't log sensitive user data
   - Sanitize metadata before storing
   - Limit metadata size to prevent DoS

3. **Chain Selector**
   - Validate chainId against SUPPORTED_CHAINS
   - Prevent injection of invalid chain configs
   - Verify factory address exists before deployment

## Deployment Strategy

### Phase 1: API Fixes (Low Risk)
1. Add contractAddress parameter support to GET endpoint
2. Deploy to staging
3. Test collection page queries
4. Deploy to production

### Phase 2: Activity Logging Verification (Low Risk)
1. Add enhanced error handling
2. Add console logging
3. Deploy to staging
4. Monitor activity creation
5. Deploy to production

### Phase 3: Chain Selector Fix (Low Risk)
1. Update onValueChange handler
2. Test chain switching
3. Deploy to staging
4. Verify chainId sync
5. Deploy to production

### Rollback Plan
- All changes are additive (no breaking changes)
- Can rollback individual phases independently
- Database schema unchanged (no migrations needed)

## Monitoring and Logging

### Metrics to Track

1. **Collection Page**
   - API response time for contractAddress queries
   - 404 rate (collection not found)
   - IPFS image load success rate

2. **Activity Logging**
   - Activity creation success rate
   - Activity creation errors
   - Duplicate activity attempts

3. **Chain Selector**
   - Chain switch success rate
   - Network switch errors
   - Invalid chain selections

### Log Messages

```typescript
// Collection Page
console.log('✅ Collection loaded:', contractAddress);
console.warn('⚠️ Collection not found:', contractAddress);
console.error('❌ Failed to fetch collection:', error);

// Activity Logging
console.log('✅ Activity logged for launchpad:', contractAddress);
console.error('❌ Failed to log activity:', error);

// Chain Selector
console.log('✅ Chain changed:', { from: oldChainId, to: newChainId });
console.warn('⚠️ Invalid chain selected:', chainId);
```

## Future Enhancements

1. **Collection Page**
   - Add real-time mint updates via WebSocket
   - Cache collection data in localStorage
   - Add social sharing features

2. **Activity Logging**
   - Add activity feed UI for users
   - Add activity filtering and search
   - Add activity export functionality

3. **Chain Selector**
   - Add chain icons/logos
   - Show gas prices for each chain
   - Add "recommended chain" indicator
