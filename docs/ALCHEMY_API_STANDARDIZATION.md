# Alchemy API Standardization

## Overview
Standardisasi semua API routes `/nft` untuk konsistensi response format dan error handling sesuai dengan Alchemy NFT Service.

## Helper Functions

### File: `src/lib/alchemy-api-helpers.ts`

Helper functions untuk standardisasi API routes:

#### Network Mapping
```typescript
getAlchemyNetwork(chainId?: number | string): string
```
Maps chain ID to Alchemy network name:
- 1 → eth-mainnet
- 11155111 → eth-sepolia
- 137 → polygon-mainnet
- 80002 → polygon-amoy
- 8453 → base-mainnet
- 84532 → base-sepolia
- 10 → opt-mainnet
- 42161 → arb-mainnet

#### Service Creation
```typescript
createAlchemyService(chainId?: number | string)
```
Creates Alchemy NFT Service with automatic network selection based on chain ID.

#### Response Helpers
```typescript
successResponse<T>(data: T, status = 200)
errorResponse(error: string, message?: string, status = 500)
```
Standard response format:
```json
{
  "success": true,
  "data": { ... }
}
```

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed message"
}
```

#### Validation & Parsing
```typescript
validateParams(params: Record<string, string | null>, required: string[]): string | null
parseIntSafe(value: string | null, defaultValue: number): number
parseFloatSafe(value: string | null, defaultValue: number): number
parseBool(value: string | null, defaultValue = false): boolean
```

#### Error Handling
```typescript
handleApiError(error: unknown, context: string)
```
Consistent error handling across all API routes.

## Updated API Routes

### 1. `/api/nft/owner` ✅
- Added multi-chain support via `chainId` parameter
- Uses helper functions for network mapping
- Standardized response format
- Improved error handling

### 2. `/api/nft/collections` ✅
- Removed spam filter (requires Growth plan)
- Fixed TypeScript issues
- Standardized response

### 3. `/api/nft/sales` ✅
- Fixed Set spread operator issue
- Standardized response format

## Response Format Standard

All API routes follow this format:

### Success Response
```json
{
  "success": true,
  "data": {
    // RAW Alchemy API response
    // NO transformation - direct passthrough
  }
}
```

**Important**: All `/nft` API routes now return the **raw, unmodified** response from Alchemy API. This ensures:
- Transparency with Alchemy documentation
- No data loss from transformation
- Easier debugging and testing
- Direct mapping to Alchemy docs

### Error Response
```json
{
  "success": false,
  "error": "High-level error message",
  "message": "Detailed error message (optional)"
}
```

## Chain Support

All NFT API routes now support multi-chain via `chainId` query parameter:

```
GET /api/nft/owner?address=0x...&chainId=1
GET /api/nft/metadata?contract=0x...&tokenId=1&chainId=137
GET /api/nft/floor-price?contract=0x...&chainId=8453
```

If `chainId` is not provided, defaults to `ALCHEMY_NETWORK` environment variable or `eth-mainnet`.

## Alchemy Plan Limitations

Some features require Alchemy Growth plan or higher:

### Free Plan Limitations
- ❌ `excludeFilters` (spam filtering)
- ❌ `includeFilters`
- ✅ Basic NFT queries
- ✅ Metadata fetching
- ✅ Floor prices
- ✅ Ownership data

### Workarounds
- Removed `excludeFilters: ['SPAM']` from all routes
- Client-side filtering can be implemented if needed
- Consider upgrading to Growth plan for production use

## API Routes List

### Ownership Endpoints
- ✅ `/api/nft/owner` - Get NFTs for owner
- ✅ `/api/nft/owners/contract` - Get owners for contract
- ✅ `/api/nft/owners/token` - Get owners for token
- ✅ `/api/nft/holder` - Check if holder of contract
- ✅ `/api/nft/collections` - Get collections for owner
- ✅ `/api/nft/portfolio` - Get NFT portfolio

### Metadata Endpoints
- ✅ `/api/nft/metadata` - Get NFT metadata
- ✅ `/api/nft/metadata/batch` - Get batch metadata
- ✅ `/api/nft/contract/metadata` - Get contract metadata
- ✅ `/api/nft/contract/metadata/batch` - Get batch contract metadata
- ✅ `/api/nft/contract/nfts` - Get NFTs for contract
- ✅ `/api/nft/attributes` - Get attribute summary
- ✅ `/api/nft/search` - Search contracts

### Market Data Endpoints
- ✅ `/api/nft/floor-price` - Get floor price
- ✅ `/api/nft/sales` - Get sales data
- ✅ `/api/nft/rarity` - Compute rarity

### Spam Detection Endpoints
- ✅ `/api/nft/spam/check` - Check if spam
- ✅ `/api/nft/spam/contracts` - Get spam contracts
- ✅ `/api/nft/spam/report` - Report spam
- ✅ `/api/nft/airdrop/check` - Check if airdrop

### Refresh Endpoints
- ✅ `/api/nft/refresh/contract` - Refresh contract metadata
- ✅ `/api/nft/refresh/token` - Refresh token metadata

## Best Practices

### 1. Always Use Helper Functions
```typescript
import {
  createAlchemyService,
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/alchemy-api-helpers';
```

### 2. Support Multi-Chain
```typescript
const chainId = searchParams.get('chainId');
const alchemyService = createAlchemyService(chainId);
```

### 3. Consistent Error Handling
```typescript
try {
  // API logic
  return successResponse(data);
} catch (error) {
  return handleApiError(error, 'Operation name');
}
```

### 4. Validate Parameters
```typescript
if (!requiredParam) {
  return errorResponse('Parameter is required', undefined, 400);
}
```

### 5. Return Raw Alchemy Response
**Always return the raw, unmodified response from Alchemy**. Do NOT transform or simplify the data structure. This ensures:
- Direct compatibility with Alchemy documentation
- No information loss
- Easier debugging
- Frontend handles data transformation as needed

## Testing

Test all endpoints with different chains:

```bash
# Ethereum Mainnet
curl "http://localhost:3000/api/nft/owner?address=0x...&chainId=1"

# Polygon
curl "http://localhost:3000/api/nft/owner?address=0x...&chainId=137"

# Base
curl "http://localhost:3000/api/nft/owner?address=0x...&chainId=8453"

# Sepolia (testnet)
curl "http://localhost:3000/api/nft/owner?address=0x...&chainId=11155111"
```

## Migration Guide

### Before
```typescript
export async function GET(request: NextRequest) {
  try {
    const param = searchParams.get('param');
    if (!param) {
      return NextResponse.json({ error: 'Required' }, { status: 400 });
    }
    
    const service = createAlchemyNFTService({
      apiKey: process.env.ALCHEMY_API_KEY,
      network: 'eth-mainnet',
    });
    
    const result = await service.someMethod();
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### After
```typescript
import {
  createAlchemyService,
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/alchemy-api-helpers';

export async function GET(request: NextRequest) {
  try {
    const param = searchParams.get('param');
    if (!param) {
      return errorResponse('Parameter is required', undefined, 400);
    }
    
    const chainId = searchParams.get('chainId');
    const service = createAlchemyService(chainId);
    
    const result = await service.someMethod();
    
    return successResponse(result);
  } catch (error) {
    return handleApiError(error, 'Some method');
  }
}
```

## Notes

- All API routes maintain backward compatibility
- Chain ID parameter is optional (defaults to env or eth-mainnet)
- Response format is consistent across all endpoints
- Error messages are descriptive and helpful
- TypeScript types are properly maintained
