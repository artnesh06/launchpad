# Migration: Admin to Create

## Overview
The `/admin` routes have been deprecated and replaced with `/create` routes. All admin functionality is now available under the Creator Studio (`/create`).

## Changes Made

### 1. Route Redirects
- `/admin` → `/create` (automatic redirect)
- `/admin/[address]` → `/create/[address]` (automatic redirect)

### 2. Features Migrated to Create
- ✅ Real API integration (`/api/admin/launchpads`)
- ✅ Debounced search (500ms delay)
- ✅ Working chain & status filters with Select component
- ✅ Click outside handler for dropdowns
- ✅ Refresh button with loading state
- ✅ Improved loading & empty states
- ✅ Stats section with background images
- ✅ Figma design implementation

### 3. Navigation
- Header navigation already points to `/create`
- No internal links to `/admin` pages found

### 4. API Endpoints (Unchanged)
All API endpoints remain at `/api/admin/*`:
- `/api/admin/launchpads` - List and filter launchpads
- `/api/admin/launchpads/save` - Save launchpad data
- `/api/admin/analytics` - Analytics data
- `/api/admin/bulk-operations` - Bulk operations
- `/api/admin/export` - Export functionality

### 5. Components (Unchanged)
Component folder structure remains:
- `src/components/admin/*` - Admin-related components
- `src/lib/api/admin-service.ts` - Admin API service

## For Developers

### Old URLs (Deprecated)
```
/admin              → Redirects to /create
/admin/[address]    → Redirects to /create/[address]
```

### New URLs (Current)
```
/create             → Creator Studio (list view)
/create/add         → Create new NFT collection
/create/[address]   → Edit/manage NFT collection
```

### Code Examples

**Before:**
```tsx
<Link href="/admin">Admin Dashboard</Link>
<Link href="/admin/0x123...">Edit Collection</Link>
```

**After:**
```tsx
<Link href="/create">Creator Studio</Link>
<Link href="/create/0x123...">Edit Collection</Link>
```

## Notes
- The `/admin` folder still exists but only contains redirect pages
- All functionality has been moved to `/create`
- API endpoints remain unchanged for backward compatibility
- No database migrations required
