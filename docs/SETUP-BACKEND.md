# Backend Setup Guide - NFT Launchpad Admin Panel

This guide will help you set up the backend services with PostgreSQL database and Prisma ORM for the NFT Launchpad admin panel.

## 🚀 Features Implemented

### Database & ORM
- ✅ **PostgreSQL** database with comprehensive schema
- ✅ **Prisma ORM** for type-safe database operations
- ✅ **Multi-chain support** with chain-specific data
- ✅ **Complete data models** for launchpads, analytics, activities, etc.

### API Endpoints
- ✅ `/api/admin/factory-info` - Factory information and management
- ✅ `/api/admin/launchpads` - Launchpad CRUD operations with advanced filtering
- ✅ `/api/admin/analytics` - Real-time analytics and metrics
- ✅ `/api/admin/bulk-operations` - Batch processing operations
- ✅ `/api/admin/export/*` - Data export in CSV/JSON formats

### Backend Services
- ✅ **Enhanced Contract Service** - Blockchain integration with database sync
- ✅ **Admin Service** - Type-safe API client
- ✅ **Notification System** - Real-time user feedback
- ✅ **Event Monitoring** - Blockchain event listening and database sync

## 📦 Prerequisites

1. **Node.js** 18+ and **pnpm**
2. **PostgreSQL** database (local or cloud)
3. **Blockchain RPC endpoints** (Infura, Alchemy, etc.)

## 🛠️ Installation Steps

### 1. Install Dependencies

```bash
# Install required packages
pnpm install

# The following packages were added:
# - @prisma/client (PostgreSQL client)
# - @radix-ui/react-dialog (UI components)  
# - @radix-ui/react-toast (Notifications)
# - prisma (Development toolkit)
# - ts-node (TypeScript execution)
```

### 2. Database Setup

```bash
# Set up PostgreSQL database
# Option A: Local PostgreSQL
createdb nft_launchpad_db

# Option B: Use Docker
docker run --name nft-launchpad-postgres \
  -e POSTGRES_DB=nft_launchpad_db \
  -e POSTGRES_USER=your_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 -d postgres:15

# Option C: Use cloud providers (Railway, Supabase, PlanetScale, etc.)
```

### 3. Environment Configuration

```bash
# Copy environment template
cp env.example.txt .env

# Update .env with your settings:
DATABASE_URL="postgresql://username:password@localhost:5432/nft_launchpad_db?schema=public"

# Add RPC URLs
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
BASE_RPC_URL="https://mainnet.base.org"
MEGAETH_RPC_URL="https://timothy.megaeth.com/rpc"
# ... other chain RPC URLs

# Add API Keys  
INFURA_API_KEY="your-infura-api-key"
ALCHEMY_API_KEY="your-alchemy-api-key"
```

### 4. Database Migration & Seeding

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (for development)
pnpm db:push

# OR create and run migrations (for production)
pnpm db:migrate

# Seed initial data (chains, sample launchpads, admin users)
pnpm db:seed

# Open Prisma Studio to view data (optional)
pnpm db:studio
```

### 5. Start Development Server

```bash
# Start Next.js with the backend
pnpm dev

# The server will start on http://localhost:3000
# Admin panel available at http://localhost:3000/admin
```

## 🏗️ Database Schema Overview

### Core Tables
- `chains` - Supported blockchain networks
- `launchpad_factories` - Factory contracts per chain
- `launchpads` - NFT collection deployments
- `launchpad_phases` - Mint phases (presale, public, etc.)
- `mints` - Individual mint transactions

### Analytics & Metadata  
- `launchpad_metadata` - Social links, images, verification status
- `launchpad_analytics` - Volume, holders, performance metrics
- `activities` - System activities and transaction logs

### Admin Features
- `admin_users` - Admin role management
- `bulk_operations` - Batch operation tracking
- `factory_settings` - Configurable factory parameters

## 🔧 API Usage Examples

### Get Factory Information
```typescript
// Frontend usage
import AdminService from '@/lib/api/admin-service';

const factoryInfo = await AdminService.getFactoryInfo(6342);
console.log(factoryInfo);
```

### Get Launchpads with Filtering
```typescript
const launchpads = await AdminService.getLaunchpads({
  chainId: 6342,
  page: 1,
  limit: 20,
  search: 'Cool NFT',
  status: 'active',
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

### Get Analytics Data
```typescript
const analytics = await AdminService.getAnalytics(6342, '7d');
console.log(analytics.overview);
```

### Export Data
```typescript
// Export launchpads as CSV
const blob = await AdminService.exportLaunchpads(6342, 'csv');
AdminService.downloadFile(blob, 'launchpads.csv');
```

## 🔄 Contract Integration

The system automatically syncs with blockchain data:

### Real-time Sync
- **Event Listening** - Monitors contract events
- **Database Updates** - Syncs launchpad creations, fee updates
- **Cache Management** - API-first with blockchain fallback

### Transaction Handling
- **Wallet Integration** - Seamless MetaMask/WalletConnect
- **Error Handling** - User-friendly notifications
- **Transaction Tracking** - Block explorer links

## 📊 Admin Panel Features

### Overview Dashboard
- ✅ Real-time analytics and metrics
- ✅ Network health monitoring  
- ✅ Growth rate calculations
- ✅ Revenue breakdown

### Launchpad Management
- ✅ Advanced table with sorting/filtering
- ✅ Status management (active/paused/completed)
- ✅ Bulk operations support
- ✅ Export functionality

### Bulk Operations  
- ✅ CSV file upload for batch creation
- ✅ Progress tracking with pause/resume
- ✅ Error handling and reporting
- ✅ Template downloads

### Settings & Security
- ✅ Fee management (creation fee, platform fee)
- ✅ Treasury address updates
- ✅ Ownership transfers
- ✅ Emergency functions

## 🚨 Security Notes

1. **Admin Access**: Only contract owners can perform admin functions
2. **Environment Variables**: Never commit `.env` files
3. **Database Security**: Use strong passwords and SSL connections
4. **API Rate Limiting**: Consider implementing rate limiting for production
5. **Input Validation**: All API inputs are validated and sanitized

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
pnpm db:studio

# Reset database (⚠️ destroys data)
pnpm db:push --force-reset
pnpm db:seed
```

### Prisma Issues
```bash
# Regenerate client
pnpm db:generate

# Reset Prisma client
rm -rf node_modules/.prisma
pnpm install
```

### Missing Environment Variables
Check that all required variables are set in `.env`:
- `DATABASE_URL`
- `*_RPC_URL` for each supported chain
- Contract addresses for each chain

## 📈 Monitoring & Maintenance

### Database Monitoring
- Monitor connection pools and query performance
- Set up backups for production databases
- Use Prisma's built-in logging for development

### API Performance
- Monitor response times for API endpoints
- Implement caching for frequently accessed data
- Use database indexes for common queries

### Blockchain Sync
- Monitor event listening services
- Implement retry logic for failed blockchain calls
- Set up alerts for sync failures

## 🚀 Production Deployment

1. **Database**: Use managed PostgreSQL (Railway, Supabase, AWS RDS)
2. **Environment**: Set production environment variables
3. **Migrations**: Run `prisma migrate deploy` instead of `db:push`
4. **Monitoring**: Set up error tracking (Sentry) and performance monitoring
5. **Scaling**: Consider read replicas for high-traffic scenarios

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Ethers.js Documentation](https://docs.ethers.org/)

---

🎉 **Your NFT Launchpad backend is now fully set up with enterprise-grade database management, real-time analytics, and comprehensive admin functionality!**