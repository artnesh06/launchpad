# Setup Pinata for IPFS Storage

## Problem
Cover images tidak tampil karena menggunakan mock IPFS upload yang menghasilkan hash tidak valid. File tidak benar-benar di-upload ke IPFS.

## Root Cause
Pinata API credentials tidak dikonfigurasi di `.env`, sehingga aplikasi menggunakan mock upload untuk development.

## Solution: Setup Pinata

### Step 1: Create Pinata Account

1. Go to [https://pinata.cloud](https://pinata.cloud)
2. Click "Sign Up" (Free tier available)
3. Verify your email
4. Complete account setup

### Step 2: Generate API Keys

1. Login to Pinata dashboard
2. Go to **API Keys** section (left sidebar)
3. Click **"New Key"** button
4. Configure permissions:
   - ✅ **pinFileToIPFS** (required)
   - ✅ **pinJSONToIPFS** (required)
   - ❌ Unpin (optional)
   - ❌ Admin (not needed)
5. Give it a name: `NFT Launchpad`
6. Click **"Create Key"**
7. **IMPORTANT**: Copy both keys immediately:
   - API Key
   - API Secret

### Step 3: Add to .env File

Open `.env` file and add your Pinata credentials:

```env
# IPFS Storage Configuration (Pinata)
NEXT_PUBLIC_PINATA_API_KEY=your_api_key_here
NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret_key_here
```

**Example:**
```env
NEXT_PUBLIC_PINATA_API_KEY=1a2b3c4d5e6f7g8h9i0j
NEXT_PUBLIC_PINATA_SECRET_KEY=9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g
```

### Step 4: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

### Step 5: Test Upload

1. Go to Create Launchpad page
2. Upload a cover image (800×800px)
3. Check console logs:
   ```
   ✅ File uploaded to IPFS: QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
   ```
4. Verify on Pinata dashboard (Files section)

## Verification

### Check if Pinata is Working

**Console Logs:**

**With Pinata (Good):**
```
📤 Uploading to Pinata: ODDS-cover (125.45 KB)
✅ Uploaded to IPFS: QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
✅ File uploaded to IPFS: ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
```

**Without Pinata (Mock):**
```
⚠️ Pinata credentials not found. Using mock upload.
🔧 Mock IPFS upload for: ODDS-cover
   Generated mock hash: Qmjscwf82qh1anqalr5v7kqg...
⚠️ WARNING: Using mock IPFS upload! Images won't be accessible.
```

### Check Image URL

**With Pinata:**
```
https://eu.orbitor.dev/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
✅ Image loads successfully
```

**Without Pinata (Mock):**
```
https://eu.orbitor.dev/ipfs/Qmjscwf82qh1anqalr5v7kqg
❌ 404 Not Found (hash doesn't exist)
```

## Pinata Free Tier Limits

- **Storage**: 1 GB
- **Bandwidth**: 100 GB/month
- **Requests**: Unlimited
- **Files**: Unlimited

**More than enough for development and small projects!**

## Alternative: Use Different IPFS Provider

If you prefer not to use Pinata, you can:

### Option 1: NFT.Storage (Free, Unlimited)
- Website: https://nft.storage
- Free tier: Unlimited storage
- Backed by Protocol Labs

### Option 2: Web3.Storage (Free, Unlimited)
- Website: https://web3.storage
- Free tier: Unlimited storage
- Also by Protocol Labs

### Option 3: Infura IPFS
- Website: https://infura.io
- Free tier: 5 GB storage
- Requires account

**Note**: If using alternative provider, you'll need to modify `src/lib/ipfs-service.ts` to use their API.

## Troubleshooting

### Issue 1: "Pinata credentials not found"
**Solution**: Make sure `.env` has both keys and restart dev server

### Issue 2: "Pinata upload failed: 401 Unauthorized"
**Solution**: 
- Check API keys are correct
- Ensure no extra spaces in `.env`
- Regenerate keys if needed

### Issue 3: "Pinata upload failed: 403 Forbidden"
**Solution**: 
- Check API key permissions
- Ensure `pinFileToIPFS` is enabled

### Issue 4: Images still not showing
**Solution**:
1. Clear browser cache
2. Check console for actual IPFS hash
3. Try accessing directly: `https://eu.orbitor.dev/ipfs/[hash]`
4. Wait a few seconds (IPFS propagation)

## ⚠️ Pinata Setup is Required

**Mock upload has been removed!** You MUST setup Pinata credentials to upload files.

**Why?**
- Mock uploads created fake IPFS hashes that don't exist
- Images wouldn't display
- Confusing for users
- Not suitable for any environment

**What happens without Pinata?**
When you try to upload without credentials, you'll see:
```
❌ Pinata IPFS credentials not configured!

To upload files to IPFS, you need to:
1. Create a free account at https://pinata.cloud
2. Generate API keys in the dashboard
3. Add them to your .env file
4. Restart the development server
```

The upload will fail and you won't be able to create launchpad until Pinata is configured.

## Production Deployment

**IMPORTANT**: For production, you MUST use real IPFS provider:

1. ✅ Setup Pinata (or alternative)
2. ✅ Add credentials to production environment variables
3. ✅ Test image uploads before launch
4. ✅ Monitor Pinata usage/limits
5. ✅ Consider paid plan for higher limits

## Files Modified

- `src/lib/ipfs-service.ts`
  - Improved mock upload to generate valid-looking hashes (46 chars)
  - Added warning messages when using mock
  - Added instructions in console

## Next Steps

1. [ ] Create Pinata account
2. [ ] Generate API keys
3. [ ] Add to `.env` file
4. [ ] Restart dev server
5. [ ] Test upload cover image
6. [ ] Verify image displays in trending table
7. [ ] Check Pinata dashboard for uploaded files

## Resources

- [Pinata Documentation](https://docs.pinata.cloud/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Pinata API Reference](https://docs.pinata.cloud/api-pinning/pin-file)
