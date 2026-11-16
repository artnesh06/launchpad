# Design Document

## Overview

This design document outlines the integration of the admin panel with the existing database and API infrastructure. The current admin panel uses mock/placeholder data and needs to be connected to real data sources through Prisma ORM and existing API endpoints. The design focuses on creating reusable React hooks, proper error handling, loading states, and a consistent data flow pattern across all admin pages.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Admin Pages    │
│  (React)        │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐  ┌────▼──────────┐
│  Custom Hooks   │  │  UI Components│
│  (Data Fetching)│  │  (shadcn/ui)  │
└────────┬────────┘  └───────────────┘
         │
┌────────▼────────┐
│  API Routes     │
│  (Next.js)      │
└────────┬────────┘
         │
┌────────▼────────┐
│  Prisma ORM     │
└────────┬────────┘
         │
┌────────▼────────┐
│  PostgreSQL DB  │
└─────────────────┘
```

### Data Flow Pattern

1. **Admin Page Component** renders UI and calls custom hooks
2. **Custom Hooks** (useAdminStats, useAdminLaunchpads, etc.) handle data fetching and state management
3. **API Routes** receive requests, validate, and query database
4. **Prisma ORM** executes database queries
5. **Response** flows back through the chain with proper error handling at each level

## Components and Interfaces

### Custom Hooks

#### useAdminStats Hook
```typescript
interface AdminStats {
  totalCollections: number;
  totalMints: number;
  totalVolume: string;
  activeLaunchpads: number;
  volumeChange?: number;
  mintsChange?: number;
}

