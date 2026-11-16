# Design Document

## Overview

This design document outlines the implementation of NFT collection and individual NFT detail pages for the launchpad platform. The feature provides users with comprehensive views of NFT collections and individual tokens, leveraging Alchemy's NFT API for data retrieval while maintaining consistency with the platform's existing design system.

The implementation consists of two main pages:
1. **Collection Page** (`/collection/[address]`) - Displays all NFTs within a collection with filtering, search, and pagination
2. **NFT Detail Page** (`/nft/[address]/[tokenid]`) - Shows detailed information about a specific NFT including metadata, attributes, ownership, and rarity

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Collection Page  │         │ NFT Detail Page  │         │
│  │  /collection/    │         │  /nft/[address]/ │         │
│  │   [address]      │         │    [tokenid]     │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes Layer                        │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ /api/nft/        │         │ /api/collections/│         │
│  │  collection/     │         │   [address]      │         │
│  │  [address]       │         │                  │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────────────────────────────────────────┐           │
│  │         AlchemyNFTService                    │           │
│  │  - getNFTsForContract()                      │           │
│  │  - getNFTMetadata()                          │           │
│  │  - getContractMetadata()                     │           │
│  │  - computeRarity()                           │           │
│  │  - summarizeNFTAttributes()                  │           │
│  └──────────────────┬───────────────────────────┘           │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────┐           │
│  │         Database Service (Prisma)            │           │
│  │  - Fetch launchpad collection data           │           │
│  │  - Fetch mint phases                         │           │
│  │  - Fetch analytics                           │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Alchemy API     │         │  Prisma Database │         │
│  │  - NFT Metadata  │         │  - Launchpads    │         │
│  │  - Ownership     │         │  - Mint Phases   │         │
│  │  - Rarity        │         │  - Analytics     │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Collection Page Load**:
   - User navigates to `/collection/[address]`
   - Page fetches collection metadata from Alchemy API
   - Page fetches launchpad data from database (if exists)
   - Page fetches NFTs using `getNFTsForContract` with pagination
   - NFTs are rendered in grid layout with filters

2. **NFT Detail Page Load**:
   - User navigates to `/nft/[address]/[tokenid]`
   - Page fetches NFT metadata from Alchemy API
   - Page fetches ownership information
   - Page fetches rarity data (if available)
   - Page fetches collection metadata for context
   - All data is rendered in detail view

3. **Filter/Search Operations**:
   - User applies filters or search
   - Client-side filtering for attributes
   - Re-fetch from API for pagination
   - Update URL query parameters

## Components and Interfaces

### Page Components

#### 1. CollectionPage Component
**Location**: `src/app/(package)/collection/[address]/page.tsx`

**Props**:
```typescript
interface CollectionPageProps {
  params: Promise<{
    address: string;
  }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    attributes?: string; // JSON stringified attribute filters
  }>;
}
```

**State**:
```typescript
interface CollectionPageState {
  collection: ContractMetadata | null;
  nfts: NFTMetadata[];
  launchpadData: LaunchpadData | null;
  loading: boolean;
  error: string | null;
  pageKey: string | undefined;
  filters: AttributeFilters;
  searchQuery: string;
}
```

**Key Methods**:
- `fetchCollectionData()` - Fetch collection metadata and launchpad data
- `fetchNFTs()` - Fetch NFTs with pagination
- `applyFilters()` - Apply attribute filters
- `handleSearch()` - Handle search input
- `loadMore()` - Load next page of NFTs

#### 2. NFTDetailPage Component
**Location**: `src/app/(package)/nft/[address]/[tokenid]/page.tsx`

**Props**:
```typescript
interface NFTDetailPageProps {
  params: Promise<{
    address: string;
    tokenid: string;
  }>;
}
```

**State**:
```typescript
interface NFTDetailPageState {
  nft: NFTMetadata | null;
  collection: ContractMetadata | null;
  owners: string[];
  rarity: NFTRarity | null;
  loading: boolean;
  error: string | null;
}
```

**Key Methods**:
- `fetchNFTData()` - Fetch NFT metadata
- `fetchOwnership()` - Fetch current owners
- `fetchRarity()` - Fetch rarity information
- `fetchCollectionContext()` - Fetch collection metadata

