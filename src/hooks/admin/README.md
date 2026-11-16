# Admin Panel Hooks

Custom React hooks for managing admin panel data fetching and operations.

## Overview

These hooks provide a consistent interface for interacting with the admin API, handling loading states, errors, and data management. All hooks use the centralized `AdminApiClient` for API calls and the error handling utilities for consistent error display.

## Available Hooks

### useAdminStats

Fetches dashboard statistics including total collections, mints, volume, and active launchpads.

```typescript
import { useAdminStats } from '@/hooks/admin';

function Dashboard() {
  const { stats, isLoading, error, refetch } = useAdminStats();
  
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      <StatCard label="Total Collections" value={stats.totalCollections} />
      <StatCard label="Total Mints" value={stats.totalMints} />
      <StatCard label="Total Volume" value={stats.totalVolume} />
      <StatCard label="Active Launchpads" value={stats.activeLaunchpads} />
    </div>
  );
}
```

**Parameters:**
- `chainId?: number` - Optional chain ID to filter stats by chain

**Returns:**
- `stats: AdminStats | null` - Dashboard statistics
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `refetch: () => Promise<void>` - Function to refetch data

### useAdminLaunchpads

Fetches and manages launchpads with filtering, pagination, and status updates.

```typescript
import { useAdminLaunchpads } from '@/hooks/admin';

function CollectionsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    chainId: undefined,
    status: undefined,
    search: '',
  });
  
  const { 
    launchpads, 
    pagination, 
    isLoading, 
    error, 
    refetch, 
    updateStatus 
  } = useAdminLaunchpads(filters);
  
  const handleStatusChange = async (id: string, status: string) => {
    await updateStatus(id, status);
  };
  
  return (
    <div>
      <FilterControls filters={filters} onChange={setFilters} />
      <LaunchpadTable 
        launchpads={launchpads} 
        onStatusChange={handleStatusChange}
      />
      <Pagination pagination={pagination} onChange={setFilters} />
    </div>
  );
}
```

**Parameters:**
- `filters: LaunchpadFilters` - Filter options
  - `chainId?: number` - Filter by chain
  - `status?: string` - Filter by status
  - `search?: string` - Search by name or address
  - `creatorAddress?: string` - Filter by creator
  - `page?: number` - Current page (default: 1)
  - `limit?: number` - Items per page (default: 10)

**Returns:**
- `launchpads: AdminLaunchpad[]` - Array of launchpads
- `pagination: PaginationInfo` - Pagination metadata
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `refetch: () => Promise<void>` - Function to refetch data
- `updateStatus: (id: string, status: string) => Promise<void>` - Function to update launchpad status

### useAdminBanners

Fetches and manages banners with full CRUD operations.

```typescript
import { useAdminBanners } from '@/hooks/admin';

function BannersPage() {
  const { 
    banners, 
    isLoading, 
    error, 
    createBanner, 
    updateBanner, 
    deleteBanner, 
    reorderBanners,
    refetch 
  } = useAdminBanners();
  
  const handleCreate = async (data: BannerInput) => {
    await createBanner(data);
  };
  
  const handleReorder = async (reordered: { id: string; sequence: number }[]) => {
    await reorderBanners(reordered);
  };
  
  return (
    <div>
      <CreateBannerButton onClick={handleCreate} />
      <DraggableBannerList 
        banners={banners} 
        onReorder={handleReorder}
        onUpdate={updateBanner}
        onDelete={deleteBanner}
      />
    </div>
  );
}
```

**Parameters:**
- `status?: string` - Optional status filter

**Returns:**
- `banners: AdminBanner[]` - Array of banners
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `createBanner: (data: BannerInput) => Promise<AdminBanner>` - Create a new banner
- `updateBanner: (id: string, data: Partial<BannerInput>) => Promise<AdminBanner>` - Update a banner
- `deleteBanner: (id: string) => Promise<void>` - Delete a banner
- `reorderBanners: (banners: { id: string; sequence: number }[]) => Promise<void>` - Reorder banners
- `refetch: () => Promise<void>` - Function to refetch data

### useAdminActivity

Fetches recent platform activities with automatic relative time formatting.

```typescript
import { useAdminActivity } from '@/hooks/admin';

function ActivityFeed() {
  const { activities, isLoading, error, refetch } = useAdminActivity(10);
  
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {activities.length === 0 ? (
        <EmptyState message="No recent activities" />
      ) : (
        <ActivityList activities={activities} />
      )}
    </div>
  );
}
```

**Parameters:**
- `limit?: number` - Maximum number of activities to fetch (default: 10)

**Returns:**
- `activities: AdminActivity[]` - Array of activities with formatted timestamps
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `refetch: () => Promise<void>` - Function to refetch data

**Utility Function:**
- `formatRelativeTime(date: Date): string` - Format a date as relative time (e.g., "2 hours ago")

### useAdminSync

Handles sync operations with progress tracking.

```typescript
import { useAdminSync } from '@/hooks/admin';

function SyncButton({ chainId }: { chainId: number }) {
  const { syncProgress, syncLaunchpads } = useAdminSync();
  
  const handleSync = async () => {
    await syncLaunchpads(chainId);
  };
  
  return (
    <div>
      <Button 
        onClick={handleSync} 
        disabled={syncProgress.status === 'syncing'}
      >
        {syncProgress.status === 'syncing' ? 'Syncing...' : 'Sync Launchpads'}
      </Button>
      
      {syncProgress.status === 'syncing' && (
        <ProgressBar 
          progress={syncProgress.progress} 
          total={syncProgress.total}
          message={syncProgress.message}
        />
      )}
    </div>
  );
}
```

**Returns:**
- `syncProgress: SyncProgress` - Current sync progress
  - `status: 'idle' | 'syncing' | 'success' | 'error'` - Sync status
  - `progress: number` - Number of items synced
  - `total: number` - Total items to sync
  - `message: string` - Status message
- `syncLaunchpads: (chainId: number) => Promise<void>` - Sync all launchpads for a chain
- `syncSingleLaunchpad: (contractAddress: string, chainId: number) => Promise<void>` - Sync a single launchpad

## Error Handling

All hooks use the centralized error handling utilities:
- Errors are automatically displayed to users via toast notifications
- Error severity determines the display duration and message
- Retryable errors include a retry suggestion
- All errors are logged to console in development mode

## Loading States

All hooks provide an `isLoading` boolean that indicates when data is being fetched. Use this to display loading skeletons or spinners:

```typescript
if (isLoading) {
  return <LoadingSkeleton />;
}
```

## Refetching Data

All hooks provide a `refetch` function to manually trigger a data refresh:

```typescript
const { data, refetch } = useAdminStats();

// Refetch after an action
const handleAction = async () => {
  await performAction();
  await refetch(); // Refresh the data
};
```

## Best Practices

1. **Use loading states**: Always show loading indicators when `isLoading` is true
2. **Handle errors gracefully**: Display user-friendly error messages
3. **Debounce search inputs**: Use `useDebounce` for search filters to avoid excessive API calls
4. **Optimize re-renders**: Use `useMemo` and `useCallback` when passing callbacks to child components
5. **Cache data**: Consider using React Query or SWR for advanced caching needs

## Requirements Validation

These hooks implement the following requirements:

- **useAdminStats**: Requirements 1.1, 1.2, 1.3, 1.4
- **useAdminLaunchpads**: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
- **useAdminBanners**: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
- **useAdminActivity**: Requirements 7.1, 7.2, 7.3, 7.4
- **useAdminSync**: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
