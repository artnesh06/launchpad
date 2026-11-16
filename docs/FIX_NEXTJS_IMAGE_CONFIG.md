# Fix: Next.js Image Configuration for IPFS Gateways

## Problem
Error when displaying IPFS images:
```
Error: Invalid src prop (https://eu.orbitor.dev/ipfs/...) on `next/image`, 
hostname "gateway.pinata.cloud" is not configured under images in your `next.config.js`
```

## Root Cause
Next.js requires all external image hostnames to be explicitly configured in `next.config.ts` for security reasons. IPFS gateway hostnames were not in the configuration.

## Solution

Added IPFS gateway hostnames to `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'api.slingacademy.com',
      port: ''
    },
    // IPFS Gateways
    {
      protocol: 'https',
      hostname: 'gateway.pinata.cloud',
      port: ''
    },
    {
      protocol: 'https',
      hostname: 'ipfs.io',
      port: ''
    },
    {
      protocol: 'https',
      hostname: 'cloudflare-ipfs.com',
      port: ''
    },
    {
      protocol: 'https',
      hostname: 'dweb.link',
      port: ''
    }
  ]
}
```

## Gateways Added

1. **gateway.pinata.cloud** - Primary gateway (default)
2. **ipfs.io** - Official IPFS gateway
3. **cloudflare-ipfs.com** - Cloudflare IPFS gateway
4. **dweb.link** - Distributed web gateway

## Why Multiple Gateways?

- **Redundancy**: If one gateway is down, can switch to another
- **Performance**: Different gateways may be faster in different regions
- **Flexibility**: Easy to change gateway in `ipfs-utils.ts`

## After This Fix

✅ Images from Pinata gateway will load correctly
✅ Images from alternative gateways will also work
✅ No more "unconfigured host" errors
✅ Next.js Image optimization will work

## Important Notes

### Restart Required
After changing `next.config.ts`, you MUST restart the development server:
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

### Production Deployment
This configuration will automatically be used in production builds. No additional setup needed.

### Adding More Gateways
If you want to add more IPFS gateways in the future:

1. Add to `next.config.ts`:
```typescript
{
  protocol: 'https',
  hostname: 'your-gateway.com',
  port: ''
}
```

2. Restart dev server
3. Update `getIpfsGateways()` in `src/lib/ipfs-utils.ts` if needed

## Security

Next.js requires explicit hostname configuration to prevent:
- Unauthorized external image loading
- Potential security vulnerabilities
- Bandwidth abuse

Only add trusted hostnames to the configuration.

## Testing

After restart, verify:
1. ✅ Images load on NFT Trending Table
2. ✅ Images load on Create page
3. ✅ Images load on Collection Detail page
4. ✅ No console errors about unconfigured hosts

## Files Changed

- `next.config.ts`
  - Added 4 IPFS gateway hostnames to `remotePatterns`

## Related Documentation

- [Next.js Image Configuration](https://nextjs.org/docs/api-reference/next/image#remote-patterns)
- [IPFS Gateways](https://docs.ipfs.tech/concepts/ipfs-gateway/)
