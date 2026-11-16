# Migrasi ke MasterContractFactory

## Overview

Project telah di-refactor untuk menggunakan arsitektur baru dengan **MasterContractFactory** dan **OddsLaunchpad** sebagai template. Ini menggantikan sistem lama yang menggunakan LaunchpadFactory untuk deploy collection secara langsung.

## Arsitektur Baru

### MasterContractFactory
- **Address (Sepolia)**: `0xB759B92CB8493342ABD53103E2Db5cd20E549975`
- **Fungsi Utama**: `deployMasterContract(address _template, bytes _creationCodeWithoutArgs, bytes _constructorArgs)`
- **Role**: Factory contract yang bertanggung jawab untuk deploy instance baru dari template yang sudah di-approve

### OddsLaunchpad Template
- **Address (Sepolia)**: `0x8214c3755126f11Ad093BD491C3d3974A7244415`
- **Status**: ✅ APPROVED
- **Bytecode Hash**: `0x59b77103992098678a1c848603dd061aa12dbadb575d1a99b2d3115a60c28ff2`
- **Role**: Template contract untuk NFT collection/launchpad

## Perubahan yang Dilakukan

### 1. Update ABI Imports
```typescript
// Sebelum
import LaunchpadFactoryABI from '../../abi/LaunchpadFactory.abi.json';
import NFTCollectionABI from '../../abi/NFTCollection.abi.json';

// Sesudah
import MasterContractFactoryABI from '../../abi/MasterContractFactory.json';
import OddsLaunchpadABI from '../../abi/OddsLaunchpad.json';
```

### 2. Fungsi Baru: `deployMasterContract`

Fungsi baru di `ContractService` yang menggantikan `createLaunchpad`:

```typescript
async deployMasterContract(
  chainId: number,
  templateAddress: string,
  request: {
    name: string;
    symbol: string;
    baseURI: string;
    unrevealedURI: string;
    contractURI: string;
    externalLink: string;
    totalMaxSupply: number;
    treasury: string;
    royaltyRecipient: string;
    royaltyPercentage: number;
    isRevealed?: boolean;
    transfersEnabled?: boolean;
  }
): Promise<string>
```

**Fitur:**
- ✅ Verifikasi template bytecode
- ✅ Encode constructor arguments untuk OddsLaunchpad
- ✅ Deploy via MasterContractFactory
- ✅ Parse event `ContractDeployed` untuk mendapatkan address collection baru
- ✅ Auto-sync dengan database setelah deployment

### 3. Update Chain Configuration

Menambahkan `oddsTemplateAddress` di chain config:

```typescript
export interface ChainConfig {
  // ... existing fields
  launchpadFactoryAddress?: string;
  oddsTemplateAddress?: string; // NEW: OddsLaunchpad template address
  // ... other fields
}
```

**Sepolia Configuration:**
```typescript
11155111: {
  // ...
  launchpadFactoryAddress: "0xB759B92CB8493342ABD53103E2Db5cd20E549975", // MasterContractFactory
  oddsTemplateAddress: "0x8214c3755126f11Ad093BD491C3d3974A7244415", // OddsLaunchpad Template
  // ...
}
```

### 4. Helper Functions

Menambahkan fungsi helper di `ContractService`:

```typescript
// Get template address dari chain config
async getTemplateAddress(chainId: number): Promise<string | null>

// Verify apakah template sudah di-approve
async isTemplateApproved(chainId: number, templateAddress: string): Promise<boolean>
```

### 5. Update Hook `use-nft-collection`

Hook `createCollection` sekarang menggunakan `deployMasterContract`:

```typescript
const createCollection = useCallback(async (data: CollectionData) => {
  const service = new ContractService();
  
  // Get template address dari chain config
  const templateAddress = await service.getTemplateAddress(data.chainId);
  
  // Deploy menggunakan MasterContractFactory
  const txHash = await service.deployMasterContract(
    data.chainId,
    templateAddress,
    { /* collection config */ }
  );
  
  return txHash;
}, []);
```

