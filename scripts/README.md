# Scripts Documentation

Kumpulan utility scripts untuk manage NFT Launchpad project.

## Template Management

### Approve Template

Approve OddsLaunchpad template di MasterContractFactory.

**Main Script (Recommended):**
```bash
# Approve untuk MegaETH (default)
node scripts/approve-template.js

# Approve untuk Sepolia
node scripts/approve-template.js 11155111

# Approve untuk Monad Testnet
node scripts/approve-template.js 10143
```

**Alternative Scripts:**
```bash
# Monad-specific script
node scripts/approve-template-monad.js

# Generic script (legacy)
node scripts/approve-odds-template.js
```

**Prerequisites:**
- Set `PRIVATE_KEY` environment variable
- Configure `.env` dengan factory dan template addresses
- Wallet harus punya admin role di factory

**Output:**
- Transaction hash
- Bytecode hash verification
- Approval confirmation

### Check Template Approval

Cek status approval template tanpa melakukan transaksi.

```bash
# Check MegaETH
node scripts/check-template-approval.js 6343

# Check Sepolia
node scripts/check-template-approval.js 11155111

# Check Monad Testnet
node scripts/check-template-approval.js 10143
```

**Output:**
- Approval status (YES/NO)
- Bytecode hash comparison
- Recommendation untuk next steps

## Launchpad Management

### Check Launchpad

Cek informasi launchpad contract.

```bash
node scripts/check-launchpad.js
```

### Check Whitelist

Verify whitelist configuration.

```bash
node scripts/check-whitelist.js
```

## Sync Methods

### Compare Sync Methods

Bandingkan performa berbagai sync methods.

```bash
node scripts/compare-sync-methods.js
```

### Test Async Sync

Test async sync functionality.

```bash
node scripts/test-async-sync.js
```

## Merkle Tree

### Test Merkle

Test merkle tree generation dan verification.

```bash
node scripts/test-merkle.js
```

## Collection Testing

### Test New Collection (Comprehensive)

Deploy dan test collection baru (Standard & Open Edition) dengan comprehensive testing.

```bash
node scripts/test-new-collection.js
```

**Features:**
- ✅ Deploy Standard Edition collection
- ✅ Deploy Open Edition collection
- ✅ Verify `isOpenEdition` flag
- ✅ Test mint functionality
- ✅ Verify tokenURI format
- ✅ Test multiple token URIs
- ✅ Comprehensive test report

**Output:**
- Deployment transaction hashes
- Collection addresses
- Token URI verification results
- Test summary

### Check Collection Type

Cek tipe collection yang sudah di-deploy dan verify tokenURI format.

```bash
node scripts/check-collection-type.js <CONTRACT_ADDRESS>
```

**Example:**
```bash
node scripts/check-collection-type.js 0x1234567890abcdef1234567890abcdef12345678
```

**Output:**
- Collection configuration
- isOpenEdition flag
- Token URI analysis
- URI pattern verification
- Mint phases info

### Quick Test Token URI

Quick test untuk cek tokenURI dengan cepat.

```bash
node scripts/quick-test-tokenuri.js <CONTRACT_ADDRESS>
```

**Output:**
- Collection type (Standard/Open Edition)
- Token URIs (first 5 tokens)
- Quick analysis (correct/wrong format)

**Use Case:**
- Quick verification setelah deploy
- Debug tokenURI issues
- Verify Open Edition format

### Detailed Testing Guide

Untuk panduan lengkap testing collection, lihat:
```bash
cat scripts/TEST_COLLECTION_README.md
```

## Environment Variables

Scripts menggunakan environment variables dari `.env`:

```env
# Wallet credentials (pilih salah satu)
PRIVATE_KEY=your-private-key
# atau
SEED_PHRASE=your twelve word seed phrase here
MNEMONIC=your twelve word seed phrase here

# MegaETH (Production)
NEXT_PUBLIC_MEGAETH_RPC_URL=https://timothy.megaeth.com/rpc
NEXT_PUBLIC_MEGAETH_FACTORY_ADDRESS=0x41bBbCCcbc34dDe370593aBD3102327B299315b1
NEXT_PUBLIC_MEGAETH_ODDS_TEMPLATE_ADDRESS=0x...

# Sepolia (Testnet)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS=0xB759B92CB8493342ABD53103E2Db5cd20E549975
NEXT_PUBLIC_SEPOLIA_ODDS_TEMPLATE_ADDRESS=0x8214c3755126f11Ad093BD491C3d3974A7244415

# Monad Testnet
NEXT_PUBLIC_MONAD_RPC_URL=https://monad-testnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_MONAD_FACTORY_ADDRESS=0x292d4516a315B3DD53537F1532EAAaA26194aBA6
NEXT_PUBLIC_MONAD_ODDS_TEMPLATE_ADDRESS=0x8214c3755126f11Ad093BD491C3d3974A7244415
```

## Common Issues

### "PRIVATE_KEY not set"

**Solution:**
```bash
export PRIVATE_KEY="your-private-key-here"
```

### "Template address not found"

**Solution:**
Update `.env` dengan template address yang benar.

### "Only admin can approve templates"

**Solution:**
Gunakan wallet yang punya admin role di factory contract.

### "Insufficient funds"

**Solution:**
Top up wallet dengan ETH untuk gas fees.

## Best Practices

1. **Test di testnet dulu** - Selalu test script di testnet sebelum mainnet
2. **Backup private key** - Simpan private key dengan aman
3. **Verify output** - Selalu cek output script untuk memastikan success
4. **Use environment variables** - Jangan hardcode sensitive data
5. **Check gas prices** - Monitor gas prices sebelum execute

## Related Documentation

- [Approve Template Guide](../docs/APPROVE_TEMPLATE_GUIDE.md)
- [Master Contract Factory Migration](../docs/MASTER_CONTRACT_FACTORY_MIGRATION.md)
- [Quick Reference](../docs/QUICK_REFERENCE_MASTER_CONTRACT.md)
- [Deployment Guide](../docs/DEPLOYMENT_GUIDE.md)

## Support

Jika mengalami masalah:
1. Cek logs di console
2. Verify environment variables
3. Check wallet balance
4. Review documentation