### UI Components

#### 1. NFTGrid Component
**Location**: `src/components/nft-grid.tsx`

Displays NFTs in a responsive grid layout.

**Props**:
```typescript
interface NFTGridProps {
  nfts: NFTMetadata[];
  loading?: boolean;
  onNFTClick: (nft: NFTMetadata) => void;
}
```

#### 2. NFTCard Component
**Location**: `src/components/nft-card.tsx`

Individual NFT card in the grid.

**Props**:
```typescript
interface NFTCardProps {
  nft: NFTMetadata;
  onClick: () => void;
}
```

#### 3. CollectionHeader Component
**Location**: `src/components/collection-header.tsx`

Collection banner and metadata display.

**Props**:
```typescript
interface CollectionHeaderProps {
  collection: ContractMetadata;
  launchpadData?: LaunchpadData | null;
  stats: {
    totalSupply: number;
    mintedCount: number;
    mintPercentage: number;
  };
}
```

#### 4. NFTAttributes Component
**Location**: `src/components/nft-attributes.tsx`

Display NFT attributes/traits.

**Props**:
```typescript
interface NFTAttributesProps {
  attributes: Array<{
    trait_type: string;
    value: string;
    prevalence?: number;
  }>;
}
```

#### 5. AttributeFilters Component
**Location**: `src/components/attribute-filters.tsx`

Filter panel for NFT attributes.

**Props**:
```typescript
interface AttributeFiltersProps {
  attributes: AttributeSummary;
  selectedFilters: AttributeFilters;
  onFilterChange: (filters: AttributeFilters) => void;
}
```

#### 6. MintPhaseDisplay Component
**Location**: `src/components/mint-phase-display.tsx`

Display mint phases for launchpad collections.

**Props**:
```typescript
interface MintPhaseDisplayProps {
  phases: MintPhase[];
  currentPhase?: MintPhase;
}
```

#### 7. RarityDisplay Component
**Location**: `src/components/rarity-display.tsx`

Display rarity information for NFTs.

**Props**:
```typescript
interface RarityDisplayProps {
  rarity: NFTRarity;
  totalSupply: number;
}
```

### API Routes

#### 1. GET /api/nft/collection/[address]
Fetch collection NFTs with pagination and metadata.

**Query Parameters**:
```typescript
interface CollectionNFTsQuery {
  pageKey?: string;
  pageSize?: number;
  withMetadata?: boolean;
}
```

**Response**:
```typescript
interface CollectionNFTsResponse {
  success: boolean;
  data?: {
    nfts: NFTMetadata[];
    pageKey?: string;
    collection: ContractMetadata;
    launchpadData?: LaunchpadData;
  };
  error?: string;
}
```

#### 2. GET /api/nft/[address]/[tokenid]
Fetch individual NFT metadata and details.

**Response**:
```typescript
interface NFTDetailResponse {
  success: boolean;
  data?: {
    nft: NFTMetadata;
    collection: ContractMetadata;
    owners: string[];
    rarity?: NFTRarity;
  };
  error?: string;
}
```

#### 3. GET /api/nft/collection/[address]/attributes
Fetch attribute summary for collection.

**Response**:
```typescript
interface AttributeSummaryResponse {
  success: boolean;
  data?: AttributeSummary;
  error?: string;
}
```

## Data Models

### NFT Metadata Model
```typescript
interface NFTMetadata {
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType?: NFTTokenType;
  };
  tokenId: string;
  tokenType?: NFTTokenType;
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    contentType?: string;
    size?: number;
    originalUrl?: string;
  };
  raw?: {
    metadata?: {
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
      [key: string]: any;
    };
    tokenUri?: string;
  };
  tokenUri?: string;
  timeLastUpdated?: string;
}
```

### Collection Metadata Model
```typescript
interface ContractMetadata {
  address: string;
  name?: string;
  symbol?: string;
  totalSupply?: string;
  tokenType?: NFTTokenType;
  contractDeployer?: string;
  deployedBlockNumber?: number;
  openSeaMetadata?: {
    floorPrice?: number;
    collectionName?: string;
    collectionSlug?: string;
    safelistRequestStatus?: string;
    imageUrl?: string;
    description?: string;
    externalUrl?: string;
    twitterUsername?: string;
    discordUrl?: string;
    bannerImageUrl?: string;
    lastIngestedAt?: string;
  };
}
```

