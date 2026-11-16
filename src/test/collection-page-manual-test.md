# Collection Page Manual Test

## Test Instructions

To manually test the collection page implementation:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to a collection page:**
   - Use a valid NFT collection contract address
   - Example URL format: `http://localhost:3000/collection/0x...`
   - Test with a known collection address from your database or a popular NFT collection

3. **Verify the following features:**

### ✅ Collection Header Display
- [ ] Banner image displays at the top (if available)
- [ ] Collection avatar/thumbnail displays
- [ ] Collection name displays correctly
- [ ] Collection description displays (if available)
- [ ] Contract address displays with copy button
- [ ] Creator address displays with copy button (if available)
- [ ] Social links display (Twitter, Discord, Website) if available

### ✅ Collection Statistics
- [ ] Total Supply displays correctly
- [ ] Minted Count displays correctly
- [ ] Mint Progress percentage displays correctly
- [ ] Progress bar reflects the mint percentage
- [ ] Token Type displays (ERC721/ERC1155)

### ✅ Mint Phases (for Launchpad Collections)
- [ ] Mint phases display if collection is from launchpad
- [ ] Active phase is highlighted
- [ ] Phase details show: name, price, start/end times
- [ ] Max per wallet and total limit display (if applicable)

### ✅ NFT Grid Display
- [ ] NFTs display in a responsive grid (1/2/4 columns)
- [ ] Each NFT card shows: image, name, token ID
- [ ] Placeholder displays for NFTs without images
- [ ] Lazy loading works (images load as you scroll)

### ✅ Pagination
- [ ] "Load More" button appears when there are more NFTs
- [ ] Clicking "Load More" fetches and displays next page
- [ ] Loading indicator shows while fetching
- [ ] "End of collection" message shows when all NFTs loaded

### ✅ Navigation
- [ ] Clicking an NFT card navigates to NFT detail page
- [ ] URL format: `/nft/[address]/[tokenid]`

### ✅ Loading States
- [ ] Skeleton loaders display during initial load
- [ ] Loading spinner shows in "Load More" button
- [ ] Smooth transitions between loading and loaded states

### ✅ Error Handling
- [ ] Invalid address shows error message
- [ ] Network errors show error with retry button
- [ ] Retry button refetches data

### ✅ Responsive Design
- [ ] Page works on mobile (1 column grid)
- [ ] Page works on tablet (2 column grid)
- [ ] Page works on desktop (4 column grid)
- [ ] All elements are properly sized and spaced

## Test Collections

You can test with these popular NFT collections:

1. **Bored Ape Yacht Club (Ethereum Mainnet):**
   - Address: `0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D`
   - URL: `http://localhost:3000/collection/0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D`

2. **Azuki (Ethereum Mainnet):**
   - Address: `0xED5AF388653567Af2F388E6224dC7C4b3241C544`
   - URL: `http://localhost:3000/collection/0xED5AF388653567Af2F388E6224dC7C4b3241C544`

3. **Your Launchpad Collections:**
   - Check your database for collections created through the launchpad
   - These will show additional mint phase information

## Expected Behavior

### Initial Load
1. Page shows skeleton loaders
2. API fetches collection metadata and first 100 NFTs
3. Collection header renders with all available information
4. NFT grid renders with first batch of NFTs
5. "Load More" button appears if more NFTs exist

### Pagination
1. User clicks "Load More"
2. Button shows loading spinner
3. API fetches next 100 NFTs using pageKey
4. New NFTs append to existing grid
5. Button updates based on whether more pages exist

### Navigation
1. User clicks an NFT card
2. Router navigates to `/nft/[address]/[tokenid]`
3. Scroll position is preserved (browser default behavior)

## Implementation Checklist

✅ Created `/collection/[address]/page.tsx` with Next.js dynamic routing
✅ Implemented data fetching from API routes using React Query
✅ Implemented pagination using Alchemy's pageKey mechanism
✅ Added loading states and skeleton loaders
✅ Integrated collection header component
✅ Integrated NFT grid component
✅ Added error handling with retry functionality
✅ Implemented responsive design
✅ Added React Query provider to application

## Requirements Validated

- ✅ **Requirement 1.1:** Fetch and display all NFTs for specified contract address
- ✅ **Requirement 1.2:** Show collection metadata (name, description, images)
- ✅ **Requirement 1.3:** Render NFTs in grid layout with thumbnails, IDs, names
- ✅ **Requirement 1.4:** Implement pagination using Alchemy's pageKey
- ✅ **Requirement 6.1:** Display loading indicators during data fetch

## Notes

- React Query is configured with 5-minute cache time
- Page size is set to 100 NFTs per request
- Lazy loading is implemented in NFTGrid component
- IPFS URLs are automatically converted to HTTP in NFTCard component
- Error boundaries can be added in future iterations
