import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { cachedFetch } from '@/lib/hybrid-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractAddress: string }> }
) {
  try {
    const { contractAddress } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Generate cache key
    const cacheKey = `/api/mints/${contractAddress}?limit=${limit}`;

    // Return cached response if available (1 second TTL for real-time data)
    return await cachedFetch(cacheKey, async () => {

    // Find launchpad by contract address
    const launchpad = await prisma.launchpad.findUnique({
      where: { contractAddress: contractAddress.toLowerCase() },
      include: {
        metadata: true,
      },
    });

    if (!launchpad) {
      return NextResponse.json(
        { success: false, error: 'Launchpad not found' },
        { status: 404 }
      );
    }

    // Get latest mints
    const mints = await prisma.mint.findMany({
      where: { launchpadId: launchpad.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tokenId: true,
        minter: true,
        quantity: true,
        txHash: true,
        createdAt: true,
      },
    });

    // Get collection image for fallback
    const collectionImage = launchpad.metadata?.image 
      ? ipfsToHttp(launchpad.metadata.image) 
      : null;

    // Try to get NFT images from NFT table
    const tokenIds = mints.map(m => m.tokenId?.toString()).filter(Boolean);
    
    const nfts = tokenIds.length > 0 ? await prisma.nFT.findMany({
      where: {
        contractAddress: contractAddress.toLowerCase(),
        tokenId: { in: tokenIds as string[] },
        chainId: launchpad.chainId,
      },
      select: {
        tokenId: true,
        imageCachedUrl: true,
        imageOriginalUrl: true,
        imageThumbnailUrl: true,
        imagePngUrl: true,
      },
    }) : [];

    // Create a map of tokenId to image
    const nftImageMap = new Map(
      nfts.map(nft => {
        // Priority: cached > thumbnail > png > original (with IPFS conversion)
        const imageUrl = nft.imageCachedUrl 
          || nft.imageThumbnailUrl 
          || nft.imagePngUrl
          || (nft.imageOriginalUrl ? ipfsToHttp(nft.imageOriginalUrl) : null);
        
        return [nft.tokenId, imageUrl];
      })
    );

    // Format response
    const latestMints = mints.map(mint => {
      const tokenIdStr = mint.tokenId?.toString() || '0';
      const nftImage = nftImageMap.get(tokenIdStr);
      
      return {
        tokenId: tokenIdStr,
        minter: mint.minter,
        quantity: mint.quantity,
        txHash: mint.txHash,
        timestamp: mint.createdAt.toISOString(),
        imageUrl: nftImage || collectionImage || '',
        // Debug info - remove in production
        hasNftImage: !!nftImage,
        usingCollectionFallback: !nftImage && !!collectionImage,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        mints: latestMints,
        total: mints.length,
        contractAddress: launchpad.contractAddress,
        chainId: launchpad.chainId,
        // Debug info
        debug: {
          totalNftsFound: nfts.length,
          totalMintsQueried: mints.length,
          collectionImageAvailable: !!collectionImage,
        },
      },
    });
    }, 3); // Cache for 3 second (real-time data)
  } catch (error) {
    console.error('Error fetching latest mints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch latest mints' },
      { status: 500 }
    );
  }
}
