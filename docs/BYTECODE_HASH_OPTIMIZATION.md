# Bytecode Hash Optimization

## Problem
Sebelumnya, aplikasi menghitung `keccak256` hash dari bytecode setiap kali melakukan deployment. Ini:
- Lambat (bytecode 53KB+ perlu di-hash)
- Boros resource di browser
- Bisa menyebabkan inconsistency jika ada masalah dengan calculation

## Solution
Sekarang hash di-calculate sekali saat build time dan disimpan sebagai constant:

```typescript
// abi/OddsLaunchpadBytecode.ts
export const ODDS_LAUNCHPAD_BYTECODE = '0x60c0604052...';
export const ODDS_LAUNCHPAD_BYTECODE_HASH = '0xf737b4fa6d09931e3a8e3772dccb4db596b66fa5b63337f9fb265482d5463bde';
```

## Benefits
✅ **Faster deployment** - Tidak perlu calculate hash setiap kali  
✅ **Consistent** - Hash selalu sama, tidak ada variasi  
✅ **Less resource usage** - Tidak ada keccak256 calculation di browser  
✅ **Better DX** - Error message lebih jelas jika hash mismatch  

## Usage

### Update Bytecode
Setiap kali ada perubahan contract, jalankan:

```bash
node update-bytecode-with-hash.js
```

Script ini akan:
1. Extract bytecode dari `OddsLaunchpadArtifact.json`
2. Calculate hash dengan `ethers.keccak256()`
3. Update `abi/OddsLaunchpadBytecode.ts` dengan bytecode DAN hash

### Approve Template
Setelah update bytecode, approve di factory:

```bash
node scripts/approve-current-bytecode.js
```

### Deploy to Production
Commit dan push perubahan:

```bash
git add abi/OddsLaunchpadBytecode.ts
git commit -m "Update bytecode and hash"
git push origin dev
```

Vercel akan otomatis rebuild dan deploy dengan bytecode baru.

## Implementation Details

### Before (Slow)
```typescript
// Calculate hash on every deployment
const currentHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);
```

### After (Fast)
```typescript
// Use pre-calculated hash
const currentHash = ODDS_LAUNCHPAD_BYTECODE_HASH;
```

## Files Changed
- `abi/OddsLaunchpadBytecode.ts` - Added `ODDS_LAUNCHPAD_BYTECODE_HASH` export
- `src/lib/contract-service.ts` - Use pre-calculated hash instead of calculating
- `update-bytecode-with-hash.js` - New script to update bytecode with hash

## Current Hash
```
0xf737b4fa6d09931e3a8e3772dccb4db596b66fa5b63337f9fb265482d5463bde
```

Approved on MegaETH Timothy (Chain ID: 6343)
