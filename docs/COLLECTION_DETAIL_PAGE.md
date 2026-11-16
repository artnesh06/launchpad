# Collection Detail Page

## Overview
Halaman detail collection mint yang dibuat berdasarkan desain Figma. Halaman ini menampilkan informasi lengkap tentang NFT collection dan memungkinkan user untuk melakukan mint.

## File Structure
```
src/app/collection/
├── layout.tsx              # Layout wrapper dengan NFTHeader
└── [id]/
    └── page.tsx           # Halaman detail collection (dynamic route)
```

## Features

### 1. Dynamic Routing
- URL: `/collection/[contractAddress]`
- Menggunakan contract address sebagai ID untuk mengambil data collection

### 2. Data Integration
- Fetch data dari API `/api/admin/launchpads?contractAddress={id}`
- Fallback ke mock data jika API gagal
- Real-time countdown timer

### 3. Mint Functionality
- Input jumlah NFT yang ingin di-mint
- Integrasi dengan ContractService untuk mint NFT
- Menampilkan konfirmasi dengan detail harga dan fee
- Error handling untuk berbagai kasus (rejected, insufficient funds, dll)

### 4. UI Components
- **Collection Image**: Gambar collection dengan aspect ratio 1:1
- **Title & Creator**: Gradient text untuk nama collection
- **Description**: Deskripsi collection
- **GTD Mint Badge**: Badge untuk menandai guaranteed mint
- **Progress Bar**: Visual progress minted vs total supply dengan glow effect
- **Mint Details Grid**: 
  - Sell Price
  - Wallet Limit
  - Eligible status
- **Mint Input**: Input jumlah + tombol Mint
- **Countdown Timer**: Real-time countdown
- **Contract Info**: Contract address (shortened) dengan copy button
- **Website Link**: Link ke website collection

### 5. Layout (Exact Figma Positioning)

**Desktop Layout (995px width, 450px height):**
- Container: 939px width, positioned 56px from left
- Left Content Area: 553px width
- Right Image Area: 386px width × 381px height, positioned at x: 553px

**Element Positions (from Figma):**
- Title: y: 10px, width: 490px, height: 32px
- Creator: y: 55px, height: 27px
- Chain: y: 82px, height: 27px
- Description: y: 123px, width: 496px, height: 61px
- GTD Badge: y: 201px, x: 57px, width: 147px, height: 38px
- Progress Bar: y: 259px, width: 493px, height: 35px
- Labels (Sel Price, Wallet Limit, Eligible): y: 323px
- Values: y: 350px
- # to Mint Label: y: 397px
- Input Box: y: 418px, x: 3px, width: 93px, height: 32px
- Mint Button: y: 418px, x: 114px, width: 182px, height: 32px
- Clock Icon: y: 427px, x: 317px
- Countdown: y: 429px, x: 340px
- Contract Address: y: 403px, x: 666px
- Website Link: y: 431px, x: 592px

**Mobile/Tablet Layout:**
- Responsive stacked layout
- Full-width image at top
- Content below with proper spacing

### 6. Design Details (Sesuai Figma)
- Font: Geist Mono
- Colors:
  - Background: #0D0E11
  - Text: #FFFFFF
  - Secondary: #B392F0
  - Muted: #857F94
  - Success: #59DA75
  - Progress: #0BFF75
  - Gradient: #EE6476 → #C770D7 → #00A2F6 → #00B2D1
- Border: #1E1F22
- Border radius: 5px, 8px
- Typography: Mengikuti exact sizing dari Figma (14px, 20px, 36px)

## Navigation

### Dari NFT Trending Table
Ada 2 cara untuk navigasi ke halaman detail:

1. **Klik pada row collection** - Klik di mana saja pada baris collection (kecuali tombol MINT)
2. **Klik tombol MINT** - Tombol MINT yang muncul saat hover akan mengarahkan ke halaman detail

Kedua cara ini akan membawa user ke `/collection/[contractAddress]`

### Back Button
- Tombol "Back" di halaman detail akan kembali ke halaman sebelumnya menggunakan `router.back()`

## Assets
- `/public/images/collection/collection-image.png` - Default collection image
- `/public/images/collection/clock-icon.svg` - Clock icon untuk countdown

## Usage Example

### Navigation
```typescript
// Navigate to collection detail
router.push(`/collection/${contractAddress}`);

// Or use Link component
<Link href={`/collection/${contractAddress}`}>
  View Collection
</Link>
```

### Wallet Connection Check
Halaman akan otomatis mengecek apakah wallet sudah terkoneksi sebelum melakukan mint. Jika belum, akan muncul alert untuk connect wallet terlebih dahulu.

## API Integration

### Fetch Collection Data
```typescript
const response = await fetch(`/api/admin/launchpads?contractAddress=${contractAddress}`);
const result = await response.json();
```

### Mint NFT
```typescript
const { ContractService } = await import('@/lib/contract-service');
const contractService = new ContractService();

// Get active phases
const phases = await contractService.getActiveMintPhases(chainId, contractAddress);

// Calculate cost
const cost = await contractService.calculateMintCost(chainId, contractAddress, phaseIndex, quantity);

// Execute mint
const txHash = await contractService.mintNFT(chainId, contractAddress, phaseIndex, quantity);
```

## Future Improvements
1. Add loading states untuk mint button
2. Add toast notifications untuk success/error
3. Add wallet connection check sebelum mint
4. Add phase selection jika ada multiple active phases
5. Add transaction history
6. Add social sharing buttons
7. Add favorite/bookmark functionality
8. Add real-time mint updates via WebSocket
