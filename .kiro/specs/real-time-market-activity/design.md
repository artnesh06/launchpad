# Design Document: Real-time Market Activity

## Overview

This design document outlines the architecture and implementation approach for displaying real-time blockchain events in the Market Activity Section. The system will leverage the existing database schema (Activity model), enhance the event listener infrastructure to support multi-chain monitoring, and create new API endpoints to serve activity data to the frontend.

The solution follows a three-tier architecture:
1. **Event Capture Layer**: Enhanced blockchain event listeners that monitor multiple chains
2. **Data Layer**: Database storage using the existing Activity model with chain-specific filtering
3. **Presentation Layer**: React components with polling-based real-time updates

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MarketActivitySection Component                      │   │
│  │  - ActivityColumn (Latest Mint)                       │   │
│  │  - ActivityColumn (Latest Collection)                 │   │
│  │  - Chain Filter Integration                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓ Polling (10s)                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GET /api/activity/recent                            │   │
│  │  - Query params: type, chain, limit                  │   │
│  │  - Returns: Activity[] with formatted data           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Activity Model (Existing)                           │   │
│  │  - type: MINT_OCCURRED | LAUNCHPAD_CREATED           │   │
│  │  - chainId, actor, metadata, txHash                  │   │
│  │  - Relations: Chain, LaunchpadFactory                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↑
┌─────────────────────────────────────────────────────────────┐
│                Event Listener Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Multi-Chain Event Listener Service                  │   │
│  │  - Monitors: Transfer events (mints)                 │   │
│  │  - Monitors: CollectionCreated events                │   │
│  │  - Per-chain RPC connections                         │   │
│  │  - Writes to Activity table                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↑
┌─────────────────────────────────────────────────────────────┐
│                  Blockchain Networks                         │
│  [Intergaze] [Ethereum] [Polygon] [Other Chains...]         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Event Capture**: Blockchain events are emitted → Event listeners detect them → Store in Activity table
2. **Data Retrieval**: Frontend polls API every 10s → API queries Activity table with filters → Returns formatted data
3. **Display**: Frontend receives data → Updates UI smoothly → Shows chain badges and relative timestamps

## Components and Interfaces

### 1. Database Schema (Existing - No Changes Required)

The existing `Activity` model already supports our requirements:

```prisma
model Activity {
  id          String       @id @default(cuid())
  chainId     Int          // ✓ Multi-chain support
  factoryId   String?      // ✓ Links to factory
  launchpadId String?      // ✓ Links to launchpad (for mints)
  type        ActivityType // ✓ MINT_OCCURRED, LAUNCHPAD_CREATED
  actor       String       // ✓ Minter or creator address
  description String       // ✓ Human-readable description
  txHash      String?      // ✓ Transaction hash
  blockNumber Int?         // ✓ Block number
  metadata    Json?        // ✓ Additional data (tokenId, price, etc.)
  createdAt   DateTime     @default(now()) // ✓ Timestamp
  
  chain     Chain             @relation(fields: [chainId], references: [chainId])
  factory   LaunchpadFactory? @relation(fields: [factoryId], references: [id])
}
```

**Metadata JSON Structure**:

For `MINT_OCCURRED` events:
```typescript
{
  tokenId: number;
  quantity: number;
  price: string; // in wei
  collectionName: string;
  collectionSymbol: string;
  collectionImage?: string;
  minterShort: string; // truncated address
}
```

For `LAUNCHPAD_CREATED` events:
```typescript
{
  collectionName: string;
  collectionSymbol: string;
  collectionImage?: string;
  totalSupply: number;
  creatorShort: string; // truncated address
}
```

### 2. Backend API Endpoint

**File**: `src/app/api/activity/recent/route.ts`