## Cara Menggunakan

### 1. Deploy Collection Baru

```typescript
import { ContractService } from '@/lib/contract-service';

const service = new ContractService();

// Get template address
const templateAddress = await service.getTemplateAddress(11155111); // Sepolia

// Deploy collection
const txHash = await service.deployMasterContract(
  11155111, // chainId
  templateAddress,
  {
    name: "My NFT Collection",
    symbol: "MNFT",
    baseURI: "ipfs://...",
    unrevealedURI: "ipfs://...",
    contractURI: "ipfs://...",
    externalLink: "https://...",
    totalMaxSupply: 10000,
    treasury: "0x...",
    royaltyRecipient: "0x...",
    royaltyPercentage: 500, // 5%
    isRevealed: false,
    transfersEnabled: true
  }
);

console.log('Transaction hash:', txHash);
```

### 2. Verify Template Approval

```typescript
const isApproved = await service.isTemplateApproved(
  11155111,
  "0x8214c3755126f11Ad093BD491C3d3974A7244415"
);

console.log('Template approved:', isApproved); // true
```

## Event yang Di-emit

Saat deploy berhasil, MasterContractFactory akan emit event:

```solidity
event ContractDeployed(
  address indexed contractAddress,  // Address collection baru
  address indexed template,         // Template yang digunakan
  address indexed deployer,         // Address yang deploy
  uint256 nonce                     // Nonce deployment
);
```

## Backward Compatibility

Fungsi lama masih tersedia tapi sudah di-deprecate:

```typescript
// ⚠️ DEPRECATED - Gunakan deployMasterContract
async createLaunchpad(chainId: number, request: {...}): Promise<string>

// ⚠️ DEPRECATED - Gunakan deployMasterContract
async createLaunchpadWithPhases(chainId: number, request: {...}, phases: any[]): Promise<string>
```

## Testing

### Manual Test di Sepolia

```bash
# 1. Verify template approval
npx hardhat run scripts/check-template-status.js --network sepolia

# 2. Deploy collection via frontend
# - Buka Creator Studio (/create/add)
# - Isi form collection
# - Submit

# 3. Verify deployment
# - Check transaction di Etherscan
# - Verify event ContractDeployed
# - Check database untuk entry baru
```

## Troubleshooting

### Template Not Approved
```
Error: MasterContractFactory__TemplateNotApproved
```
**Solution**: Run approve script:
```bash
npx hardhat run scripts/approve-template-sepolia.js --network sepolia
```

### Invalid Bytecode
```
Error: MasterContractFactory__InvalidBytecode
```
**Solution**: Verify template bytecode hash matches approved hash

### Template Not Found
```
Error: OddsLaunchpad template not configured for chain X
```
**Solution**: Add `oddsTemplateAddress` to chain config di `src/config/chains.ts`

## Next Steps

1. ✅ Update ABI imports
2. ✅ Implement `deployMasterContract` function
3. ✅ Update chain configuration
4. ✅ Update hooks dan components
5. ⏳ Test deployment di Sepolia
6. ⏳ Update documentation
7. ⏳ Deploy ke production (MegaETH)

## References

- MasterContractFactory: `abi/MasterContractFactory.json`
- OddsLaunchpad: `abi/OddsLaunchpad.json`
- Contract Service: `src/lib/contract-service.ts`
- Chain Config: `src/config/chains.ts`
- Hook: `src/hooks/use-nft-collection.tsx`

## Contract Addresses

### Sepolia Testnet
- **MasterContractFactory**: `0xB759B92CB8493342ABD53103E2Db5cd20E549975`
- **OddsLaunchpad Template**: `0x8214c3755126f11Ad093BD491C3d3974A7244415`
- **Explorer**: https://sepolia.etherscan.io

### MegaETH (Coming Soon)
- **MasterContractFactory**: TBD
- **OddsLaunchpad Template**: TBD
