# Toast Notifications Guide

This guide explains how toast notifications are implemented and used throughout the admin panel.

## Overview

The admin panel uses [Sonner](https://sonner.emilkowal.ski/) for toast notifications. Sonner is already configured in the root layout (`src/app/layout.tsx`) and provides a clean, accessible notification system.

## Configuration

The Toaster component is configured in `src/app/layout.tsx`:

```tsx
<Toaster position="top-right" expand={false} richColors closeButton />
```

## Usage

### Using Admin Error Handler (Recommended)

The recommended way to display notifications in admin hooks and components is through the admin error handler utilities:

```typescript
import { displayError, displaySuccess, displayInfo } from '@/lib/admin-error-handler';

// Success notification
displaySuccess('Operation completed successfully');
displaySuccess('Banner created', 'The banner is now visible on the homepage');

// Error notification
displayError(error); // Automatically handles AdminPanelError and regular Error objects

// Info notification
displayInfo('Processing...', 'This may take a few moments');
```

### Direct Toast Usage

For simple cases, you can use toast directly:

```typescript
import { toast } from 'sonner';

// Success
toast.success('Operation successful');

// Error
toast.error('Something went wrong');

// Info
toast('Information message');

// Warning
toast.warning('Warning message');

// With description
toast.success('Title', {
  description: 'Additional details here',
  duration: 5000,
});

// Promise-based (shows loading, then success/error)
toast.promise(
  fetchData(),
  {
    loading: 'Loading...',
    success: 'Data loaded successfully',
    error: 'Failed to load data',
  }
);
```

## Error Severity Levels

The admin error handler supports three severity levels:

### Low Severity
- Duration: 3 seconds
- Use for: Minor issues that don't require immediate attention

### Medium Severity (Default)
- Duration: 5 seconds
- Shows retry message if error is retryable
- Use for: Standard errors that users should be aware of

### High Severity
- Duration: 7 seconds
- Shows support contact message
- Use for: Critical errors that may require support intervention

## Best Practices

### 1. Use displayError for all error handling
```typescript
try {
  await someOperation();
} catch (err) {
  displayError(err); // Handles all error types appropriately
  throw err; // Re-throw if needed
}
```

### 2. Use displaySuccess for successful operations
```typescript
const result = await createBanner(data);
displaySuccess('Banner created successfully');
```

### 3. Provide context in descriptions
```typescript
displaySuccess(
  'Sync completed',
  `${count} launchpads synced successfully`
);
```

### 4. Don't show toasts for expected loading states
```typescript
// ❌ Don't do this
toast.loading('Loading data...');
setIsLoading(true);

// ✅ Do this instead
setIsLoading(true); // Use loading state in UI
```

### 5. Use toast.promise for async operations
```typescript
toast.promise(
  syncLaunchpads(),
  {
    loading: 'Syncing launchpads...',
    success: 'Sync completed',
    error: 'Sync failed',
  }
);
```

## Examples from Admin Panel

### Banner Management
```typescript
// Create banner
const createBanner = async (data: BannerInput) => {
  try {
    const response = await adminApiClient.post('/banners', data);
    displaySuccess('Banner created successfully');
    return response.data;
  } catch (err) {
    displayError(err);
    throw err;
  }
};
```

### Status Update
```typescript
// Update launchpad status
const updateStatus = async (id: string, status: string) => {
  try {
    const response = await adminApiClient.patch(`/launchpads/${id}/status`, { status });
    displaySuccess('Status updated successfully');
  } catch (err) {
    displayError(err);
    throw err;
  }
};
```

### Sync Operations
```typescript
// Sync with progress
const syncLaunchpads = async (chainId: number) => {
  try {
    setSyncProgress({ status: 'syncing', progress: 0, total: 0, message: 'Starting sync...' });
    
    const result = await adminApiClient.post('/sync', { chainId });
    
    displaySuccess(
      'Sync completed',
      `${result.synced} launchpads synced successfully`
    );
  } catch (err) {
    displayError(err);
  }
};
```

## Customization

### Custom Toast Styles

The toast styles are configured in `src/components/ui/sonner.tsx`:

```typescript
toastOptions={{
  classNames: {
    toast: "group toast group-[.toaster]:bg-background...",
    error: "group-[.toast]:bg-destructive...",
    success: "group-[.toast]:bg-green-600...",
    warning: "group-[.toast]:bg-yellow-600...",
    info: "group-[.toast]:bg-blue-600...",
  },
}}
```

### Custom Duration

```typescript
toast.success('Message', { duration: 10000 }); // 10 seconds
```

### Action Buttons

```typescript
toast('Event created', {
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
});
```

## Accessibility

Sonner is built with accessibility in mind:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader announcements
- Focus management

## Testing

When testing components that use toast notifications:

```typescript
import { toast } from 'sonner';

// Mock toast in tests
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    promise: jest.fn(),
  },
}));

// Verify toast was called
expect(toast.success).toHaveBeenCalledWith('Operation successful');
```

## Related Files

- `src/app/layout.tsx` - Toaster configuration
- `src/components/ui/sonner.tsx` - Sonner component wrapper
- `src/lib/admin-error-handler.ts` - Error handling utilities
- `src/hooks/useAdmin*.ts` - Admin hooks using toast notifications