interface UseAdminStatsReturn {
  stats: AdminStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useAdminStats(chainId?: number): UseAdminStatsReturn
```

#### useAdminLaunchpads Hook
```typescript
interface LaunchpadFilters {
  chainId?: number;
  status?: string;
  search?: string;
  creatorAddress?: string;
  page?: number;
  limit?: number;
}

interface UseAdminLaunchpadsReturn {
  launchpads: Launchpad[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
}

function useAdminLaunchpads(filters: LaunchpadFilters): UseAdminLaunchpadsReturn
```

#### useAdminBanners Hook
```typescript
interface UseAdminBannersReturn {
  banners: Banner[];
  isLoading: boolean;
  error: Error | null;
  createBanner: (data: BannerInput) => Promise<Banner>;
  updateBanner: (id: string, data: Partial<BannerInput>) => Promise<Banner>;
  deleteBanner: (id: string) => Promise<void>;
  reorderBanners: (banners: { id: string; sequence: number }[]) => Promise<void>;
  refetch: () => Promise<void>;
}

function useAdminBanners(status?: string): UseAdminBannersReturn
```

#### useAdminActivity Hook
```typescript
interface UseAdminActivityReturn {
  activities: Activity[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useAdminActivity(limit?: number): UseAdminActivityReturn
```

#### useAdminSync Hook
```typescript
interface SyncProgress {
  status: 'idle' | 'syncing' | 'success' | 'error';
  progress: number;
  total: number;
  message: string;
}

interface UseAdminSyncReturn {
  syncProgress: SyncProgress;
  syncLaunchpads: (chainId: number) => Promise<void>;
  syncSingleLaunchpad: (contractAddress: string, chainId: number) => Promise<void>;
}

function useAdminSync(): UseAdminSyncReturn
```

### Page Components

#### Dashboard Page
- Displays real-time statistics cards
- Shows recent activity feed
- Provides quick action buttons
- Uses: `useAdminStats`, `useAdminActivity`

#### Collections Page
- Lists all launchpads with pagination
- Provides filtering by chain, status, search
- Shows detailed information per launchpad
- Allows status updates
- Uses: `useAdminLaunchpads`

#### Factory Page
- Displays factory contract information
- Shows template approval status
- Provides sync functionality
- Uses: Custom API calls to factory-info endpoint

#### Banners Page
- Lists all banners with CRUD operations
- Supports drag-and-drop reordering
- Shows banner preview
- Uses: `useAdminBanners`

#### Analytics Page
- Displays volume charts over time
- Shows top collections by volume
- Displays top creators
- Provides export functionality
- Uses: Custom analytics API calls

## Data Models

### Frontend Types

```typescript
// Launchpad with computed fields
interface AdminLaunchpad {
  id: string;
  chainId: number;
  contractAddress: string;
  creator: string;
  name: string;
  symbol: string;
  description?: string;
  totalMaxSupply: number;
  mintedCount: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  volume: number;
  mintPrice: number;
  mintPercentage: number;
  isComplete: boolean;
  daysSinceCreated: number;
  chartData24h: ChartDataPoint[];
  volumeChange24h: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: LaunchpadMetadata;
  analytics?: LaunchpadAnalytics;
  phases?: LaunchpadPhase[];
}

// Banner
interface AdminBanner {
  id: string;
  title: string;
  creator: string;
  network: string;
  image: string;
  thumbnail?: string;
  type: 'IMAGE' | 'VIDEO';
  twitter?: string;
  discord?: string;
  telegram?: string;
  collectionAddress?: string;
  launchpadId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
  launchpad?: {
    name: string;
    contractAddress: string;
  };
}

// Activity
interface AdminActivity {
  id: string;
  chainId: number;
  type: ActivityType;
  actor: string;
  description: string;
  txHash?: string;
  blockNumber?: number;
  metadata?: any;
  createdAt: Date;
}

// Stats
interface AdminStats {
  totalCollections: number;
  totalMints: number;
  totalVolume: string;
  activeLaunchpads: number;
  completedLaunchpads: number;
}

// Factory Info
interface FactoryInfo {
  address: string;
  owner: string;
  treasury: string;
  creationFee: string;
  platformFeePercentage: number;
  freeMintFee: string;
  totalLaunchpads: number;
  isActive: boolean;
  version: string;
}
```

### API Response Formats

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string; // Only in development
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      current: number;
      total: number;
      count: number;
      limit: number;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Dashboard stats API returns all required fields
*For any* dashboard stats API call, the response should contain totalCollections, totalMints, totalVolume, and activeLaunchpads fields with valid numeric values
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Loading states are displayed during data fetching
*For any* component with data fetching, when isLoading is true, loading indicators should be rendered
**Validates: Requirements 1.5, 4.5, 8.4, 10.1**

### Property 3: Launchpads API returns paginated results
*For any* page number and limit parameters, the launchpads API response should include pagination metadata with current, total, count, and limit fields
**Validates: Requirements 2.1**

### Property 4: Launchpad data contains all required fields
*For any* launchpad returned by the API, it should contain contractAddress, creator, chainId, status, mintedCount, totalMaxSupply, and volume fields
**Validates: Requirements 2.2**

### Property 5: Chain filter returns only matching launchpads
*For any* chainId filter parameter, all returned launchpads should have the same chainId
**Validates: Requirements 2.3**

### Property 6: Status filter returns only matching launchpads
*For any* status filter parameter, all returned launchpads should have the same status
**Validates: Requirements 2.4**

### Property 7: Search returns matching launchpads
*For any* search query, all returned launchpads should contain the search term in either name, symbol, or contractAddress (case-insensitive)
**Validates: Requirements 2.5**

### Property 8: Sync operation fetches blockchain data
*For any* chain sync operation, the system should call the factory contract and return a list of launchpad addresses
**Validates: Requirements 3.1**

### Property 9: Sync updates database with blockchain data
*For any* successful sync operation, all launchpads from the blockchain should exist in the database after sync completes
**Validates: Requirements 3.2**

### Property 10: Sync displays progress indicators
*For any* sync operation in progress, the UI should display progress indicators with status 'syncing'
**Validates: Requirements 3.3**

### Property 11: Sync completion shows count
*For any* completed sync operation, the result should include the number of launchpads synced
**Validates: Requirements 3.4**

### Property 12: Sync errors are displayed
*For any* failed sync operation, error messages should be captured and displayed to the user
**Validates: Requirements 3.5**

### Property 13: Factory API returns all required fields
*For any* factory info API call, the response should contain contractAddress, owner, treasury, creationFee, platformFeePercentage, freeMintFee, and totalLaunchpads fields
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 14: Analytics API returns time-series data
*For any* analytics API call, the response should contain volume and mints data with timestamps
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 15: Top collections are sorted by volume
*For any* analytics response, the top collections array should be sorted in descending order by volume
**Validates: Requirements 5.4**

### Property 16: Top creators are sorted by volume
*For any* analytics response, the top creators array should be sorted in descending order by total volume
**Validates: Requirements 5.5**

### Property 17: Banner creation includes all required fields
*For any* banner creation request, the saved banner should contain title, image, status, and sequence fields
**Validates: Requirements 6.2**

### Property 18: Banner updates are persisted
*For any* banner update request, the database record should reflect the updated values
**Validates: Requirements 6.3**

### Property 19: Banner deletion removes from database
*For any* banner deletion request, the banner should no longer exist in the database after deletion
**Validates: Requirements 6.4**

### Property 20: Banner reordering updates sequences
*For any* banner reorder operation, all affected banners should have their sequence numbers updated in the database
**Validates: Requirements 6.5**

### Property 21: Activity data contains all required fields
*For any* activity returned by the API, it should contain type, actor, description, and createdAt fields
**Validates: Requirements 7.1, 7.2**

### Property 22: Activity results are limited
*For any* activity API call with a limit parameter, the response should contain no more than the specified limit of activities
**Validates: Requirements 7.3**

### Property 23: Timestamps are formatted as relative time
*For any* activity timestamp, it should be formatted as relative time (e.g., "2 hours ago", "1 day ago")
**Validates: Requirements 7.4**

### Property 24: CSV export contains all fields
*For any* export operation, the generated CSV should contain all relevant fields for the exported data type
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 25: Launchpad details contain complete information
*For any* launchpad detail view, the data should include metadata, phases, and whitelist information
**Validates: Requirements 9.2**

### Property 26: Status updates are persisted
*For any* launchpad status update, the new status should be saved to the database and reflected in subsequent queries
**Validates: Requirements 9.3**

### Property 27: Mint sync fetches blockchain transactions
*For any* launchpad mint sync operation, the system should fetch mint transactions from the blockchain for that launchpad
**Validates: Requirements 9.4**

### Property 28: Phase data contains all required fields
*For any* phase in a launchpad, it should contain startTime, endTime, price, and maxMintPerWallet fields
**Validates: Requirements 9.5**

### Property 29: API errors display error messages
*For any* failed API request, an error message should be displayed to the user with actionable information
**Validates: Requirements 10.2**

### Property 30: Non-critical errors use toast notifications
*For any* non-critical error, the system should display a toast notification rather than blocking the UI
**Validates: Requirements 10.3**

### Property 31: Critical errors display error boundary
*For any* critical error, the system should display an error boundary component with a retry option
**Validates: Requirements 10.4**

### Property 32: Success operations show confirmation
*For any* successful data update operation, a success confirmation message should be displayed
**Validates: Requirements 10.5**

## Error Handling

### Error Categories

1. **Network Errors**: Failed API requests due to network issues
   - Display: Toast notification with retry button
   - Action: Allow user to retry the request

2. **Validation Errors**: Invalid input data
   - Display: Inline form validation messages
   - Action: Highlight invalid fields and show error messages

3. **Authorization Errors**: Unauthorized access attempts
   - Display: Redirect to login page
   - Action: Clear session and require re-authentication

4. **Database Errors**: Failed database operations
   - Display: Toast notification with error details
   - Action: Log error and suggest contacting support

5. **Blockchain Errors**: Failed blockchain interactions
   - Display: Toast notification with transaction details
   - Action: Provide link to block explorer and retry option

### Error Handling Strategy

```typescript
// Custom error class
class AdminPanelError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AdminPanelError';
  }
}

// Error handler utility
function handleApiError(error: unknown): AdminPanelError {
  if (error instanceof AdminPanelError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Network error
    if (error.message.includes('fetch')) {
      return new AdminPanelError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR',
        'medium',
        true
      );
    }
    
    // Generic error
    return new AdminPanelError(
      error.message,
      'UNKNOWN_ERROR',
      'medium',
      false
    );
  }
  
