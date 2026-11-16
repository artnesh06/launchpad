/**
 * NFT Detail API Route
 * 
 * Get detailed information for a specific NFT token from database
 * GET /api/nft/[address]/[tokenid]
 * 
 * Cache: 10 seconds TTL (moderate frequency, contract data)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string; tokenid: string }> }
) {
  try {
    const { address, tokenid } = await params;

    // Validate contract address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid contract address format' 
        },
        { status: 400 }
      );
    }

    // Validate token ID
    if (!tokenid || tokenid.trim() === '') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token ID is required' 
        },
        { status: 400 }
      );
    }

    // Generate cache key with address and tokenId
    const cacheKey = getCacheKey(`/api/nft/${address}/${tokenid}`, {});

    // Wrap database query with cache (10 seconds TTL for contract data)
    return await cachedFetch(cacheKey, async () => {
      // Get chainId from launchpad
      const launchpad = await prisma.launchpad.findFirst({
        where: {
          contractAddress: {
            equals: address.toLowerCase(),
            mode: 'insensitive'
          }
        },
        select: {
          chainId: true,
          name: true,
          symbol: true
        }
      });

      if (!launchpad) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Collection not found' 
          },
          { status: 404 }
        );
      }

      // Fetch NFT from database
      const nft = await prisma.nFT.findUnique({
        where: {
          contractAddress_tokenId_chainId: {
            contractAddress: address.toLowerCase(),
            tokenId: tokenid,
            chainId: launchpad.chainId
          }
        },
        include: {
          contract: true,
          attributes: true,
          rarity: true,
          ownership: {
            where: { isCurrent: true }
          }
        }
      });

      if (!nft) {
        return NextResponse.json(
          { 
            success: false,
            error: 'NFT not found' 
          },
          { status: 404 }
        );
      }

      // Transform to Alchemy-like format for compatibility
      const nftMetadata = {
        contract: {
          address: nft.contractAddress,
          name: nft.contract.name,
          symbol: nft.contract.symbol,
          totalSupply: nft.contract.totalSupply,
          tokenType: nft.tokenType,
          openSeaMetadata: {
            floorPrice: nft.contract.openSeaFloorPrice,
            collectionName: nft.contract.openSeaCollectionName,
            collectionSlug: nft.contract.openSeaCollectionSlug,
            safelistRequestStatus: nft.contract.openSeaSafelistStatus,
            imageUrl: nft.contract.openSeaImageUrl,
            description: nft.contract.openSeaDescription,
            externalUrl: nft.contract.openSeaExternalUrl,
            twitterUsername: nft.contract.openSeaTwitter,
            discordUrl: nft.contract.openSeaDiscord,
            bannerImageUrl: nft.contract.openSeaBannerImageUrl,
          }
        },
        tokenId: nft.tokenId,
        tokenType: nft.tokenType,
        name: nft.name,
        description: nft.description,
        tokenUri: nft.tokenUri,
        image: {
          cachedUrl: nft.imageCachedUrl,
          thumbnailUrl: nft.imageThumbnailUrl,
          pngUrl: nft.imagePngUrl,
          contentType: nft.imageContentType,
          size: nft.imageSize,
          originalUrl: nft.imageOriginalUrl,
        },
        raw: {
          metadata: nft.rawMetadata,
          tokenUri: nft.rawTokenUri,
        },
        timeLastUpdated: nft.timeLastUpdated.toISOString(),
        mint: nft.mintAddress ? {
          mintAddress: nft.mintAddress,
          blockNumber: nft.mintBlockNumber,
          timestamp: nft.mintTimestamp?.toISOString(),
          transactionHash: nft.mintTransactionHash,
        } : undefined,
      };

      // Get owners
      const owners = nft.ownership.map(o => o.ownerAddress);

      // Get rarity
      const rarity = nft.rarity ? {
        strategyId: nft.rarity.strategyId,
        strategyVersion: nft.rarity.strategyVersion,
        rank: nft.rarity.rank,
        score: nft.rarity.score,
        maxRank: nft.rarity.maxRank,
        totalSupply: nft.rarity.totalSupply,
        rarityScore: nft.rarity.rarityScore,
        prevalence: nft.rarity.prevalence,
        percentile: nft.rarity.percentile,
      } : null;

      // Add attributes to metadata
      if (nftMetadata.raw.metadata && typeof nftMetadata.raw.metadata === 'object') {
        (nftMetadata.raw.metadata as any).attributes = nft.attributes.map(attr => ({
          trait_type: attr.traitType,
          value: attr.value,
          display_type: attr.displayType,
          prevalence: attr.prevalence,
        }));
      }

      return NextResponse.json({
        success: true,
        data: {
          nft: nftMetadata,
          collection: nftMetadata.contract,
          owners,
          rarity,
          launchpad: launchpad,
          chainId: launchpad.chainId,
        },
      });
    }, 10); // 10 seconds TTL for contract data
  } catch (error) {
    console.error('NFT Detail API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch NFT details',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
