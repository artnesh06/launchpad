# 🚀 Deployment Guide - NFT Launchpad

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- pnpm/npm/yarn
- MetaMask or Web3 wallet

## Environment Setup

### 1. Database Configuration

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nft-launchpad?schema=public"
```

### 2. Blockchain Configuration

```env
# Chain RPCs
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/YOUR_KEY"
BASE_RPC_URL="https://mainnet.base.org"
MEGAETH_RPC_URL="https://timothy.megaeth.com/rpc"

# Contract Addresses
MEGAETH_FACTORY_ADDRESS="0x41bBbCCcbc34dDe370593aBD3102327B299315b1"
```

### 3. Application Configuration

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CHAIN_ID="6342"
NEXT_PUBLIC_DEFAULT_CHAIN="megaeth"
```

## Installation

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Database

```bash
# Generate Prisma Client
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# (Optional) Seed database
pnpm prisma db seed
```

### 3. Build Application

```bash
pnpm build
```

## Running the Application

### Development Mode

```bash
pnpm dev
```

### Production Mode

```bash
pnpm start
```

## Post-Deployment Setup

### 1. Start Mint Listeners

After the server is running, start the mint listeners:

```bash
# Using curl
curl -X POST http://localhost:3000/api/admin/launchpads/listeners \
  -H "Content-Type: application/json" \
  -d '{"action": "start-all"}'

# Or using the script
pnpm tsx scripts/start-listeners.ts
```

### 2. Initial Sync (Optional)

If you have existing launchpads, sync their mint data:

```bash
pnpm tsx scripts/sync-all-launchpads.ts
```

### 3. Health Check

Verify everything is running:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": {
      "status": "healthy",
      "latency": "5ms"
    },
    "mintListeners": {
      "status": "active",
      "count": 10
    }
  },
  "stats": {
    "totalLaunchpads": 50,
    "activeLaunchpads": 45,
    "totalMints": 1234,
    "listenersActive": 10
  }
}
```

## API Endpoints

### Core APIs

```
GET  /api/health                              - Health check
GET  /api/admin/launchpads                    - List launchpads
POST /api/admin/launchpads/save               - Save launchpad
POST /api/admin/launchpads/sync-mints         - Sync mints
GET  /api/admin/launchpads/listeners          - Get listeners
POST /api/admin/launchpads/listeners          - Manage listeners
```

### Usage Examples

#### Create Launchpad

```bash
curl -X POST http://localhost:3000/api/admin/launchpads/save \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 6342,
    "contractAddress": "0x...",
    "creator": "0x...",
    "name": "My NFT Collection",
    "symbol": "MNFT",
    "totalMaxSupply": 10000,
    "treasury": "0x...",
    "phases": [{
      "name": "Public Sale",
      "phaseType": "PUBLIC",
      "startTime": "2025-01-01T00:00:00Z",
      "price": "1000000000000000000",
      "totalLimit": 10000,
      "isActive": true
    }]
  }'
```

#### Get Launchpads with Chart Data

```bash
curl "http://localhost:3000/api/admin/launchpads?chainId=6342&limit=10"
```

#### Sync Mints

```bash
curl -X POST http://localhost:3000/api/admin/launchpads/sync-mints \
  -H "Content-Type: application/json" \
  -d '{
    "launchpadId": "clxxx...",
    "contractAddress": "0x...",
    "chainId": 6342
  }'
```

## Monitoring

### 1. Check Listener Status

```bash
curl http://localhost:3000/api/admin/launchpads/listeners
```

### 2. View Logs

```bash
# Application logs
tail -f logs/app.log

# PM2 logs (if using PM2)
pm2 logs
```

### 3. Database Monitoring

```bash
# Check active connections
psql -U user -d nft-launchpad -c "SELECT count(*) FROM pg_stat_activity;"

# Check table sizes
psql -U user -d nft-launchpad -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "nft-launchpad" -- start

# Start listeners (after app is running)
pm2 start scripts/start-listeners.ts --name "mint-listeners"

# Save PM2 configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t nft-launchpad .
docker run -p 3000:3000 --env-file .env nft-launchpad
```

### Using Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/nft-launchpad
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=nft-launchpad
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
docker-compose up -d
```

## Troubleshooting

### Listeners Not Starting

```bash
# Check if server is running
curl http://localhost:3000/api/health

# Restart listeners
curl -X POST http://localhost:3000/api/admin/launchpads/listeners \
  -d '{"action": "stop-all"}'

curl -X POST http://localhost:3000/api/admin/launchpads/listeners \
  -d '{"action": "start-all"}'
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Prisma
pnpm prisma db pull
```

### Sync Issues

```bash
# Manual sync for specific launchpad
curl -X POST http://localhost:3000/api/admin/launchpads/sync-mints \
  -H "Content-Type: application/json" \
  -d '{
    "launchpadId": "xxx",
    "contractAddress": "0x...",
    "chainId": 6342
  }'
```

## Maintenance

### Database Backup

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20250103.sql
```

### Update Application

```bash
# Pull latest code
git pull

# Install dependencies
pnpm install

# Run migrations
pnpm prisma migrate deploy

# Rebuild
pnpm build

# Restart
pm2 restart nft-launchpad
```

## Performance Tuning

### Database Indexes

```sql
-- Add indexes for better performance
CREATE INDEX idx_mints_launchpad_created ON mints(launchpad_id, created_at);
CREATE INDEX idx_launchpads_chain_status ON launchpads(chain_id, status);
CREATE INDEX idx_phases_launchpad_active ON launchpad_phases(launchpad_id, is_active);
```

### Connection Pooling

```env
# Increase connection pool
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20"
```

## Security

### 1. Environment Variables

Never commit `.env` file. Use secrets management:

```bash
# Using AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id nft-launchpad/prod

# Using Vercel
vercel env add DATABASE_URL
```

### 2. API Rate Limiting

Consider adding rate limiting for public APIs.

### 3. Database Security

```sql
-- Create read-only user for analytics
CREATE USER analytics WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics;
```

## Support

For issues or questions:
- Check logs: `pm2 logs` or `docker logs`
- Health check: `curl http://localhost:3000/api/health`
- Documentation: See `COMPLETE_INTEGRATION_SUMMARY.md`

---

**Last Updated:** 2025-01-03
**Version:** 1.0.0
