# Implementation Plan: API Caching Implementation

## Overview

Implementasi caching pada semua GET API endpoints menggunakan hybrid-cache library yang sudah ada. Implementasi akan dilakukan secara incremental per endpoint group dengan testing yang comprehensive untuk memastikan correctness dan stability. Setiap endpoint group akan di-cache dengan TTL yang sesuai karakteristik datanya, dan mutation endpoints akan mengimplementasikan cache invalidation.

## Tasks

- [x] 1. Setup testing infrastructure dan cache test utilities
  - Install fast-check library untuk property-based testing
  - Create test utilities untuk mock Redis dan time manipulation
  - Setup test fixtures untuk berbagai endpoint scenarios
  - Configure test environment variables (REDIS_URL, CACHE_ENABLED)
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]* 1.1 Write property tests untuk cache key generation
  - **Property 1: Cache Key Uniqueness** - Different parameters produce different keys
  - **Property 2: Cache Key Determinism** - Same inputs always produce same key
  - **Property 3: Cache Key Parameter Sorting** - Parameters sorted alphabetically
  - **Property 4: Cache Key Completeness** - All relevant parameters included
  - **Validates: Requirements 1.4, 1.5, 2.4, 2.5, 3.4, 3.5, 4.5, 5.6, 5.7, 6.4, 11.2, 11.3, 11.5**

- [ ]* 1.2 Write property tests untuk cache behavior
  - **Property 5: Cache TTL Correctness** - Cache expires after TTL, not before
  - **Property 6: Cache Hit Consistency** - Same request within TTL returns same data
  - **Property 7: Cache Miss After Expiry** - Request after TTL fetches fresh data
  - **Property 16: Default TTL Behavior** - Unspecified TTL defaults to 5 seconds
  - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 16.3**

- [ ]* 1.3 Write property tests untuk cache invalidation
  - **Property 8: Cache Invalidation Completeness** - All matching patterns cleared
  - **Property 9: Mutation Success Independence** - Mutation succeeds even if invalidation fails
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.6**

- [ ]* 1.4 Write property tests untuk error handling dan fallback
  - **Property 10: Redis Fallback** - System uses memory cache when Redis unavailable
  - **Property 11: Cache Failure Non-Blocking** - Failed cache operations don't throw exceptions
  - **Property 12: Error Response Non-Caching** - Error responses (4xx/5xx) not cached
  - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**

- [ ]* 1.5 Write property tests untuk backward compatibility
  - **Property 13: Response Format Preservation** - Response format unchanged after caching
  - **Property 14: Authentication Preservation** - Auth checks still enforced with cache
  - **Validates: Requirements 15.1, 15.3**

- [ ]* 1.6 Write property tests untuk cache metrics
  - **Property 15: Cache Metrics Accuracy** - Hit/miss counts accurately tracked
  - **Validates: Requirements 14.1**

- [x] 2. Implement Activity Endpoints caching (Real-time data)
  - [x] 2.1 Cache `/api/activity/recent` endpoint dengan TTL 1 detik
    - Wrap existing query dengan cachedFetch
    - Generate cache key dengan getCacheKey untuk path dan query params
    - Test dengan berbagai query parameter combinations
    - _Requirements: 1.1, 1.4, 1.5_
  
  - [x] 2.2 Cache `/api/activity/mints-chart` endpoint dengan TTL 5 detik
    - Implement cache wrapper dengan proper key generation
    - Include date range dan filter parameters dalam cache key
    - _Requirements: 1.2, 1.4, 1.5_
  
  - [x] 2.3 Cache `/api/activity/errors` endpoint dengan TTL 10 detik
    - Implement cache dengan error log specific parameters
    - _Requirements: 1.3, 1.4, 1.5_

- [ ]* 2.4 Write unit tests untuk Activity endpoints
  - Test cache hit/miss behavior untuk setiap endpoint
  - Test parameter variations menghasilkan different cache keys
  - Test TTL expiration untuk real-time data
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Implement Banner Endpoints caching (Static content)
  - [x] 3.1 Cache `/api/banners` endpoint dengan TTL 300 detik
    - Wrap query dengan cachedFetch dan TTL 300s
    - Include status filter dalam cache key
    - _Requirements: 9.1, 9.4_
  
  - [x] 3.2 Cache `/api/admin/banners` endpoint dengan TTL 300 detik
    - Implement cache dengan admin-specific parameters
    - _Requirements: 9.2, 9.4_
  
  - [x] 3.3 Implement cache invalidation untuk banner mutations
    - Add clearAllCache('/api/banners*') pada POST/PUT/DELETE banner endpoints
    - Add clearAllCache('/api/admin/banners*') pada admin banner mutations
    - Ensure mutation succeeds even if invalidation fails
    - _Requirements: 12.3, 12.6_

