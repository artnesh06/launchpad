# Requirements Document

## Introduction

Sistem ini akan mengimplementasikan caching pada semua API endpoint GET yang belum memiliki cache untuk meningkatkan performa dan mengurangi beban database. Implementasi akan menggunakan hybrid-cache yang sudah ada (kombinasi in-memory dan Redis) dengan TTL yang disesuaikan berdasarkan karakteristik data setiap endpoint.

## Glossary

- **Hybrid_Cache**: Sistem caching yang menggunakan Redis sebagai primary cache dan in-memory sebagai fallback
- **Cache_Key**: Identifier unik untuk setiap cache entry yang terdiri dari path dan query parameters
- **TTL**: Time To Live, durasi dalam detik sebelum cache entry dianggap expired
- **Cache_Hit**: Kondisi ketika data ditemukan di cache dan masih valid
- **Cache_Miss**: Kondisi ketika data tidak ditemukan di cache atau sudah expired
- **Cache_Invalidation**: Proses menghapus atau memperbarui cache entry ketika data berubah
- **Static_Data**: Data yang jarang berubah (contoh: chain configuration, template bytecode)
- **Frequent_Data**: Data yang sering diakses dengan update moderat (contoh: launchpad list, collections)
- **Real_Time_Data**: Data yang memerlukan kesegaran tinggi (contoh: recent mints, live activities)
- **Expensive_Query**: Query database yang memerlukan waktu eksekusi lama atau resource intensif
- **GET_Endpoint**: API endpoint yang hanya membaca data tanpa melakukan mutasi

## Requirements

### Requirement 1: Cache Implementation untuk Activity Endpoints

**User Story:** Sebagai pengguna, saya ingin melihat activity data dengan cepat, sehingga saya dapat memantau aktivitas platform secara real-time.

#### Acceptance Criteria

1. WHEN mengakses `/api/activity/recent`, THE Hybrid_Cache SHALL cache response dengan TTL 1 detik
2. WHEN mengakses `/api/activity/mints-chart`, THE Hybrid_Cache SHALL cache response dengan TTL 5 detik
3. WHEN mengakses `/api/activity/errors`, THE Hybrid_Cache SHALL cache response dengan TTL 10 detik
4. WHEN query parameters berbeda digunakan, THE System SHALL generate Cache_Key yang unik untuk setiap kombinasi
5. THE Cache_Key SHALL include semua query parameters yang mempengaruhi response data

### Requirement 2: Cache Implementation untuk Admin Analytics Endpoints

**User Story:** Sebagai admin, saya ingin mengakses analytics dan statistics dengan cepat, sehingga saya dapat membuat keputusan berdasarkan data terkini tanpa menunggu lama.

#### Acceptance Criteria

1. WHEN mengakses `/api/admin/analytics/*`, THE Hybrid_Cache SHALL cache response dengan TTL 30 detik
2. WHEN mengakses `/api/admin/stats/*`, THE Hybrid_Cache SHALL cache response dengan TTL 30 detik
3. WHEN mengakses `/api/admin/activities`, THE Hybrid_Cache SHALL cache response dengan TTL 5 detik
4. THE System SHALL include pagination parameters dalam Cache_Key generation
5. THE System SHALL include filter parameters dalam Cache_Key generation

### Requirement 3: Cache Implementation untuk Collection Endpoints

**User Story:** Sebagai pengguna, saya ingin melihat collection data dengan cepat, sehingga saya dapat browse NFT collections tanpa delay.

#### Acceptance Criteria

1. WHEN mengakses `/api/collections/[address]`, THE Hybrid_Cache SHALL cache response dengan TTL 10 detik
2. WHEN mengakses `/api/nft/collections`, THE Hybrid_Cache SHALL cache response dengan TTL 10 detik
3. WHEN mengakses `/api/nft/collection/*`, THE Hybrid_Cache SHALL cache response dengan TTL 10 detik
4. THE Cache_Key SHALL include contract address sebagai unique identifier
5. THE Cache_Key SHALL include chainId jika tersedia dalam query parameters

### Requirement 4: Cache Implementation untuk NFT Metadata Endpoints

**User Story:** Sebagai pengguna, saya ingin melihat NFT metadata dengan cepat, sehingga saya dapat melihat detail NFT tanpa loading yang lama.

#### Acceptance Criteria

1. WHEN mengakses `/api/metadata/[contractAddress]/[tokenId]`, THE Hybrid_Cache SHALL cache response dengan TTL 300 detik
2. WHEN mengakses `/api/nft/metadata/*`, THE Hybrid_Cache SHALL cache response dengan TTL 300 detik
3. WHEN mengakses `/api/ipfs/[hash]`, THE Hybrid_Cache SHALL cache response dengan TTL 300 detik
4. THE System SHALL treat metadata sebagai Static_Data dengan TTL lebih panjang
5. THE Cache_Key SHALL include contractAddress dan tokenId untuk uniqueness

