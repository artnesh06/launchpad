# Removed Mock IPFS Upload

## Changes Made

### Before:
- App used mock IPFS upload when Pinata credentials not configured
- Generated fake IPFS hashes (e.g., `Qmjscwf82qh1anqalr5v7kqg`)
- Images wouldn't display but upload appeared to succeed
- Confusing for users

### After:
- Mock upload completely removed
- App throws clear error when Pinata not configured
- Forces users to setup real IPFS before uploading
- No more fake hashes in database

## Error Message

When trying to upload without Pinata credentials:

```
❌ Pinata IPFS credentials not configured!

To upload files to IPFS, you need to:
1. Create a free account at https://pinata.cloud
2. Generate API keys in the dashboard
3. Add them to your .env file:
   NEXT_PUBLIC_PINATA_API_KEY=your_api_key
   NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret_key
4. Restart the development server

See SETUP_PINATA_IPFS.md for detailed instructions.
```

## Benefits

✅ **No Confusion**: Clear error message instead of silent failure
✅ **No Fake Data**: Database won't have invalid IPFS hashes
✅ **Forces Setup**: Users must configure Pinata properly
✅ **Better UX**: Fail fast with helpful instructions
✅ **Production Ready**: No mock code in production

## Files Changed

- `src/lib/ipfs-service.ts`
  - Removed `mockUpload()` function
  - Changed credential check to throw error
  - Added helpful error message with setup instructions

## Setup Required

**You MUST setup Pinata to use the app:**

1. Create account: https://pinata.cloud (Free)
2. Generate API keys
3. Add to `.env`:
   ```env
   NEXT_PUBLIC_PINATA_API_KEY=your_key
   NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret
   ```
4. Restart server

See `SETUP_PINATA_IPFS.md` for detailed guide.

## Testing

### Test 1: Without Credentials
1. Remove Pinata keys from `.env`
2. Try to create launchpad with cover image
3. ✅ Should see error message
4. ✅ Upload should fail
5. ✅ No fake hash in database

### Test 2: With Credentials
1. Add Pinata keys to `.env`
2. Restart server
3. Create launchpad with cover image
4. ✅ File uploads to real IPFS
5. ✅ Valid hash in database
6. ✅ Image displays correctly

## Migration

If you have existing launchpads with fake IPFS hashes:

### Option 1: Re-upload Images
1. Setup Pinata
2. Edit launchpad
3. Re-upload cover image
4. Save

### Option 2: Database Cleanup
```sql
-- Find launchpads with invalid IPFS hashes
SELECT id, image FROM LaunchpadMetadata 
WHERE image LIKE 'ipfs://Qm%' 
AND LENGTH(image) < 53; -- ipfs:// (7) + hash (46) = 53

-- Set to NULL to use fallback
UPDATE LaunchpadMetadata 
SET image = NULL 
WHERE image LIKE 'ipfs://Qm%' 
AND LENGTH(image) < 53;
```

## Pinata Free Tier

Perfect for development and small projects:
- Storage: 1 GB
- Bandwidth: 100 GB/month
- Files: Unlimited
- Requests: Unlimited

## Alternative Providers

If you prefer not to use Pinata:
- NFT.Storage (unlimited, free)
- Web3.Storage (unlimited, free)
- Infura IPFS (5 GB free)

**Note**: Requires code changes in `ipfs-service.ts`