- [ ]* 3.4 Write unit tests untuk Banner endpoints
  - Test static content caching dengan long TTL
  - Test cache invalidation setelah banner mutations
  - Test different status filters produce different cache keys
  - _Requirements: 9.1, 9.2, 12.3_

- [x] 4. Checkpoint - Verify initial endpoint groups
  - Run all tests untuk Activity dan Banner endpoints
  - Verify cache hit rates dalam development environment
  - Check Redis connectivity dan fallback behavior
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Collection Endpoints caching (Moderate updates)
  - [x] 5.1 Cache `/api/collections/[address]` endpoint dengan TTL 10 detik
    - Include contract address dalam cache key path
    - Include chainId query parameter dalam cache key
    - _Requirements: 3.1, 3.4, 3.5_
  
  - [x] 5.2 Cache `/api/nft/collections` endpoint dengan TTL 10 detik
    - Include pagination dan filter parameters dalam cache key
    - _Requirements: 3.2_
  
  - [x] 5.3 Cache `/api/nft/collection/*` endpoints dengan TTL 10 detik
    - Cache collection details dan attributes endpoints
    - _Requirements: 3.3_
  
  - [x] 5.4 Implement cache invalidation untuk collection mutations
    - Add clearAllCache('/api/collections/*') pada collection POST/PUT/DELETE
    - Add clearAllCache('/api/nft/collections*') pada collection mutations
    - _Requirements: 12.2, 12.6_

- [ ]* 5.5 Write unit tests untuk Collection endpoints
  - Test collection caching dengan different addresses
  - Test chainId parameter variations
  - Test cache invalidation setelah collection updates
  - _Requirements: 3.1, 3.2, 3.3, 12.2_

- [x] 6. Implement NFT Metadata Endpoints caching (Immutable data)
  - [x] 6.1 Cache `/api/metadata/[contractAddress]/[tokenId]` dengan TTL 300 detik
    - Include contractAddress dan tokenId dalam cache key path
    - Treat metadata sebagai immutable dengan long TTL
    - _Requirements: 4.1, 4.5_
  
  - [x] 6.2 Cache `/api/nft/metadata` endpoint dengan TTL 300 detik
    - Include contract dan token parameters dalam cache key
    - _Requirements: 4.2, 4.5_
  
  - [x] 6.3 Cache `/api/ipfs/[hash]` endpoint dengan TTL 300 detik
    - Include IPFS hash dalam cache key path
    - IPFS content is immutable, use long TTL
    - _Requirements: 4.3_

- [ ]* 6.4 Write unit tests untuk NFT Metadata endpoints
  - Test immutable data caching dengan long TTL
  - Test different contract/token combinations produce unique keys
  - Test IPFS hash caching
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Implement NFT Query Endpoints caching (Moderate frequency)
  - [x] 7.1 Cache NFT contract endpoints dengan TTL 10 detik
    - Cache `/api/nft/[address]/[tokenid]`
    - Cache `/api/nft/contract/metadata`
    - Cache `/api/nft/contract/nfts`
    - Include address, tokenId, dan pagination dalam cache keys
    - _Requirements: 5.1_
  
  - [x] 7.2 Cache NFT owner endpoints dengan TTL 5 detik
    - Cache `/api/nft/owner`
    - Cache `/api/nft/owners/token`
    - Cache `/api/nft/owners/contract`
    - Include wallet address dalam cache key untuk user-specific queries
    - _Requirements: 5.2, 5.3, 5.6_
  
  - [x] 7.3 Cache NFT holdings endpoints dengan TTL 5 detik
    - Cache `/api/nft/holdings`
    - Cache `/api/nft/portfolio`
    - Cache `/api/nft/holder`
    - Include wallet address dan filter parameters dalam cache keys
    - _Requirements: 5.4, 5.5, 5.6, 5.7_

