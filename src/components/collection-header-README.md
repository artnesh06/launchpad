# CollectionHeader Component

A comprehensive header component for displaying NFT collection information, including metadata, statistics, mint phases, and social links.

## Features

- **Banner Image Display**: Large banner image at the top (if available)
- **Collection Avatar**: Thumbnail/avatar image with fallback to initials
- **Collection Metadata**: Name, description, and basic information
- **Statistics Display**: Total supply, minted count, and mint progress percentage
- **Address Display**: Contract and creator addresses with copy-to-clipboard functionality
- **Social Links**: Twitter, Discord, and external website links (when available)
- **Mint Phases**: Display of launchpad mint phases with active phase highlighting
- **IPFS Support**: Automatic conversion of IPFS URLs to HTTP gateway URLs
- **Responsive Design**: Mobile-first responsive layout
- **Design System Compliance**: Follows project design system with mono fonts and border color `#1E1F22`

## Props

```typescript
interface CollectionHeaderProps {
  collection: ContractMetadata;      // Required: Collection metadata from Alchemy
  launchpadData?: LaunchpadData | null;  // Optional: Launchpad-specific data
  stats: CollectionStats;            // Required: Collection statistics
}

interface CollectionStats {
  totalSupply: number;    // Total number of NFTs in collection
  mintedCount: number;    // Number of NFTs minted
  mintPercentage: number; // Mint progress percentage (0-100)
}
```

## Usage

### Basic Usage

```tsx
import { CollectionHeader } from '@/components/collection-header';

function CollectionPage() {
  const collection = {
    address: '0x...',
    name: 'My NFT Collection',
    totalSupply: '10000',
    // ... other metadata
  };

  const stats = {
    totalSupply: 10000,
    mintedCount: 5000,
    mintPercentage: 50,
  };

  return <CollectionHeader collection={collection} stats={stats} />;
}
```

### With Launchpad Data

```tsx
import { CollectionHeader } from '@/components/collection-header';

function LaunchpadCollectionPage() {
  const collection = { /* ... */ };
  const launchpadData = {
    id: '1',
    name: 'Launchpad Collection',
    phases: [
      {
        name: 'Whitelist',
        price: '0.05',
        isActive: true,
        // ... other phase data
      },
    ],
    // ... other launchpad data
  };
  const stats = { /* ... */ };

  return (
    <CollectionHeader
      collection={collection}
      launchpadData={launchpadData}
      stats={stats}
    />
  );
}
```

## Component Structure

The component is organized into several sections:

1. **Banner Section** (optional): Full-width banner image at the top
2. **Collection Info Section**: Avatar, name, description, and social links
3. **Statistics Section**: Total supply, minted count, mint percentage, and token type
4. **Mint Phases Section** (optional): Display of mint phases when launchpad data is available

## Styling

The component follows the project's design system:

- **Font**: Mono font family for headings and labels
- **Border Color**: `#1E1F22` for all borders
- **Colors**: Uses theme colors (foreground, muted-foreground, primary, etc.)
- **Responsive**: Mobile-first with breakpoints at `md` (768px) and `lg` (1024px)

## Features in Detail

### Address Copy Functionality

Both contract and creator addresses have copy-to-clipboard buttons that:
- Copy the full address to clipboard
- Show a checkmark icon for 2 seconds after successful copy
- Handle errors gracefully

### Social Links

Social links are conditionally displayed:
- Only shown when at least one social link is available
- Opens in new tab with `noopener noreferrer` for security
- Includes Twitter, Discord, and external website links

### Mint Phases

When launchpad data includes mint phases:
- Displays all phases in a responsive grid
- Highlights active phases with a badge and border
- Shows phase details: price, max per wallet, total limit, start/end dates
- Formats dates in a readable format

### IPFS Support

The component automatically converts IPFS URLs to HTTP gateway URLs using the `ipfsToHttp` utility:
- Handles `ipfs://` protocol URLs
- Uses Pinata gateway by default
- Falls back gracefully if conversion fails

### Fallback Handling

The component handles missing data gracefully:
- Shows fallback avatar with initials when no image is available
- Hides sections when data is not available (e.g., social links, mint phases)
- Displays formatted addresses even when full metadata is missing

## Accessibility

- All interactive elements are keyboard accessible
- Copy buttons have proper `aria-label` attributes
- Social link buttons have descriptive labels
- Images have appropriate alt text

## Requirements Validation

This component validates the following requirements:

- **1.2**: Collection metadata display (name, description, images)
- **3.1**: Total supply and minted count statistics
- **3.2**: Mint progress percentage
- **3.3**: Mint phase information display
- **3.4**: Creator and contract address with copy functionality
- **3.5**: Social links display when available
- **4.1**: Design system color scheme and typography
- **4.2**: Banner image positioning at top
- **4.3**: Avatar component styling
- **4.4**: Border color consistency
- **4.5**: Mono font family usage

## Examples

See `collection-header-example.tsx` for complete usage examples including:
- Basic collection with OpenSea metadata
- Collection with launchpad data and mint phases
- Minimal collection without optional metadata
- Collection with IPFS images
- Collection with all social links
- Collection without social links
