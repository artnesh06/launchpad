# Analisis Contract Events dan Listener Coverage

## Executive Summary

Setelah menganalisis contract ABI dan listener yang ada, ditemukan bahwa **hanya 2 dari 26 events** yang saat ini di-handle oleh listener. Berikut adalah analisis lengkap dan rekomendasi.

---

## 📊 Events yang Tersedia di OddsLaunchpad Contract

### Total Events: 26

1. **Airdropped** - Batch airdrop NFT
2. **Approval** - ERC721 approval (standard)
3. **ApprovalForAll** - ERC721 approval for all (standard)
4. **BaseURIUpdated** - Update base URI metadata
5. **BatchMetadataUpdate** - Update metadata batch
6. **Burned** - NFT dibakar
7. **ConsecutiveTransfer** - Transfer batch (ERC721)
8. **ContractURIUpdated** - Update contract URI
9. **ExternalLinkUpdated** - Update external link
10. **Minted** - NFT di-mint (custom event)
11. **OwnershipTransferred** - Transfer ownership contract
12. **Paused** - Contract di-pause
13. **PhaseAdded** - Mint phase baru ditambahkan
14. **PhaseUpdated** - Mint phase di-update
15. **PlatformFeeToggled** - Platform fee diaktifkan/dinonaktifkan
16. **PlatformFlatFeeUpdated** - Platform fee di-update
17. **Revealed** - Collection di-reveal
18. **RoleAdminChanged** - Role admin berubah
19. **RoleGranted** - Role diberikan
20. **RoleRevoked** - Role dicabut
21. **RoyaltyUpdated** - Royalty di-update
22. **Transfer** - NFT ditransfer (ERC721 standard)
23. **TransferLockUpdated** - Transfer lock status berubah
24. **TreasuryUpdated** - Treasury address di-update
25. **Unpaused** - Contract di-unpause
26. **Withdrawn** - Funds ditarik

---

## ✅ Events yang Sudah Di-Handle

### 1. Transfer Event (untuk Mint Detection)
**File:** `src/lib/blockchain/activity-listener.ts` & `src/lib/mint-listener.ts`

```typescript
// Mendeteksi mint dengan filter Transfer dari zero address
contract.filters.Transfer(ethers.ZeroAddress, null, null)
```

**Activity Type:** `MINT_OCCURRED`

**Data yang Disimpan:**
- Minter address
- Token ID
- Transaction hash
- Block number
- Price
- Collection info

### 2. ContractDeployed Event (MasterContractFactory)
**File:** `src/lib/blockchain/blockchain-service.ts`

```typescript
contract.on('ContractDeployed', async (contractAddress, template, deployer, nonce) => {
  await this.syncLaunchpadToDatabase(chainId, contractAddress);
});
```

**Note:** Ini adalah event dari Factory contract, bukan dari Launchpad contract.

---

## ❌ Events yang BELUM Di-Handle (24 Events)

### 🔴 HIGH PRIORITY - Events Penting untuk User Activity

#### 1. **Burned** Event
**Kenapa Penting:**
- User membakar NFT mereka
- Mempengaruhi supply dan rarity
- Activity penting untuk ditampilkan

**Rekomendasi:**
```typescript
// Activity Type: BURN_OCCURRED
contract.on('Burned', async (owner, tokenId, event) => {
  // Record burn activity
});
```

#### 2. **Airdropped** Event
**Kenapa Penting:**
- Batch airdrop adalah aktivitas besar
- Menunjukkan distribusi NFT
- Marketing event yang signifikan

**Rekomendasi:**
```typescript
// Activity Type: AIRDROP_OCCURRED
contract.on('Airdropped', async (operator, recipientCount, totalQuantity, event) => {
  // Record airdrop activity
});
```

#### 3. **PhaseAdded** Event
**Kenapa Penting:**
- Mint phase baru = opportunity baru untuk minters
- User perlu notifikasi real-time
- Mempengaruhi mint strategy

**Rekomendasi:**
```typescript
// Activity Type: PHASE_CREATED (sudah ada di enum)
contract.on('PhaseAdded', async (phaseId, name, startTime, endTime, price, event) => {
  // Record phase creation
  // Trigger notifications
});
```

