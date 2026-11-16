# Collections Page Integration Test

## Test Date
Generated: 2024

## Overview
This document describes the manual testing steps for the Collections page integration with real data.

## Implementation Summary

### Completed Features
1. ✅ Integrated `useAdminLaunchpads` hook for real data fetching
2. ✅ Implemented pagination controls (Previous/Next buttons)
3. ✅ Added loading states with skeleton loaders
4. ✅ Implemented chain filter dropdown
5. ✅ Implemented status filter dropdown
6. ✅ Implemented search input with 300ms debouncing
7. ✅ Made table rows clickable for navigation to detail page
8. ✅ Implemented status update dropdown in table
9. ✅ Added toast notifications for success/error messages

### API Endpoints
- **GET /api/admin/launchpads**: Fetches paginated launchpads with filters
  - Query params: `page`, `limit`, `chainId`, `status`, `search`
  - Response format: `{ success, data: { items, pagination } }`
  
- **PATCH /api/admin/launchpads/[id]/status**: Updates launchpad status
  - Body: `{ status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' }`
  - Response format: `{ success, data: AdminLaunchpad }`

## Manual Testing Steps

### Test 1: Page Load and Data Display
1. Navigate to `/admin/collections`
2. Verify loading skeleton appears initially
3. Verify table displays launchpads with:
   - Name and contract address
   - Creator address (formatted)
   - Chain name
   - Status dropdown
   - Minted/Supply with percentage
   - Volume in ETH

**Expected Result**: Table loads with real data from database

### Test 2: Chain Filter
1. Click on chain filter dropdown
2. Select "MegaETH"
3. Verify only MegaETH launchpads are displayed
4. Select "Sepolia"
5. Verify only Sepolia launchpads are displayed
6. Select "All Chains"
7. Verify all launchpads are displayed

**Expected Result**: Filter works correctly and resets to page 1

### Test 3: Status Filter
1. Click on status filter dropdown
2. Select "Active"
3. Verify only active launchpads are displayed
4. Select "Paused"
5. Verify only paused launchpads are displayed
6. Select "All Status"
7. Verify all launchpads are displayed

**Expected Result**: Filter works correctly and resets to page 1

### Test 4: Search Functionality
1. Type "test" in search input
2. Wait 300ms for debounce
3. Verify only launchpads matching "test" in name/address are displayed
4. Clear search input
5. Verify all launchpads are displayed again

**Expected Result**: Search works with debouncing and resets to page 1

### Test 5: Pagination
1. Verify pagination controls show current page and total pages
2. Click "Next" button
3. Verify page 2 data loads
4. Verify "Previous" button is now enabled
5. Click "Previous" button
6. Verify page 1 data loads
7. Verify "Previous" button is disabled on page 1

**Expected Result**: Pagination works correctly

### Test 6: Row Navigation
1. Click on any launchpad row
2. Verify navigation to `/admin/collections/[id]`

**Expected Result**: Clicking row navigates to detail page

### Test 7: Status Update
1. Click on status dropdown in any row (without clicking the row)
2. Select a different status
3. Verify toast notification appears with success message
4. Verify status is updated in the table
5. Refresh page
6. Verify status persists

**Expected Result**: Status updates successfully with toast notification

### Test 8: Combined Filters
1. Select chain filter: "MegaETH"
2. Select status filter: "Active"
3. Type search term: "nft"
4. Verify only MegaETH active launchpads matching "nft" are displayed

**Expected Result**: All filters work together correctly

### Test 9: Empty State
1. Apply filters that return no results
2. Verify "No collections found" message is displayed

**Expected Result**: Empty state message appears

### Test 10: Error Handling
1. Disconnect from database (if possible)
2. Verify error toast notification appears
3. Reconnect to database
4. Verify data loads correctly

**Expected Result**: Errors are handled gracefully with toast notifications

## Requirements Validation

### Requirement 2.1 ✅
"WHEN the admin visits the collections page THEN the system SHALL fetch launchpads from the database with pagination"
- Implemented: useAdminLaunchpads hook with pagination

### Requirement 2.2 ✅
"WHEN the admin views a launchpad THEN the system SHALL display contract address, creator, chain, status, minted count, total supply, and volume"
- Implemented: All fields displayed in table

### Requirement 2.3 ✅
"WHEN the admin filters by chain THEN the system SHALL return only launchpads from the selected chain"
- Implemented: Chain filter dropdown

### Requirement 2.4 ✅
"WHEN the admin filters by status THEN the system SHALL return only launchpads with the selected status"
- Implemented: Status filter dropdown

### Requirement 2.5 ✅
"WHEN the admin searches by name or address THEN the system SHALL return matching launchpads"
- Implemented: Search input with debouncing

### Requirement 9.1 ✅
"WHEN the admin clicks on a launchpad THEN the system SHALL navigate to the detail page"
- Implemented: Clickable table rows

### Requirement 9.3 ✅
"WHEN the admin updates launchpad status THEN the system SHALL save the change to the database"
- Implemented: Status dropdown with API call

## Notes
- All filters reset pagination to page 1
- Search has 300ms debounce to reduce API calls
- Status dropdown prevents row click event propagation
- Loading states use skeleton loaders for better UX
- Toast notifications use sonner library
