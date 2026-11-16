-- "imageManifestHash" exists in schema.prisma but was never added by a migration
-- (it was applied with `prisma db push`). IF NOT EXISTS keeps this safe for
-- databases that already have the column.
ALTER TABLE "launchpads" ADD COLUMN IF NOT EXISTS "imageManifestHash" TEXT;
