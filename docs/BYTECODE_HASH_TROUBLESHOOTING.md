# Bytecode Hash Troubleshooting

## Problem: Hash Mismatch After Deployment

Jika Anda mengalami error seperti ini:

```
❌ Error: Bytecode hash mismatch!
Approved: 0x43e0eb141728bae0796724540110aa350b7729f9f81d408427df5839d95a4d08
Current:  0xf737b4fa6d09931e3a8e3772dccb4db596b66fa5b63337f9fb265482d5463bde
```

### Root Cause
Ada **delay antara deployment dan propagation** di Vercel/CDN. Aplikasi yang running masih menggunakan bytecode lama meskipun sudah redeploy.

## Solutions

### Solution 1: Skip Hash Validation (Recommended untuk Development)

Tambahkan environment variable di Vercel:

```bash
SKIP_BYTECODE_HASH_VALIDATION=true
```

**Steps:**
1. Buka Vercel Dashboard → Project Settings → Environment Variables
2. Tambahkan variable baru:
   - Name: `SKIP_BYTECODE_HASH_VALIDATION`
   - Value: `true`
   - Environment: Production (atau semua)
3. Redeploy aplikasi

**Pros:**
- ✅ Langsung bisa deploy tanpa error
- ✅ Tidak perlu approve hash berkali-kali
- ✅ Cocok untuk development/testing

**Cons:**
- ⚠️  Bypass security check
- ⚠️  Harus pastikan template sudah approved di factory

### Solution 2: Approve Hash yang Diminta

Jalankan script approve dengan hash yang diminta error:

```bash
# Edit scripts/approve-current-bytecode.js
# Ganti currentBytecodeHash dengan hash dari error message

node scripts/approve-current-bytecode.js
```

**Pros:**
- ✅ Lebih secure
- ✅ Hash validation tetap aktif

**Cons:**
- ❌ Harus approve setiap kali bytecode berubah
- ❌ Bisa frustrating kalau sering berubah

### Solution 3: Wait for Propagation

Tunggu 5-10 menit setelah deployment, kemudian:

1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Coba lagi

**Pros:**
- ✅ Tidak perlu ubah code/config
- ✅ Paling "clean"

**Cons:**
- ❌ Harus tunggu
- ❌ Tidak selalu work

## Best Practice

### For Development/Testing:
```bash
SKIP_BYTECODE_HASH_VALIDATION=true
```

### For Production:
```bash
# Remove or set to false
SKIP_BYTECODE_HASH_VALIDATION=false
```

Dan pastikan:
1. Bytecode di-update dengan: `node update-bytecode-with-hash.js`
2. Hash di-approve dengan: `node scripts/approve-current-bytecode.js`
3. Commit dan push perubahan
4. Tunggu deployment selesai (5-10 menit)

## Verification

Cek hash yang sedang digunakan:

```bash
# Local
node -e "const { ODDS_LAUNCHPAD_BYTECODE_HASH } = require('./abi/OddsLaunchpadBytecode.ts'); console.log('Local hash:', ODDS_LAUNCHPAD_BYTECODE_HASH);"

# Factory (on-chain)
node -e "const ethers = require('ethers'); const MasterContractFactoryABI = require('./abi/MasterContractFactory.json'); const provider = new ethers.JsonRpcProvider('https://timothy.megaeth.com/rpc'); const factory = new ethers.Contract('0x292d4516a315B3DD53537F1532EAAaA26194aBA6', MasterContractFactoryABI, provider); (async () => { const hash = await factory.getTemplateBytecodeHash('0x8214c3755126f11Ad093BD491C3d3974A7244415'); console.log('Factory hash:', hash); })();"
```

## Current Status

**Template Address:** `0x8214c3755126f11Ad093BD491C3d3974A7244415`  
**Factory Address:** `0x292d4516a315B3DD53537F1532EAAaA26194aBA6`  
**Chain:** MegaETH Timothy (6343)

**Latest Approved Hash:** `0x43e0eb141728bae0796724540110aa350b7729f9f81d408427df5839d95a4d08`  
**Latest Local Hash:** `0xf737b4fa6d09931e3a8e3772dccb4db596b66fa5b63337f9fb265482d5463bde`

## Emergency Fix

Jika benar-benar stuck dan perlu deploy ASAP:

1. Set `SKIP_BYTECODE_HASH_VALIDATION=true` di Vercel
2. Redeploy
3. Deploy collection
4. Setelah selesai, fix hash mismatch dengan tenang
5. Set `SKIP_BYTECODE_HASH_VALIDATION=false` kembali
