# 🚀 Quick Start Guide

Get your NFT Launchpad up and running in 5 minutes!

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm (recommended) or npm

## Installation

```bash
# 1. Clone and install
git clone <repository>
cd nft-launchpad
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database URL and RPC endpoints
# See ENVIRONMENT_VARIABLES.md for detailed configuration guide

# 3. Setup database
pnpm prisma generate
pnpm prisma migrate deploy

# 4. Build and start
pnpm build
pnpm start
```

## Post-Installation

```bash
# In a new terminal, start mint listeners
pnpm listeners:start

# Check health
pnpm health
```

## Verify Installation

Visit: http://localhost:3000

You should see:
- ✅ NFT Trending Table with collections
- ✅ Charts displaying volume data
- ✅ MINT button on hover

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server

# Database
pnpm db:studio              # Open Prisma Studio
pnpm db:migrate             # Run migrations

# Listeners
pnpm listeners:start        # Start mint listeners
pnpm sync:all              # Sync all launchpads

# Health Check
pnpm health                # Check system health
```

## API Quick Test

```bash
# Get launchpads
curl "http://localhost:3000/api/admin/launchpads?chainId=6342&limit=5"

# Check listeners
curl http://localhost:3000/api/admin/launchpads/listeners

# Health check
curl http://localhost:3000/api/health
```

## Troubleshooting

### Server won't start
```bash
# Check if port 3000 is available
lsof -i :3000

# Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Listeners not working
```bash
# Restart listeners
curl -X POST http://localhost:3000/api/admin/launchpads/listeners \
  -H "Content-Type: application/json" \
  -d '{"action": "start-all"}'
```

### No data showing
```bash
# Sync from blockchain
pnpm sync:all
```

## Next Steps

1. Configure environment variables: [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
2. Set up activity listeners: [ACTIVITY_LISTENERS.md](./ACTIVITY_LISTENERS.md)
3. Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production setup
4. Check [COMPLETE_INTEGRATION_SUMMARY.md](./COMPLETE_INTEGRATION_SUMMARY.md) for full documentation
5. Review [FINAL_CHECKLIST.md](./FINAL_CHECKLIST.md) before deploying

## Support

- 📚 Documentation: See `/docs` folder
- 🐛 Issues: Check logs with `pm2 logs`
- 💬 Questions: Review documentation files

---

**Ready to launch!** 🚀