### Launchpad Data Model
```typescript
interface LaunchpadData {
  id: string;
  contractAddress: string;
  creator: string;
  name: string;
  symbol: string;
  description?: string;
  totalMaxSupply: number;
  mintedCount: number;
  volume: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  chainId: number;
  treasury?: string;
  royaltyRecipient?: string;
  royaltyPercentage?: number;
  metadata?: {
    image?: string;
    bannerImage?: string;
  };
  phases?: MintPhase[];
}
```

### Attribute Filters Model
```typescript
interface AttributeFilters {
  [traitType: string]: string[]; // trait type -> selected values
}
```

### NFT Rarity Model
```typescript
interface NFTRarity {
  strategyId: string;
  strategyVersion: string;
  rank: number;
  score: number;
  maxRank: number;
  totalSupply: number;
  rarityScore: number;
  prevalence: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable properties from the prework analysis, I've identified the following consolidations to eliminate redundancy:

**Consolidations:**
1. Properties 1.2, 1.3, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 9.1, 9.4 all test that specific information is displayed - these can be consolidated into comprehensive "required information display" properties
2. Properties 5.3 and 5.4 test filter application and clearing - these are inverse operations that can be combined into a single round-trip property
3. Properties 10.2, 10.3, 10.4 all test rarity information display - these can be consolidated into one comprehensive rarity display property

**Final Property Set:**
After consolidation, we have 25 unique properties that provide comprehensive validation coverage without redundancy.

### Correctness Properties

Property 1: Collection NFT fetching
*For any* valid contract address, navigating to `/collection/[address]` should trigger an API call to fetch NFTs from Alchemy for that contract
**Validates: Requirements 1.1**

Property 2: Collection metadata display completeness
*For any* collection with metadata, the collection page should display all required fields: name, description, banner image, and thumbnail image
**Validates: Requirements 1.2**

Property 3: NFT grid structure
*For any* list of NFTs, each NFT rendered in the grid should contain a thumbnail image, token ID, and name
**Validates: Requirements 1.3**

Property 4: Pagination trigger
*For any* collection where total NFTs exceed page size, the system should implement pagination using Alchemy's pageKey mechanism
**Validates: Requirements 1.4**

Property 5: IPFS URL transformation
*For any* IPFS URL in NFT metadata, the system should convert it to an HTTP gateway URL before display
**Validates: Requirements 1.5**

Property 6: NFT detail fetching
*For any* valid contract address and token ID combination, navigating to `/nft/[address]/[tokenid]` should trigger an API call to fetch that NFT's metadata
**Validates: Requirements 2.1**

Property 7: NFT detail information completeness
*For any* NFT with metadata, the detail page should display the NFT image, name, description, and all attributes
**Validates: Requirements 2.2, 2.5**

Property 8: Ownership information display
*For any* NFT, the detail page should display the current owner address
**Validates: Requirements 2.3**

Property 9: Collection context display
*For any* NFT, the detail page should display the collection name and contract address
**Validates: Requirements 2.4**

Property 10: Collection statistics display
*For any* collection, the collection page should display total supply and minted count statistics
**Validates: Requirements 3.1**

Property 11: Mint progress calculation
*For any* collection with total supply and minted count, the displayed mint percentage should equal (mintedCount / totalSupply) * 100
**Validates: Requirements 3.2**

Property 12: Mint phase information display
*For any* launchpad collection with mint phases, the collection page should display all active phases with their start times, end times, and prices
**Validates: Requirements 3.3, 9.1, 9.4**

Property 13: Address display with copy functionality
*For any* collection, the collection page should display creator and contract addresses with functional copy buttons
**Validates: Requirements 3.4**

Property 14: Social links conditional display
*For any* collection with social links in metadata, those links should be displayed as clickable icons; collections without social links should not show empty social sections
**Validates: Requirements 3.5**

Property 15: Banner image positioning
*For any* collection page, if a banner image exists, it should be positioned at the top of the page
**Validates: Requirements 4.2**

Property 16: Attribute filter generation
*For any* collection with NFT attributes, the system should generate filter options for each unique attribute type found in the collection
**Validates: Requirements 5.2**

Property 17: Filter application and clearing round-trip
*For any* collection, applying filters then clearing them should result in displaying the same set of NFTs as the initial unfiltered state
**Validates: Requirements 5.3, 5.4**

Property 18: Filter state URL synchronization
*For any* applied filters, the URL query parameters should reflect those filters, and reloading the page should restore the same filter state
**Validates: Requirements 5.5**

Property 19: Loading indicator display
*For any* async data fetch operation, a loading indicator should be visible until the operation completes
**Validates: Requirements 6.1**

Property 20: Error handling with retry
*For any* failed API request, the system should display an error message and provide retry functionality
**Validates: Requirements 6.2**

Property 21: Invalid address error handling
*For any* invalid contract address, the system should display a user-friendly error message instead of crashing
**Validates: Requirements 6.3**

Property 22: NFT card navigation
*For any* NFT displayed in the collection grid, clicking it should navigate to that NFT's detail page at `/nft/[address]/[tokenid]`
**Validates: Requirements 7.2**

Property 23: Adjacent NFT navigation
*For any* NFT in a collection (except first and last), the detail page should provide navigation to the previous and next NFTs in the collection
**Validates: Requirements 7.3**

Property 24: Scroll position preservation
*For any* navigation from collection page to NFT detail and back, the scroll position on the collection page should be preserved
**Validates: Requirements 7.5**

Property 25: Launchpad data merging
*For any* collection that exists in both the launchpad database and Alchemy API, the displayed data should be a merge of both sources with database data taking precedence for launchpad-specific fields
**Validates: Requirements 9.5**

Property 26: Countdown timer display
*For any* upcoming mint phase, the system should display a countdown timer showing time remaining until the phase starts
**Validates: Requirements 9.3**

Property 27: Rarity information display
*For any* NFT with available rarity data, the detail page should display the rank, rarity score, and percentile
**Validates: Requirements 10.1, 10.2, 10.3**

Property 28: Attribute prevalence display
*For any* NFT attribute with prevalence data, the system should display the prevalence percentage alongside the trait value
**Validates: Requirements 10.4**

## Error Handling

### Error Categories

1. **Network Errors**
   - Alchemy API unavailable
   - Timeout errors
   - Rate limiting

2. **Data Errors**
   - Invalid contract address
   - NFT not found
   - Missing metadata

3. **Client Errors**
   - Invalid URL parameters
   - Malformed filter queries
   - Browser compatibility issues

### Error Handling Strategy

```typescript
interface ErrorState {
  type: 'network' | 'data' | 'client';
  message: string;
  retryable: boolean;
  details?: string;
}