```typescript
// GET /api/activity/recent
// Query Parameters:
// - type: 'mint' | 'collection' | 'all' (default: 'all')
// - chain: number | 'all' (default: 'all')
// - limit: number (default: 3, max: 10)

interface ActivityResponse {
  success: boolean;
  data: {
    activities: FormattedActivity[];
  };
  error?: string;
}

interface FormattedActivity {
  id: string;
  type: 'mint' | 'collection';
  name: string; // NFT name or Collection name
  action: string; // "Minted by 0x1234...5678" or "Created by 0x1234...5678"
  time: string; // Relative time: "1m 2s"
  avatar: string; // Image URL
  chainId: number;
  chainName: string;
  chainIcon?: string;
  txHash?: string;
  isFirst?: boolean; // For highlighting most recent
}
```

**Implementation Logic**:
1. Parse and validate query parameters
2. Build Prisma where clause based on filters
3. Query Activity table with relations (chain)
4. Transform data to FormattedActivity format
5. Calculate relative timestamps
6. Mark first item as `isFirst: true`
7. Return JSON response

### 3. Event Listener Service

**File**: `src/lib/blockchain/activity-listener.ts`

```typescript
interface ActivityListenerConfig {
  chainId: number;
  rpcUrl: string;
  factoryAddress: string;
  launchpadAddresses: string[];
}

class ActivityListener {
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;
  private launchpadContracts: Map<string, ethers.Contract>;
  
  constructor(config: ActivityListenerConfig);
  
  // Start listening to all events
  async start(): Promise<void>;
  
  // Stop listening
  async stop(): Promise<void>;
  
  // Listen to CollectionCreated events from factory
  private async listenToCollectionCreated(): Promise<void>;
  
  // Listen to Transfer events (mints) from launchpad contracts
  private async listenToMintEvents(): Promise<void>;
  
  // Store activity in database
  private async storeActivity(activity: ActivityData): Promise<void>;
}
```

**Multi-Chain Listener Manager**:

**File**: `src/lib/blockchain/multi-chain-listener-manager.ts`

```typescript
class MultiChainListenerManager {
  private listeners: Map<number, ActivityListener>;
  
  // Initialize listeners for all active chains
  async initializeAll(): Promise<void>;
  
  // Add listener for a specific chain
  async addChain(chainId: number): Promise<void>;
  
  // Remove listener for a specific chain
  async removeChain(chainId: number): Promise<void>;
  
  // Get status of all listeners
  getStatus(): ListenerStatus[];
}
```

### 4. Frontend Components

**File**: `src/components/market-activity-section.tsx` (Enhanced)

```typescript
interface ActivityItem {
  id: string;
  name: string;
  action: string;
  time: string;
  avatar: string;
  chainId: number;
  chainIcon?: string;
  txHash?: string;
  isFirst?: boolean;
}

interface ActivityColumnProps {
  title: string;
  description: string;
  type: 'mint' | 'collection';
  chainFilter: number | 'all';
}

function ActivityColumn({ title, description, type, chainFilter }: ActivityColumnProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch activities on mount and every 10 seconds
  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, [type, chainFilter]);
  
  async function fetchActivities() {
    // Call API and update state
  }
  
  // Render activities with chain badges
}
```

**New Hook**: `src/hooks/useActivityFeed.ts`

```typescript
interface UseActivityFeedOptions {
  type: 'mint' | 'collection' | 'all';
  chainId?: number | 'all';
  limit?: number;
  pollingInterval?: number; // default: 10000ms
}

function useActivityFeed(options: UseActivityFeedOptions) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Polling logic with error handling and retry
  
  return { activities, loading, error, refetch };
}
```

### 5. Chain Filter Integration

The Market Activity Section will integrate with the existing `ChainSelection` component to filter activities by chain.

**Integration Points**:
1. Read selected chain from global state or context
2. Pass chainId to ActivityColumn components
3. Display chain badge on each activity item
4. Update activities when chain selection changes

## Data Models

### Activity Type Enum (Existing)

```typescript
enum ActivityType {
  MINT_OCCURRED      // For NFT mints
  LAUNCHPAD_CREATED  // For collection creation
  // ... other types
}
```

### Frontend Types

**File**: `src/types/activity.ts`

