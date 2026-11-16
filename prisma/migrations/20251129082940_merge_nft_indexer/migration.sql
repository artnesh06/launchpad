-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('MINT', 'TRANSFER', 'BURN');

-- CreateEnum
CREATE TYPE "Marketplace" AS ENUM ('OPENSEA', 'SEAPORT', 'MAGIC_EDEN', 'BLUR', 'LOOKSRARE', 'X2Y2', 'RARIBLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "nfts" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "tokenUri" TEXT,
    "imageCachedUrl" TEXT,
    "imageThumbnailUrl" TEXT,
    "imagePngUrl" TEXT,
    "imageContentType" TEXT,
    "imageSize" INTEGER,
    "imageOriginalUrl" TEXT,
    "rawMetadata" JSONB,
    "rawTokenUri" TEXT,
    "timeLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acquiredBlockTimestamp" TIMESTAMP(3),
    "acquiredBlockNumber" INTEGER,
    "mintAddress" TEXT,
    "mintBlockNumber" INTEGER,
    "mintTimestamp" TIMESTAMP(3),
    "mintTransactionHash" TEXT,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "isAirdrop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_contracts" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "symbol" TEXT,
    "totalSupply" TEXT,
    "tokenType" TEXT,
    "contractDeployer" TEXT,
    "deployedBlockNumber" INTEGER,
    "openSeaFloorPrice" DOUBLE PRECISION,
    "openSeaCollectionName" TEXT,
    "openSeaCollectionSlug" TEXT,
    "openSeaSafelistStatus" TEXT,
    "openSeaImageUrl" TEXT,
    "openSeaDescription" TEXT,
    "openSeaExternalUrl" TEXT,
    "openSeaTwitter" TEXT,
    "openSeaDiscord" TEXT,
    "openSeaBannerImageUrl" TEXT,
    "openSeaLastIngestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_attributes" (
    "id" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "traitType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayType" TEXT,
    "numericValue" DOUBLE PRECISION,
    "prevalence" DOUBLE PRECISION,
    "count" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_ownership" (
    "id" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "balance" TEXT NOT NULL DEFAULT '1',
    "acquiredAt" TIMESTAMP(3) NOT NULL,
    "acquiredBlock" INTEGER NOT NULL,
    "acquiredTxHash" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_transfers" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "nftId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '1',
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "transferType" "TransferType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nft_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '1',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "expirationTime" TIMESTAMP(3),
    "status" "ListingStatus" NOT NULL,
    "listingTxHash" TEXT NOT NULL,
    "listingBlock" INTEGER NOT NULL,
    "cancelTxHash" TEXT,
    "cancelBlock" INTEGER,
    "saleTxHash" TEXT,
    "saleBlock" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_sales" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "buyer" TEXT NOT NULL,
    "seller" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '1',
    "sellerFeeAmount" TEXT,
    "sellerFeeCurrency" TEXT,
    "protocolFeeAmount" TEXT,
    "protocolFeeCurrency" TEXT,
    "royaltyFeeAmount" TEXT,
    "royaltyFeeCurrency" TEXT,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "bundleIndex" INTEGER NOT NULL DEFAULT 0,
    "taker" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingId" TEXT,

    CONSTRAINT "marketplace_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_offers" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "offerer" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '1',
    "offerTime" TIMESTAMP(3) NOT NULL,
    "expirationTime" TIMESTAMP(3),
    "status" "OfferStatus" NOT NULL,
    "offerTxHash" TEXT NOT NULL,
    "offerBlock" INTEGER NOT NULL,
    "acceptTxHash" TEXT,
    "acceptBlock" INTEGER,
    "cancelTxHash" TEXT,
    "cancelBlock" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_floor_prices" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "floorPrice" DOUBLE PRECISION NOT NULL,
    "priceCurrency" TEXT NOT NULL,
    "collectionUrl" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nft_floor_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_rarity" (
    "id" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategyVersion" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxRank" INTEGER NOT NULL,
    "totalSupply" INTEGER NOT NULL,
    "rarityScore" DOUBLE PRECISION NOT NULL,
    "prevalence" DOUBLE PRECISION NOT NULL,
    "percentile" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_rarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_collection_analytics" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "totalVolume" TEXT NOT NULL DEFAULT '0',
    "volume24h" TEXT NOT NULL DEFAULT '0',
    "volume7d" TEXT NOT NULL DEFAULT '0',
    "volume30d" TEXT NOT NULL DEFAULT '0',
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "sales24h" INTEGER NOT NULL DEFAULT 0,
    "sales7d" INTEGER NOT NULL DEFAULT 0,
    "sales30d" INTEGER NOT NULL DEFAULT 0,
    "floorPrice" TEXT,
    "avgSalePrice" TEXT NOT NULL DEFAULT '0',
    "lastSalePrice" TEXT,
    "highestSale" TEXT,
    "uniqueHolders" INTEGER NOT NULL DEFAULT 0,
    "totalSupply" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_collection_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "component" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "chainId" INTEGER,
    "contractAddress" TEXT,
    "tokenId" TEXT,
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "metadata" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nfts_chainId_contractAddress_idx" ON "nfts"("chainId", "contractAddress");

-- CreateIndex
CREATE INDEX "nfts_isSpam_isAirdrop_idx" ON "nfts"("isSpam", "isAirdrop");

-- CreateIndex
CREATE UNIQUE INDEX "nfts_contractAddress_tokenId_chainId_key" ON "nfts"("contractAddress", "tokenId", "chainId");

-- CreateIndex
CREATE INDEX "nft_contracts_chainId_idx" ON "nft_contracts"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "nft_contracts_address_chainId_key" ON "nft_contracts"("address", "chainId");

-- CreateIndex
CREATE INDEX "nft_attributes_nftId_idx" ON "nft_attributes"("nftId");

-- CreateIndex
CREATE INDEX "nft_attributes_traitType_value_idx" ON "nft_attributes"("traitType", "value");

-- CreateIndex
CREATE INDEX "nft_ownership_nftId_isCurrent_idx" ON "nft_ownership"("nftId", "isCurrent");

-- CreateIndex
CREATE INDEX "nft_ownership_ownerAddress_isCurrent_idx" ON "nft_ownership"("ownerAddress", "isCurrent");

-- CreateIndex
CREATE INDEX "nft_transfers_nftId_idx" ON "nft_transfers"("nftId");

-- CreateIndex
CREATE INDEX "nft_transfers_fromAddress_idx" ON "nft_transfers"("fromAddress");

-- CreateIndex
CREATE INDEX "nft_transfers_toAddress_idx" ON "nft_transfers"("toAddress");

-- CreateIndex
CREATE INDEX "nft_transfers_blockNumber_idx" ON "nft_transfers"("blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "nft_transfers_txHash_logIndex_key" ON "nft_transfers"("txHash", "logIndex");

-- CreateIndex
CREATE INDEX "marketplace_listings_chainId_marketplace_status_idx" ON "marketplace_listings"("chainId", "marketplace", "status");

-- CreateIndex
CREATE INDEX "marketplace_listings_contractAddress_tokenId_idx" ON "marketplace_listings"("contractAddress", "tokenId");

-- CreateIndex
CREATE INDEX "marketplace_listings_seller_idx" ON "marketplace_listings"("seller");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_sales_listingId_key" ON "marketplace_sales"("listingId");

-- CreateIndex
CREATE INDEX "marketplace_sales_chainId_marketplace_idx" ON "marketplace_sales"("chainId", "marketplace");

-- CreateIndex
CREATE INDEX "marketplace_sales_contractAddress_tokenId_idx" ON "marketplace_sales"("contractAddress", "tokenId");

-- CreateIndex
CREATE INDEX "marketplace_sales_buyer_idx" ON "marketplace_sales"("buyer");

-- CreateIndex
CREATE INDEX "marketplace_sales_seller_idx" ON "marketplace_sales"("seller");

-- CreateIndex
CREATE INDEX "marketplace_sales_blockNumber_idx" ON "marketplace_sales"("blockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_sales_txHash_logIndex_bundleIndex_key" ON "marketplace_sales"("txHash", "logIndex", "bundleIndex");

-- CreateIndex
CREATE INDEX "marketplace_offers_chainId_marketplace_status_idx" ON "marketplace_offers"("chainId", "marketplace", "status");

-- CreateIndex
CREATE INDEX "marketplace_offers_contractAddress_tokenId_idx" ON "marketplace_offers"("contractAddress", "tokenId");

-- CreateIndex
CREATE INDEX "marketplace_offers_offerer_idx" ON "marketplace_offers"("offerer");

-- CreateIndex
CREATE INDEX "nft_floor_prices_contractAddress_chainId_marketplace_idx" ON "nft_floor_prices"("contractAddress", "chainId", "marketplace");

-- CreateIndex
CREATE INDEX "nft_floor_prices_retrievedAt_idx" ON "nft_floor_prices"("retrievedAt");

-- CreateIndex
CREATE UNIQUE INDEX "nft_rarity_nftId_key" ON "nft_rarity"("nftId");

-- CreateIndex
CREATE INDEX "nft_rarity_rank_idx" ON "nft_rarity"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "nft_collection_analytics_contractAddress_chainId_key" ON "nft_collection_analytics"("contractAddress", "chainId");

-- CreateIndex
CREATE INDEX "error_logs_errorType_severity_idx" ON "error_logs"("errorType", "severity");

-- CreateIndex
CREATE INDEX "error_logs_component_operation_idx" ON "error_logs"("component", "operation");

-- CreateIndex
CREATE INDEX "error_logs_createdAt_idx" ON "error_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activities_txHash_type_launchpadId_idx" ON "activities"("txHash", "type", "launchpadId");

-- AddForeignKey
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfts" ADD CONSTRAINT "nfts_contractAddress_chainId_fkey" FOREIGN KEY ("contractAddress", "chainId") REFERENCES "nft_contracts"("address", "chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_contracts" ADD CONSTRAINT "nft_contracts_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_attributes" ADD CONSTRAINT "nft_attributes_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_ownership" ADD CONSTRAINT "nft_ownership_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_transfers" ADD CONSTRAINT "nft_transfers_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_transfers" ADD CONSTRAINT "nft_transfers_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_contractAddress_chainId_fkey" FOREIGN KEY ("contractAddress", "chainId") REFERENCES "nft_contracts"("address", "chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_sales" ADD CONSTRAINT "marketplace_sales_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_sales" ADD CONSTRAINT "marketplace_sales_contractAddress_chainId_fkey" FOREIGN KEY ("contractAddress", "chainId") REFERENCES "nft_contracts"("address", "chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_sales" ADD CONSTRAINT "marketplace_sales_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_offers" ADD CONSTRAINT "marketplace_offers_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_floor_prices" ADD CONSTRAINT "nft_floor_prices_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "chains"("chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_floor_prices" ADD CONSTRAINT "nft_floor_prices_contractAddress_chainId_fkey" FOREIGN KEY ("contractAddress", "chainId") REFERENCES "nft_contracts"("address", "chainId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_rarity" ADD CONSTRAINT "nft_rarity_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_collection_analytics" ADD CONSTRAINT "nft_collection_analytics_contractAddress_chainId_fkey" FOREIGN KEY ("contractAddress", "chainId") REFERENCES "nft_contracts"("address", "chainId") ON DELETE RESTRICT ON UPDATE CASCADE;
