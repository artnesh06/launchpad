# NFT Holding Tab Implementation

## Overview
Implementasi tab "Holding" pada NFT Trending Table yang menampilkan NFT yang dimiliki oleh user dalam bentuk card grid sesuai design Figma.

## Files Created

### 1. API Route: `/api/nft/owner`
**File:** `src/app/api/nft/owner/route.ts`

API endpoint untuk mendapatkan NFT yang dimiliki oleh wallet address menggunakan Alchemy NFT API.

**Endpoint:** `GET /api/nft/owner`

**Query Parameters:**
- `address` (required): Wallet address
- `pageSize` (optional): Number of NFTs per page (default: 20)
- `pageKey` (optional): Pagination key for next page
- `contractAddresses` (optional): Filter by specific contract addresses (comma-separated)
- `chainId` (optional): Chain ID to fetch NFTs from (1=Ethereum, 137=Polygon, 8453=Base, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "nfts": [
      {
        "contractAddress": "0x...",
        "tokenId": "123",
        "name": "NFT Name",
        "description": "Description",
        "image": "https://...",
        "floorPrice": 0.5,
        "collection": {
          "name": "Collection Name",
          "symbol": "SYMBOL"
        }
      }
    ],
    "pageKey": "next_page_key",
    "totalCount": 100
  }
}
```

**Features:**
- Fetches NFTs owned by wallet using Alchemy API
- Multi-chain support (Ethereum, Polygon, Base, Sepolia, etc.)
- Includes metadata and images
- Fetches floor prices from OpenSea
- Supports pagination
- Automatic network mapping based on chain ID

### 2. NFT Holding Card Component
**File:** `src/components/nft-holding-card.tsx`

Card component untuk menampilkan individual NFT sesuai design Figma.

**Props:**
- `contractAddress`: Contract address of NFT
- `tokenId`: Token ID
- `name`: NFT name
- `image`: NFT image URL (supports IPFS)
- `floorPrice`: Floor price in ETH
- `collection`: Collection info (name, symbol)
- `onList`: Callback for List button
- `onSend`: Callback for Send button

**Design Features:**
- Size: 191px x 285px
- Background: #0D0E11
- Border: #1E1F22
- Rounded corners: 10px
- Image area: 191px x 191px (top)
- Info area with token ID, floor price, and volume badge
- Two action buttons: List and Send

### 3. NFT Holding Grid Component
**File:** `src/components/nft-holding-grid.tsx`

Grid container untuk menampilkan multiple NFT cards dengan pagination.

**Props:**
- `walletAddress` (optional): Specific wallet address to fetch NFTs for. If not provided, uses connected wallet from wagmi.
- `chainFilter` (optional): Chain ID or 'all' to filter NFTs by chain (default: 'all')

**Features:**
- Auto-detects connected wallet using wagmi
- Responsive grid layout (1-5 columns based on screen size)
- Pagination with "Load More" button
- Loading and error states
- Empty state when no NFTs found
- Wallet connection prompt

### 4. Updated NFT Trending Table
**File:** `src/components/nft-trending-table.tsx`

Updated to integrate NFTHoldingGrid in the "Holding" tab.

**Changes:**
- Imported `NFTHoldingGrid` component
- Replaced `CollectionTable` with `NFTHoldingGrid` in holding tab
- Removed load more footer for holding tab (handled internally by grid)

## Design Implementation

### Figma Design Reference
**Node ID:** 2441-96
**File:** ODDS Launchpad

### Card Layout
```
┌─────────────────────┐
│                     │
│   NFT Image         │ 191x191px
│   (or Avatar)       │
│                     │
├─────────────────────┤
│ #112                │ Token ID (truncated if long)
│ FP: 0.2 ETH         │ Floor Price (or "FP: N/A")
│ SYMBOL / Name       │ Collection Symbol or Name
├──────────┬──────────┤
│   List   │   Send   │ Action Buttons
└──────────┴──────────┘
```

### Colors
- Card Background: `#0D0E11`
- Border: `#1E1F22`
- Image Placeholder: `#2D253E`
- Text Primary: `#FFFFFF`
- Text Secondary: `#6A7282`
- Volume Badge BG: `#1E192B`
- Volume Text: `#05DF72`
- Button BG: `#1E192B`
- Button Hover: `#2D253E`

