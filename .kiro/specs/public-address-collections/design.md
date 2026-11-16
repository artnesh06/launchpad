# Design Document

## Overview

Fitur ini akan mengubah Creator Studio dari menampilkan semua collection secara global menjadi menampilkan collection per creator address. Implementasi akan memanfaatkan AppKit (Reown) untuk wallet connection dan memfilter data berdasarkan creator address. Halaman collection detail akan dibuat public dengan membedakan antara mode view (public) dan mode edit (authenticated creator only).

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  /create (Protected)          │  /create/[address] (Hybrid) │
│  - Requires wallet connection │  - Public view mode          │
│  - Shows user's collections   │  - Edit mode for creator     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
├─────────────────────────────────────────────────────────────┤
│  /api/admin/launchpads        │  /api/collections/[address] │
│  - Add creatorAddress filter  │  - Public endpoint          │
│  - Existing auth logic        │  - No auth required         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer (Prisma)                   │
│  - Filter by creator field                                   │
│  - No schema changes required                                │
└─────────────────────────────────────────────────────────────┘
```

### Wallet Integration Flow

```
User visits /create
       │
       ▼
Check wallet connection (AppKit)
       │
       ├─── Not Connected ──────► Show "Connect Wallet" prompt
       │
       └─── Connected ──────────► Fetch collections by creator address
                                   │
                                   ▼
                            Display filtered collections
```

## Components and Interfaces

### 1. Modified `/create` Page Component

**File:** `src/app/create/page.tsx`

**Changes:**
- Add wallet connection check using `useAppKitAccount` hook
- Add `creatorAddress` parameter to API calls
- Show wallet connection prompt when not connected
- Update stats to reflect only user's collections

**New State:**
```typescript
const { address, isConnected } = useAppKitAccount();
const [needsWalletConnection, setNeedsWalletConnection] = useState(false);
```

**API Call Update:**
```typescript
// Before
const response = await fetch(`/api/admin/launchpads?${params.toString()}`);

// After
if (address) {
  params.append('creatorAddress', address);
}
const response = await fetch(`/api/admin/launchpads?${params.toString()}`);
```

### 2. New Public Collection Detail Page

**File:** `src/app/collection/[address]/page.tsx` (new)

**Purpose:** Public view of collection details without requiring wallet connection

**Features:**
- Display collection information (read-only)
- Show mint phases and status
- Display mint statistics
- Show "Connect Wallet to Mint" button for visitors
- Redirect to edit page if user is the creator

**Component Structure:**
```typescript
interface PublicCollectionPageProps {
  params: { address: string };
}

export default function PublicCollectionPage({ params }: PublicCollectionPageProps) {
  const { address: walletAddress, isConnected } = useAppKitAccount();
  const [collection, setCollection] = useState<LaunchpadData | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  
  // Fetch collection data from public API
  // Check if connected wallet is creator
  // Render read-only view or show edit option
}
```

### 3. Modified Edit Page Component

**File:** `src/app/create/[address]/page.tsx`

**Changes:**
- Add creator verification
- Show read-only view if user is not creator
- Keep edit functionality for creators only

**Creator Verification:**
```typescript
const { address: walletAddress, isConnected } = useAppKitAccount();
const [isCreator, setIsCreator] = useState(false);

useEffect(() => {
  if (launchpad && walletAddress) {
    setIsCreator(
      launchpad.creator.toLowerCase() === walletAddress.toLowerCase()
    );
  }
}, [launchpad, walletAddress]);
```

### 4. New Public API Endpoint

**File:** `src/app/api/collections/[address]/route.ts` (new)

**Purpose:** Public endpoint to fetch collection data without authentication

**Implementation:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const contractAddress = params.address;
    
    // Query database for collection by contract address
    const launchpad = await prisma.launchpad.findFirst({
      where: {
        contractAddress: {
          equals: contractAddress,
          mode: 'insensitive'
        }
      },
      include: {
        metadata: true,
        analytics: true,
        phases: true,
        _count: { select: { mints: true } }
      }
    });
    
    if (!launchpad) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 });
    }
    
    // Return formatted data
    return NextResponse.json({
      success: true,
      data: formatLaunchpadData(launchpad)
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
```

### 5. Modified Admin API Endpoint

**File:** `src/app/api/admin/launchpads/route.ts`

**Changes:**
- Add `creatorAddress` query parameter support
- Filter results by creator when parameter is provided

