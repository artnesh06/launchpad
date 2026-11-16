# Implementasi Modal Sukses Mint

## Overview

Implementasi modal sukses mint yang muncul setelah user berhasil melakukan mint NFT, baik di halaman launchpad detail (`/l/[id]`) maupun di homepage (`/`) melalui nft-trending-table.

## Design Reference

Design Figma: https://www.figma.com/design/6BSJBFTKSNnXaLUUNqPy6N/ODDS-Laucnhpad?node-id=3958-322

## Komponen yang Dibuat

### 1. MintSuccessModal Component

**File:** `src/components/modal/mint-success-modal.tsx`

**Props:**
```typescript
interface MintSuccessModalProps {
  open: boolean;
  onClose: () => void;
  mintData: {
    tokenIds: string[];
    quantity: number;
    txHash: string;
    chainId: number;
    contractAddress: string;
    collectionName: string;
    collectionImage?: string;
  };
}
```

**Fitur:**
- ✅ Menampilkan status sukses dengan icon checkmark hijau
- ✅ Grid preview NFT yang di-mint (1-4 NFT ditampilkan)
- ✅ Menampilkan "+X more" jika lebih dari 4 NFT
- ✅ Informasi collection dengan image dan nama
- ✅ Daftar Token IDs yang di-mint
- ✅ Tombol "View on Explorer" untuk melihat transaksi
- ✅ Tombol "Share" untuk share ke Twitter
- ✅ Tombol "Close" untuk menutup modal
- ✅ Loading state untuk fetch NFT images
- ✅ Fallback ke collection image jika NFT image tidak tersedia

### 2. API Endpoint untuk NFT Detail

**File:** `src/app/api/nft/[chainId]/[contractAddress]/[tokenId]/route.ts`

**Endpoint:** `GET /api/nft/{chainId}/{contractAddress}/{tokenId}`

**Response:**
```json
{
  "id": "string",
  "chainId": number,
  "contractAddress": "string",
  "tokenId": "string",
  "name": "string",
  "description": "string",
  "image": {
    "cachedUrl": "string",
    "thumbnailUrl": "string",
    "pngUrl": "string",
    "originalUrl": "string"
  },
  "attributes": [...],
  "ownership": {...}
}
```

## Integrasi

### 1. Launchpad Detail Page

**File:** `src/app/(package)/l/[id]/page.tsx`

**Perubahan:**
1. Import `MintSuccessModal` component
2. Tambah state untuk modal dan mint data:
```typescript
const [mintSuccessModalOpen, setMintSuccessModalOpen] = useState(false);
const [lastMintData, setLastMintData] = useState<{...} | null>(null);
```

3. Listen ke `useWalletMint` hook untuk detect mint baru:
```typescript
useEffect(() => {
  if (userMints.length > 0 && collection) {
    const latestMint = userMints[0];
    
    if (latestMint.animationState === 'entering') {
      // Collect recent mints (within 5 seconds)
      const recentMints = userMints.filter(mint => {
        const timeDiff = now.getTime() - mint.timestamp.getTime();
        return timeDiff < 5000;
      });

      setLastMintData({
        tokenIds: recentMints.map(m => m.tokenId),
        quantity: recentMints.length,
        txHash: '',
        chainId: getChainIdFromName(collection.chain),
        contractAddress: collection.contractAddress,
        collectionName: collection.name,
        collectionImage: collection.image || undefined,
      });
      
      setMintSuccessModalOpen(true);
    }
  }
}, [userMints, collection]);
```

4. Render modal:
```tsx
{lastMintData && (
  <MintSuccessModal
    open={mintSuccessModalOpen}
    onClose={() => setMintSuccessModalOpen(false)}
    mintData={lastMintData}
  />
)}
```

### 2. Homepage NFT Trending Table (MintDrawer)

**File:** `src/components/mint-drawer.tsx`

**Perubahan:**
1. Import `MintSuccessModal` dan `useWalletMint`
2. Tambah state untuk modal dan mint data (sama seperti launchpad page)
3. Gunakan `useWalletMint` hook untuk track user mints
4. Listen ke user mints dan show modal (sama seperti launchpad page)
5. Render modal di dalam Drawer component

## Data Flow

### 1. Mint Transaction
```
User clicks Mint
  ↓
Transaction submitted to blockchain
  ↓
Transaction confirmed
  ↓
nft-listener-service detects mint event
  ↓
WebSocket event emitted to wallet room
```

### 2. WebSocket Event
```
Event emitted to: wallet:{walletAddress}
Event type: 'mint'
Event data: {
  contractAddress: string,
  chainId: number,
  minter: string,
  tokenId: string,
  quantity: number,
  timestamp: string,
  transactionHash: string,
  imageUrl?: string
}
```

### 3. Frontend Detection
```
useWalletMint hook receives event
  ↓
Creates UserMint entry with animationState: 'entering'
  ↓
useEffect detects new mint (animationState === 'entering')
  ↓
Collects recent mints (within 5 seconds)
  ↓
Sets lastMintData and opens modal
  ↓
Modal fetches NFT images from API
  ↓
Displays success modal with NFT previews
```

