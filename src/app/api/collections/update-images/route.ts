import { authorizeCreatorOrAdmin } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearAllCache } from '@/lib/hybrid-cache';

/**
 * Helper function to upload file directly to Pinata (server-side)
 * Avoids circular dependency of calling our own API
 */
async function uploadToPinata(file: File): Promise<{ ipfsHash: string; ipfsUrl: string; gatewayUrl: string }> {
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error('Pinata credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      size: file.size.toString()
    }
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 1
  });
  formData.append('pinataOptions', options);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'pinata_api_key': pinataApiKey,
      'pinata_secret_api_key': pinataSecretKey
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const result = await response.json();
  const ipfsHash = result.IpfsHash;

  return {
    ipfsHash,
    ipfsUrl: `ipfs://${ipfsHash}`,
    gatewayUrl: `https://eu.orbitor.dev/ipfs/${ipfsHash}`
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const collectionId = formData.get('collectionId') as string;
    const contractAddress = formData.get('contractAddress') as string;
    const coverImage = formData.get('coverImage') as File | null;
    const bannerImage = formData.get('bannerImage') as File | null;

    if (!collectionId && !contractAddress) {
      return NextResponse.json({
        success: false,
        error: 'Collection ID or Contract Address is required'
      }, { status: 400 });
    }

    const denied = await authorizeCreatorOrAdmin(request, {
      action: 'collection:update-images',
      target: collectionId || contractAddress,
    });
    if (denied) return denied;

    // Check if collection exists (by ID or contract address)
    const collection = await prisma.launchpad.findFirst({
      where: collectionId 
        ? { id: collectionId }
        : { contractAddress: { equals: contractAddress, mode: 'insensitive' } },
      include: { metadata: true }
    });

    if (!collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 });
    }

    const updateData: any = {};

    // Upload cover image to IPFS directly (avoid circular API calls)
    if (coverImage && coverImage.size > 0) {
      console.log('📤 Uploading cover image to IPFS:', coverImage.name, `(${(coverImage.size / 1024).toFixed(2)} KB)`);
      
      try {
        const uploadResult = await uploadToPinata(coverImage);
        updateData.image = uploadResult.ipfsUrl;
        console.log('✅ Cover image uploaded:', uploadResult.ipfsUrl);
      } catch (uploadError: any) {
        console.error('❌ Error uploading cover image:', uploadError);
        return NextResponse.json({
          success: false,
          error: `Error uploading cover image: ${uploadError.message}`
        }, { status: 500 });
      }
    }

    // Upload banner image to IPFS directly (avoid circular API calls)
    if (bannerImage && bannerImage.size > 0) {
      console.log('📤 Uploading banner image to IPFS:', bannerImage.name, `(${(bannerImage.size / 1024).toFixed(2)} KB)`);
      
      try {
        const uploadResult = await uploadToPinata(bannerImage);
        updateData.bannerImage = uploadResult.ipfsUrl;
        console.log('✅ Banner image uploaded:', uploadResult.ipfsUrl);
      } catch (uploadError: any) {
        console.error('❌ Error uploading banner image:', uploadError);
        return NextResponse.json({
          success: false,
          error: `Error uploading banner image: ${uploadError.message}`
        }, { status: 500 });
      }
    }

    // Update metadata if we have changes
    if (Object.keys(updateData).length > 0) {
      if (collection.metadata) {
        await prisma.launchpadMetadata.update({
          where: { id: collection.metadata.id },
          data: updateData
        });
      } else {
        await prisma.launchpadMetadata.create({
          data: {
            launchpadId: collectionId,
            ...updateData
          }
        });
      }

      console.log('✅ Metadata updated in database:', updateData);
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
      message: 'Collection images updated successfully',
      data: {
        collectionId,
        updatedFields: Object.keys(updateData),
        urls: updateData
      }
    });
  } catch (error) {
    console.error('Error updating collection images:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update collection images'
    }, { status: 500 });
  }
}
