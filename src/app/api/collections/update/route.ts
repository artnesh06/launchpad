import { authorizeCreatorOrAdmin } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearAllCache } from '@/lib/hybrid-cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      collectionId,
      name,
      symbol,
      description,
      externalLink,
      maxSupply,
      royaltyPercentage,
      royaltyRecipient,
      treasury,
      metadata
    } = body;

    if (!collectionId) {
      return NextResponse.json({
        success: false,
        error: 'Collection ID is required'
      }, { status: 400 });
    }

    const denied = await authorizeCreatorOrAdmin(request, { action: 'collection:update', target: collectionId });
    if (denied) return denied;

    // Check if collection exists
    const collection = await prisma.launchpad.findUnique({
      where: { id: collectionId },
      include: { metadata: true }
    });

    if (!collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 });
    }

    // Update collection data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (symbol !== undefined) updateData.symbol = symbol;
    if (description !== undefined) updateData.description = description;
    if (externalLink !== undefined) updateData.externalLink = externalLink;
    if (maxSupply !== undefined) updateData.totalMaxSupply = parseInt(maxSupply);
    if (royaltyPercentage !== undefined) updateData.royaltyPercentage = parseInt(royaltyPercentage);
    if (royaltyRecipient !== undefined) updateData.royaltyRecipient = royaltyRecipient;
    if (treasury !== undefined) updateData.treasury = treasury;

    // Update database
    const updatedCollection = await prisma.launchpad.update({
      where: { id: collectionId },
      data: updateData
    });

    // Update or create metadata if provided
    if (metadata) {
      const metadataUpdateData: any = {};
      
      if (metadata.twitter !== undefined) metadataUpdateData.twitter = metadata.twitter || null;
      if (metadata.discord !== undefined) metadataUpdateData.discord = metadata.discord || null;

      if (Object.keys(metadataUpdateData).length > 0) {
        if (collection.metadata) {
          // Update existing metadata
          await prisma.launchpadMetadata.update({
            where: { id: collection.metadata.id },
            data: metadataUpdateData
          });
        } else {
          // Create new metadata
          await prisma.launchpadMetadata.create({
            data: {
              launchpadId: collectionId,
              ...metadataUpdateData
            }
          });
        }
      }
    }

    // Invalidate collection cache (non-blocking)
    try {
      await clearAllCache('/api/collections/*');
      await clearAllCache('/api/nft/collections*');
      await clearAllCache('/api/nft/collection/*');
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      // Don't fail the mutation if cache invalidation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Collection updated successfully',
      data: updatedCollection
    });
  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update collection'
    }, { status: 500 });
  }
}
