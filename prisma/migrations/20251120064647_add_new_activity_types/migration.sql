-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'BURN_OCCURRED';
ALTER TYPE "ActivityType" ADD VALUE 'AIRDROP_OCCURRED';
ALTER TYPE "ActivityType" ADD VALUE 'COLLECTION_REVEALED';
ALTER TYPE "ActivityType" ADD VALUE 'ROYALTY_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'METADATA_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'CONTRACT_PAUSED';
ALTER TYPE "ActivityType" ADD VALUE 'CONTRACT_UNPAUSED';
ALTER TYPE "ActivityType" ADD VALUE 'TRANSFER_LOCK_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'ROLE_GRANTED';
ALTER TYPE "ActivityType" ADD VALUE 'ROLE_REVOKED';