```typescript
export type ActivityType = 'mint' | 'collection';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  name: string;
  action: string;
  time: string;
  avatar: string;
  chainId: number;
  chainName: string;
  chainIcon?: string;
  txHash?: string;
  isFirst?: boolean;
}

export interface ActivityFeedResponse {
  success: boolean;
  data: {
    activities: ActivityItem[];
  };
  error?: string;
}
```

## Error Handling

### Event Listener Error Handling

1. **RPC Connection Failures**:
   - Implement exponential backoff retry (1s, 2s, 4s, 8s, max 30s)
   - Log errors to console and monitoring service
   - Continue monitoring other chains if one fails
   - Send alert if connection fails for > 5 minutes

2. **Event Processing Errors**:
   - Wrap event handlers in try-catch blocks
   - Log error details (event data, error message, stack trace)
   - Skip failed event and continue processing
   - Store failed events in error queue for manual review

3. **Database Write Failures**:
   - Retry database writes up to 3 times
   - Log failed writes with event data
   - Continue listening even if write fails
   - Alert if write failure rate > 10%

### API Error Handling

1. **Invalid Parameters**:
   - Return 400 Bad Request with clear error message
   - Validate chain ID against supported chains
   - Validate limit parameter (1-10)

2. **Database Query Failures**:
   - Return 500 Internal Server Error
   - Log error details
   - Return empty array with error flag in development

3. **Timeout Handling**:
   - Set query timeout to 5 seconds
   - Return cached data if available
   - Return empty array with timeout flag

### Frontend Error Handling

1. **API Request Failures**:
   - Show cached data if available
   - Retry after 30 seconds
   - Display "Connection issue" message after 3 failed attempts
   - Don't show error to user on first failure

2. **Empty Data**:
   - Display "No recent activity" message
   - Keep polling in background
   - Update immediately when data arrives

3. **Stale Data**:
   - Show timestamp of last successful update
   - Indicate when data is > 1 minute old
   - Continue polling to get fresh data

## Testing Strategy

### Unit Tests

1. **API Endpoint Tests** (`src/app/api/activity/recent/route.test.ts`):
   - Test query parameter validation
   - Test filtering by type (mint, collection, all)
   - Test filtering by chain
   - Test limit parameter
   - Test response format
   - Test error handling

2. **Activity Listener Tests** (`src/lib/blockchain/activity-listener.test.ts`):
   - Mock ethers.js provider and contracts
   - Test event detection and parsing
   - Test database write operations
   - Test error handling and retries
   - Test multi-chain coordination

3. **Frontend Hook Tests** (`src/hooks/useActivityFeed.test.ts`):
   - Test polling behavior
   - Test data transformation
   - Test error handling
   - Test cleanup on unmount

### Integration Tests

1. **End-to-End Activity Flow**:
   - Deploy test contract
   - Emit test events
   - Verify events stored in database
   - Verify API returns correct data
   - Verify frontend displays data

2. **Multi-Chain Testing**:
   - Test with multiple chains configured
   - Verify chain filtering works correctly
   - Verify chain badges display correctly

3. **Real-time Update Testing**:
   - Emit event during polling interval
   - Verify UI updates within expected time
   - Verify no duplicate entries

### Manual Testing Checklist

- [ ] Verify mint events appear in Latest Mint column
- [ ] Verify collection creation events appear in Latest Collection column
- [ ] Verify chain filter updates activities correctly
- [ ] Verify chain badges display on each item
- [ ] Verify relative timestamps update correctly
- [ ] Verify most recent item has green highlight
- [ ] Verify "No recent activity" message when empty
- [ ] Verify polling continues after errors
- [ ] Verify UI doesn't flicker on updates
- [ ] Test on multiple chains simultaneously

## Performance Considerations

### Database Optimization

1. **Indexes**:
   - Add composite index on `(chainId, type, createdAt DESC)` for fast filtering
   - Add index on `createdAt DESC` for recent activity queries
   - Existing indexes on `chainId` and `type` are sufficient

2. **Query Optimization**:
   - Limit queries to last 24 hours of data
   - Use `take` parameter to limit results
   - Include only necessary relations (chain)
   - Cache chain data to avoid repeated joins

