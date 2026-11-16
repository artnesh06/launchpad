/*
  Warnings:

  - A unique constraint covering the columns `[promoCode]` on the table `banners` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PromoRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "promoCode" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "launchpads" ADD COLUMN     "manifestHash" TEXT;

-- CreateTable
CREATE TABLE "promo_requests" (
    "id" TEXT NOT NULL,
    "promoCode" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,
    "collectionAddress" TEXT,
    "creator" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "chainName" TEXT NOT NULL,
    "image" TEXT,
    "thumbnail" TEXT,
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "description" TEXT,
    "status" "PromoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "bannerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_requests_promoCode_key" ON "promo_requests"("promoCode");

-- CreateIndex
CREATE INDEX "promo_requests_status_createdAt_idx" ON "promo_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "banners_promoCode_key" ON "banners"("promoCode");

-- CreateIndex
CREATE INDEX "banners_startDate_endDate_idx" ON "banners"("startDate", "endDate");