### Typography
- Font Family: Geist Mono
- Token ID: 14px, medium, white
- Floor Price: 13.2px, normal, #6A7282
- Volume: 12px, normal, #05DF72
- Buttons: 14px, medium, white

## Usage

### Basic Usage
```tsx
import { NFTTrendingTable } from '@/components/nft-trending-table';

export default function Page() {
  return <NFTTrendingTable chainFilter="all" />;
}
```

### With Specific Wallet
```tsx
import { NFTHoldingGrid } from '@/components/nft-holding-grid';

export default function Page() {
  return <NFTHoldingGrid walletAddress="0x..." />;
}
```

### API Usage
```typescript
// Fetch NFTs for a wallet
const response = await fetch('/api/nft/owner?address=0x...&pageSize=20');
const data = await response.json();

// With pagination
const nextPage = await fetch(`/api/nft/owner?address=0x...&pageKey=${data.data.pageKey}`);
```

## Environment Variables

Required environment variables (already configured):
```env
ALCHEMY_API_KEY=your_alchemy_api_key
ALCHEMY_NETWORK=eth-mainnet
```

## Dependencies

- `wagmi`: For wallet connection
- `@/lib/alchemy-nft-service`: Alchemy NFT API service
- `@/lib/ipfs-utils`: IPFS URL conversion
- `@/components/ui/card`: Base card component

## Features

### Implemented
- ✅ NFT card component matching Figma design
- ✅ Grid layout with responsive columns (1-6 columns based on screen size)
- ✅ Fetch NFTs from Alchemy API
- ✅ Multi-chain support with automatic network mapping
- ✅ Floor price display from OpenSea
- ✅ IPFS image support with fallback avatar
- ✅ Pagination with load more button
- ✅ Wallet connection detection via wagmi
- ✅ Loading and error states
- ✅ Chain filter integration
- ✅ Token ID truncation for long IDs (ENS, etc.)
- ✅ Collection symbol/name display
- ✅ NFT count display
- ✅ Tooltip for full token ID and names

### TODO
- ⏳ List NFT functionality (marketplace integration)
- ⏳ Send NFT functionality (transfer)
- ⏳ Filter by collection
- ⏳ Sort options
- ⏳ Search functionality

## Testing

1. Connect wallet
2. Navigate to NFT Trending Table
3. Click "Holding" tab
4. View your NFTs in grid layout
5. Click "Load More" for pagination
6. Test List/Send buttons (console logs for now)

## Notes

- Floor prices are fetched from OpenSea via Alchemy
- Images support both HTTP and IPFS URLs with automatic conversion
- Pagination is handled automatically with pageKey
- Token IDs longer than 10 characters are truncated with "..." (hover to see full ID)
- Collection symbol is displayed if available, otherwise collection name
- Fallback avatar shows first letter of collection name if no image
- Grid is responsive: 1 column (mobile) to 6 columns (2xl screens)
- NFT count is displayed above the grid
- Action buttons (List/Send) prevent event bubbling

## Response Format

The API returns NFTs in this format:
```json
{
  "success": true,
  "data": {
    "nfts": [
      {
        "contractAddress": "0x...",
        "tokenId": "123",
        "name": "NFT Name",
        "description": "Description",
        "image": "https://...",
        "floorPrice": 0.5,
        "collection": {
          "name": "Collection Name",
          "symbol": "SYMBOL"
        }
      }
    ],
    "pageKey": "next_page_key",
    "totalCount": 100
  }
}
```

## Data Handling

### Token ID
- Short IDs (≤10 chars): Display as-is
- Long IDs (>10 chars): Truncate to 6 chars + "..."
- Hover shows full token ID in tooltip

### Images
- Priority: cachedUrl → thumbnailUrl → originalUrl
- IPFS URLs automatically converted to HTTP gateway
- Fallback: First letter of collection name as avatar

### Floor Price
- Fetched from OpenSea via Alchemy
- Displayed with 4 decimal places
- Shows "FP: N/A" if no floor price available

### Collection Info
- Priority: symbol → name → "Unknown"
- Truncated with ellipsis if too long
- Hover shows full text in tooltip
