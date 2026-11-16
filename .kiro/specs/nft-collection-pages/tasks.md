# Implementation Plan

- [x] 1. Set up API routes for NFT data fetching





  - Create API route `/api/nft/collection/[address]` to fetch collection NFTs with pagination
  - Create API route `/api/nft/[address]/[tokenid]` to fetch individual NFT details
  - Create API route `/api/nft/collection/[address]/attributes` to fetch attribute summary
  - Implement error handling and response formatting for all routes
  - _Requirements: 1.1, 2.1, 8.2, 8.3, 8.4_

- [ ]* 1.1 Write property test for API route data fetching
  - **Property 1: Collection NFT fetching**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for NFT detail fetching
  - **Property 6: NFT detail fetching**
  - **Validates: Requirements 2.1**
-

- [x] 2. Create core UI components for NFT display




  - Create `NFTCard` component for grid display with image, token ID, and name
  - Create `NFTGrid` component for responsive grid layout
  - Create `NFTAttributes` component for displaying traits
  - Create `RarityDisplay` component for rarity information
  - Implement image lazy loading with intersection observer
  - _Requirements: 1.3, 2.5, 10.2, 10.3_

- [ ]* 2.1 Write property test for NFT grid structure
  - **Property 3: NFT grid structure**
  - **Validates: Requirements 1.3**

- [ ]* 2.2 Write property test for NFT detail information completeness
  - **Property 7: NFT detail information completeness**
  - **Validates: Requirements 2.2, 2.5**

- [x] 3. Implement collection header and metadata display





  - Create `CollectionHeader` component with banner image support
  - Implement collection metadata display (name, description, images)
  - Add collection statistics display (total supply, minted count, percentage)
  - Add creator and contract address display with copy functionality
  - Add social links display when available
  - _Requirements: 1.2, 3.1, 3.2, 3.4, 3.5, 4.2_

- [ ]* 3.1 Write property test for collection metadata display
  - **Property 2: Collection metadata display completeness**
  - **Validates: Requirements 1.2**

- [ ]* 3.2 Write property test for collection statistics display
  - **Property 10: Collection statistics display**
  - **Validates: Requirements 3.1**

- [ ]* 3.3 Write property test for mint progress calculation
  - **Property 11: Mint progress calculation**
  - **Validates: Requirements 3.2**

- [ ]* 3.4 Write property test for address display with copy
  - **Property 13: Address display with copy functionality**
  - **Validates: Requirements 3.4**

- [ ]* 3.5 Write property test for social links conditional display
  - **Property 14: Social links conditional display**
  - **Validates: Requirements 3.5**


- [x] 4. Build collection page with pagination



  - Create `/collection/[address]/page.tsx` with Next.js dynamic routing
  - Implement data fetching from API routes using React Query
  - Implement pagination using Alchemy's pageKey mechanism
  - Add loading states and skeleton loaders
  - Integrate collection header and NFT grid components
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1_

- [ ]* 4.1 Write property test for pagination trigger
  - **Property 4: Pagination trigger**
  - **Validates: Requirements 1.4**

- [ ]* 4.2 Write property test for loading indicator display
  - **Property 19: Loading indicator display**
  - **Validates: Requirements 6.1**

- [x] 5. Implement IPFS URL handling





  - Verify `ipfsToHttp` utility function exists and works correctly
  - Apply IPFS URL conversion to all image URLs from Alchemy API
  - Add fallback placeholder images for failed loads
  - _Requirements: 1.5, 6.5_

- [ ]* 5.1 Write property test for IPFS URL transformation
  - **Property 5: IPFS URL transformation**
  - **Validates: Requirements 1.5**


-

- [x] 6. Create NFT detail page







  - Create `/nft/[address]/[tokenid]/page.tsx` with dynamic routing
  - Implement NFT metadata fetching and display
  - Display NFT image, name, description, and attributes
  - Display ownership information
  - Display collection context with clickable collection name
  - Add breadcrumb navigation back to collection
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.4_

- [ ]* 6.1 Write property test for ownership information display
  - **Property 8: Ownership information display**
  - **Validates: Requirements 2.3**

- [ ]* 6.2 Write property test for collection context display
  - **Property 9: Collection context display**
  - **Validates: Requirements 2.4**

- [x] 7. Implement attribute filtering system





  - Create `AttributeFilters` component with filter options
  - Implement filter generation from collection attributes
  - Implement filter application logic
  - Implement filter clearing functionality
  - Sync filter state with URL query parameters
  - Add search input for token ID and name filtering
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 7.1 Write property test for attribute filter generation
  - **Property 16: Attribute filter generation**
  - **Validates: Requirements 5.2**

