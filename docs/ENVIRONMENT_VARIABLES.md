# Environment Variables Documentation

This document provides a comprehensive guide to all environment variables used in the NFT Launchpad platform.

## Table of Contents

- [Database Configuration](#database-configuration)
- [Application Configuration](#application-configuration)
- [Admin Authentication](#admin-authentication)
- [Blockchain RPC URLs](#blockchain-rpc-urls)
- [Contract Addresses](#contract-addresses)
- [IPFS Storage Configuration](#ipfs-storage-configuration)
- [Wallet Configuration](#wallet-configuration)
- [Activity Listener Configuration](#activity-listener-configuration)
- [Activity API Configuration](#activity-api-configuration)

---

## Database Configuration

### `DATABASE_URL`

**Required**: Yes  
**Type**: String (PostgreSQL connection URL)  
**Example**: `postgresql://user:password@localhost:5432/database_name?schema=public`

PostgreSQL database connection string. This is required for the application to connect to the database.

**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]?schema=public`

---

## Application Configuration

### `NEXT_PUBLIC_APP_URL`

**Required**: Yes  
**Type**: String (URL)  
**Default**: `http://localhost:3000`  
**Example**: `https://your-domain.com`

The base URL of your application. Used for generating absolute URLs and API endpoints.

### `NEXT_PUBLIC_CHAIN_ID`

**Required**: Yes  
**Type**: String (numeric)  
**Example**: `6342`

The default blockchain network chain ID. This determines which blockchain network the application connects to by default.

### `NEXT_PUBLIC_DEFAULT_CHAIN`

**Required**: Yes  
**Type**: String  
**Example**: `megaeth`

The default blockchain network identifier. Must match one of the configured chain names in your database.

**Supported values**: `ethereum`, `base`, `abstract`, `megaeth`, `hyperliquid`, or any custom chain configured in your database.

---

## Admin Authentication

All `/admin` pages and `/api/admin/**` routes require an admin (see `src/middleware.ts` and
`src/lib/admin-route-policy.ts`). A request is admin when it carries a valid signed `admin-session`
cookie (from `POST /api/admin/auth`) **or** a valid `ADMIN_API_KEY` header. Unauthenticated API calls get
`401` JSON; pages redirect to `/admin/login`. A few read-only / chain-synced endpoints used by the public site
are explicitly allowlisted, and creator write endpoints accept either an admin session or a wallet signature
from the collection creator/on-chain owner (`src/lib/creator-auth.ts`).

### `ADMIN_USERNAME` / `ADMIN_PASSWORD`

**Required**: Yes (admin panel)  
**Security**: Server-side only. Compared in constant time.

### `ADMIN_SESSION_SECRET`

**Required**: Yes - admin login is refused and every session is rejected while it is unset or shorter than 32 characters  
**Type**: String (random, >= 32 chars)  
**Security**: Server-side only  
**Generate**: `openssl rand -base64 48`

HMAC-SHA256 key that signs the admin session cookie (`payload = user + issued-at + expiry`, 12 h lifetime;
cookie is `httpOnly`, `secure` in production, `sameSite=strict`, `path=/`). Rotating it logs out all admins.

### `ADMIN_API_KEY`

**Required**: Optional (>= 16 chars when used)  
**Security**: Server-side only  
**Generate**: `openssl rand -hex 32`

Machine-to-machine admin credential. Sent to the listener backend (`NEXT_PUBLIC_BACKEND_URL`) and accepted by
`/api/admin/**` via `x-admin-api-key: <key>` or `Authorization: Bearer <key>` (e.g. cron jobs, listener webhooks).

### `USER_SESSION_SECRET`

**Required**: Yes for Discord / linked-wallet login (NFT holder verification)  
**Type**: String (random, >= 32 chars)  
**Generate**: `openssl rand -base64 48`

HMAC-SHA256 key for the stateless `discord-session` cookie (24 h, httpOnly, sameSite=lax). Without it
no user session can be created or validated. The old unsigned `discord-session-data` cookie is no longer trusted.

### `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_REDIRECT_URI`

**Required**: For Discord OAuth  
From the Discord developer portal (OAuth2). `DISCORD_REDIRECT_URI` defaults to
`${NEXT_PUBLIC_APP_URL}/api/auth/discord/callback` and must be registered in the Discord app.

### `REDIS_URL` / `CACHE_ENABLED`

**Required**: Optional. Redis for the hybrid API cache (falls back to in-memory). `CACHE_ENABLED=false` disables caching.

### `MEGAETH_MAINNET_RPC_URL`

**Required**: Optional (defaults to `https://mainnet.megaeth.com/rpc`). Put private/VIP RPC URLs (they embed an
access token) here instead of in code. Server-side only.

---

## Blockchain RPC URLs

RPC (Remote Procedure Call) URLs are used to connect to blockchain networks. Each supported chain requires its own RPC endpoint.

### `ETHEREUM_RPC_URL`

**Required**: If Ethereum support is enabled  
**Type**: String (URL)  
**Example**: `https://mainnet.infura.io/v3/YOUR_INFURA_KEY`

Ethereum mainnet RPC endpoint. Get a free API key from:
- [Infura](https://infura.io/)
- [Alchemy](https://www.alchemy.com/)
- [QuickNode](https://www.quicknode.com/)

### `BASE_RPC_URL`

**Required**: If Base support is enabled  
**Type**: String (URL)  
**Example**: `https://mainnet.base.org`

Base network RPC endpoint. Public endpoint available at `https://mainnet.base.org`.

### `ABSTRACT_RPC_URL`

**Required**: If Abstract support is enabled  
**Type**: String (URL)  
**Example**: `https://api.testnet.abs.xyz`

Abstract testnet RPC endpoint.

### `MEGAETH_RPC_URL`

**Required**: If MegaETH support is enabled  
**Type**: String (URL)  
**Example**: `https://timothy.megaeth.com/rpc`

MegaETH network RPC endpoint.

### `HYPERLIQUID_RPC_URL`

**Required**: If Hyperliquid support is enabled  
**Type**: String (URL)  
**Example**: `https://api.hyperliquid-testnet.xyz/evm`

Hyperliquid testnet RPC endpoint.

### `ALCHEMY_API_KEY`

**Required**: Yes (NFT data APIs, Monad testnet RPC)  
**Type**: String  
**Security**: Server-side only - never prefix with `NEXT_PUBLIC_`  
**Example**: `YOUR_ALCHEMY_KEY`

Used by the `/api/nft/*` routes (Alchemy NFT API, network selected by `ALCHEMY_NETWORK`, default `eth-mainnet`)
and to build the Monad testnet RPC URL `https://monad-testnet.g.alchemy.com/v2/<key>` used by the `/api/rpc` proxy.

### `INFURA_API_KEY`

**Required**: Optional  
**Type**: String  
**Security**: Server-side only  
**Example**: `YOUR_INFURA_KEY`

Used to build the Sepolia RPC URL `https://sepolia.infura.io/v3/<key>` for the `/api/rpc` proxy.

### `SEPOLIA_RPC_URL` / `MONAD_TESTNET_RPC_URL`

**Required**: Optional (override)  
**Type**: String (URL)

Full RPC URLs for Sepolia / Monad testnet. When set they take precedence over the URLs built from
`INFURA_API_KEY` / `ALCHEMY_API_KEY`. If none are set the app falls back to public RPC endpoints.

---

## Contract Addresses

Factory contract addresses for each supported blockchain network. These contracts are used to create and manage NFT collections.

### `ETHEREUM_FACTORY_ADDRESS`

**Required**: If Ethereum support is enabled  
**Type**: String (Ethereum address)  
**Example**: `0x292d4516a315B3DD53537F1532EAAaA26194aBA6`

LaunchpadFactory contract address on Ethereum mainnet.

### `BASE_FACTORY_ADDRESS`

**Required**: If Base support is enabled  
**Type**: String (Ethereum address)  
**Example**: `0x292d4516a315B3DD53537F1532EAAaA26194aBA6`

LaunchpadFactory contract address on Base network.

### `ABSTRACT_FACTORY_ADDRESS`

**Required**: If Abstract support is enabled  
**Type**: String (Ethereum address)  
**Example**: `0x292d4516a315B3DD53537F1532EAAaA26194aBA6`

LaunchpadFactory contract address on Abstract testnet.

### `MEGAETH_FACTORY_ADDRESS`

**Required**: If MegaETH support is enabled  
**Type**: String (Ethereum address)  
**Example**: `0x292d4516a315B3DD53537F1532EAAaA26194aBA6`

LaunchpadFactory contract address on MegaETH network.

### `HYPERLIQUID_FACTORY_ADDRESS`

**Required**: If Hyperliquid support is enabled  
**Type**: String (Ethereum address)  
**Example**: `0x292d4516a315B3DD53537F1532EAAaA26194aBA6`

LaunchpadFactory contract address on Hyperliquid testnet.

---

## IPFS Storage Configuration

IPFS (InterPlanetary File System) is used for decentralized storage of NFT metadata and images. This project uses Pinata as the IPFS pinning service.

### `PINATA_API_KEY`

**Required**: Yes (for IPFS uploads)  
**Type**: String  
**Security**: Server-side only (no `NEXT_PUBLIC_` prefix)  
**Example**: `your_pinata_api_key`

Pinata API key for authenticating IPFS upload requests.

**How to get**:
1. Create an account at [https://pinata.cloud](https://pinata.cloud)
2. Go to the API Keys section
3. Create a new API key with pinning permissions
4. Copy the API Key value

### `PINATA_SECRET_KEY`

**Required**: Yes (for IPFS uploads)  
**Type**: String  
**Security**: Server-side only (no `NEXT_PUBLIC_` prefix)  
**Example**: `your_pinata_secret_key`

Pinata Secret Key for authenticating IPFS upload requests.

**How to get**: Same as `PINATA_API_KEY` - both are provided when creating a new API key.

⚠️ **Security Note**: These keys are server-side only and will NOT be exposed to the browser/frontend. Never add the `NEXT_PUBLIC_` prefix to these variables.

### `NEXT_PUBLIC_IPFS_GATEWAY`

**Required**: No  
**Type**: String (URL)  
**Default**: `https://eu.orbitor.dev`  
**Example**: `https://eu.orbitor.dev`

IPFS gateway URL for retrieving uploaded content. This is public and can be exposed to the frontend.

**Alternative gateways**:
- `https://ipfs.io`
- `https://cloudflare-ipfs.com`
- `https://eu.orbitor.dev`

---

## Wallet Configuration

### `NEXT_PUBLIC_REOWN_PROJECT_ID`

**Required**: Yes (for wallet connection)  
**Type**: String  
**Example**: `your_reown_project_id_here`

Reown (formerly WalletConnect) project ID for enabling wallet connections.

**How to get**:
1. Visit [https://cloud.reown.com/](https://cloud.reown.com/)
2. Create a new project
3. Copy the Project ID
4. Replace the value in `.env` and in `src/lib/wallet-config.ts`

---

## Activity Listener Configuration

The Activity Listener service monitors blockchain events in real-time and stores them in the database for display in the Market Activity Section.

### `ACTIVITY_LISTENER_ENABLED`

**Required**: No  
**Type**: Boolean (string)  
**Default**: `true`  
**Values**: `true` | `false`

Enable or disable the activity listener service.

- `true`: Monitor blockchain events in real-time
- `false`: Disable event monitoring (activity feed will show cached data only)

**When to disable**:
- During development if you don't need real-time updates
- To reduce RPC usage and costs
- For testing with static data

### `ACTIVITY_LISTENER_POLL_INTERVAL`

**Required**: No  
**Type**: Number (milliseconds)  
**Default**: `5000` (5 seconds)  
**Range**: `1000` - `60000` (1 second - 1 minute)

Polling interval for checking new blocks on the blockchain.

**Trade-offs**:
- **Lower values** (e.g., 1000-3000ms):
  - More real-time event detection
  - Higher RPC usage and costs
  - Better user experience
  
- **Higher values** (e.g., 10000-30000ms):
  - Lower RPC usage and costs
  - Slower event detection
  - Reduced server load

**Recommended values**:
- Development: `10000` (10 seconds)
- Production (high traffic): `5000` (5 seconds)
- Production (cost-sensitive): `15000` (15 seconds)

---

## Activity API Configuration

Configuration for the Activity Feed API endpoint that serves real-time blockchain events to the frontend.

### `ACTIVITY_API_CACHE_TTL`

**Required**: No  
**Type**: Number (seconds)  
**Default**: `10`  
**Range**: `5` - `300` (5 seconds - 5 minutes)

Cache Time To Live (TTL) for activity feed data. This controls how long activity data is cached before refreshing from the database.

**Trade-offs**:
- **Lower values** (e.g., 5-10 seconds):
  - More real-time data
  - Higher database load
  - Better user experience
  
- **Higher values** (e.g., 30-60 seconds):
  - Lower database load
  - Reduced server costs
  - Slightly stale data

**Recommended values**:
- Development: `5` (5 seconds)
- Production: `10` (10 seconds)
- High traffic: `15` (15 seconds)

### `ACTIVITY_API_RATE_LIMIT`

**Required**: No  
**Type**: Number (requests per minute)  
**Default**: `60`  
**Range**: `10` - `1000`

Rate limit for the activity API endpoint (requests per minute per IP address).

**Purpose**: Prevent abuse and protect your server from excessive requests.

**Recommended values**:
- Development: `120` (2 requests per second)
- Production: `60` (1 request per second)
- High traffic: `30` (0.5 requests per second)

**Note**: The frontend polls every 10 seconds by default, so 60 requests per minute (6 requests per 10 seconds) is sufficient for normal usage.

---

## Setup Instructions

### 1. Copy the Example File

```bash
cp .env.example .env
```

### 2. Configure Required Variables

At minimum, you must configure:

1. `DATABASE_URL` - Your PostgreSQL connection string
2. `NEXT_PUBLIC_APP_URL` - Your application URL
3. `NEXT_PUBLIC_CHAIN_ID` - Default chain ID
4. `NEXT_PUBLIC_DEFAULT_CHAIN` - Default chain name
5. `PINATA_API_KEY` - Pinata API key (for IPFS)
6. `PINATA_SECRET_KEY` - Pinata secret key (for IPFS)
7. `NEXT_PUBLIC_REOWN_PROJECT_ID` - Reown project ID (for wallets)

### 3. Configure Blockchain Networks

For each blockchain network you want to support:

1. Add the RPC URL (e.g., `ETHEREUM_RPC_URL`)
2. Add the factory contract address (e.g., `ETHEREUM_FACTORY_ADDRESS`)
3. Ensure the chain is configured in your database

### 4. Optional: Configure Activity Listeners

If you want real-time blockchain event monitoring:

1. Set `ACTIVITY_LISTENER_ENABLED=true`
2. Adjust `ACTIVITY_LISTENER_POLL_INTERVAL` based on your needs
3. Configure `ACTIVITY_API_CACHE_TTL` and `ACTIVITY_API_RATE_LIMIT`

### 5. Verify Configuration

```bash
# Check if all required variables are set
npm run build

# Start the application
npm run dev
```

---

## Security Best Practices

1. **Never commit `.env` files to version control**
   - Add `.env` to `.gitignore`
   - Use `.env.example` as a template

2. **Keep sensitive keys server-side**
   - Never add `NEXT_PUBLIC_` prefix to API keys or secrets
   - Only use `NEXT_PUBLIC_` for truly public values

3. **Use different keys for different environments**
   - Development: Use test/development API keys
   - Production: Use production API keys with appropriate rate limits

4. **Rotate keys regularly**
   - Change API keys periodically
   - Revoke old keys after rotation

5. **Use environment-specific values**
   - Development: Use test networks and lower rate limits
   - Production: Use mainnet and production-grade RPC endpoints

---

## Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`

**Solution**: Check your `DATABASE_URL` format and ensure PostgreSQL is running.

### RPC Connection Issues

**Error**: `Failed to connect to RPC endpoint`

**Solution**: 
1. Verify the RPC URL is correct
2. Check if the RPC endpoint is accessible
3. Ensure you have a valid API key (for Infura, Alchemy, etc.)

### IPFS Upload Failures

**Error**: `Pinata authentication failed`

**Solution**:
1. Verify `PINATA_API_KEY` and `PINATA_SECRET_KEY` are correct
2. Check if the API key has pinning permissions
3. Ensure the keys are not expired

### Activity Listener Not Starting

**Error**: `Activity listener failed to start`

**Solution**:
1. Check if `ACTIVITY_LISTENER_ENABLED=true`
2. Verify all RPC URLs are configured
3. Check factory contract addresses are correct
4. Review logs for specific error messages

---

## Related Documentation

- [Activity Listeners Documentation](./ACTIVITY_LISTENERS.md)
- [Quick Start Guide](./QUICK_START.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Setup Backend Guide](./SETUP-BACKEND.md)

---

## Support

For additional help:
1. Check the [documentation index](./DOCS_INDEX.md)
2. Review the [troubleshooting section](#troubleshooting)
3. Check application logs for specific error messages