  return new AdminPanelError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    'medium',
    false
  );
}
```

### Loading States

All data fetching operations should implement loading states:

```typescript
interface LoadingState {
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: Error | null;
}
```

Loading indicators should be displayed using skeleton loaders for better UX:
- **Stats Cards**: Skeleton cards with pulsing animation
- **Tables**: Skeleton rows matching table structure
- **Charts**: Skeleton chart placeholders
- **Forms**: Disabled inputs with loading spinner

## Testing Strategy

### Unit Testing

Unit tests will verify individual components and hooks:

1. **Hook Tests**: Test custom hooks in isolation
   - Mock API responses
   - Test loading states
   - Test error handling
   - Test data transformations

2. **Component Tests**: Test UI components
   - Test rendering with different props
   - Test user interactions
   - Test conditional rendering
   - Test error boundaries

3. **API Route Tests**: Test API endpoints
   - Test request validation
   - Test database queries
   - Test response formatting
   - Test error responses

### Property-Based Testing

Property-based tests will verify correctness properties across many inputs:

1. **Data Validation Properties**: Test that API responses always contain required fields
2. **Filtering Properties**: Test that filters always return matching results
3. **Pagination Properties**: Test that pagination always returns correct page data
4. **Error Handling Properties**: Test that errors are always caught and displayed
5. **State Management Properties**: Test that state updates are always reflected in UI

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **Dashboard Flow**: Load dashboard → Fetch stats → Display data
2. **Collections Flow**: Load collections → Filter → Paginate → View details
3. **Sync Flow**: Trigger sync → Monitor progress → Display results
4. **Banner Management Flow**: Create → Update → Reorder → Delete
5. **Export Flow**: Request export → Generate CSV → Download file

### Testing Tools

- **Unit Tests**: Vitest + React Testing Library
- **Property-Based Tests**: fast-check (JavaScript property testing library)
- **Integration Tests**: Playwright or Cypress
- **API Tests**: Supertest

### Property-Based Testing Configuration

- Each property test should run a minimum of 100 iterations
- Each property test must be tagged with a comment referencing the design document property
- Tag format: `// Feature: admin-panel-integration, Property {number}: {property_text}`