**Implementation:**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const creatorAddress = searchParams.get('creatorAddress') || '';
  
  // Build where clause
  const where: any = {};
  
  if (contractAddress) {
    where.contractAddress = contractAddress;
  } else {
    where.chainId = chainId;
  }
  
  // Add creator filter
  if (creatorAddress) {
    where.creator = {
      equals: creatorAddress,
      mode: 'insensitive'
    };
  }
  
  // ... rest of the query logic
}
```

### 6. Wallet Connection Guard Component

**File:** `src/components/wallet-connection-guard.tsx` (new)

**Purpose:** Reusable component to prompt wallet connection

**Implementation:**
```typescript
interface WalletConnectionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WalletConnectionGuard({ 
  children, 
  fallback 
}: WalletConnectionGuardProps) {
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();
  
  if (!isConnected) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-lg text-[#857F94] font-mono">
          Please connect your wallet to view your collections
        </p>
        <button
          onClick={() => open()}
          className="px-6 py-3 bg-[#B392F0] rounded-lg text-black font-bold font-mono hover:bg-[#B392F0]/90"
        >
          Connect Wallet
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
}
```

## Data Models

### Existing Prisma Schema (No Changes Required)

```prisma
model Launchpad {
  id              String   @id @default(cuid())
  contractAddress String   @unique
  creator         String   // This field is used for filtering
  chainId         Int
  name            String
  symbol          String
  description     String?
  totalMaxSupply  Int
  status          String
  createdAt       DateTime @default(now())
  // ... other fields
}
```

**Key Field:** `creator` - Contains the wallet address of the collection creator

## Error Handling

### 1. Wallet Not Connected

**Scenario:** User accesses `/create` without wallet connection

**Handling:**
```typescript
if (!isConnected) {
  return <WalletConnectionGuard />;
}
```

### 2. Collection Not Found

**Scenario:** User accesses non-existent collection

**Handling:**
```typescript
if (!collection) {
  return (
    <div className="text-center py-12">
      <p className="text-xl text-[#857F94] font-mono">Collection not found</p>
      <Link href="/create">
        <button className="mt-4 px-6 py-3 bg-[#B392F0] rounded-lg">
          Back to Collections
        </button>
      </Link>
    </div>
  );
}
```

### 3. Unauthorized Edit Attempt

**Scenario:** Non-creator tries to edit collection

**Handling:**
```typescript
if (isConnected && !isCreator) {
  return (
    <div className="text-center py-12">
      <p className="text-xl text-[#857F94] font-mono">
        You are not the creator of this collection
      </p>
      <p className="text-sm text-[#505052] font-mono mt-2">
        Only the creator can edit collection settings
      </p>
    </div>
  );
}
```

### 4. API Error Handling

**Implementation:**
```typescript
try {
  const response = await fetch(url);
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch data');
  }
  
  return result;
} catch (error) {
  console.error('API Error:', error);
  toast.error(error instanceof Error ? error.message : 'Unknown error');
  return null;
}
```

## Testing Strategy

### 1. Unit Tests

**Components to Test:**
- `WalletConnectionGuard` - wallet connection logic
- API route handlers - filtering and data formatting
- Creator verification logic

**Test Cases:**
```typescript
describe('WalletConnectionGuard', () => {
  it('should show connect prompt when wallet not connected', () => {});
  it('should render children when wallet connected', () => {});
});

describe('Creator Verification', () => {
  it('should identify creator correctly', () => {});
  it('should handle case-insensitive address comparison', () => {});
});
```

### 2. Integration Tests

**Scenarios:**
- User connects wallet and sees their collections
- User switches wallet and sees different collections
- Visitor views public collection page
- Creator edits their collection
- Non-creator attempts to edit collection

### 3. E2E Tests

**User Flows:**
1. Connect wallet → View collections → Edit collection → Save changes
2. Visit public collection page → Connect wallet → Mint NFT
3. Switch wallet → Verify collections update
4. Disconnect wallet → Verify redirect to connection prompt

### 4. Manual Testing Checklist

- [ ] Connect wallet on `/create` page
- [ ] Verify only user's collections are shown
- [ ] Verify stats reflect user's collections only
- [ ] Switch wallet and verify collections update
- [ ] Disconnect wallet and verify connection prompt
- [ ] Access public collection page without wallet
- [ ] Verify all read-only data is displayed
- [ ] Connect wallet as creator and verify edit access
- [ ] Connect wallet as non-creator and verify read-only view
- [ ] Test API endpoints with various parameters
- [ ] Test error scenarios (404, 403, 500)

## Security Considerations

### 1. Address Verification

- Always compare addresses in lowercase to avoid case-sensitivity issues
- Verify wallet signature for sensitive operations (already implemented in contract interactions)

### 2. Public API Rate Limiting

- Consider implementing rate limiting on public endpoints to prevent abuse
- Use caching for frequently accessed collections

### 3. Data Exposure

- Public API should only expose necessary fields
- Sensitive creator information (if any) should be filtered out

### 4. CORS Configuration

- Ensure proper CORS headers for public API endpoints
- Restrict origins if needed for production

## Performance Optimization

### 1. Database Queries

- Add index on `creator` field for faster filtering
```sql
CREATE INDEX idx_launchpad_creator ON Launchpad(creator);
```

### 2. Caching Strategy

- Cache public collection data with short TTL (5 minutes)
- Invalidate cache on collection updates

### 3. Pagination

- Maintain existing pagination for creator's collections
- Implement infinite scroll for better UX (optional)

### 4. Lazy Loading

- Load collection images lazily
- Defer loading of non-critical data (analytics, charts)

## Migration Plan

### Phase 1: Backend Changes
1. Update API endpoint to support `creatorAddress` filter
2. Create new public API endpoint
3. Add database indexes

### Phase 2: Frontend Changes
1. Update `/create` page with wallet connection guard
2. Modify edit page with creator verification
3. Create public collection detail page

### Phase 3: Testing & Deployment
1. Run all tests
2. Deploy to staging environment
3. Perform manual testing
4. Deploy to production

### Rollback Plan

If issues occur:
1. Remove `creatorAddress` filter from API calls (shows all collections again)
2. Revert frontend changes
3. Keep public API endpoint (no harm in having it)