### Requirement 5: Cache Implementation untuk NFT Query Endpoints

**User Story:** Sebagai pengguna, saya ingin query NFT data dengan cepat, sehingga saya dapat mencari dan filter NFT dengan performa baik.

#### Acceptance Criteria

1. WHEN mengakses `/api/nft/[address]/*`, THE Hybrid_Cache SHALL cache response dengan TTL 10 detik
2. WHEN mengakses `/api/nft/owner/*`, THE Hybrid_Cache SHALL cache response dengan TTL 5 detik
3. WHEN mengakses `/api/nft/owners/*`, THE Hybrid_Cache SHALL cache response dengan TTL 10 detik
4. WHEN mengakses `/api/nft/holdings/*`, THE Hybrid_Cache SHALL cache response dengan TTL 5 detik
5. WHEN mengakses `/api/nft/portfolio/*`, THE Hybrid_Cache SHALL cache response dengan TTL 5 detik
6. THE Cache_Key SHALL include wallet address untuk user-specific queries
7. THE Cache_Key SHALL include pagination dan filter parameters

### Requirement 6: Cache Implementation untuk NFT Attributes dan Rarity

**User Story:** Sebagai pengguna, saya ingin melihat NFT attributes dan rarity dengan cepat, sehingga saya dapat mengevaluasi NFT berdasarkan trait dan kelangkaannya.

#### Acceptance Criteria

1. WHEN mengakses `/api/nft/attributes/*`, THE Hybrid_Cache SHALL cache response dengan TTL 60 detik
2. WHEN mengakses `/api/nft/rarity/*`, THE Hybrid_Cache SHALL cache response dengan TTL 60 detik
3. THE System SHALL treat attributes dan rarity sebagai Expensive_Query dengan TTL lebih panjang
4. THE Cache_Key SHALL include collection address dan query filters

### Requirement 7: Cache Implementation untuk Price dan Market Data

**User Story:** Sebagai pengguna, saya ingin melihat price data dengan cepat, sehingga saya dapat membuat keputusan trading berdasarkan harga terkini.

#### Acceptance Criteria

1. WHEN mengakses `/api/crypto-price`, THE Hybrid_Cache SHALL cache response dengan TTL 10 detik
2. WHEN mengakses `/api/nft/floor-price/*`, THE Hybrid_Cache SHALL cache response dengan TTL 30 detik
3. WHEN mengakses `/api/nft/sales/*`, THE Hybrid_Cache SHALL cache response dengan TTL 10 detik
4. THE Cache_Key SHALL include currency dan market parameters

### Requirement 8: Cache Implementation untuk Whitelist Endpoints

**User Story:** Sebagai pengguna, saya ingin verify whitelist status dengan cepat, sehingga saya dapat mint NFT tanpa delay saat whitelist check.

#### Acceptance Criteria

1. WHEN mengakses `/api/whitelist/proof`, THE Hybrid_Cache SHALL cache response dengan TTL 30 detik
2. WHEN mengakses `/api/whitelist/list`, THE Hybrid_Cache SHALL cache response dengan TTL 30 detik
3. THE Cache_Key SHALL include contractAddress, address, dan phaseId
4. THE System SHALL treat whitelist data sebagai semi-static dengan TTL moderat

### Requirement 9: Cache Implementation untuk Banner dan Static Content

**User Story:** Sebagai pengguna, saya ingin melihat banners dan static content dengan cepat, sehingga UI dapat load dengan performa optimal.

#### Acceptance Criteria

1. WHEN mengakses `/api/banners`, THE Hybrid_Cache SHALL cache response dengan TTL 300 detik
2. WHEN mengakses `/api/admin/banners`, THE Hybrid_Cache SHALL cache response dengan TTL 300 detik
3. THE System SHALL treat banners sebagai Static_Data dengan TTL paling panjang
4. THE Cache_Key SHALL include status filter jika tersedia

### Requirement 10: Cache Implementation untuk Admin Factory dan Template Endpoints

**User Story:** Sebagai admin, saya ingin mengakses factory dan template data dengan cepat, sehingga saya dapat manage launchpad configuration dengan efisien.

#### Acceptance Criteria

1. WHEN mengakses `/api/admin/factory-info`, THE Hybrid_Cache SHALL cache response dengan TTL 60 detik
2. WHEN mengakses `/api/admin/factory-details`, THE Hybrid_Cache SHALL cache response dengan TTL 60 detik
3. WHEN mengakses `/api/admin/template-bytecode`, THE Hybrid_Cache SHALL cache response dengan TTL 300 detik
4. THE System SHALL treat template bytecode sebagai Static_Data
5. THE Cache_Key SHALL include chainId untuk factory queries

