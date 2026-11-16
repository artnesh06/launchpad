# Quick Reference: MasterContractFactory

## 🚀 Quick Start

### 1. Verify Template Approval
```bash
npx ts-node scripts/verify-template.ts
```

### 2. Deploy Collection (Frontend)
```typescript
import { useNFTCollection } from '@/hooks/use-nft-collection';

const { createCollection } = useNFTCollection();

const txHash = await createCollection({
  chainId: 11155111, // Sepolia
  name: "My Collection",
  symbol: "MC",
  baseURI: "ipfs://...",
  unrevealedURI: "ipfs://...",
  contractURI: "ipfs://...",
  externalLink: "https://...",
  totalMaxSupply: 10000,
  treasury: "0x...",
  royaltyRecipient: "0x...",
  royaltyPercentage: 500 // 5%
});
```

### 3. Deploy Collection (Backend/Script)
```typescript
import { ContractService } from '@/lib/contract-service';

const service = new ContractService();
const templateAddress = await service.getTemplateAddress(11155111);

const txHash = await service.deployMasterContract(
  11155111,
  templateAddress,
  {
    name: "My Collection",
    symbol: "MC",
    // ... other config
  }
);
```

## 📋 Contract Addresses

### Sepolia Testnet
```
MasterContractFactory: 0xB759B92CB8493342ABD53103E2Db5cd20E549975
OddsLaunchpad Template: 0x8214c3755126f11Ad093BD491C3d3974A7244415
```

## 🔧 Key Functions

### ContractService Methods

```typescript
// Get template address for chain
getTemplateAddress(chainId: number): Promise<string | null>

// Check if template is approved
isTemplateApproved(chainId: number, templateAddress: string): Promise<boolean>

// Deploy new collection
deployMasterContract(
  chainId: number,
  templateAddress: string,
  config: CollectionConfig
): Promise<string>
```

### MasterContractFactory ABI

```solidity
// Deploy new instance from template
function deployMasterContract(
  address _template,
  bytes memory _creationCodeWithoutArgs,
  bytes memory _constructorArgs
) external returns (address)

// Check template approval
function getTemplateApproved(address _template) external view returns (bool)

// Get template bytecode hash
function getTemplateBytecodeHash(address _template) external view returns (bytes32)
```

## 📊 Events

```solidity
event ContractDeployed(
  address indexed contractAddress,
  address indexed template,
  address indexed deployer,
  uint256 nonce
);
```

## 🔍 Verification

### Check Template Status
```bash
# Via script
npx ts-node scripts/verify-template.ts

# Via Etherscan
# 1. Go to Factory contract
# 2. Read Contract -> getTemplateApproved
# 3. Input template address
```

### Check Deployment
```bash
# 1. Get transaction hash from deployment
# 2. View on Etherscan: https://sepolia.etherscan.io/tx/[TX_HASH]
# 3. Check "Logs" tab for ContractDeployed event
# 4. contractAddress field = your new collection address
```

## 🐛 Common Errors

### Template Not Approved
```
Error: MasterContractFactory__TemplateNotApproved
```
**Fix**: Run `npx hardhat run scripts/approve-template-sepolia.js --network sepolia`

### Template Not Configured
```
Error: OddsLaunchpad template not configured for chain X
```
**Fix**: Add `oddsTemplateAddress` to `src/config/chains.ts`

### Invalid Bytecode
```
Error: MasterContractFactory__InvalidBytecode
```
**Fix**: Verify template bytecode matches approved hash

## 📝 Configuration Files

### Chain Config
```typescript
// src/config/chains.ts
export interface ChainConfig {
  launchpadFactoryAddress?: string;  // MasterContractFactory address
  oddsTemplateAddress?: string;      // OddsLaunchpad template address
}
```

### Environment Variables
```bash
# .env
SEPOLIA_FACTORY_ADDRESS="0xB759B92CB8493342ABD53103E2Db5cd20E549975"
SEPOLIA_TEMPLATE_ADDRESS="0x8214c3755126f11Ad093BD491C3d3974A7244415"
```

## 🔗 Links

- [Full Migration Guide](./MASTER_CONTRACT_FACTORY_MIGRATION.md)
- [Sepolia Factory](https://sepolia.etherscan.io/address/0xB759B92CB8493342ABD53103E2Db5cd20E549975)
- [Sepolia Template](https://sepolia.etherscan.io/address/0x8214c3755126f11Ad093BD491C3d3974A7244415)

## 💡 Tips

1. **Always verify template approval** before deploying
2. **Wait for transaction confirmation** before using deployed address
3. **Parse ContractDeployed event** to get new collection address
4. **Check gas estimates** before deployment (can be expensive)
5. **Test on Sepolia** before deploying to mainnet

## 🎯 Workflow

```
1. Verify Template Approval
   ↓
2. Prepare Collection Config
   ↓
3. Call deployMasterContract
   ↓
4. Wait for Transaction
   ↓
5. Parse ContractDeployed Event
   ↓
6. Get New Collection Address
   ↓
7. Add Mint Phases (optional)
   ↓
8. Collection Ready! 🎉
```
