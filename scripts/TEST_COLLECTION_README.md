# Test Collection Scripts

Script-script untuk testing dan verifikasi NFT Collection (Standard Edition & Open Edition).

## 📋 Daftar Script

### 1. `test-new-collection.js`
Script lengkap untuk deploy dan test collection baru (Standard & Open Edition).

**Fitur:**
- ✅ Deploy Standard Edition collection
- ✅ Deploy Open Edition collection  
- ✅ Verify `isOpenEdition` flag
- ✅ Test mint functionality
- ✅ Verify tokenURI format untuk kedua tipe
- ✅ Test multiple token URIs
- ✅ Comprehensive test report

**Cara Pakai:**
```bash
node scripts/test-new-collection.js
```

**Yang Ditest:**
- Standard Edition: tokenURI harus berbeda untuk setiap token (0.json, 1.json, dst)
- Open Edition: tokenURI harus sama untuk semua token (tidak ada tokenId)

---

### 2. `check-collection-type.js`
Script untuk mengecek collection yang sudah di-deploy.

**Fitur:**
- 🔍 Check collection type (Standard/Open Edition)
- 📋 Display collection configuration
- 🔗 Analyze tokenURI pattern
- ✅ Verify consistency antara type dan URI format
- 📅 Display mint phases info

**Cara Pakai:**
```bash
node scripts/check-collection-type.js <CONTRACT_ADDRESS>
```

**Contoh:**
```bash
node scripts/check-collection-type.js 0x1234567890abcdef1234567890abcdef12345678
```

**Output:**
- Collection info (name, symbol, supply)
- isOpenEdition flag
- tokenURI untuk beberapa token pertama
- URI pattern analysis
- Verification result

---

### 3. `quick-test-tokenuri.js`
Script cepat untuk test tokenURI tanpa detail lengkap.

**Fitur:**
- ⚡ Quick check collection type
- 🔗 Display token URIs
- ✅ Simple verification

**Cara Pakai:**
```bash
node scripts/quick-test-tokenuri.js <CONTRACT_ADDRESS>
```

**Contoh:**
```bash
node scripts/quick-test-tokenuri.js 0x1234567890abcdef1234567890abcdef12345678
```

---

### 4. `batch-check-collections.js`
Script untuk check multiple collections sekaligus.

**Fitur:**
- 📊 Batch checking multiple collections
- 📋 Summary report
- 🔍 Identify problematic collections
- 📁 Support file input

**Cara Pakai:**

**Option 1: Direct addresses**
```bash
node scripts/batch-check-collections.js 0x123... 0x456... 0x789...
```

**Option 2: From file**
```bash
node scripts/batch-check-collections.js --file addresses.txt
```

**File Format (addresses.txt):**
```
# Collection addresses (one per line)
0x1234567890abcdef1234567890abcdef12345678
0x2345678901234567890123456789012345678901
0x3456789012345678901234567890123456789012
```

**Output:**
- Individual collection status
- Summary statistics
- Collections grouped by type
- List of problematic collections
- Recommendations

---

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Buat file `.env` dengan konfigurasi berikut:

```env
# RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Wallet (pilih salah satu)
PRIVATE_KEY=your_private_key_here
# atau
SEED_PHRASE=your twelve word seed phrase here
```

### 3. Approve Template (Jika Belum)
Sebelum deploy collection baru, pastikan template sudah di-approve:

```bash
node scripts/approve-current-bytecode.js
```

---

## 📊 Test Scenarios

### Scenario 1: Test Collection Baru
Deploy dan test kedua tipe collection:

```bash
node scripts/test-new-collection.js
```

**Expected Output:**
```
✅ Standard Edition deployed
   - tokenURI(0): ipfs://hash/0.json
   - tokenURI(1): ipfs://hash/1.json
   - All URIs are UNIQUE ✅

✅ Open Edition deployed
   - tokenURI(0): ipfs://hash
   - tokenURI(1): ipfs://hash
   - All URIs are IDENTICAL ✅
```

---

### Scenario 2: Check Collection yang Bermasalah
Jika Anda menemukan collection dengan tokenURI yang salah:

