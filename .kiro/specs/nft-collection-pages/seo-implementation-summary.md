# SEO and Meta Tags Implementation Summary

## Overview
Implemented comprehensive SEO and meta tags for NFT collection and detail pages, including Open Graph tags for social media sharing, JSON-LD structured data, and Next.js image optimization configuration.

## Implementation Details

### 1. SEO Utilities (`src/lib/seo-utils.ts`)
Created a utility module with functions to generate:
- **Collection Metadata**: Dynamic meta tags for collection pages including title, description, and images
- **NFT Metadata**: Dynamic meta tags for individual NFT pages
- **Collection Structured Data**: JSON-LD schema for collection pages (CollectionPage type)
- **NFT Structured Data**: JSON-LD schema for NFT pages (VisualArtwork type)

Key features:
- IPFS URL conversion for images
- Fallback values for missing metadata
- Twitter card support with creator attribution
- Canonical URL generation

### 2. Next.js Image Optimization (`next.config.ts`)
Added remote image patterns for:
- **Alchemy CDN**: 
  - `res.cloudinary.com`
  - `nft-cdn.alchemy.com`
  - `alchemy.mypinata.cloud`
- **OpenSea CDN**:
  - `i.seadn.io`
  - `openseauserdata.com`
- **IPFS Gateways** (already configured):
  - `gateway.pinata.cloud`
  - `ipfs.io`
  - `cloudflare-ipfs.com`
  - `dweb.link`

### 3. Collection Page Meta Tags
Added to `src/app/(package)/collection/[address]/page.tsx`:
- Dynamic `<Head>` component with:
  - Title and description
  - Open Graph tags (og:title, og:description, og:image, og:url, og:type)
  - Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image, twitter:creator)
  - Canonical URL
- JSON-LD structured data script tag with CollectionPage schema
- Metadata includes:
  - Collection name and description
  - Banner/thumbnail images (IPFS converted)
  - Mint statistics (minted count, total supply, percentage)
  - Social links (Twitter username if available)

### 4. NFT Detail Page Meta Tags
Added to `src/app/(package)/nft/[address]/[tokenid]/page.tsx`:
- Dynamic `<Head>` component with:
  - Title and description
  - Open Graph tags
  - Twitter Card tags
  - Canonical URL
- JSON-LD structured data script tag with VisualArtwork schema
- Metadata includes:
  - NFT name and description
  - NFT image (IPFS converted)
  - Collection context
  - Ownership information
  - Attributes as PropertyValue schema

## Schema.org Structured Data

### Collection Page Schema
```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Collection Name",
  "description": "Collection description",
  "url": "https://odds.wtf/collection/0x...",
  "image": "https://...",
  "creator": {
    "@type": "Person",
    "identifier": "0x..."
  },
  "about": {
    "@type": "CreativeWork",
    "name": "Collection Name",
    "identifier": "0x...",
    "additionalType": "NFT Collection"
  },
  "numberOfItems": 1000
}
```

### NFT Detail Page Schema
```json
{
  "@context": "https://schema.org",
  "@type": "VisualArtwork",
  "name": "NFT Name",
  "description": "NFT description",
  "image": "https://...",
  "identifier": "0x.../123",
  "url": "https://odds.wtf/nft/0x.../123",
  "creator": {
    "@type": "Person",
    "identifier": "0x..."
  },
  "owner": [{
    "@type": "Person",
    "identifier": "0x..."
  }],
  "isPartOf": {
    "@type": "Collection",
    "name": "Collection Name",
    "identifier": "0x..."
  },
  "additionalProperty": [
    {
      "@type": "PropertyValue",
      "name": "Trait Type",
      "value": "Trait Value"
    }
  ],
  "artMedium": "Digital",
  "artform": "NFT"
}
```

## Social Media Sharing

### Open Graph Tags
- **og:title**: Page title (Collection name or NFT name)
- **og:description**: Description from metadata
- **og:image**: Banner image (collection) or NFT image (detail)
- **og:url**: Canonical URL
- **og:type**: "website"
- **og:site_name**: "ODDS NFT Launchpad"
- **og:image:width/height**: Optimized dimensions (1200x630 for collections, 1200x1200 for NFTs)

### Twitter Cards
- **twitter:card**: "summary_large_image"
- **twitter:title**: Page title
- **twitter:description**: Description from metadata
- **twitter:image**: Same as Open Graph image
- **twitter:creator**: Twitter username from collection metadata (if available)

## Benefits

1. **SEO Optimization**:
   - Search engines can properly index NFT collections and individual NFTs
   - Rich snippets in search results with images and descriptions
   - Canonical URLs prevent duplicate content issues

2. **Social Media Sharing**:
   - Beautiful preview cards when sharing on Twitter, Facebook, Discord, etc.
   - Proper attribution with creator Twitter handles
   - High-quality images optimized for social platforms

3. **Structured Data**:
   - Machine-readable metadata for search engines
   - Enhanced search result features (rich snippets)
   - Better understanding of NFT content by crawlers

4. **Image Optimization**:
   - Next.js automatic image optimization for all external sources
   - Faster page loads with optimized image formats
   - Responsive images for different device sizes

## Testing Recommendations

1. **Meta Tags Validation**:
   - Use Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - Use Twitter Card Validator: https://cards-dev.twitter.com/validator
   - Use LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

2. **Structured Data Validation**:
   - Use Google Rich Results Test: https://search.google.com/test/rich-results
   - Use Schema.org Validator: https://validator.schema.org/

3. **SEO Audit**:
   - Use Lighthouse in Chrome DevTools
   - Check meta tag presence and content
   - Verify canonical URLs
   - Test social media sharing

## Requirements Validation

✅ **Implement dynamic meta tags with collection/NFT information**
- Collection pages have dynamic title, description, and images
- NFT detail pages have dynamic title, description, and images
- All metadata is generated from API data

✅ **Add Open Graph tags for social media sharing**
- Complete Open Graph implementation on both pages
- Includes title, description, image, URL, type, and site name
- Images are properly sized for social platforms

✅ **Add JSON-LD structured data for NFT collections**
- CollectionPage schema for collection pages
- VisualArtwork schema for NFT detail pages
- Includes all relevant properties (creator, owner, attributes, etc.)

✅ **Configure Next.js image optimization for external domains**
- Added Alchemy CDN domains
- Added OpenSea CDN domains
- IPFS gateways already configured
- All external images now optimized by Next.js

## Files Modified

1. `next.config.ts` - Added remote image patterns for Alchemy and OpenSea CDNs
2. `src/lib/seo-utils.ts` - Created SEO utility functions (NEW)
3. `src/app/(package)/collection/[address]/page.tsx` - Added meta tags and structured data
4. `src/app/(package)/nft/[address]/[tokenid]/page.tsx` - Added meta tags and structured data

## Notes

- Meta tags are dynamically generated based on actual NFT/collection data
- IPFS URLs are automatically converted to HTTP gateway URLs for better compatibility
- Fallback values ensure meta tags are always present even with incomplete data
- Structured data follows Schema.org standards for maximum compatibility
- All images are optimized through Next.js Image component for performance
