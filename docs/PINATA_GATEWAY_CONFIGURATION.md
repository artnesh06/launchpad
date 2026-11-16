# Pinata Gateway Configuration

## Overview

Project ini menggunakan **Pinata dedicated gateway** untuk akses IPFS yang lebih cepat dan reliable.

Gateway URL: `https://eu.orbitor.dev/`

## Keuntungan Menggunakan Dedicated Gateway

### 1. **Performa Lebih Cepat** ⚡
- Dedicated gateway memiliki bandwidth lebih tinggi
- Caching yang lebih baik untuk file yang sering diakses
- Latency lebih rendah dibanding public gateway

### 2. **Reliability Lebih Tinggi** 🛡️
- Uptime guarantee dari Pinata
- Tidak terbatas rate limit seperti public gateway
- Prioritas akses untuk file Anda

### 3. **Custom Domain** 🌐
- URL yang lebih profesional dan branded
- Mudah diingat dan di-whitelist
- Tidak bergantung pada public gateway yang bisa down

## Konfigurasi

### File yang Menggunakan Gateway

1. **`src/app/api/ipfs/upload/route.ts`**
   ```typescript
   gatewayUrl: `https://eu.orbitor.dev/ipfs/${ipfsHash}`
   ```

2. **`src/app/api/ipfs/upload-json/route.ts`**
   ```typescript
   gatewayUrl: `https://eu.orbitor.dev/ipfs/${ipfsHash}`
   ```

3. **`src/lib/ipfs-service.ts`**
   ```typescript
   static toGatewayUrl(ipfsUrl: string, gateway: string = 'https://eu.orbitor.dev'): string
   ```

4. **`scripts/verify-metadata.js`**
   ```javascript
   const IPFS_GATEWAYS = [
     'https://eu.orbitor.dev/ipfs/',
     // ... other gateways as fallback
   ];
   ```

## Format URL

### IPFS Protocol URL
```
ipfs://QmHash
ipfs://QmHash/0.json
ipfs://QmHash/image.png
```

### Gateway HTTP URL
```
https://eu.orbitor.dev/ipfs/QmHash
https://eu.orbitor.dev/ipfs/QmHash/0.json
https://eu.orbitor.dev/ipfs/QmHash/image.png
```

## Testing Gateway

### 1. Test via Browser
Buka URL di browser:
```
https://eu.orbitor.dev/ipfs/QmYourHash
```

### 2. Test via cURL
```bash
curl -I https://eu.orbitor.dev/ipfs/QmYourHash
```

Expected response:
```
HTTP/2 200
content-type: application/json
x-pinata-gateway: gold-permanent-frog-787
```

### 3. Test via Script
```bash
node scripts/verify-metadata.js <contractAddress> <tokenId>
```

Script akan otomatis test gateway dan menampilkan hasil.

## Fallback Gateways

Jika dedicated gateway down (sangat jarang), sistem akan fallback ke:

1. **Gateway Pinata Public**: `https://eu.orbitor.dev/ipfs/`
2. **IPFS.io**: `https://ipfs.io/ipfs/`
3. **Cloudflare**: `https://cloudflare-ipfs.com/ipfs/`
4. **Dweb.link**: `https://dweb.link/ipfs/`

## Environment Variables

Tidak ada environment variable khusus untuk gateway. Gateway URL di-hardcode di kode karena:
- Lebih simple dan tidak perlu konfigurasi tambahan
- Gateway URL jarang berubah
- Menghindari kesalahan konfigurasi

Jika perlu mengganti gateway, update di 4 file yang disebutkan di atas.

## Monitoring

### Check Gateway Health

```bash
# Test gateway availability
curl -I https://eu.orbitor.dev/ipfs/QmTest

# Check response time
time curl -s https://eu.orbitor.dev/ipfs/QmTest > /dev/null
```

### Expected Performance

- **Response Time**: < 500ms (first request)
- **Response Time**: < 100ms (cached)
- **Uptime**: 99.9%+
- **Bandwidth**: Unlimited

## Troubleshooting

### Gateway Tidak Bisa Diakses