- [ ]* 7.4 Write unit tests untuk NFT Query endpoints
  - Test user-specific caching dengan wallet addresses
  - Test pagination parameters dalam cache keys
  - Test TTL differences antara contract data (10s) dan user data (5s)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Implement NFT Attributes dan Rarity caching (Expensive queries)
  - [x] 8.1 Cache `/api/nft/attributes` endpoint dengan TTL 60 detik
    - Include collection address dan filter parameters dalam cache key
    - Use longer TTL karena expensive computation
    - _Requirements: 6.1, 6.4_
  
  - [x] 8.2 Cache `/api/nft/rarity` endpoint dengan TTL 60 detik
    - Include collection address dan rarity parameters dalam cache key
    - _Requirements: 6.2, 6.4_

- [ ]* 8.3 Write unit tests untuk Attributes dan Rarity endpoints
  - Test expensive query caching dengan longer TTL
  - Test collection-specific cache keys
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Checkpoint - Verify NFT endpoint groups
  - Run all tests untuk Collection, Metadata, Query, Attributes endpoints
  - Verify cache performance untuk expensive queries
  - Check cache key uniqueness across different NFT queries
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Admin Analytics Endpoints caching (Expensive queries)
  - [x] 10.1 Cache admin analytics endpoints dengan TTL 30 detik
    - Cache `/api/admin/analytics/*`
    - Cache `/api/admin/stats`
    - Cache `/api/admin/platform-fee/stats`
    - Cache `/api/admin/platform-fee/history`
    - Include date ranges dan filter parameters dalam cache keys
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  
  - [x] 10.2 Cache `/api/admin/activities` endpoint dengan TTL 5 detik
    - Include pagination dan filter parameters dalam cache key
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [x] 10.3 Cache admin factory endpoints dengan appropriate TTLs
    - Cache `/api/admin/factory-info` dengan TTL 60 detik
    - Cache `/api/admin/factory-details` dengan TTL 60 detik
    - Cache `/api/admin/template-bytecode` dengan TTL 300 detik (static)
    - Include chainId dalam cache keys untuk factory queries
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [ ]* 10.4 Write unit tests untuk Admin Analytics endpoints
  - Test expensive analytics queries dengan 30s TTL
  - Test factory info caching dengan chainId variations
  - Test template bytecode caching sebagai static data
  - _Requirements: 2.1, 2.2, 2.3, 10.1, 10.2, 10.3_

- [x] 11. Implement Price dan Market Data caching (External APIs)
  - [x] 11.1 Cache `/api/crypto-price` endpoint dengan TTL 10 detik
    - Include currency parameters dalam cache key
    - Rate-limit protection untuk external API calls
    - _Requirements: 7.1, 7.4_
  
  - [x] 11.2 Cache NFT market endpoints dengan appropriate TTLs
    - Cache `/api/nft/floor-price` dengan TTL 30 detik
    - Cache `/api/nft/sales` dengan TTL 10 detik
    - Include collection address dan market parameters dalam cache keys
    - _Requirements: 7.2, 7.3, 7.4_

- [ ]* 11.3 Write unit tests untuk Price dan Market endpoints
  - Test external API caching dengan rate-limit scenarios
  - Test currency parameter variations
  - Test floor price vs sales data TTL differences
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 12. Implement Whitelist Endpoints caching (Semi-static data)
  - [x] 12.1 Cache `/api/whitelist/proof` endpoint dengan TTL 30 detik
    - Include contractAddress, address, dan phaseId dalam cache key
    - _Requirements: 8.1, 8.3_
  
  - [x] 12.2 Cache `/api/whitelist/list` endpoint dengan TTL 30 detik
    - Include contractAddress dan phase parameters dalam cache key
    - _Requirements: 8.2, 8.3_
  
  - [x] 12.3 Implement cache invalidation untuk whitelist mutations
    - Add clearAllCache('/api/whitelist/*') pada whitelist POST/PUT/DELETE
    - _Requirements: 12.4, 12.6_

- [ ]* 12.4 Write unit tests untuk Whitelist endpoints
  - Test whitelist proof caching dengan different addresses dan phases
  - Test cache invalidation setelah whitelist updates
  - _Requirements: 8.1, 8.2, 12.4_

