# Panduan Approve Template OddsLaunchpad

## Apa itu Template Approval?

Template approval adalah proses untuk mendaftarkan bytecode OddsLaunchpad contract ke MasterContractFactory. Ini diperlukan agar factory bisa deploy collection baru menggunakan template yang sudah diverifikasi.

## Kapan Perlu Approve Template?

Anda perlu approve template dalam situasi berikut:

1. **Pertama kali setup** - Setelah deploy MasterContractFactory
2. **Update contract** - Setelah update OddsLaunchpad contract
3. **Deploy ke chain baru** - Setiap chain memerlukan approval sendiri

## Cara 1: Menggunakan Script (Recommended)

### Prerequisites

1. Set private key di environment:
```bash
export PRIVATE_KEY="your-private-key-here"
```

2. Pastikan file `.env` sudah dikonfigurasi dengan benar:
```env
# Sepolia
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS=0x8214c3755126f11ad093bd491c3d3974a7244415
NEXT_PUBLIC_SEPOLIA_ODDS_TEMPLATE_ADDRESS=0xYOUR_TEMPLATE_ADDRESS

# Monad Testnet
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_FACTORY_ADDRESS=0xYOUR_FACTORY_ADDRESS
NEXT_PUBLIC_MONAD_ODDS_TEMPLATE_ADDRESS=0xYOUR_TEMPLATE_ADDRESS
```

### Jalankan Script

**Untuk Sepolia (default):**
```bash
node scripts/approve-odds-template.js
```

**Untuk Monad Testnet:**
```bash
node scripts/approve-odds-template.js 41454
```

**Untuk chain lain:**
```bash
node scripts/approve-odds-template.js <CHAIN_ID>
```

### Output yang Diharapkan

```
🚀 Starting template approval process...

🔧 Approve OddsLaunchpad Template
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Network: Sepolia
Chain ID: 11155111
Factory: 0x8214c3755126f11ad093bd491c3d3974a7244415
Template: 0xYOUR_TEMPLATE_ADDRESS

Deployer: 0xYourAddress
Balance: 0.5 ETH

📦 Bytecode Info:
Hash: 0x1234...abcd
Length: 12345 bytes

📝 Approving template...
Silakan konfirmasi transaksi di wallet Anda.

✅ Transaction submitted!
Hash: 0x5678...efgh

⏳ Menunggu konfirmasi...
✅ Template berhasil di-approve!
Block: 1234567
Gas used: 45000

📋 Verification:
Approved: ✅
Stored hash: 0x1234...abcd
Expected hash: 0x1234...abcd
Match: ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SELESAI!

Template berhasil di-approve!
Anda sekarang bisa deploy collection via factory.

Next steps:
1. Buat collection baru via Creator Studio
2. Factory akan otomatis deploy menggunakan template ini
3. Collection akan muncul di dashboard Anda
```

## Cara 2: Menggunakan UI

### Langkah-langkah:

1. Buka halaman admin/creator studio
2. Cari tombol "Approve Template"
3. Klik tombol tersebut
4. Konfirmasi transaksi di wallet Anda
5. Tunggu hingga transaksi selesai

### Kode untuk Menambahkan Button di UI:

```tsx
import { ApproveTemplateButton } from '@/components/admin/approve-template-button';

// Di dalam component Anda:
<ApproveTemplateButton 
  chainId={11155111} 
  onSuccess={() => {
    console.log('Template approved!');
    // Refresh data atau lakukan action lain
  }}
/>
```

## Cara 3: Menggunakan Contract Service

Jika Anda ingin integrate ke dalam aplikasi:

```typescript
import { ContractService } from '@/lib/contract-service';

const contractService = new ContractService();

// Approve template dengan bytecode hash yang sudah diketahui
const txHash = await contractService.approveTemplate(
  chainId,
  templateAddress,
  bytecodeHash
);

// Atau gunakan helper function untuk OddsLaunchpad
const result = await contractService.approveOddsLaunchpadTemplate(chainId);
```

## Verifikasi Approval

Setelah approve, Anda bisa verifikasi dengan cara:

### 1. Menggunakan Script

```bash
node scripts/check-template-approval.js
```

### 2. Menggunakan Contract Service

```typescript
const isApproved = await contractService.isTemplateApproved(
  chainId,
  templateAddress
);

const bytecodeHash = await contractService.getTemplateBytecodeHash(
  chainId,
  templateAddress
);

console.log('Approved:', isApproved);
console.log('Hash:', bytecodeHash);
```

## Troubleshooting

### Error: "Only admin can approve templates"

**Penyebab:** Wallet yang digunakan bukan admin di MasterContractFactory

**Solusi:**
1. Pastikan menggunakan wallet yang sama dengan yang deploy factory
2. Atau grant admin role ke wallet Anda:
```typescript
await factory.grantRole(ADMIN_ROLE, yourAddress);
```

### Error: "Bytecode hash mismatch"

**Penyebab:** Template contract sudah diupdate tapi approval belum

**Solusi:**
1. Jalankan script approve lagi untuk update hash
2. Script akan otomatis detect dan update hash yang baru

### Error: "Template address not found"

**Penyebab:** Template address belum dikonfigurasi di `.env`

**Solusi:**
1. Update `.env` dengan template address yang benar
2. Atau pass template address langsung ke script

### Error: "Insufficient funds"

**Penyebab:** Wallet tidak punya cukup ETH untuk gas fee

**Solusi:**
1. Top up wallet dengan ETH
2. Untuk testnet, gunakan faucet:
   - Sepolia: https://sepoliafaucet.com/
   - Monad: https://faucet.monad.xyz/

## Best Practices

1. **Approve sekali saja** - Tidak perlu approve berulang kali kecuali ada update contract
2. **Verifikasi setelah approve** - Selalu cek apakah approval berhasil
3. **Simpan transaction hash** - Untuk audit trail
4. **Test di testnet dulu** - Sebelum approve di mainnet
5. **Backup private key** - Jangan sampai hilang akses admin

## FAQ

### Q: Apakah perlu approve setiap kali deploy collection?
**A:** Tidak. Approve hanya dilakukan sekali per template per chain.

### Q: Apa yang terjadi jika tidak approve template?
**A:** Factory tidak bisa deploy collection baru. Akan muncul error "Template not approved".

### Q: Bisakah approve template untuk orang lain?
**A:** Tidak. Hanya admin factory yang bisa approve template.

### Q: Apakah bisa approve multiple template?
**A:** Ya. Factory bisa menyimpan multiple template yang berbeda.

### Q: Bagaimana cara revoke approval?
**A:** Gunakan fungsi `removeTemplate()` di factory contract.

## Related Documentation

- [Master Contract Factory Guide](./MASTER_CONTRACT_FACTORY_MIGRATION.md)
- [Quick Start Guide](./QUICK_START.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Contract Documentation](./CONTRACT_DOCUMENTATION_INDEX.md)

## Support

Jika mengalami masalah, silakan:
1. Cek logs di console untuk error detail
2. Verifikasi konfigurasi di `.env`
3. Pastikan wallet punya cukup balance
4. Cek apakah wallet adalah admin di factory
