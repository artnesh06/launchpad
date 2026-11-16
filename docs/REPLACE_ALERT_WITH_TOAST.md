# Replace Alert with Toast Notifications

## Overview
Mengganti semua `alert()` dan `window.confirm()` dengan toast notifications menggunakan library `sonner` untuk UX yang lebih baik.

## Changes Made

### 1. Collection Detail Page - `src/app/collection/[id]/page.tsx`

**Before:**
```typescript
// Konfirmasi popup sebelum mint
const confirmed = window.confirm(`Mint ${mintAmount} NFT...`);
if (!confirmed) return;

// Success alert
alert(`Minting successful!`);

// Error alerts
alert('Please connect your wallet first');
```

**After:**
```typescript
// Import toast
import { toast } from 'sonner';

// Validasi dengan toast
toast.error('Please connect your wallet first');

// Loading toast
const loadingToast = toast.loading('Processing mint transaction...');

// Success toast dengan description
toast.success('Minting successful!', {
  description: `Transaction: ${txHash.slice(0, 10)}...`,
  duration: 5000,
});

// Error toast dengan detail
toast.error('Minting failed', {
  description: error.message,
});
```

**Features:**
- ✅ Loading indicator saat processing
- ✅ Success notification dengan transaction hash
- ✅ Error handling dengan pesan detail
- ✅ Auto-dismiss setelah 5 detik
- ✅ Tidak blocking UI

### 2. Collection Management Page - `src/app/create/[address]/page.tsx`

**Replaced alerts:**
- Phase toggle success/error
- Phase update success/error
- Whitelist update success/error
- Royalty update success/error
- Save validation

**Example:**
```typescript
// Before
alert('Phase updated successfully!');
alert(`Failed to save phase: ${error.message}`);

// After
toast.success('Phase updated successfully!');
toast.error(`Failed to save phase: ${error.message}`);
```

### 3. Profile Assets Component - `src/components/admin/collection/profile-assets.tsx`

**Replaced alerts:**
- File type validation
- File size validation

**Example:**
```typescript
// Before
alert('Please upload an image file');
alert('File size must be less than 10MB');

// After
toast.error('Please upload an image file');
toast.error('File size must be less than 10MB');
```

## Toast Types Used

### 1. `toast.error()` - Error messages
```typescript
toast.error('Error message');
toast.error('Error title', { description: 'Details...' });
```

### 2. `toast.success()` - Success messages
```typescript
toast.success('Success message');
toast.success('Success title', { description: 'Details...', duration: 5000 });
```

### 3. `toast.loading()` - Loading indicator
```typescript
const loadingToast = toast.loading('Processing...');
// Later dismiss it
toast.dismiss(loadingToast);
```

### 4. `toast.info()` - Info messages
```typescript
toast.info('No changes to save.');
```

## Benefits

1. **Better UX**
   - Non-blocking notifications
   - Auto-dismiss
   - Stackable (multiple toasts)
   - Smooth animations

2. **More Information**
   - Can show title + description
   - Can show loading states
   - Can be dismissed manually

3. **Consistent Design**
   - Matches app design system
   - Positioned consistently (top-right)
   - Color-coded by type (error=red, success=green)

4. **Better Error Handling**
   - Can show detailed error messages
   - Can show transaction hashes
   - Can show multiple errors at once

## Testing

Test scenarios:
1. ✅ Mint NFT - shows loading → success/error toast
2. ✅ Toggle phase - shows success/error toast
3. ✅ Update phase - shows success/error toast
4. ✅ Upload whitelist - shows success/error toast
5. ✅ Upload invalid file - shows error toast
6. ✅ Connect wallet validation - shows error toast

## Files Modified

- `src/app/collection/[id]/page.tsx`
- `src/app/create/[address]/page.tsx`
- `src/components/admin/collection/profile-assets.tsx`

## Library Used

**Sonner** - Modern toast notification library
- Already installed in project
- Zero configuration needed
- Accessible by default
- Beautiful animations
- TypeScript support

Documentation: https://sonner.emilkowal.ski/
