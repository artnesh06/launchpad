# NFT Display Components

This directory contains reusable UI components for displaying NFT collections and individual NFTs.

## Components

### NFTCard

A card component for displaying individual NFTs in a grid layout.

**Features:**
- Displays NFT image with lazy loading
- Shows NFT name and token ID
- Handles IPFS URL conversion automatically
- Fallback placeholder for missing images
- Hover effects and transitions
- Loading state with blur effect

**Props:**
```typescript
interface NFTCardProps {
  nft: NFTMetadata;
  onClick: () => void;
  className?: string;
}
```

**Usage:**
```tsx
<NFTCard 
  nft={nftData} 
  onClick={() => router.push(`/nft/${address}/${tokenId}`)} 
/>
```

### NFTGrid

A responsive grid layout for displaying multiple NFT cards with lazy loading.

**Features:**
- Responsive grid (1/2/3/4 columns based on screen size)
- Intersection Observer for lazy loading
- Loading skeleton states
- Empty state when no NFTs
- Automatic lazy loading as user scrolls

**Props:**
```typescript
interface NFTGridProps {
  nfts: NFTMetadata[];
  loading?: boolean;
  onNFTClick: (nft: NFTMetadata) => void;
  className?: string;
}
```

**Usage:**
```tsx
<NFTGrid 
  nfts={nftList} 
  loading={isLoading}
  onNFTClick={(nft) => handleNFTClick(nft)} 
/>
```

### NFTAttributes

Displays NFT attributes/traits in a structured grid layout.

**Features:**
- Grid layout for attributes
- Shows trait type and value
- Optional prevalence percentage with visual bar
- Responsive design (2-3 columns)
- Hover effects

**Props:**
```typescript
interface NFTAttributesProps {
  attributes: Array<{
    trait_type: string;
    value: string | number;
    prevalence?: number;
  }>;
  className?: string;
}
```

**Usage:**
```tsx
<NFTAttributes 
  attributes={nft.raw?.metadata?.attributes || []} 
/>
```

### RarityDisplay

Displays NFT rarity information including rank, score, and percentile.

**Features:**
- Rarity tier badge (Legendary, Epic, Rare, Uncommon, Common)
- Rank visualization with progress bar
- Rarity score display
- Percentile calculation
- Total supply context

**Props:**
```typescript
interface RarityDisplayProps {
  rarity: NFTRarity;
  totalSupply: number;
  className?: string;
}
```

**Usage:**
```tsx
<RarityDisplay 
  rarity={rarityData} 
  totalSupply={collection.totalSupply} 
/>
```

## Design System

All components follow the project's design system:

- **Border Color:** `#1E1F22` (consistent with create-studio pages)
- **Font:** Mono font family for all text
- **Colors:** Uses Tailwind CSS theme colors (primary, muted, foreground, etc.)
- **Responsive:** Mobile-first responsive design
- **Accessibility:** Proper semantic HTML and ARIA labels

## Image Handling

All components automatically handle IPFS URLs using the `ipfsToHttp` utility:
- Converts `ipfs://` URLs to HTTP gateway URLs
- Uses Pinata gateway by default
- Fallback to placeholder when images fail to load

## Lazy Loading

The NFTGrid component implements lazy loading using Intersection Observer:
- Images load 50px before entering viewport
- Reduces initial page load time
- Improves performance for large collections
- Skeleton loaders during loading state

## Requirements Validation

These components satisfy the following requirements:

- **Requirement 1.3:** NFT grid layout with thumbnail images, token IDs, and names ✓
- **Requirement 2.5:** Structured attribute display with trait types and values ✓
- **Requirement 10.2:** Rarity rank display ✓
- **Requirement 10.3:** Rarity score and percentile display ✓

## Example Usage

See `example-usage.tsx` for complete examples of all components.
