-- CreateEnum
CREATE TYPE "LaunchpadStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('PRESALE', 'PUBLIC', 'ALLOWLIST', 'FREE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('FACTORY_CREATED', 'LAUNCHPAD_CREATED', 'LAUNCHPAD_UPDATED', 'MINT_OCCURRED', 'PHASE_CREATED', 'PHASE_UPDATED', 'FEE_UPDATED', 'TREASURY_UPDATED', 'OWNERSHIP_TRANSFERRED', 'EMERGENCY_WITHDRAW');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateEnum
CREATE TYPE "BulkOperationType" AS ENUM ('CREATE_LAUNCHPADS', 'UPDATE_FEES', 'UPDATE_TREASURIES', 'EXPORT_DATA');

-- CreateEnum
CREATE TYPE "BulkStatus" AS ENUM ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'VIEWER');

-- CreateTable
CREATE TABLE "chains" (
    "id" SERIAL NOT NULL,
    "chainId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "rpcUrl" TEXT NOT NULL,
    "blockExplorer" TEXT NOT NULL,
    "nativeCurrencyName" TEXT NOT NULL,
    "nativeCurrencySymbol" TEXT NOT NULL,
    "nativeCurrencyDecimals" INTEGER NOT NULL,
    "isTestnet" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launchpad_factories" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "deployedChainId" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "treasury" TEXT NOT NULL,
    "creationFee" TEXT NOT NULL,
    "platformFeePercentage" INTEGER NOT NULL,
    "freeMintFee" TEXT NOT NULL,
    "totalLaunchpads" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launchpad_factories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launchpads" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "factoryId" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "baseURI" TEXT,
    "unrevealedURI" TEXT,
    "contractURI" TEXT,
    "externalLink" TEXT,
    "totalMaxSupply" INTEGER NOT NULL,
    "mintedCount" INTEGER NOT NULL DEFAULT 0,
    "treasury" TEXT NOT NULL,
    "royaltyRecipient" TEXT,
    "royaltyPercentage" INTEGER NOT NULL DEFAULT 0,
    "status" "LaunchpadStatus" NOT NULL DEFAULT 'ACTIVE',
    "volume" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "lastMintAt" TIMESTAMP(3),
    "deployTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launchpads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launchpad_phases" (
    "id" TEXT NOT NULL,
    "launchpadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phaseType" "PhaseType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "price" TEXT NOT NULL,
    "maxMintPerWallet" INTEGER,
    "totalLimit" INTEGER,
    "mintedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "merkleRoot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launchpad_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mints" (
    "id" TEXT NOT NULL,
    "launchpadId" TEXT NOT NULL,
    "phaseId" TEXT,
    "minter" TEXT NOT NULL,
    "tokenId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "gasUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launchpad_metadata" (
    "id" TEXT NOT NULL,
    "launchpadId" TEXT NOT NULL,
    "image" TEXT,
    "bannerImage" TEXT,
    "website" TEXT,
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "medium" TEXT,
    "github" TEXT,
    "tags" TEXT[],
    "category" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launchpad_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launchpad_analytics" (
    "id" TEXT NOT NULL,
    "launchpadId" TEXT NOT NULL,
    "totalVolume" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "totalMints" INTEGER NOT NULL DEFAULT 0,
    "uniqueHolders" INTEGER NOT NULL DEFAULT 0,
    "avgMintPrice" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "floorPrice" DECIMAL(18,8),
    "lastSalePrice" DECIMAL(18,8),
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "launchpad_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "factoryId" TEXT,
    "launchpadId" TEXT,
    "type" "ActivityType" NOT NULL,
    "actor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factory_settings" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "SettingType" NOT NULL DEFAULT 'STRING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factory_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_operations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BulkOperationType" NOT NULL,
    "status" "BulkStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "data" JSONB NOT NULL,
    "result" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chains_chainId_key" ON "chains"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "launchpad_factories_contractAddress_key" ON "launchpad_factories"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "launchpads_contractAddress_key" ON "launchpads"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "mints_txHash_key" ON "mints"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "launchpad_metadata_launchpadId_key" ON "launchpad_metadata"("launchpadId");

-- CreateIndex
CREATE UNIQUE INDEX "launchpad_analytics_launchpadId_key" ON "launchpad_analytics"("launchpadId");

-- CreateIndex
CREATE UNIQUE INDEX "factory_settings_factoryId_key_key" ON "factory_settings"("factoryId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_address_key" ON "admin_users"("address");

-- AddForeignKey
ALTER TABLE "launchpad_factories" ADD CONSTRAINT "launchpad_factories_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launchpads" ADD CONSTRAINT "launchpads_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launchpads" ADD CONSTRAINT "launchpads_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "launchpad_factories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launchpad_phases" ADD CONSTRAINT "launchpad_phases_launchpadId_fkey" FOREIGN KEY ("launchpadId") REFERENCES "launchpads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mints" ADD CONSTRAINT "mints_launchpadId_fkey" FOREIGN KEY ("launchpadId") REFERENCES "launchpads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mints" ADD CONSTRAINT "mints_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "launchpad_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launchpad_metadata" ADD CONSTRAINT "launchpad_metadata_launchpadId_fkey" FOREIGN KEY ("launchpadId") REFERENCES "launchpads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launchpad_analytics" ADD CONSTRAINT "launchpad_analytics_launchpadId_fkey" FOREIGN KEY ("launchpadId") REFERENCES "launchpads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "launchpad_factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factory_settings" ADD CONSTRAINT "factory_settings_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "launchpad_factories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex for Activity table performance optimization
-- Composite index for filtering by chainId, type, and sorting by createdAt DESC
CREATE INDEX "activities_chainId_type_createdAt_idx" ON "activities"("chainId", "type", "createdAt" DESC);

-- CreateIndex for recent activity queries sorted by createdAt DESC
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt" DESC);