### API Performance

1. **Response Time Target**: < 200ms for typical requests
2. **Caching Strategy**:
   - Cache chain metadata (name, icon) in memory
   - Consider Redis cache for activity data (5-10 second TTL)
   - Implement ETag for conditional requests

3. **Rate Limiting**:
   - Limit to 60 requests per minute per IP
   - Return 429 Too Many Requests if exceeded

### Frontend Performance

1. **Polling Optimization**:
   - Use 10-second polling interval (balance between real-time and load)
   - Pause polling when tab is not visible
   - Use AbortController to cancel in-flight requests

2. **Rendering Optimization**:
   - Use React.memo for ActivityItem components
   - Implement smooth transitions for new items
   - Avoid re-rendering entire list on updates

3. **Bundle Size**:
   - Lazy load activity feed components
   - Use dynamic imports for ethers.js utilities

## Security Considerations

1. **API Security**:
   - Validate all input parameters
   - Sanitize data before returning to frontend
   - Implement rate limiting
   - No authentication required (public data)

2. **Event Listener Security**:
   - Validate event data before storing
   - Sanitize addresses and transaction hashes
   - Prevent SQL injection in metadata JSON
   - Use read-only RPC endpoints

3. **Frontend Security**:
   - Sanitize displayed data (addresses, names)
   - Validate image URLs before displaying
   - Use HTTPS for all API requests
   - Implement CSP headers for image sources

## Deployment Considerations

### Environment Variables

```env
# Multi-chain RPC URLs
INTERGAZE_RPC_URL=https://...
ETHEREUM_RPC_URL=https://...
POLYGON_RPC_URL=https://...

# Event listener configuration
ACTIVITY_LISTENER_ENABLED=true
ACTIVITY_LISTENER_POLL_INTERVAL=5000

# API configuration
ACTIVITY_API_CACHE_TTL=10
ACTIVITY_API_RATE_LIMIT=60
```

### Startup Sequence

1. Initialize database connection
2. Load chain configurations from database
3. Start multi-chain listener manager
4. Start API server
5. Health check endpoint confirms all listeners active

### Monitoring

1. **Metrics to Track**:
   - Events processed per chain per minute
   - API response times
   - Database query times
   - Listener connection status
   - Error rates

2. **Alerts**:
   - Listener disconnected for > 5 minutes
   - API error rate > 5%
   - Database write failures > 10%
   - No events received for > 1 hour (per chain)

### Rollback Plan

1. Keep existing mock data as fallback
2. Feature flag to disable real-time updates
3. Ability to switch back to static data
4. Database migration rollback script

## Migration Plan

### Phase 1: Backend Infrastructure (Week 1)
1. Create API endpoint `/api/activity/recent`
2. Implement activity listener service
3. Add database indexes
4. Test with single chain

### Phase 2: Multi-Chain Support (Week 1-2)
1. Implement multi-chain listener manager
2. Add chain filtering to API
3. Test with multiple chains
4. Deploy to staging

### Phase 3: Frontend Integration (Week 2)
1. Create `useActivityFeed` hook
2. Update `MarketActivitySection` component
3. Add chain badges and filtering
4. Test polling and updates

### Phase 4: Testing & Optimization (Week 2-3)
1. Integration testing
2. Performance optimization
3. Error handling refinement
4. Load testing

### Phase 5: Production Deployment (Week 3)
1. Deploy backend changes
2. Start event listeners
3. Deploy frontend changes
4. Monitor and adjust

## Future Enhancements

1. **WebSocket Support**: Replace polling with WebSocket for true real-time updates
2. **Activity Details Modal**: Click on activity item to see full transaction details
3. **Activity History**: View historical activity beyond last 3 items
4. **Activity Notifications**: Browser notifications for specific events
5. **Activity Filters**: Filter by price range, collection, user
6. **Activity Search**: Search activities by address, transaction hash
7. **Activity Analytics**: Charts and statistics for activity trends
