-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "BannerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SCHEDULED');

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'evm',
    "image" TEXT NOT NULL,
    "thumbnail" TEXT,
    "type" "BannerType" NOT NULL DEFAULT 'IMAGE',
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "collectionAddress" TEXT,
    "launchpadId" TEXT,
    "mintedDate" TIMESTAMP(3),
    "mintedLink" TEXT,
    "status" "BannerStatus" NOT NULL DEFAULT 'ACTIVE',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_status_sequence_idx" ON "banners"("status", "sequence");

-- CreateIndex
CREATE INDEX "launchpads_createdAt_idx" ON "launchpads"("createdAt");

-- CreateIndex
CREATE INDEX "launchpads_chainId_createdAt_idx" ON "launchpads"("chainId", "createdAt");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_launchpadId_fkey" FOREIGN KEY ("launchpadId") REFERENCES "launchpads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
