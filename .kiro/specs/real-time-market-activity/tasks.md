# Implementation Plan

- [x] 1. Create backend API endpoint for activity feed





  - Create `/api/activity/recent/route.ts` endpoint with GET handler
  - Implement query parameter parsing and validation (type, chain, limit)
  - Build Prisma query with filters for activity type and chain
  - Transform Activity data to FormattedActivity format with relative timestamps
  - Add chain information from relations
  - Mark first item with `isFirst: true` flag
  - Implement error handling and response formatting
  - _Requirements: 1.1, 2.1, 3.1, 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Create activity listener service for blockchain events





  - [x] 2.1 Implement base ActivityListener class


    - Create `src/lib/blockchain/activity-listener.ts` file
    - Implement constructor with chain configuration
    - Create ethers.js provider and contract instances
    - Implement start() and stop() methods
    - Add event listener setup for CollectionCreated events
    - Add event listener setup for Transfer events (mints)
    - _Requirements: 4.1, 4.2, 9.1, 9.3_

  - [x] 2.2 Implement event processing and storage

    - Create event handler for CollectionCreated events
    - Create event handler for Transfer events with from=0x0 filter
    - Parse event data and extract relevant information
    - Format metadata JSON for mint and collection events
    - Implement database write with Activity model
    - Add error handling with logging
    - _Requirements: 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_
  - [x] 2.3 Create multi-chain listener manager


    - Create `src/lib/blockchain/multi-chain-listener-manager.ts` file
    - Implement MultiChainListenerManager class
    - Load chain configurations from database
    - Initialize ActivityListener for each active chain
    - Implement addChain() and removeChain() methods
    - Add getStatus() method for monitoring
    - Handle per-chain connection failures independently
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3. Create frontend hook for activity feed





  - Create `src/hooks/useActivityFeed.ts` file
  - Implement useActivityFeed hook with polling logic
  - Add API call to `/api/activity/recent` endpoint
  - Implement 10-second polling interval with useEffect
  - Add error handling with 30-second retry on failure
  - Implement loading state management
  - Add cleanup on component unmount
  - Pause polling when tab is not visible
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Update MarketActivitySection component with real-time data





  - [x] 4.1 Create ActivityItem type and interfaces


    - Create `src/types/activity.ts` file
    - Define ActivityType, ActivityItem, and ActivityFeedResponse types
    - Export types for use in components
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 4.2 Update ActivityColumn component


    - Modify ActivityColumn to accept type and chainFilter props
    - Integrate useActivityFeed hook
    - Replace static mock data with dynamic activities
    - Implement conditional rendering for loading state
    - Add "No recent activity" fallback message
    - Apply green background highlight to first item
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 4.3 Add chain badges to activity items


    - Add chain icon/badge display to each ActivityItem
    - Fetch chain metadata (name, icon) from API response
    - Style chain badge with appropriate positioning
    - _Requirements: 8.3, 10.5_
  - [x] 4.4 Integrate chain filter


    - Read selected chain from ChainSelection component state
    - Pass chainId to ActivityColumn components
    - Update activities when chain selection changes
    - Handle "all chains" filter option
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [x] 5. Add utility functions for data formatting





  - Create `src/utils/activity-helpers.ts` file
  - Implement relative timestamp formatter (e.g., "1m 2s", "5m 30s")
  - Implement address truncation function (first 6 + last 4 chars)
  - Implement price formatting from wei to ETH
  - Add function to generate activity description text
  - _Requirements: 1.5, 2.5, 5.2, 5.3_

- [x] 6. Add database indexes for performance





  - Create Prisma migration for composite index on Activity table
  - Add index on `(chainId, type, createdAt DESC)`
  - Add index on `createdAt DESC` for recent queries
  - Run migration on development database
  - _Requirements: 6.4_

- [x] 7. Create startup script for event listeners





  - Create `scripts/start-activity-listeners.ts` file
  - Initialize MultiChainListenerManager on startup
  - Add health check endpoint at `/api/activity/health`
  - Implement graceful shutdown handling
  - Add logging for listener status
  - _Requirements: 9.1, 9.4_

- [x] 8. Add environment configuration





  - Add multi-chain RPC URLs to `.env.example`
  - Add activity listener configuration variables
  - Add API configuration variables (cache TTL, rate limit)
  - Document environment variables in README
  - _Requirements: 9.3_

- [x] 9. Implement error handling and retry logic





  - Add exponential backoff retry for RPC connections
  - Implement database write retry (up to 3 attempts)
  - Add error logging for failed events
  - Implement API error responses with appropriate status codes
  - Add frontend error handling with cached data fallback
  - _Requirements: 3.4, 4.5, 9.5_

- [x] 10. Update existing components to remove unused imports





  - Remove unused imports from `src/app/(package)/page.tsx`
  - Clean up NFTHeader, NFTFeaturedCard, Button, Badge imports
  - Remove unused Card, Separator, Search, StatisticsSection imports
  - _Requirements: N/A (code cleanup)_