## Event Listener (nft-listener-service)

### Event yang Di-emit

**File:** `nft-listener-service/src/lib/websocket/event-emitter.ts`

**Function:** `emitMintEvent(data: MintEventData)`

**Rooms yang Menerima Event:**
1. `homepage:all` - Semua user di homepage
2. `homepage:chain:{chainId}` - User yang filter by chain
3. `launchpad:{contractAddress}` - User di halaman launchpad detail
4. `wallet:{minterAddress}` - User yang melakukan mint (untuk modal)

**Data yang Di-emit:**
```typescript
interface MintEventData {
  contractAddress: string;
  chainId: number;
  minter: string;
  tokenId: string;
  quantity: number;
  timestamp: string;
  transactionHash: string;
  phaseId?: string;
  imageUrl?: string;
}
```

## Testing

### Manual Testing Steps

1. **Test di Launchpad Page:**
   - Buka `/l/[contractAddress]`
   - Connect wallet
   - Mint 1 NFT → Modal harus muncul dengan 1 NFT preview
   - Mint 3 NFT sekaligus → Modal harus muncul dengan 3 NFT previews
   - Mint 5 NFT sekaligus → Modal harus muncul dengan 4 NFT previews + "+1 more"

2. **Test di Homepage:**
   - Buka `/`
   - Hover collection row → Tombol MINT muncul
   - Click MINT → Drawer terbuka
   - Mint NFT → Modal sukses muncul

3. **Test Fitur Modal:**
   - Click "View on Explorer" → Buka block explorer dengan txHash
   - Click "Share" → Buka Twitter dengan pre-filled tweet
   - Click "Close" → Modal tertutup
   - Click outside modal → Modal tertutup

4. **Test Edge Cases:**
   - Mint saat NFT image belum tersedia → Fallback ke collection image
   - Mint multiple NFT dalam waktu dekat → Semua token IDs terkumpul
   - Network error saat fetch NFT → Graceful fallback

## Styling

Modal menggunakan design system yang sama dengan aplikasi:
- Background: `#0D0E11`
- Border: `#2F3336`
- Success color: `#0BFF75`
- Primary color: `#B392F0`
- Text colors: `white`, `#857F94`, `#6A7282`

## Dependencies

- `@/components/ui/dialog` - Dialog component dari shadcn/ui
- `@/components/ui/button` - Button component
- `@/hooks/useWalletMint` - Hook untuk track user mints
- `@/config/chains` - Chain configuration
- `@/lib/ipfs-utils` - IPFS URL conversion
- `@hugeicons/react` & `@hugeicons/core-free-icons` - Icons (Cancel01Icon, ExternalLinkIcon, etc.)

## Future Improvements

1. **Animation:**
   - Tambah confetti animation saat modal muncul
   - Smooth transition untuk NFT images loading

2. **Social Sharing:**
   - Tambah share ke Discord, Telegram
   - Generate share image dengan NFT preview

3. **NFT Preview:**
   - Support video/audio NFTs
   - 3D model preview untuk 3D NFTs

4. **Analytics:**
   - Track modal open rate
   - Track share button clicks
   - Track explorer link clicks

5. **Notification:**
   - Browser notification untuk mint sukses
   - Email notification (optional)

## Troubleshooting

### Modal tidak muncul setelah mint
- Check WebSocket connection: `isConnected` harus `true`
- Check wallet address match: `minter` harus sama dengan `address`
- Check console untuk error messages
- Verify nft-listener-service running dan emit events

### NFT images tidak muncul
- Check API endpoint `/api/nft/[chainId]/[contractAddress]/[tokenId]`
- Check database memiliki NFT data
- Check IPFS gateway accessible
- Verify fallback ke collection image works

### Modal muncul multiple kali
- Check `animationState === 'entering'` condition
- Verify useEffect dependencies correct
- Check mint event tidak di-emit duplicate

## Related Files

- `src/components/modal/mint-success-modal.tsx` - Modal component
- `src/app/(package)/l/[id]/page.tsx` - Launchpad page integration
- `src/components/mint-drawer.tsx` - Homepage mint drawer integration
- `src/app/api/nft/[chainId]/[contractAddress]/[tokenId]/route.ts` - NFT API endpoint
- `src/hooks/useWalletMint.ts` - Wallet mint tracking hook
- `src/types/websocket.ts` - WebSocket type definitions
- `nft-listener-service/src/lib/websocket/event-emitter.ts` - Event emitter
- `nft-listener-service/src/lib/blockchain/activity-listener.ts` - Blockchain listener

## Conclusion

Implementasi modal sukses mint sudah selesai dan terintegrasi dengan:
- ✅ Launchpad detail page
- ✅ Homepage nft-trending-table (via MintDrawer)
- ✅ WebSocket real-time updates
- ✅ NFT metadata API
- ✅ Design sesuai Figma

Modal akan otomatis muncul setelah user berhasil mint NFT, menampilkan preview NFT yang di-mint, dan menyediakan aksi untuk view transaction dan share ke social media.
