# Fix: IPFS Images Not Displaying

## Problem
Cover images tidak tampil di NFT Trending Table dan Collection Detail page meskipun sudah tersimpan di database dengan format `ipfs://Qm...`

## Root Cause
Browser tidak bisa langsung menampilkan IPFS URLs dengan format `ipfs://`. URL ini perlu dikonversi ke HTTP gateway URL seperti `https://eu.orbitor.dev/ipfs/Qm...`

## Solution

### 1. Create IPFS Utility Functions (`src/lib/ipfs-utils.ts`)

```typescript
/**
 * Convert IPFS URI to HTTP URL
 * @param ipfsUri - IPFS URI (ipfs://Qm... or Qm...)
 * @param gateway - IPFS gateway URL (optional)
 * @returns HTTP URL
 */
export function ipfsToHttp(
  ipfsUri: string | null | undefined, 
  gateway: string = 'https://eu.orbitor.dev'
): string | null {
  if (!ipfsUri) return null;

  // If already HTTP URL, return as-is
  if (ipfsUri.startsWith('http://') || ipfsUri.startsWith('https://')) {
    return ipfsUri;
  }

  // Remove ipfs:// prefix if present
  const hash = ipfsUri.replace('ipfs://', '');

  // Return gateway URL
  return `${gateway}/ipfs/${hash}`;
}
```

**Features:**
- ✅ Converts `ipfs://Qm...` to `https://eu.orbitor.dev/ipfs/Qm...`
- ✅ Handles URLs without `ipfs://` prefix
- ✅ Returns HTTP URLs as-is (no conversion needed)
- ✅ Returns `null` for invalid/empty input
- ✅ Configurable gateway (default: Pinata)

**Additional Functions:**
- `isValidIpfsHash()` - Validate IPFS hash format
- `getIpfsGateways()` - Get list of fallback gateways
- `ipfsToHttpWithFallbacks()` - Get multiple gateway URLs for redundancy

### 2. Update NFT Trending Table

**Before:**
```typescript
const coverImage = launchpad.metadata?.image || launchpad.metadata?.coverImage;
```

**After:**
```typescript
import { ipfsToHttp } from '@/lib/ipfs-utils';

const coverImageRaw = launchpad.metadata?.image || launchpad.metadata?.coverImage;
const coverImage = coverImageRaw ? ipfsToHttp(coverImageRaw) : undefined;
```

### 3. Update Collection Detail Page

**Before:**
```typescript
image: launchpad.metadata?.image || "/images/collection/collection-image.png"
```

**After:**
```typescript
import { ipfsToHttp } from '@/lib/ipfs-utils';

const imageUrl = launchpad.metadata?.image 
  ? (ipfsToHttp(launchpad.metadata.image) || "/images/collection/collection-image.png")
  : "/images/collection/collection-image.png";

// Use imageUrl in CollectionData
```

## URL Conversion Examples

### Example 1: IPFS Protocol URL
```
Input:  ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
Output: https://eu.orbitor.dev/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
```

### Example 2: IPFS Hash Only
```
Input:  QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
Output: https://eu.orbitor.dev/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
```

### Example 3: Already HTTP URL
```
Input:  https://example.com/image.png
Output: https://example.com/image.png (no conversion)
```

### Example 4: Null/Undefined
```
Input:  null
Output: null
```

## IPFS Gateways

### Primary Gateway (Default)
- **Pinata**: `https://eu.orbitor.dev`
  - Fast, reliable
  - Good uptime
  - No rate limits for public content

### Fallback Gateways
- **IPFS.io**: `https://ipfs.io`
- **Cloudflare**: `https://cloudflare-ipfs.com`
- **Dweb.link**: `https://dweb.link`

### Usage with Custom Gateway
```typescript
// Use different gateway
const url = ipfsToHttp('ipfs://Qm...', 'https://ipfs.io');

// Get all fallback URLs
const urls = ipfsToHttpWithFallbacks('ipfs://Qm...');
// Returns: [
//   'https://eu.orbitor.dev/ipfs/Qm...',
//   'https://ipfs.io/ipfs/Qm...',
//   'https://cloudflare-ipfs.com/ipfs/Qm...',
//   'https://dweb.link/ipfs/Qm...'
// ]
```

## Testing

### Test Case 1: NFT Trending Table
1. Create launchpad with cover image
2. Check API response: `metadata.image` should be `ipfs://Qm...`
3. Check browser: Image should display using gateway URL
4. ✅ Image visible in table

### Test Case 2: Collection Detail Page
1. Click on collection in trending table
2. Navigate to `/collection/[id]`
3. Check image source in DevTools
4. ✅ Should be `https://eu.orbitor.dev/ipfs/...`

### Test Case 3: Fallback to Avatar
1. Create launchpad without cover image
2. Check trending table
3. ✅ Should show letter avatar (fallback)

## Benefits

✅ **Images Display Correctly**: IPFS URLs converted to HTTP
✅ **Browser Compatible**: Works in all browsers
✅ **Fallback Support**: Multiple gateways available
✅ **Flexible**: Easy to change gateway
✅ **Type Safe**: Proper TypeScript types
✅ **Reusable**: Utility can be used anywhere in app

## Files Changed

1. **New File**: `src/lib/ipfs-utils.ts`
   - IPFS utility functions
   - Gateway configuration
   - URL conversion logic

2. **Updated**: `src/components/nft-trending-table.tsx`
   - Import `ipfsToHttp`
   - Convert image URL before use

3. **Updated**: `src/app/collection/[id]/page.tsx`
   - Import `ipfsToHttp`
   - Convert image URL before display

## Future Improvements

- [ ] Add image loading states
- [ ] Add error handling for failed image loads
- [ ] Implement automatic gateway fallback on error
- [ ] Add image caching
- [ ] Support for IPFS CIDv1 format
- [ ] Add image optimization/resizing via gateway params

## Related Issues

- ✅ Cover image not displaying in trending table
- ✅ Collection detail page showing broken images
- ✅ IPFS URLs not browser-compatible
