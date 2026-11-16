-- schema.prisma has VerificationManagedRole.updatedAt (@updatedAt) but
-- manual_nft_holder_verification created the table without it.
-- The folder name sorts right after manual_nft_holder_verification on purpose.
-- Idempotent: safe for databases where the column was already added by hand.
ALTER TABLE "verification_managed_roles" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "verification_managed_roles" ALTER COLUMN "updatedAt" DROP DEFAULT;