- [ ]* 7.2 Write property test for filter round-trip
  - **Property 17: Filter application and clearing round-trip**
  - **Validates: Requirements 5.3, 5.4**

- [ ]* 7.3 Write property test for filter URL synchronization
  - **Property 18: Filter state URL synchronization**
  - **Validates: Requirements 5.5**
-

- [x] 8. Add navigation and routing features




  - Implement NFT card click navigation to detail page
  - Implement adjacent NFT navigation (previous/next)
  - Implement scroll position preservation on back navigation
  - Make collection name clickable on NFT detail page
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [ ]* 8.1 Write property test for NFT card navigation
  - **Property 22: NFT card navigation**
  - **Validates: Requirements 7.2**

- [ ]* 8.2 Write property test for adjacent NFT navigation
  - **Property 23: Adjacent NFT navigation**
  - **Validates: Requirements 7.3**

- [ ]* 8.3 Write property test for scroll position preservation
  - **Property 24: Scroll position preservation**
  - **Validates: Requirements 7.5**

- [x] 9. Implement error handling and edge cases





  - Add error boundary components for pages
  - Implement error message display with retry functionality
  - Handle invalid contract addresses with user-friendly errors
  - Handle non-existent NFTs with "not found" pages
  - Add fallback placeholder images for failed image loads
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ]* 9.1 Write property test for error handling with retry
  - **Property 20: Error handling with retry**
  - **Validates: Requirements 6.2**

- [ ]* 9.2 Write property test for invalid address error handling
  - **Property 21: Invalid address error handling**
  - **Validates: Requirements 6.3**


- [x] 10. Integrate launchpad-specific features






  - Create `MintPhaseDisplay` component for mint phases
  - Fetch launchpad data from database for collections
  - Merge launchpad database data with Alchemy API data
  - Display mint phases with start/end times and prices
  - Implement countdown timers for upcoming phases
  - Highlight active mint phases
  - _Requirements: 3.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 10.1 Write property test for mint phase information display
  - **Property 12: Mint phase information display**
  - **Validates: Requirements 3.3, 9.1, 9.4**

- [ ]* 10.2 Write property test for launchpad data merging
  - **Property 25: Launchpad data merging**
  - **Validates: Requirements 9.5**

- [ ]* 10.3 Write property test for countdown timer display
  - **Property 26: Countdown timer display**
  - **Validates: Requirements 9.3**

- [x] 11. Add rarity information display





  - Fetch rarity data using Alchemy's `computeRarity` method
  - Display rarity rank, score, and percentile on NFT detail page
  - Display attribute prevalence percentages
  - Gracefully hide rarity section when data unavailable
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 11.1 Write property test for rarity information display
  - **Property 27: Rarity information display**
  - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ]* 11.2 Write property test for attribute prevalence display
  - **Property 28: Attribute prevalence display**
  - **Validates: Requirements 10.4**


- [x] 12. Apply design system styling



  - Apply consistent color scheme matching create-studio pages
  - Use mono font family for headings and labels
  - Use border color `#1E1F22` for all borders
  - Ensure banner images are positioned at top
  - Reuse existing Avatar component for collection thumbnails
  - Implement responsive grid layout (1/2/4 columns)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 12.1 Write property test for banner image positioning
  - **Property 15: Banner image positioning**
  - **Validates: Requirements 4.2**

- [x] 13. Optimize performance and accessibility





  - Implement virtual scrolling for large collections (>1000 NFTs)
  - Add lazy loading for images with intersection observer
  - Implement API response caching with React Query (5 min TTL)
  - Add debouncing to search input (300ms)
  - Add aria-labels for screen readers
  - Ensure keyboard navigation works for all interactive elements
  - Verify color contrast meets WCAG AA standards
  - Ensure minimum 44x44px touch targets for mobile
  - _Requirements: All requirements (performance and accessibility)_
-

- [x] 14. Add SEO and meta tags




  - Implement dynamic meta tags with collection/NFT information
  - Add Open Graph tags for social media sharing
  - Add JSON-LD structured data for NFT collections
  - Configure Next.js image optimization for external domains
  - _Requirements: All requirements (SEO)_

- [x] 15. Final checkpoint - Ensure all tests pass














  - Ensure all tests pass, ask the user if questions arise.
