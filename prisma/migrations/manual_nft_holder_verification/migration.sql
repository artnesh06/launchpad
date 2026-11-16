-- NFT Holder Verification System Migration
-- This migration creates all tables required for the NFT holder verification system
-- Apply this migration manually to your database

-- Create verification_users table
CREATE TABLE IF NOT EXISTS "verification_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discordId" TEXT NOT NULL UNIQUE,
    "discordUsername" TEXT NOT NULL,
    "discordDiscriminator" TEXT NOT NULL,
    "discordAvatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create index on discordId
CREATE INDEX IF NOT EXISTS "verification_users_discordId_idx" ON "verification_users"("discordId");

-- Create verification_wallets table
CREATE TABLE IF NOT EXISTS "verification_wallets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "verification_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint and indexes for verification_wallets
CREATE UNIQUE INDEX IF NOT EXISTS "verification_wallets_userId_address_key" ON "verification_wallets"("userId", "address");
CREATE INDEX IF NOT EXISTS "verification_wallets_userId_idx" ON "verification_wallets"("userId");
CREATE INDEX IF NOT EXISTS "verification_wallets_address_idx" ON "verification_wallets"("address");

-- Create verification_chains table
CREATE TABLE IF NOT EXISTS "verification_chains" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "networkId" TEXT NOT NULL UNIQUE,
    "rpcEndpoint" TEXT NOT NULL,
    "explorerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create verification_nft_collections table
CREATE TABLE IF NOT EXISTS "verification_nft_collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verification_nft_collections_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "verification_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create unique constraint and index for verification_nft_collections
CREATE UNIQUE INDEX IF NOT EXISTS "verification_nft_collections_chainId_contractAddress_key" ON "verification_nft_collections"("chainId", "contractAddress");
CREATE INDEX IF NOT EXISTS "verification_nft_collections_chainId_idx" ON "verification_nft_collections"("chainId");

-- Create enum types for verification_role_rules
DO $$ BEGIN
    CREATE TYPE "VerificationRuleType" AS ENUM ('INDIVIDUAL_CONTRACT', 'MULTI_CONTRACT', 'NFT_THRESHOLD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VerificationRequirementType" AS ENUM ('ANY', 'ALL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create verification_role_rules table
CREATE TABLE IF NOT EXISTS "verification_role_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "discordRoleId" TEXT NOT NULL,
    "ruleType" "VerificationRuleType" NOT NULL,
    "threshold" INTEGER,
    "requirementType" "VerificationRequirementType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create verification_role_rule_collections junction table
CREATE TABLE IF NOT EXISTS "verification_role_rule_collections" (
    "roleRuleId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    PRIMARY KEY ("roleRuleId", "collectionId"),
    CONSTRAINT "verification_role_rule_collections_roleRuleId_fkey" FOREIGN KEY ("roleRuleId") REFERENCES "verification_role_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "verification_role_rule_collections_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "verification_nft_collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create verification_managed_roles table
CREATE TABLE IF NOT EXISTS "verification_managed_roles" (
    "discordRoleId" TEXT NOT NULL PRIMARY KEY,
    "roleName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create verification_nonces table
CREATE TABLE IF NOT EXISTS "verification_nonces" (
    "nonce" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on expiresAt for verification_nonces
CREATE INDEX IF NOT EXISTS "verification_nonces_expiresAt_idx" ON "verification_nonces"("expiresAt");

-- Create verification_logs table
CREATE TABLE IF NOT EXISTS "verification_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "cycleEnd" TIMESTAMP(3) NOT NULL,
    "usersProcessed" INTEGER NOT NULL,
    "rolesAssigned" INTEGER NOT NULL,
    "rolesRemoved" INTEGER NOT NULL,
    "errors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to tables for documentation
COMMENT ON TABLE "verification_users" IS 'Stores Discord user information for NFT holder verification';
COMMENT ON TABLE "verification_wallets" IS 'Stores wallet addresses linked to Discord users with cryptographic signatures';
COMMENT ON TABLE "verification_chains" IS 'Stores blockchain network configurations for NFT verification';
COMMENT ON TABLE "verification_nft_collections" IS 'Stores NFT collection contract addresses and metadata';
COMMENT ON TABLE "verification_role_rules" IS 'Stores role assignment rules based on NFT ownership criteria';
COMMENT ON TABLE "verification_role_rule_collections" IS 'Junction table linking role rules to NFT collections';
COMMENT ON TABLE "verification_managed_roles" IS 'Tracks Discord roles managed by the verification system';
COMMENT ON TABLE "verification_nonces" IS 'Stores temporary nonces for wallet signature verification';
COMMENT ON TABLE "verification_logs" IS 'Audit trail for verification cycles';
