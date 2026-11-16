# Manual Factory Page Test Guide

## Prerequisites
- Admin panel should be accessible at `/admin/factory`
- Database should have factory data for at least one chain
- API endpoint `/api/admin/factory-info` should be working

## Test Cases

### Test 1: Initial Page Load
**Steps:**
1. Navigate to `/admin/factory`
2. Observe the page loading

**Expected Results:**
- ✅ Page displays "Factory Management" heading
- ✅ Chain selector shows default chain (MegaETH)
- ✅ Loading skeleton appears (8 animated skeleton items)
- ✅ After loading, factory information displays with all fields:
  - Contract Address
  - Status badge (Active/Inactive)
  - Owner address
  - Treasury address
  - Creation Fee (in ETH)
  - Platform Fee (percentage)
  - Free Mint Fee (in ETH)
  - Total Launchpads count
  - Version
  - Last Updated timestamp

### Test 2: Chain Selection
**Steps:**
1. Click on the chain selector dropdown
2. Select a different chain (e.g., Sepolia)
3. Observe the page behavior

**Expected Results:**
- ✅ Loading state appears
- ✅ Factory information updates for the selected chain
- ✅ All fields display correct data for the new chain
- ✅ Total Launchpads count reflects the selected chain

### Test 3: Refresh Functionality
**Steps:**
1. Click the "Refresh" button in the Factory Information card
2. Observe the button and data behavior

**Expected Results:**
- ✅ Button shows loading spinner and "Loading..." text
- ✅ Button is disabled during loading
- ✅ Factory information refreshes
- ✅ Button returns to normal state after loading

### Test 4: Sync All Launchpads
**Steps:**
1. Click the "Sync All" button in the Sync Operations section
2. Observe the sync progress

**Expected Results:**
- ✅ Button shows loading spinner and "Syncing..." text
- ✅ Button is disabled during sync
- ✅ Sync progress section appears below the button
- ✅ Progress section shows:
  - Status: "Syncing..."
  - Progress count (X / Y)
  - Progress message
  - Progress bar (if total > 0)
- ✅ On success:
  - Status changes to "Sync Completed"
  - Success message displays
  - Toast notification appears
  - Factory info auto-refreshes
  - Progress section disappears after 3 seconds
- ✅ On error:
  - Status changes to "Sync Failed"
  - Error message displays
  - Toast notification appears
  - Progress section disappears after 5 seconds

### Test 5: Error Handling
**Steps:**
1. Disconnect from the internet or stop the API server
2. Refresh the page or click refresh button
3. Observe error handling

**Expected Results:**
- ✅ Error message displays: "Failed to load factory information"
- ✅ "Try Again" button appears
- ✅ Clicking "Try Again" retries the request
- ✅ Toast notification shows error details

### Test 6: Responsive Design
**Steps:**
1. Resize browser window to different sizes
2. Test on mobile viewport (< 768px)
3. Test on tablet viewport (768px - 1024px)
4. Test on desktop viewport (> 1024px)

**Expected Results:**
- ✅ Factory information grid adjusts to screen size
- ✅ On mobile: Single column layout
- ✅ On tablet/desktop: Two column layout
- ✅ Chain selector remains accessible
- ✅ All text remains readable
- ✅ Addresses break properly (no overflow)

### Test 7: Data Formatting
**Steps:**
1. Verify all displayed data is properly formatted

**Expected Results:**
- ✅ Addresses display in monospace font
- ✅ Addresses break on long lines (no horizontal scroll)
- ✅ ETH values show proper decimal places
- ✅ Percentage values include % symbol
- ✅ Timestamps show in local format
- ✅ Status badge has correct color (green for active, red for inactive)

## Requirements Coverage

### Requirement 4.1 ✅
Factory information is fetched from the blockchain via API

### Requirement 4.2 ✅
All required fields are displayed (address, owner, treasury, fees)

### Requirement 4.3 ✅
Total launchpads created is displayed

### Requirement 4.4 ✅
Loading states are shown during data fetch

### Requirement 3.1 ✅
Sync can be triggered for specific chain

### Requirement 3.2 ✅
Sync updates database with blockchain data

### Requirement 3.3 ✅
Progress indicators are displayed during sync

### Requirement 3.4 ✅
Sync completion shows count of synced launchpads

### Requirement 3.5 ✅
Sync errors are displayed with details

## Notes
- The factory page now uses real data from the API
- All mock data has been removed
- Loading states provide good UX during data fetching
- Error handling allows users to retry failed requests
- Sync functionality is fully integrated with progress tracking
