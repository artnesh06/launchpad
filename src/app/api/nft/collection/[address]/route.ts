/**
 * NFT Collection API Route
 * 
 * Get all NFTs for a specific collection contract from database with pagination
 * GET /api/nft/collection/[address]?page=1&pageSize=100
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '100');

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

    // Generate cache key including contract address and pagination parameters
    const cacheKey = getCacheKey(`/api/nft/collection/${address}`, {
      page: page.toString(),
      pageSize: pageSize.toString()
    });

    // Wrap database query with cache (TTL: 10 seconds for moderate updates)
    return await cachedFetch(cacheKey, async () => {
      // Get chainId from launchpad
      const launchpad = await prisma.launchpad.findFirst({
        where: {
          contractAddress: {
            equals: address.toLowerCase(),
            mode: 'insensitive'
          },
          status: {
            not: 'CANCELLED'  // Exclude cancelled collections
          }
        },
        include: {
          phases: {
            orderBy: { phaseIndex: 'asc' } as any,  // Order by phaseIndex to match smart contract
          },
          metadata: true,
          analytics: true,
        },
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

      // Get contract metadata
      const storedContract = await prisma.nFTContract.findUnique({
        where: {
          address_chainId: {
            address: address.toLowerCase(),
            chainId: launchpad.chainId
          }
        }
      });

      // The listener creates the nft_contracts row when the first NFT is
      // synced, so a collection with no mints yet has none. Its detail page
      // must still load (empty item list), so fall back to the launchpad row.
      const contract = storedContract ?? {
        address: launchpad.contractAddress.toLowerCase(),
        name: launchpad.name,
        symbol: launchpad.symbol,
        totalSupply: String(launchpad.mintedCount ?? 0),
        tokenType: 'ERC721',
        contractDeployer: launchpad.creator,
        deployedBlockNumber: null,
        openSeaFloorPrice: null,
        openSeaCollectionName: null,
        openSeaCollectionSlug: null,
        openSeaSafelistStatus: null,
        openSeaImageUrl: null,
        openSeaDescription: null,
        openSeaExternalUrl: null,
        openSeaTwitter: null,
        openSeaDiscord: null,
        openSeaBannerImageUrl: null,
      };

      // Get total count
      const totalCount = await prisma.nFT.count({
        where: {
          contractAddress: address.toLowerCase(),
          chainId: launchpad.chainId
        }
      });

      // Fetch NFTs from database with pagination
      const nfts = await prisma.nFT.findMany({
        where: {
          contractAddress: address.toLowerCase(),
          chainId: launchpad.chainId
        },
        include: {
          attributes: true,
          rarity: true,
        },
        orderBy: [
          { tokenId: 'asc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Transform to Alchemy-like format for compatibility
      const transformedNFTs = nfts.map(nft => ({
        contract: {
          address: nft.contractAddress,
          name: contract.name,
          symbol: contract.symbol,
          totalSupply: contract.totalSupply,
          tokenType: nft.tokenType,
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
          metadata: {
            ...nft.rawMetadata as any,
            attributes: nft.attributes.map(attr => ({
              trait_type: attr.traitType,
              value: attr.value,
              display_type: attr.displayType,
              prevalence: attr.prevalence,
            }))
          },
          tokenUri: nft.rawTokenUri,
        },
        timeLastUpdated: nft.timeLastUpdated.toISOString(),
        mint: nft.mintAddress ? {
          mintAddress: nft.mintAddress,
          blockNumber: nft.mintBlockNumber,
          timestamp: nft.mintTimestamp?.toISOString(),
          transactionHash: nft.mintTransactionHash,
        } : undefined,
      }));

      // Collection metadata
      const collectionMetadata = {
        address: contract.address,
        name: contract.name,
        symbol: contract.symbol,
        totalSupply: contract.totalSupply,
        tokenType: contract.tokenType,
        contractDeployer: contract.contractDeployer,
        deployedBlockNumber: contract.deployedBlockNumber,
        openSeaMetadata: {
          floorPrice: contract.openSeaFloorPrice,
          collectionName: contract.openSeaCollectionName,
          collectionSlug: contract.openSeaCollectionSlug,
          safelistRequestStatus: contract.openSeaSafelistStatus,
          imageUrl: contract.openSeaImageUrl,
          description: contract.openSeaDescription,
          externalUrl: contract.openSeaExternalUrl,
          twitterUsername: contract.openSeaTwitter,
          discordUrl: contract.openSeaDiscord,
          bannerImageUrl: contract.openSeaBannerImageUrl,
        }
      };

      // Launchpad data
      const launchpadData = {
        id: launchpad.id,
        contractAddress: launchpad.contractAddress,
        creator: launchpad.creator,
        name: launchpad.name,
        symbol: launchpad.symbol,
        description: launchpad.description,
        totalMaxSupply: launchpad.totalMaxSupply,
        mintedCount: launchpad.mintedCount,
        volume: launchpad.volume,
        status: launchpad.status,
        createdAt: launchpad.createdAt.toISOString(),
        chainId: launchpad.chainId,
        treasury: launchpad.treasury,
        royaltyRecipient: launchpad.royaltyRecipient,
        royaltyPercentage: launchpad.royaltyPercentage,
        metadata: launchpad.metadata ? {
          image: launchpad.metadata.image,
          bannerImage: launchpad.metadata.bannerImage,
          website: launchpad.metadata.website,
          twitter: launchpad.metadata.twitter,
          discord: launchpad.metadata.discord,
        } : undefined,
        phases: launchpad.phases.map(phase => ({
          id: phase.id,
          name: phase.name,
          phaseType: phase.phaseType,
          startTime: phase.startTime.toISOString(),
          endTime: phase.endTime?.toISOString(),
          price: phase.price,
          maxMintPerWallet: phase.maxMintPerWallet,
          totalLimit: phase.totalLimit,
          mintedCount: phase.mintedCount,
          isActive: phase.isActive,
        })),
      };

      // Calculate next page key
      const hasMore = totalCount > page * pageSize;
      const nextPageKey = hasMore ? (page + 1).toString() : undefined;

      return NextResponse.json({
        success: true,
        data: {
          nfts: transformedNFTs,
          pageKey: nextPageKey,
          collection: collectionMetadata,
          launchpadData,
        },
      });
    }, 10); // TTL: 10 seconds (moderate updates for collection NFTs)
  } catch (error) {
    console.error('Collection NFTs API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch collection NFTs',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
