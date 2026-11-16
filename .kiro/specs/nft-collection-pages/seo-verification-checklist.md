# SEO Implementation Verification Checklist

## Manual Testing Steps

### 1. Collection Page Meta Tags

**Test URL**: `/collection/[any-valid-address]`

#### Browser DevTools Verification
1. Open the collection page in a browser
2. Open DevTools (F12) → Elements/Inspector tab
3. Look for `<head>` section and verify the following tags exist:

**Required Meta Tags**:
- [ ] `<title>` contains collection name
- [ ] `<meta name="description">` contains collection description
- [ ] `<link rel="canonical">` points to correct URL

**Open Graph Tags**:
- [ ] `<meta property="og:title">`
- [ ] `<meta property="og:description">`
- [ ] `<meta property="og:url">`
- [ ] `<meta property="og:type" content="website">`
- [ ] `<meta property="og:site_name" content="ODDS NFT Launchpad">`
- [ ] `<meta property="og:image">` (if collection has image)
- [ ] `<meta property="og:image:width" content="1200">`
- [ ] `<meta property="og:image:height" content="630">`

**Twitter Card Tags**:
- [ ] `<meta name="twitter:card" content="summary_large_image">`
- [ ] `<meta name="twitter:title">`
- [ ] `<meta name="twitter:description">`
- [ ] `<meta name="twitter:image">` (if collection has image)
- [ ] `<meta name="twitter:creator">` (if collection has Twitter username)

**Structured Data**:
- [ ] `<script type="application/ld+json">` exists
- [ ] JSON contains `"@type": "CollectionPage"`
- [ ] JSON contains collection name and description
- [ ] JSON contains `numberOfItems` field

### 2. NFT Detail Page Meta Tags

**Test URL**: `/nft/[address]/[tokenid]`

#### Browser DevTools Verification
1. Open an NFT detail page in a browser
2. Open DevTools (F12) → Elements/Inspector tab
3. Look for `<head>` section and verify the following tags exist:

**Required Meta Tags**:
- [ ] `<title>` contains NFT name and collection name
- [ ] `<meta name="description">` contains NFT description
- [ ] `<link rel="canonical">` points to correct URL

**Open Graph Tags**:
- [ ] `<meta property="og:title">`
- [ ] `<meta property="og:description">`
- [ ] `<meta property="og:url">`
- [ ] `<meta property="og:type" content="website">`
- [ ] `<meta property="og:site_name" content="ODDS NFT Launchpad">`
- [ ] `<meta property="og:image">` (if NFT has image)
- [ ] `<meta property="og:image:width" content="1200">`
- [ ] `<meta property="og:image:height" content="1200">`

**Twitter Card Tags**:
- [ ] `<meta name="twitter:card" content="summary_large_image">`
- [ ] `<meta name="twitter:title">`
- [ ] `<meta name="twitter:description">`
- [ ] `<meta name="twitter:image">` (if NFT has image)
- [ ] `<meta name="twitter:creator">` (if collection has Twitter username)

**Structured Data**:
- [ ] `<script type="application/ld+json">` exists
- [ ] JSON contains `"@type": "VisualArtwork"`
- [ ] JSON contains NFT name and description
- [ ] JSON contains `owner` field (if available)
- [ ] JSON contains `isPartOf` with collection info
- [ ] JSON contains `additionalProperty` array with attributes

### 3. Social Media Sharing Tests

#### Facebook Sharing Debugger
1. Go to: https://developers.facebook.com/tools/debug/
2. Enter collection page URL
3. Click "Debug"
4. Verify:
   - [ ] Title displays correctly
   - [ ] Description displays correctly
   - [ ] Image displays correctly (if available)
   - [ ] No errors or warnings

5. Repeat for NFT detail page URL

#### Twitter Card Validator
1. Go to: https://cards-dev.twitter.com/validator
2. Enter collection page URL
3. Verify:
   - [ ] Card preview displays correctly
   - [ ] Title displays correctly
   - [ ] Description displays correctly
   - [ ] Image displays correctly (if available)
   - [ ] Creator attribution shows (if available)

4. Repeat for NFT detail page URL

#### LinkedIn Post Inspector
1. Go to: https://www.linkedin.com/post-inspector/
2. Enter collection page URL
3. Verify:
   - [ ] Preview displays correctly
   - [ ] Title and description are accurate
   - [ ] Image displays (if available)

4. Repeat for NFT detail page URL

### 4. Structured Data Validation