```bash
node scripts/check-collection-type.js 0xYourCollectionAddress
```

**Jika Open Edition tapi tokenURI berbeda:**
```
❌ WRONG: Open Edition should have identical URIs for all tokens
   This collection was likely deployed with old contract version
```

**Solusi:**
- Collection yang sudah di-deploy tidak bisa diupdate
- Deploy collection baru dengan template terbaru
- Pastikan template sudah di-approve dengan bytecode terbaru

---

## 🔧 Troubleshooting

### Error: "Template not approved"
```bash
node scripts/approve-current-bytecode.js
```

### Error: "Bytecode hash mismatch"
Template yang di-approve berbeda dengan bytecode saat ini.

**Solusi:**
```bash
node scripts/approve-current-bytecode.js
```

### Error: "No contract found at this address"
Contract address salah atau tidak ada di network yang dipilih.

**Cek:**
- Apakah address benar?
- Apakah RPC URL benar?
- Apakah contract sudah di-deploy?

### Open Edition tokenURI masih ada tokenId (0.json, 1.json)
Collection di-deploy dengan versi contract lama yang belum support `isOpenEdition`.

**Solusi:**
1. Approve template terbaru:
   ```bash
   node scripts/approve-current-bytecode.js
   ```

2. Deploy collection baru via Creator Studio
3. Pastikan pilih "Open Edition"
4. Verify dengan:
   ```bash
   node scripts/check-collection-type.js <NEW_ADDRESS>
   ```

---

## 📝 Test Checklist

Sebelum production deployment:

- [ ] Template sudah di-approve dengan bytecode terbaru
- [ ] Test deploy Standard Edition berhasil
- [ ] Test deploy Open Edition berhasil
- [ ] Standard Edition tokenURI format: `ipfs://hash/0.json`, `ipfs://hash/1.json`
- [ ] Open Edition tokenURI format: `ipfs://hash` (sama untuk semua token)
- [ ] Mint functionality works
- [ ] Phases configuration correct
- [ ] Metadata accessible via IPFS

---

## 🎯 Expected Results

### Standard Edition
```javascript
// Collection Config
{
  isOpenEdition: false,
  baseURI: "ipfs://QmMetadataHash/"
}

// Token URIs
tokenURI(0) → "ipfs://QmMetadataHash/0.json"
tokenURI(1) → "ipfs://QmMetadataHash/1.json"
tokenURI(2) → "ipfs://QmMetadataHash/2.json"
// Each token has unique metadata
```

### Open Edition
```javascript
// Collection Config
{
  isOpenEdition: true,
  baseURI: "ipfs://QmMetadataHash"
}

// Token URIs
tokenURI(0) → "ipfs://QmMetadataHash"
tokenURI(1) → "ipfs://QmMetadataHash"
tokenURI(2) → "ipfs://QmMetadataHash"
// All tokens share the same metadata
```

---

## 🔗 Related Scripts

- `approve-current-bytecode.js` - Approve template dengan bytecode terbaru
- `check-template-approval.js` - Check status approval template
- `test-deploy-collection.js` - Test basic deployment (legacy)
- `verify-metadata.js` - Verify metadata accessibility

---

## 💡 Tips

1. **Selalu approve template terbaru** sebelum deploy collection baru
2. **Test di testnet** (Sepolia) sebelum mainnet
3. **Verify tokenURI** setelah mint untuk memastikan format benar
4. **Backup private key** dengan aman
5. **Check gas price** sebelum deploy di mainnet

---

## 📞 Support

Jika menemukan masalah:

1. Check error message di console
2. Verify template approval status
3. Check contract bytecode hash
4. Verify RPC connection
5. Check wallet balance

---

## 🎉 Success Indicators

Script berhasil jika:

✅ Template approved and hash matches  
✅ Standard Edition deployed  
✅ Open Edition deployed  
✅ Standard Edition URI format is CORRECT  
✅ Open Edition URI format is CORRECT  
✅ All token URIs are UNIQUE (Standard)  
✅ All token URIs are IDENTICAL (Open)  
✅ Mint successful  
✅ All tests passed!  
