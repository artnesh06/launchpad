# Admin Panel Utilities

This directory contains shared utilities and types for the admin panel integration.

## Overview

The admin panel utilities provide a centralized way to handle API calls, error handling, and data types across all admin pages.

## Files

### `admin-api-client.ts`
Centralized API client for making HTTP requests to admin endpoints.

**Features:**
- Consistent error handling across all API calls
- Automatic query parameter building
- Support for GET, POST, PUT, PATCH, DELETE methods
- Credential handling for authentication
- Detailed error codes and severity levels

**Usage:**
```typescript
import { adminApiClient } from '@/lib/admin';

// GET request
const stats = await adminApiClient.get<AdminStats>('/stats');

// POST request
const banner = await adminApiClient.post<AdminBanner>('/banners', {
  title: 'New Banner',
  image: 'https://example.com/image.jpg',
});

// PUT request
const updated = await adminApiClient.put<AdminBanner>('/banners/123', {
  title: 'Updated Banner',
});

// DELETE request
await adminApiClient.delete('/banners/123');
```

### `admin-error-handler.ts`
Utilities for handling and displaying errors in the admin panel.

**Features:**
- Error severity levels (low, medium, high)
- Automatic toast notifications based on severity
- Retry logic with exponential backoff
- Error formatting for logging
- Success and info message helpers

**Usage:**
```typescript
import { 
  displayError, 
  displaySuccess, 
  displayLoading,
  retryWithBackoff,
  withErrorHandling 
} from '@/lib/admin';

// Display error
try {
  await someOperation();
} catch (error) {
  displayError(error);
}

// Display success
displaySuccess('Banner created successfully');

// Display loading with promise
displayLoading(
  createBanner(data),
  {
    loading: 'Creating banner...',
    success: 'Banner created!',
    error: 'Failed to create banner',
  }
);

// Retry with backoff
const result = await retryWithBackoff(
  () => adminApiClient.get('/stats'),
  3, // max retries
  1000 // initial delay in ms
);

// Wrap function with error handling
const createBannerWithHandling = withErrorHandling(
  createBanner,
  {
    showError: true,
    showSuccess: true,
    successMessage: 'Banner created successfully',
  }
);
```

### `admin-types.ts` (in `src/types/`)
TypeScript interfaces and types for admin data models.

**Includes:**
- `AdminLaunchpad` - Launchpad with computed fields
- `AdminBanner` - Banner data model
- `AdminActivity` - Activity feed item
- `AdminStats` - Dashboard statistics
- `FactoryInfo` - Factory contract information
- `AnalyticsData` - Analytics data structures
- `LaunchpadFilters` - Filter options for launchpads
- `PaginationInfo` - Pagination metadata
- `ApiResponse` - Standard API response format
- `PaginatedResponse` - Paginated API response format
- `SyncProgress` - Sync operation progress
- And more...

**Usage:**
```typescript
import type { AdminLaunchpad, AdminStats, LaunchpadFilters } from '@/types/admin';

const filters: LaunchpadFilters = {
  chainId: 1,
  status: 'ACTIVE',
  page: 1,
  limit: 20,
};

const stats: AdminStats = {
  totalCollections: 100,
  totalMints: 5000,
  totalVolume: '1000000',
  activeLaunchpads: 50,
  completedLaunchpads: 50,
};
```

## Error Handling

### AdminPanelError Class

Custom error class with additional metadata:

```typescript
class AdminPanelError extends Error {
  code: string;           // Error code (e.g., 'NETWORK_ERROR', 'VALIDATION_ERROR')
  severity: 'low' | 'medium' | 'high';  // Error severity
  retryable: boolean;     // Whether the operation can be retried
}
```

### Error Codes

- `NETWORK_ERROR` - Network connectivity issues (retryable)
- `TIMEOUT_ERROR` - Request timeout (retryable)
- `UNAUTHORIZED` - Authentication required (not retryable)
- `FORBIDDEN` - Insufficient permissions (not retryable)
- `NOT_FOUND` - Resource not found (not retryable)
- `VALIDATION_ERROR` - Invalid input data (not retryable)
- `RATE_LIMIT` - Too many requests (retryable)
- `SERVER_ERROR` - Server-side error (retryable)
- `API_ERROR` - Generic API error (retryable)
- `UNKNOWN_ERROR` - Unknown error (not retryable)

### Error Severity Levels

- **Low**: Minor issues, short toast duration (3s)
- **Medium**: Moderate issues, medium toast duration (5s), shows retry hint if retryable
- **High**: Critical issues, long toast duration (7s), shows support contact hint

## API Response Format

All API responses follow this standard format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string; // Only in development
}
```

Paginated responses:

```typescript
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
  error?: string;
}
```

## Best Practices

1. **Always use the adminApiClient** for API calls instead of raw fetch
2. **Use displayError** to show errors to users instead of console.log
3. **Use displaySuccess** for success confirmations
4. **Use displayLoading** for operations that take time
5. **Use retryWithBackoff** for operations that might fail temporarily
6. **Use withErrorHandling** to wrap async functions with automatic error handling
7. **Import types from @/types/admin** for type safety
8. **Check error.retryable** before implementing retry logic

## Testing

When testing admin utilities:

1. Test error handling for all HTTP status codes
2. Test retry logic with exponential backoff
3. Test toast notifications are displayed correctly
4. Test API client builds URLs correctly with query parameters
5. Test error severity levels trigger appropriate UI responses

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 10.1**: Loading states through API client and error handler
- **Requirement 10.2**: Error messages with actionable information through AdminPanelError
- **Requirement 10.3**: Toast notifications for non-critical errors through displayError