1. **Check Pinata Status**
   - Visit: https://status.pinata.cloud/
   - Check if there's any ongoing incident

2. **Test dengan Gateway Lain**
   ```bash
   # Try public gateway
   curl https://eu.orbitor.dev/ipfs/QmYourHash
   
   # Try IPFS.io
   curl https://ipfs.io/ipfs/QmYourHash
   ```

3. **Check DNS Resolution**
   ```bash
   nslookup gold-permanent-frog-787.mypinata.cloud
   ```

### File Tidak Ditemukan (404)

1. **Verify IPFS Hash**
   - Pastikan hash benar dan file sudah di-pin
   - Check di Pinata dashboard

2. **Check File Status**
   ```bash
   # Via Pinata API
   curl -X GET "https://api.pinata.cloud/data/pinList?status=pinned" \
     -H "pinata_api_key: YOUR_API_KEY" \
     -H "pinata_secret_api_key: YOUR_SECRET_KEY"
   ```

3. **Wait for Propagation**
   - File baru mungkin butuh 1-2 menit untuk propagate
   - Try again setelah beberapa saat

### Slow Response

1. **Check Network**
   ```bash
   ping gold-permanent-frog-787.mypinata.cloud
   traceroute gold-permanent-frog-787.mypinata.cloud
   ```

2. **Use CDN/Caching**
   - Implement caching layer di frontend
   - Use service worker untuk cache IPFS content

3. **Optimize File Size**
   - Compress images before upload
   - Use appropriate image formats (WebP, AVIF)

## Best Practices

### 1. Always Use IPFS Protocol in Smart Contracts
```solidity
// ✅ Good - Protocol agnostic
string baseURI = "ipfs://QmHash/";

// ❌ Bad - Gateway specific
string baseURI = "https://eu.orbitor.dev/ipfs/QmHash/";
```

### 2. Convert to Gateway URL Only in Frontend
```typescript
// In frontend/API
const gatewayUrl = IPFSService.toGatewayUrl(ipfsUrl);
```

### 3. Implement Retry Logic
```typescript
async function fetchFromIPFS(hash: string) {
  const gateways = [
    'https://eu.orbitor.dev/ipfs/',
    'https://eu.orbitor.dev/ipfs/',
    'https://ipfs.io/ipfs/'
  ];
  
  for (const gateway of gateways) {
    try {
      const response = await fetch(gateway + hash);
      if (response.ok) return response;
    } catch (error) {
      continue; // Try next gateway
    }
  }
  
  throw new Error('All gateways failed');
}
```

### 4. Cache Aggressively
```typescript
// Use browser cache
const response = await fetch(gatewayUrl, {
  cache: 'force-cache',
  next: { revalidate: 3600 } // 1 hour
});
```

## Migration Guide

### Jika Perlu Ganti Gateway

1. **Update Gateway URL di 4 File:**
   - `src/app/api/ipfs/upload/route.ts`
   - `src/app/api/ipfs/upload-json/route.ts`
   - `src/lib/ipfs-service.ts`
   - `scripts/verify-metadata.js`

2. **Test Thoroughly:**
   ```bash
   # Test upload
   npm run test:upload
   
   # Test metadata
   node scripts/verify-metadata.js <address> 0
   
   # Test in browser
   npm run dev
   ```

3. **Update Documentation:**
   - Update this file
   - Update README if needed
   - Notify team members

## Support

### Pinata Support
- Dashboard: https://app.pinata.cloud/
- Docs: https://docs.pinata.cloud/
- Support: support@pinata.cloud

### Internal Support
- Check `docs/FIX_METADATA_NOT_READABLE_BY_ALCHEMY.md`
- Run `node scripts/verify-metadata.js` for debugging
- Check application logs for IPFS errors

## References

- [Pinata Gateway Documentation](https://docs.pinata.cloud/gateways/dedicated-gateways)
- [IPFS Best Practices](https://docs.ipfs.tech/concepts/best-practices/)
- [NFT Metadata Standards](https://docs.opensea.io/docs/metadata-standards)
