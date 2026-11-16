# Manual Navigation Features Test

## Test Environment Setup
1. Start the development server: `npm run dev`
2. Navigate to a collection page with multiple NFTs
3. Have browser developer tools open to monitor console and network

## Test Cases

### Test 1: NFT Card Click Navigation
**Requirement**: 7.2 - NFT card click navigation to detail page

**Steps**:
1. Navigate to `/collection/[address]` (use a valid collection address)
2. Scroll through the NFT grid
3. Click on any NFT card

**Expected Results**:
- ✅ Browser navigates to `/nft/[address]/[tokenid]`
- ✅ NFT detail page loads with correct NFT information
- ✅ No console errors

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 2: Adjacent NFT Navigation - Next Button
**Requirement**: 7.3 - Adjacent NFT navigation (previous/next)

**Steps**:
1. Navigate to an NFT detail page (not the last NFT in collection)
2. Locate the Previous/Next navigation buttons below the breadcrumb
3. Click the "Next" button

**Expected Results**:
- ✅ Navigation buttons are visible
- ✅ Position indicator shows "X of Y" format
- ✅ Page navigates to the next NFT in the collection
- ✅ URL updates to new token ID
- ✅ NFT details update to show next NFT

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 3: Adjacent NFT Navigation - Previous Button
**Requirement**: 7.3 - Adjacent NFT navigation (previous/next)

**Steps**:
1. Navigate to an NFT detail page (not the first NFT in collection)
2. Click the "Previous" button

**Expected Results**:
- ✅ Page navigates to the previous NFT in the collection
- ✅ URL updates to new token ID
- ✅ NFT details update to show previous NFT

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 4: Adjacent NFT Navigation - First NFT
**Requirement**: 7.3 - Adjacent NFT navigation (previous/next)

**Steps**:
1. Navigate to the first NFT in a collection
2. Observe the Previous button state

**Expected Results**:
- ✅ Previous button is disabled (grayed out)
- ✅ Next button is enabled
- ✅ Position indicator shows "1 of Y"

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 5: Adjacent NFT Navigation - Last NFT
**Requirement**: 7.3 - Adjacent NFT navigation (previous/next)

**Steps**:
1. Navigate to the last NFT in a collection
2. Observe the Next button state

**Expected Results**:
- ✅ Next button is disabled (grayed out)
- ✅ Previous button is enabled
- ✅ Position indicator shows "Y of Y"

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 6: Collection Name Click Navigation
**Requirement**: 7.4 - Collection name clickable on NFT detail page

**Steps**:
1. Navigate to any NFT detail page
2. Locate the collection name (should be above the NFT name)
3. Click on the collection name

**Expected Results**:
- ✅ Collection name is styled as a clickable link (blue/primary color)
- ✅ Hover shows underline or visual feedback
- ✅ Click navigates to `/collection/[address]`
- ✅ Collection page loads correctly

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 7: Scroll Position Preservation - Save
**Requirement**: 7.5 - Scroll position preservation on back navigation

**Steps**:
1. Navigate to a collection page with many NFTs
2. Scroll down approximately 50% of the page
3. Note the current scroll position (or a visible NFT)
4. Click on an NFT card to navigate to detail page

**Expected Results**:
- ✅ Navigation to NFT detail page occurs
- ✅ Check sessionStorage in dev tools - should contain 'collectionScrollPosition'

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 8: Scroll Position Preservation - Restore
**Requirement**: 7.5 - Scroll position preservation on back navigation

**Steps**:
1. From the NFT detail page (after Test 7)
2. Click the browser back button OR click the collection name in breadcrumb
3. Observe the scroll position when collection page loads

**Expected Results**:
- ✅ Page scrolls to the previously saved position
- ✅ The NFT that was clicked is visible (or nearby)
- ✅ sessionStorage 'collectionScrollPosition' is cleared after restoration

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 9: Scroll Position Preservation - Multiple Navigations
**Requirement**: 7.5 - Scroll position preservation on back navigation

**Steps**:
1. Navigate to collection page
2. Scroll to position A, click NFT 1
3. Go back to collection (should restore to position A)
4. Scroll to position B, click NFT 2
5. Go back to collection (should restore to position B)

**Expected Results**:
- ✅ Each return to collection page restores the most recent scroll position
- ✅ No interference between multiple navigations

**Status**: ⬜ Pass / ⬜ Fail

---

### Test 10: Breadcrumb Navigation
**Requirement**: 7.1 - Breadcrumb navigation back to collection

**Steps**:
1. Navigate to an NFT detail page
2. Locate the breadcrumb at the top
3. Click on the collection name in the breadcrumb

**Expected Results**:
- ✅ Breadcrumb shows: Collections > [Collection Name] > [NFT Name]
- ✅ Collection name is clickable
- ✅ Click navigates to collection page
- ✅ Scroll position is preserved (if previously saved)

**Status**: ⬜ Pass / ⬜ Fail

---

## Edge Cases

### Edge Case 1: Single NFT Collection
**Steps**:
1. Navigate to a collection with only 1 NFT
2. View the NFT detail page

**Expected Results**:
- ✅ Both Previous and Next buttons are disabled
- ✅ Position indicator shows "1 of 1"

**Status**: ⬜ Pass / ⬜ Fail

---

### Edge Case 2: Direct URL Navigation
**Steps**:
1. Directly navigate to an NFT detail page via URL
2. Observe navigation buttons

**Expected Results**:
- ✅ Navigation buttons appear after collection NFTs load
- ✅ Buttons work correctly

**Status**: ⬜ Pass / ⬜ Fail

---

### Edge Case 3: No Saved Scroll Position
**Steps**:
1. Navigate directly to collection page (not from NFT detail)
2. Observe scroll position

**Expected Results**:
- ✅ Page loads at top (scroll position 0)
- ✅ No errors in console

**Status**: ⬜ Pass / ⬜ Fail

---

## Performance Tests

### Performance 1: Navigation Speed
**Steps**:
1. Click through 5-10 NFTs using Next button
2. Observe loading times

**Expected Results**:
- ✅ Navigation is smooth and responsive
- ✅ No noticeable lag between clicks
- ✅ Collection NFTs are cached (check Network tab)

**Status**: ⬜ Pass / ⬜ Fail

---

### Performance 2: Scroll Restoration Speed
**Steps**:
1. Scroll to bottom of large collection
2. Navigate to NFT and back
3. Measure time to restore scroll position

**Expected Results**:
- ✅ Scroll restoration happens within 100-200ms
- ✅ No visible "jump" or flicker

**Status**: ⬜ Pass / ⬜ Fail

---

## Accessibility Tests

### Accessibility 1: Keyboard Navigation
**Steps**:
1. Use Tab key to navigate through NFT detail page
2. Focus on Previous/Next buttons
3. Press Enter to activate

**Expected Results**:
- ✅ Buttons are keyboard accessible
- ✅ Focus indicator is visible
- ✅ Enter key activates navigation

**Status**: ⬜ Pass / ⬜ Fail

---

### Accessibility 2: Screen Reader
**Steps**:
1. Enable screen reader
2. Navigate to NFT detail page
3. Focus on navigation buttons

**Expected Results**:
- ✅ Buttons announce as "Previous" and "Next"
- ✅ Disabled state is announced
- ✅ Position indicator is readable

**Status**: ⬜ Pass / ⬜ Fail

---

## Summary

**Total Tests**: 15
**Passed**: ___
**Failed**: ___
**Pass Rate**: ___%

## Notes
- Document any issues or unexpected behavior
- Include screenshots if helpful
- Note browser and device used for testing
