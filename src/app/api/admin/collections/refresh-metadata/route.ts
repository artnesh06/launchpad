/**
 * Collection Refresh Metadata API Route
 * 
 * Refresh NFT metadata for a specific collection
 * Only accessible by admin or collection creator
 * POST /api/admin/collections/refresh-metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication first
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { contractAddress, chainId, userAddress } = body;

    if (!contractAddress || !chainId) {
      return NextResponse.json(
        { success: false, error: 'Contract address and chain ID are required' },
        { status: 400 }
      );
    }

    // Get launchpad to check creator
    const launchpad = await prisma.launchpad.findFirst({
      where: {
        contractAddress: {
          equals: contractAddress.toLowerCase(),
          mode: 'insensitive'
        },
        chainId
      }
    });

    if (!launchpad) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // If userAddress is provided, check if user is creator
    // Admin is already verified by verifyAdminAuth above
    if (userAddress) {
      const isCreator = launchpad.creator.toLowerCase() === userAddress.toLowerCase();
      
      if (!isCreator) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Unauthorized - Only collection creator can refresh metadata' 
          },
          { status: 403 }
        );
      }
      
      console.log(`🔄 Starting metadata refresh for collection ${contractAddress} on chain ${chainId}`);
      console.log(`   Requested by creator: ${userAddress}`);
    } else {
      console.log(`🔄 Starting metadata refresh for collection ${contractAddress} on chain ${chainId}`);
      console.log(`   Requested by admin`);
    }

    // Get all NFTs for this collection
    const nfts = await prisma.nFT.findMany({
      where: {
        contractAddress: contractAddress.toLowerCase(),
        chainId
      },
      select: {
        id: true,
        tokenId: true,
        tokenUri: true,
      }
    });

    if (nfts.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No NFTs found in database. Please sync the collection first.' 
        },
        { status: 404 }
      );
    }

    console.log(`📊 Found ${nfts.length} NFTs to refresh`);

    let refreshedCount = 0;
    let errorCount = 0;

    // Refresh metadata for each NFT
    for (const nft of nfts) {
      try {
        // Fetch metadata from tokenURI
        if (nft.tokenUri) {
          let fetchUrl = nft.tokenUri;
          
          // Convert IPFS to HTTP
          if (fetchUrl.startsWith('ipfs://')) {
            fetchUrl = fetchUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
          }

          try {
            const response = await fetch(fetchUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'NFT-Launchpad/1.0'
              },
              signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
              const metadata = await response.json();

              // Update NFT with fresh metadata
              await prisma.nFT.update({
                where: { id: nft.id },
                data: {
                  name: metadata.name || nft.tokenId,
                  description: metadata.description || null,
                  rawMetadata: metadata,
                  timeLastUpdated: new Date(),
                  // Update image URLs if available
                  imageCachedUrl: metadata.image ? 
                    metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : null,
                  imageThumbnailUrl: metadata.image ? 
                    metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : null,
                  imageOriginalUrl: metadata.image || null,
                }
              });

              // Update or create attributes
              if (metadata.attributes && Array.isArray(metadata.attributes)) {
                // Delete old attributes
                await prisma.nFTAttribute.deleteMany({
                  where: { nftId: nft.id }
                });

                // Create new attributes
                await prisma.nFTAttribute.createMany({
                  data: metadata.attributes.map((attr: any) => ({
                    nftId: nft.id,
                    traitType: attr.trait_type || 'Unknown',
                    value: String(attr.value),
                    displayType: attr.display_type || null,
                  }))
                });
              }

              refreshedCount++;
            } else {
              console.warn(`⚠️ Failed to fetch metadata for token ${nft.tokenId}: ${response.status}`);
              errorCount++;
            }
          } catch (fetchError) {
            console.warn(`⚠️ Error fetching metadata for token ${nft.tokenId}:`, fetchError);
            errorCount++;
          }
        } else {
          console.warn(`⚠️ No tokenURI for token ${nft.tokenId}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing token ${nft.tokenId}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Metadata refresh complete: ${refreshedCount} refreshed, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      data: {
        refreshedCount,
        errorCount,
        totalNFTs: nfts.length,
        message: `Refreshed metadata for ${refreshedCount} NFTs`,
      },
    });
  } catch (error) {
    console.error('Failed to refresh metadata:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh metadata',
      },
      { status: 500 }
    );
  }
}