## Implementation Notes

### State Management

Use React hooks and context for state management:
- No global state library needed (Redux, Zustand)
- Use React Query or SWR for server state caching
- Use React Context for shared UI state (theme, sidebar state)

### API Client

Create a centralized API client for consistent error handling:

```typescript
class AdminApiClient {
  private baseUrl = '/api/admin';
  
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new AdminPanelError(
        `API request failed: ${response.statusText}`,
        'API_ERROR',
        'medium',
        true
      );
    }
    
    return response.json();
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new AdminPanelError(
        `API request failed: ${response.statusText}`,
        'API_ERROR',
        'medium',
        true
      );
    }
    
    return response.json();
  }
  
  // Similar methods for PUT, DELETE
}
```

### Performance Considerations

1. **Pagination**: Always paginate large datasets (launchpads, activities)
2. **Caching**: Cache API responses with appropriate TTL
3. **Debouncing**: Debounce search inputs (300ms)
4. **Lazy Loading**: Lazy load heavy components (charts, tables)
5. **Optimistic Updates**: Use optimistic updates for better UX

### Security Considerations

1. **Authentication**: All admin routes require authentication
2. **Authorization**: Verify admin role on every API request
3. **Input Validation**: Validate all user inputs on both client and server
4. **Rate Limiting**: Implement rate limiting on API endpoints
5. **CSRF Protection**: Use CSRF tokens for state-changing operations

### Accessibility

1. **Keyboard Navigation**: All interactive elements must be keyboard accessible
2. **Screen Readers**: Use proper ARIA labels and semantic HTML
3. **Focus Management**: Manage focus for modals and dynamic content
4. **Color Contrast**: Ensure sufficient color contrast (WCAG AA)
5. **Loading States**: Announce loading states to screen readers
