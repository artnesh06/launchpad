/**
 * NFT Holdings API Route
 * 
 * Get NFTs owned by a wallet address from database
 * GET /api/nft/holdings?address=0x...&pageSize=20&page=1&chainId=11155111
 * 
 * Cache: 5 seconds TTL (user-specific holdings data, needs freshness)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const chainIdParam = searchParams.get('chainId');

    // Validate required params
    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Generate cache key with wallet address and filter parameters
    const cacheKey = getCacheKey('/api/nft/holdings', {
      address,
      pageSize: pageSize.toString(),
      page: page.toString(),
      chainId: chainIdParam
    });

    // Wrap database query with cache (5 seconds TTL for user holdings)
    return await cachedFetch(cacheKey, async () => {
      // Build where clause
      const where: any = {
        ownerAddress: address.toLowerCase(),
        isCurrent: true,
      };

      // Add chain filter if provided and not 'all'
      if (chainIdParam && chainIdParam !== 'all') {
        const chainId = parseInt(chainIdParam);
        if (!isNaN(chainId)) {
          where.nft = {
            chainId: chainId,
          };
        }
      }

      // Get total count
      const totalCount = await prisma.nFTOwnership.count({ where });

      // Get NFTs with pagination
      const ownerships = await prisma.nFTOwnership.findMany({
        where,
        include: {
          nft: {
            include: {
              contract: true,
              attributes: true,
              rarity: true,
            },
          },
        },
        orderBy: {
          acquiredAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Transform to Alchemy-like format for compatibility
      const nfts = ownerships.map((ownership) => {
        const nft = ownership.nft;
        return {
          contract: {
            address: nft.contractAddress,
            name: nft.contract.name,
            symbol: nft.contract.symbol,
            totalSupply: nft.contract.totalSupply,
            tokenType: nft.tokenType,
          },
          tokenId: nft.tokenId,
          tokenType: nft.tokenType,
          name: nft.name,
          description: nft.description,
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
          tokenUri: nft.tokenUri,
          timeLastUpdated: nft.timeLastUpdated.toISOString(),
          balance: ownership.balance,
          chainId: nft.chainId,
          // Add rarity if available
          rarity: nft.rarity ? {
            rank: nft.rarity.rank,
            score: nft.rarity.score,
            percentile: nft.rarity.percentile,
          } : undefined,
          // Add attributes
          attributes: nft.attributes.map((attr) => ({
            trait_type: attr.traitType,
            value: attr.value,
            display_type: attr.displayType,
          })),
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          ownedNfts: nfts,
          totalCount,
          page,
          pageSize,
          hasMore: totalCount > page * pageSize,
        },
      });
    }, 5); // 5 seconds TTL for user holdings
  } catch (error) {
    console.error('Failed to fetch NFT holdings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch NFT holdings',
      },
      { status: 500 }
    );
  }
}