function handleError(error: unknown): ErrorState {
  if (isNetworkError(error)) {
    return {
      type: 'network',
      message: 'Unable to connect to NFT data service',
      retryable: true,
      details: 'Please check your connection and try again'
    };
  }
  
  if (isDataError(error)) {
    return {
      type: 'data',
      message: 'NFT or collection not found',
      retryable: false,
      details: 'Please verify the contract address and token ID'
    };
  }
  
  return {
    type: 'client',
    message: 'An unexpected error occurred',
    retryable: true,
    details: 'Please refresh the page'
  };
}
```

### Retry Logic

- Network errors: Exponential backoff with max 3 retries
- Rate limiting: Respect Retry-After header
- User-initiated retries: Immediate retry with loading state

### Fallback Behavior

- Missing images: Display placeholder with collection/NFT initials
- Missing metadata: Show available data with "incomplete metadata" notice
- Missing rarity: Hide rarity section gracefully
- Empty collections: Show "No NFTs found" message with helpful text

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

1. **Component Rendering Tests**
   - NFTCard renders with valid metadata
   - NFTCard handles missing image
   - CollectionHeader renders with complete data
   - CollectionHeader handles missing banner
   - AttributeFilters renders filter options
   - MintPhaseDisplay shows active phases

2. **Utility Function Tests**
   - `ipfsToHttp` converts IPFS URLs correctly
   - `calculateMintPercentage` returns correct percentage
   - `formatAddress` truncates addresses properly
   - `parseAttributeFilters` handles URL params correctly

3. **API Route Tests**
   - Collection API returns correct data structure
   - NFT detail API handles invalid token IDs
   - Attribute summary API aggregates correctly

4. **Error Handling Tests**
   - Invalid address shows error message
   - Network failure triggers retry UI
   - Missing NFT shows not found page

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** library for TypeScript/JavaScript.

**Configuration**: Each property test should run a minimum of 100 iterations.

**Test Tagging**: Each property-based test must include a comment with this exact format:
```typescript
// **Feature: nft-collection-pages, Property {number}: {property_text}**
```

**Property Test Implementation**:

1. **Property 5: IPFS URL Transformation**
```typescript
// **Feature: nft-collection-pages, Property 5: IPFS URL transformation**
fc.assert(
  fc.property(
    fc.string().filter(s => s.startsWith('ipfs://')),
    (ipfsUrl) => {
      const httpUrl = ipfsToHttp(ipfsUrl);
      return httpUrl.startsWith('http://') || httpUrl.startsWith('https://');
    }
  ),
  { numRuns: 100 }
);
```

2. **Property 11: Mint Progress Calculation**
```typescript
// **Feature: nft-collection-pages, Property 11: Mint progress calculation**
fc.assert(
  fc.property(
    fc.nat(10000), // totalSupply
    fc.nat(), // mintedCount
    (totalSupply, mintedCount) => {
      fc.pre(totalSupply > 0 && mintedCount <= totalSupply);
      const percentage = calculateMintPercentage(mintedCount, totalSupply);
      const expected = (mintedCount / totalSupply) * 100;
      return Math.abs(percentage - expected) < 0.01;
    }
  ),
  { numRuns: 100 }
);
```

3. **Property 17: Filter Round-Trip**
```typescript
// **Feature: nft-collection-pages, Property 17: Filter application and clearing round-trip**
fc.assert(
  fc.property(
    fc.array(generateNFTMetadata()), // collection of NFTs
    fc.dictionary(fc.string(), fc.array(fc.string())), // filters
    (nfts, filters) => {
      const initialNFTs = nfts;
      const filteredNFTs = applyFilters(nfts, filters);
      const clearedNFTs = applyFilters(nfts, {});
      return JSON.stringify(initialNFTs) === JSON.stringify(clearedNFTs);
    }
  ),
  { numRuns: 100 }
);
```

4. **Property 18: Filter State URL Synchronization**
```typescript
// **Feature: nft-collection-pages, Property 18: Filter state URL synchronization**
fc.assert(
  fc.property(
    fc.dictionary(fc.string(), fc.array(fc.string())),
    (filters) => {
      const url = filtersToURL(filters);
      const parsedFilters = urlToFilters(url);
      return JSON.stringify(filters) === JSON.stringify(parsedFilters);
    }
  ),
  { numRuns: 100 }
);
```

5. **Property 25: Launchpad Data Merging**
```typescript
// **Feature: nft-collection-pages, Property 25: Launchpad data merging**
fc.assert(
  fc.property(
    generateAlchemyData(),
    generateLaunchpadData(),
    (alchemyData, launchpadData) => {
      const merged = mergeLaunchpadData(alchemyData, launchpadData);
      // Launchpad-specific fields should come from launchpad data
      return merged.phases === launchpadData.phases &&
             merged.mintedCount === launchpadData.mintedCount &&
             // Alchemy fields should be preserved
             merged.contractAddress === alchemyData.address;
    }
  ),
  { numRuns: 100 }
);
```

### Integration Testing

Integration tests will verify end-to-end flows:

1. **Collection Page Flow**
   - Navigate to collection page
   - Verify NFTs load and display
   - Apply filters and verify results
   - Click NFT and verify navigation

2. **NFT Detail Flow**
   - Navigate to NFT detail page
   - Verify all data sections load
   - Click collection name and verify navigation back
   - Navigate to adjacent NFTs

3. **Launchpad Integration Flow**
   - Load launchpad collection
   - Verify database and API data merge
   - Verify mint phases display
   - Verify countdown timers work

### Test Data Generators

For property-based testing, we need generators for:

```typescript
// Generate random NFT metadata
function generateNFTMetadata(): fc.Arbitrary<NFTMetadata> {
  return fc.record({
    contract: fc.record({
      address: fc.hexaString({ minLength: 40, maxLength: 40 }),
      name: fc.string(),
      symbol: fc.string(),
    }),
    tokenId: fc.nat().map(String),
    name: fc.string(),
    description: fc.option(fc.string()),
    image: fc.option(fc.record({
      cachedUrl: fc.webUrl(),
      thumbnailUrl: fc.webUrl(),
    })),
    raw: fc.option(fc.record({
      metadata: fc.record({
        attributes: fc.array(fc.record({
          trait_type: fc.string(),
          value: fc.oneof(fc.string(), fc.nat()),
        })),
      }),
    })),
  });
}