#### Google Rich Results Test
1. Go to: https://search.google.com/test/rich-results
2. Enter collection page URL
3. Click "Test URL"
4. Verify:
   - [ ] No errors
   - [ ] CollectionPage schema detected
   - [ ] All properties are valid

5. Repeat for NFT detail page URL
6. Verify VisualArtwork schema is detected

#### Schema.org Validator
1. Go to: https://validator.schema.org/
2. Enter collection page URL
3. Verify:
   - [ ] No errors
   - [ ] Schema is valid
   - [ ] All required properties present

4. Repeat for NFT detail page URL

### 5. Image Optimization Verification

#### Next.js Image Optimization
1. Open collection page with images
2. Open DevTools → Network tab
3. Filter by "Img"
4. Verify:
   - [ ] Images are served through Next.js image optimization (`/_next/image?url=...`)
   - [ ] Images have appropriate sizes for viewport
   - [ ] Images are in optimized formats (WebP when supported)

5. Test with images from:
   - [ ] Alchemy CDN (res.cloudinary.com, nft-cdn.alchemy.com)
   - [ ] OpenSea CDN (i.seadn.io)
   - [ ] IPFS gateways (gateway.pinata.cloud, ipfs.io)

### 6. SEO Audit with Lighthouse

1. Open collection page in Chrome
2. Open DevTools (F12) → Lighthouse tab
3. Select "SEO" category
4. Click "Generate report"
5. Verify:
   - [ ] Score is 90+ (green)
   - [ ] Document has a meta description
   - [ ] Document has a valid title
   - [ ] Links are crawlable
   - [ ] Image elements have alt attributes

6. Repeat for NFT detail page

### 7. Mobile Responsiveness

1. Open collection page on mobile device or use DevTools mobile emulation
2. Verify:
   - [ ] Meta viewport tag is present
   - [ ] Images scale appropriately
   - [ ] Text is readable without zooming
   - [ ] Touch targets are at least 44x44px

### 8. IPFS URL Conversion

1. Find a collection or NFT with IPFS images
2. Open DevTools → Elements tab
3. Verify:
   - [ ] `ipfs://` URLs are converted to `https://` gateway URLs
   - [ ] Images load successfully
   - [ ] No broken image placeholders

### 9. Canonical URLs

1. Open collection page
2. View page source (Ctrl+U or Cmd+U)
3. Find `<link rel="canonical">`
4. Verify:
   - [ ] URL matches current page URL
   - [ ] URL is absolute (includes domain)
   - [ ] URL uses HTTPS

5. Repeat for NFT detail page

### 10. Dynamic Content Verification

Test with different collections to ensure metadata updates:

**Collection A** (with full metadata):
- [ ] Title includes collection name
- [ ] Description includes collection description
- [ ] Image is collection banner/thumbnail
- [ ] Twitter creator is included

**Collection B** (with minimal metadata):
- [ ] Title has fallback text
- [ ] Description has generated text with stats
- [ ] No broken image tags
- [ ] No Twitter creator tag

**NFT A** (with full metadata):
- [ ] Title includes NFT name and collection
- [ ] Description is NFT description
- [ ] Image is NFT image
- [ ] Attributes are in structured data

**NFT B** (with minimal metadata):
- [ ] Title uses token ID as fallback
- [ ] Description has generated text
- [ ] Structured data handles missing fields gracefully

## Expected Results

All checkboxes should be checked (✓) for a complete implementation.

## Common Issues and Solutions

### Issue: Meta tags not appearing
**Solution**: Ensure the page has loaded completely. Meta tags are added dynamically in client components.

### Issue: Images not loading in social media previews
**Solution**: 
- Verify IPFS URLs are being converted to HTTP
- Check that image URLs are accessible publicly
- Ensure Next.js image domains are configured in next.config.ts

### Issue: Structured data validation errors
**Solution**:
- Check that all required Schema.org properties are present
- Verify JSON-LD syntax is valid
- Ensure data types match schema requirements

### Issue: Twitter cards not showing
**Solution**:
- Verify twitter:card meta tag is "summary_large_image"
- Ensure image meets Twitter's size requirements (min 300x157px)
- Check that image URL is absolute and publicly accessible

## Automated Testing (Future)

When a testing framework is added to the project, run:
```bash
npm test -- src/test/seo-utils-verification.test.ts
```

This will verify:
- Metadata generation functions work correctly
- IPFS URL conversion works
- Structured data format is valid
- Fallback values are used when data is missing