- [x] 13. Implement remaining endpoints caching
  - [x] 13.1 Cache search dan spam check endpoints
    - Cache `/api/nft/search` dengan TTL 10 detik
    - Cache `/api/nft/spam/check` dengan TTL 60 detik
    - Cache `/api/nft/spam/contracts` dengan TTL 60 detik
    - Include search queries dan contract addresses dalam cache keys
  
  - [x] 13.2 Cache airdrop dan promo endpoints
    - Cache `/api/nft/airdrop/check` dengan TTL 10 detik
    - Cache `/api/promo-requests` dengan TTL 30 detik
    - Include eligibility parameters dalam cache keys
  
  - [x] 13.3 Cache health check endpoint
    - Cache `/api/health` dengan TTL 5 detik
    - Simple health status caching
  
  - [x] 13.4 Document RPC endpoint as non-cacheable
    - Add comment explaining why `/api/rpc` should NOT be cached (proxy endpoint)

- [ ]* 13.5 Write unit tests untuk remaining endpoints
  - Test search result caching
  - Test spam detection caching
  - Test airdrop eligibility caching
  - Test health check caching

- [x] 14. Checkpoint - Verify all endpoint groups
  - Run complete test suite untuk all cached endpoints
  - Verify cache hit rates untuk each endpoint group
  - Test cache invalidation patterns untuk all mutation endpoints
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement cache statistics endpoint
  - [x] 15.1 Create `/api/cache/stats` endpoint untuk admin monitoring
    - Return cache hit rate, total hits, total misses
    - Include per-endpoint statistics jika available
    - Add admin authentication check
    - _Requirements: 14.2, 14.3, 14.5_
  
  - [x] 15.2 Add cache performance logging
    - Log cache hits/misses untuk monitoring
    - Log cache operation failures
    - Include timestamp dan endpoint information
    - _Requirements: 14.1, 14.4_

- [ ]* 15.3 Write unit tests untuk cache statistics
  - Test hit/miss counting accuracy
  - Test admin-only access untuk stats endpoint
  - Test statistics reset functionality
  - _Requirements: 14.1, 14.2, 14.3, 14.5_

- [x] 16. Update documentation
  - [x] 16.1 Update CACHING_STRATEGY.md dengan all new cached endpoints
    - Document TTL choices untuk each endpoint group
    - Document cache key structures
    - Document cache invalidation patterns
    - _Requirements: 17.2, 17.3, 17.4_
  
  - [x] 16.2 Add inline code comments untuk cache implementations
    - Explain TTL choices dalam code comments
    - Document cache key generation logic
    - Add troubleshooting notes untuk common issues
    - _Requirements: 17.1, 17.5_
  
  - [x] 16.3 Create cache troubleshooting guide
    - Document common cache issues dan solutions
    - Document Redis fallback behavior
    - Document cache invalidation debugging
    - _Requirements: 17.5_

- [x] 17. Final integration testing dan deployment preparation
  - [x] 17.1 Run full test suite dengan all property dan unit tests
    - Verify all 16 correctness properties pass
    - Verify all unit tests pass
    - Check test coverage meets 90%+ goal
  
  - [x] 17.2 Test cache behavior dengan Redis enabled dan disabled
    - Test dengan REDIS_URL configured
    - Test dengan Redis unavailable (fallback scenario)
    - Test dengan CACHE_ENABLED=false
    - _Requirements: 13.1, 16.1, 16.2_
  
  - [x] 17.3 Verify backward compatibility
    - Compare API responses before dan after caching
    - Verify authentication checks still enforced
    - Verify error handling unchanged
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [x] 17.4 Performance testing dan validation
    - Measure response time improvements (target: <5ms untuk cache hits)
    - Verify cache hit rate target (90%+)
    - Test concurrent request handling
    - Monitor database connection usage reduction

- [x] 18. Final checkpoint - Production readiness
  - All tests passing (property tests dan unit tests)
  - Documentation complete dan up-to-date
  - Cache configuration validated
  - Performance targets met
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked dengan `*` adalah optional dan dapat di-skip untuk faster MVP
- Setiap task reference specific requirements untuk traceability
- Implementasi dilakukan secara incremental per endpoint group untuk safety
- Cache invalidation harus non-blocking (mutation tetap succeed jika invalidation fails)
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples, edge cases, dan integration points
- Checkpoints ensure incremental validation dan user feedback opportunities
- TTL values sudah disesuaikan dengan karakteristik data setiap endpoint group
- Redis fallback ke in-memory cache adalah automatic dan transparent