// Generate random collection metadata
function generateCollectionMetadata(): fc.Arbitrary<ContractMetadata> {
  return fc.record({
    address: fc.hexaString({ minLength: 40, maxLength: 40 }),
    name: fc.string(),
    symbol: fc.string(),
    totalSupply: fc.nat().map(String),
    openSeaMetadata: fc.option(fc.record({
      bannerImageUrl: fc.webUrl(),
      imageUrl: fc.webUrl(),
      description: fc.string(),
    })),
  });
}

// Generate random launchpad data
function generateLaunchpadData(): fc.Arbitrary<LaunchpadData> {
  return fc.record({
    id: fc.uuid(),
    contractAddress: fc.hexaString({ minLength: 40, maxLength: 40 }),
    name: fc.string(),
    totalMaxSupply: fc.nat(10000),
    mintedCount: fc.nat(10000),
    phases: fc.array(generateMintPhase()),
  });
}
```

## Implementation Notes

### Performance Considerations

1. **Pagination**: Implement virtual scrolling for large collections (>1000 NFTs)
2. **Image Loading**: Use lazy loading for NFT images with intersection observer
3. **Caching**: Cache Alchemy API responses in memory for 5 minutes
4. **Debouncing**: Debounce search input by 300ms to reduce API calls

### Accessibility

1. **Keyboard Navigation**: All interactive elements must be keyboard accessible
2. **Screen Readers**: Provide aria-labels for images and interactive elements
3. **Focus Management**: Maintain logical focus order through the page
4. **Color Contrast**: Ensure all text meets WCAG AA standards

### Mobile Responsiveness

1. **Grid Layout**: Responsive grid (1 column mobile, 2 tablet, 4 desktop)
2. **Touch Targets**: Minimum 44x44px touch targets for mobile
3. **Image Optimization**: Serve appropriately sized images for device
4. **Filter UI**: Collapsible filter panel on mobile

### SEO Considerations

1. **Meta Tags**: Dynamic meta tags with collection/NFT information
2. **Open Graph**: OG tags for social media sharing
3. **Structured Data**: JSON-LD schema for NFT collections
4. **Server-Side Rendering**: Use Next.js SSR for initial page load

## Dependencies

### External Libraries

- **fast-check**: Property-based testing library (^3.15.0)
- **@tanstack/react-query**: Data fetching and caching (^5.0.0)
- **react-intersection-observer**: Lazy loading images (^9.5.0)
- **date-fns**: Date formatting for mint phases (^3.0.0)

### Internal Dependencies

- **AlchemyNFTService**: Existing service for Alchemy API calls
- **ipfsToHttp**: Existing utility for IPFS URL conversion
- **Prisma**: Database access for launchpad data
- **UI Components**: Existing component library (Avatar, Button, Card, etc.)

### API Dependencies

- **Alchemy NFT API**: Primary data source for NFT metadata
- **Launchpad Database**: Secondary data source for launchpad-specific information
- **IPFS Gateway**: Image hosting and retrieval

## Deployment Considerations

### Environment Variables

```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_api_key
NEXT_PUBLIC_ALCHEMY_NETWORK=eth-mainnet
NEXT_PUBLIC_IPFS_GATEWAY=https://eu.orbitor.dev
DATABASE_URL=postgresql://...
```

### Build Configuration

- Enable Next.js image optimization for external domains (Alchemy, IPFS)
- Configure API route caching headers
- Set up error tracking (Sentry integration)

### Monitoring

- Track Alchemy API usage and rate limits
- Monitor page load times for collection pages
- Track error rates for different error types
- Monitor image load success rates