#### 4. **PhaseUpdated** Event
**Kenapa Penting:**
- Perubahan price, time, atau supply
- User perlu tahu perubahan rules
- Mempengaruhi mint decisions

**Rekomendasi:**
```typescript
// Activity Type: PHASE_UPDATED (sudah ada di enum)
contract.on('PhaseUpdated', async (phaseId, name, startTime, endTime, price, event) => {
  // Record phase update
  // Trigger notifications
});
```

#### 5. **Revealed** Event
**Kenapa Penting:**
- Reveal adalah moment penting dalam NFT lifecycle
- User menunggu reveal untuk tahu rarity
- High engagement moment

**Rekomendasi:**
```typescript
// Activity Type: COLLECTION_REVEALED (perlu ditambah ke enum)
contract.on('Revealed', async (baseURI, event) => {
  // Record reveal
  // Trigger notifications
  // Update metadata
});
```

---

### 🟡 MEDIUM PRIORITY - Events untuk Admin/Management

#### 6. **TreasuryUpdated** Event
**Kenapa Penting:**
- Transparency untuk fund management
- Security monitoring

**Rekomendasi:**
```typescript
// Activity Type: TREASURY_UPDATED (sudah ada di enum)
contract.on('TreasuryUpdated', async (oldTreasury, newTreasury, event) => {
  // Record treasury change
});
```

#### 7. **Withdrawn** Event
**Kenapa Penting:**
- Fund withdrawal tracking
- Financial transparency
- Security monitoring

**Rekomendasi:**
```typescript
// Activity Type: EMERGENCY_WITHDRAW (sudah ada di enum)
contract.on('Withdrawn', async (recipient, amount, event) => {
  // Record withdrawal
});
```

#### 8. **OwnershipTransferred** Event
**Kenapa Penting:**
- Critical security event
- Ownership changes perlu tracked
- Audit trail

**Rekomendasi:**
```typescript
// Activity Type: OWNERSHIP_TRANSFERRED (sudah ada di enum)
contract.on('OwnershipTransferred', async (previousOwner, newOwner, event) => {
  // Record ownership transfer
  // Alert admins
});
```

#### 9. **PlatformFeeToggled** Event
**Kenapa Penting:**
- Fee changes affect mint cost
- Transparency

**Rekomendasi:**
```typescript
// Activity Type: FEE_UPDATED (sudah ada di enum)
contract.on('PlatformFeeToggled', async (enabled, event) => {
  // Record fee toggle
});
```

#### 10. **PlatformFlatFeeUpdated** Event
**Kenapa Penting:**
- Fee changes affect mint cost
- Transparency

**Rekomendasi:**
```typescript
// Activity Type: FEE_UPDATED (sudah ada di enum)
contract.on('PlatformFlatFeeUpdated', async (newFee, event) => {
  // Record fee update
});
```

#### 11. **RoyaltyUpdated** Event
**Kenapa Penting:**
- Royalty changes affect secondary sales
- Creator earnings transparency

**Rekomendasi:**
```typescript
// Activity Type: ROYALTY_UPDATED (perlu ditambah ke enum)
contract.on('RoyaltyUpdated', async (recipient, percentage, event) => {
  // Record royalty update
});
```

---

### 🟢 LOW PRIORITY - Events untuk Metadata/UI Updates

#### 12. **BaseURIUpdated** Event
**Use Case:** Metadata URI changes

#### 13. **ContractURIUpdated** Event
**Use Case:** Contract metadata changes

#### 14. **ExternalLinkUpdated** Event
**Use Case:** External link changes

#### 15. **BatchMetadataUpdate** Event
**Use Case:** Batch metadata refresh (ERC4906)

---

### ⚪ OPTIONAL - Standard ERC721 Events

#### 16-18. **Approval**, **ApprovalForAll**, **Transfer**
**Note:** Transfer sudah di-handle untuk mint detection. Approval events biasanya tidak perlu di-track untuk activity feed.

---

### 🔒 SECURITY/ADMIN - Events untuk Monitoring

#### 19. **Paused** Event
**Use Case:** Contract paused (emergency)

#### 20. **Unpaused** Event
**Use Case:** Contract resumed

#### 21. **TransferLockUpdated** Event
**Use Case:** Transfer lock status changed

#### 22-24. **RoleAdminChanged**, **RoleGranted**, **RoleRevoked**
**Use Case:** Access control changes