### Requirement 11: Cache Key Generation Consistency

**User Story:** Sebagai developer, saya ingin cache key generation yang konsisten, sehingga cache dapat berfungsi dengan benar dan predictable.

#### Acceptance Criteria

1. THE System SHALL use `getCacheKey` function dari hybrid-cache untuk semua cache key generation
2. WHEN query parameters ada, THE System SHALL include semua parameters dalam sorted order
3. WHEN path parameters ada, THE System SHALL include parameters dalam cache key path
4. THE System SHALL normalize parameter values untuk consistency
5. THE Cache_Key SHALL be deterministic untuk input yang sama

### Requirement 12: Cache Invalidation untuk Mutation Endpoints

**User Story:** Sebagai developer, saya ingin cache ter-invalidate otomatis ketika data berubah, sehingga users selalu melihat data terkini setelah update.

#### Acceptance Criteria

1. WHEN POST/PUT/DELETE operation berhasil pada launchpad, THE System SHALL invalidate cache dengan pattern `/api/admin/launchpads*`
2. WHEN POST/PUT/DELETE operation berhasil pada collection, THE System SHALL invalidate cache dengan pattern `/api/collections/*` dan `/api/nft/collections*`
3. WHEN POST/PUT/DELETE operation berhasil pada banner, THE System SHALL invalidate cache dengan pattern `/api/banners*` dan `/api/admin/banners*`
4. WHEN POST/PUT/DELETE operation berhasil pada whitelist, THE System SHALL invalidate cache dengan pattern `/api/whitelist/*`
5. THE System SHALL use `invalidateCache` atau `clearAllCache` function dari hybrid-cache
6. IF cache invalidation fails, THEN THE System SHALL log error tetapi tidak menggagalkan mutation operation

### Requirement 13: Error Handling dan Fallback

**User Story:** Sebagai developer, saya ingin sistem tetap berfungsi ketika cache error, sehingga users tidak mengalami downtime karena cache issues.

#### Acceptance Criteria

1. WHEN Redis tidak tersedia, THE Hybrid_Cache SHALL fallback ke in-memory cache
2. WHEN cache read fails, THE System SHALL fetch data dari database dan log error
3. WHEN cache write fails, THE System SHALL continue serving response dan log error
4. THE System SHALL NOT cache error responses
5. THE System SHALL NOT throw exception ketika cache operation fails

### Requirement 14: Cache Performance Monitoring

**User Story:** Sebagai developer, saya ingin monitor cache performance, sehingga saya dapat optimize TTL dan identify issues.

#### Acceptance Criteria

1. THE System SHALL track Cache_Hit dan Cache_Miss count untuk monitoring
2. THE System SHALL provide endpoint `/api/cache/stats` untuk view cache statistics
3. WHEN accessing cache stats, THE System SHALL return hit rate, total hits, dan total misses
4. THE System SHALL log cache performance metrics untuk analysis
5. THE Cache statistics SHALL be accessible hanya untuk admin users

### Requirement 15: Backward Compatibility

**User Story:** Sebagai developer, saya ingin implementasi cache tidak break existing functionality, sehingga deployment dapat dilakukan dengan aman.

#### Acceptance Criteria

1. THE System SHALL maintain existing API response format setelah cache implementation
2. THE System SHALL maintain existing error handling behavior
3. THE System SHALL maintain existing authentication dan authorization checks
4. WHEN cache is disabled via environment variable, THE System SHALL function normally tanpa cache
5. THE System SHALL be deployable secara incremental per endpoint group

### Requirement 16: Cache Configuration Management

**User Story:** Sebagai developer, saya ingin configure cache behavior via environment variables, sehingga saya dapat adjust cache settings tanpa code changes.

#### Acceptance Criteria

1. THE System SHALL support `CACHE_ENABLED` environment variable untuk enable/disable cache globally
2. THE System SHALL support `REDIS_URL` environment variable untuk Redis connection
3. THE System SHALL use default TTL values jika tidak specified
4. THE System SHALL allow TTL override via environment variables untuk specific endpoint groups
5. THE System SHALL validate environment variables pada startup

### Requirement 17: Documentation dan Code Comments

**User Story:** Sebagai developer, saya ingin dokumentasi yang jelas tentang cache implementation, sehingga saya dapat maintain dan extend cache functionality.

#### Acceptance Criteria

1. THE System SHALL include inline comments explaining cache TTL choices untuk setiap endpoint
2. THE System SHALL document cache key structure untuk setiap endpoint type
3. THE System SHALL update CACHING_STRATEGY.md dengan new cached endpoints
4. THE System SHALL include examples untuk cache invalidation patterns
5. THE System SHALL document troubleshooting steps untuk common cache issues