---

## 📋 Rekomendasi Implementation Priority

### Phase 1: Critical User-Facing Events (Immediate)
1. ✅ **Burned** - User burns NFT
2. ✅ **Airdropped** - Batch airdrop
3. ✅ **PhaseAdded** - New mint phase
4. ✅ **PhaseUpdated** - Phase changes
5. ✅ **Revealed** - Collection reveal

### Phase 2: Admin/Management Events (Short-term)
6. ✅ **TreasuryUpdated** - Treasury changes
7. ✅ **Withdrawn** - Fund withdrawals
8. ✅ **OwnershipTransferred** - Ownership changes
9. ✅ **PlatformFeeToggled** - Fee toggle
10. ✅ **PlatformFlatFeeUpdated** - Fee updates
11. ✅ **RoyaltyUpdated** - Royalty changes

### Phase 3: Metadata/UI Events (Medium-term)
12. ✅ **BaseURIUpdated** - Metadata URI
13. ✅ **ContractURIUpdated** - Contract metadata
14. ✅ **ExternalLinkUpdated** - External links

### Phase 4: Security/Monitoring Events (Long-term)
15. ✅ **Paused** / **Unpaused** - Emergency controls
16. ✅ **TransferLockUpdated** - Transfer locks
17. ✅ **RoleGranted** / **RoleRevoked** - Access control

---

## 🔧 Required Changes

### 1. Update Prisma Schema
Tambahkan ActivityType baru:

```prisma
enum ActivityType {
  // Existing
  FACTORY_CREATED
  LAUNCHPAD_CREATED
  LAUNCHPAD_UPDATED
  MINT_OCCURRED
  PHASE_CREATED
  PHASE_UPDATED
  FEE_UPDATED
  TREASURY_UPDATED
  OWNERSHIP_TRANSFERRED
  EMERGENCY_WITHDRAW
  
  // New - Phase 1
  BURN_OCCURRED
  AIRDROP_OCCURRED
  COLLECTION_REVEALED
  
  // New - Phase 2
  ROYALTY_UPDATED
  
  // New - Phase 3
  METADATA_UPDATED
  
  // New - Phase 4
  CONTRACT_PAUSED
  CONTRACT_UNPAUSED
  TRANSFER_LOCK_UPDATED
  ROLE_GRANTED
  ROLE_REVOKED
}
```

### 2. Extend ActivityListener Class
Tambahkan method untuk setiap event handler di `src/lib/blockchain/activity-listener.ts`

### 3. Update Database Migration
```bash
npx prisma migrate dev --name add_new_activity_types
```

---

## 📊 Current Coverage Statistics

- **Total Events Available:** 26
- **Events Currently Handled:** 2 (7.7%)
- **Events Recommended (Phase 1):** 5
- **Events Recommended (All Phases):** 17
- **Coverage Gap:** 24 events (92.3%)

---

## 🎯 Impact Analysis

### Dengan Phase 1 Implementation:
- **User Activity Visibility:** +250% (dari 1 event type ke 6 event types)
- **Real-time Notifications:** Enabled untuk critical events
- **User Engagement:** Improved dengan reveal & phase notifications

### Dengan Full Implementation (All Phases):
- **Complete Activity Tracking:** 100% coverage
- **Admin Dashboard:** Full transparency
- **Security Monitoring:** Complete audit trail
- **User Experience:** Comprehensive activity feed

---

## 📝 Next Steps

1. **Review & Approve** priority phases
2. **Update Prisma Schema** dengan new ActivityTypes
3. **Implement Phase 1** event listeners
4. **Test** dengan testnet contracts
5. **Deploy** ke production
6. **Monitor** event capture rates
7. **Iterate** dengan Phase 2-4

---

## 📚 Related Documentation

- [Activity Listeners Documentation](./ACTIVITY_LISTENERS.md)
- [Contract Features Documentation](./CONTRACT_FEATURES_DOCUMENTATION.md)
- [ABI Functions Analysis](./ABI_FUNCTIONS_ANALYSIS.md)

---

**Generated:** 2025-11-20  
**Analyzed Contracts:** OddsLaunchpad.json, MasterContractFactory.json  
**Current Listeners:** activity-listener.ts, mint-listener.ts, blockchain-service.ts
