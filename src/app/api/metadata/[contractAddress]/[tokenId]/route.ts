import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

/**
 * Custom Metadata Resolver API
 * 
 * This API resolves tokenURI for contracts that use manifest-based metadata
 * due to Pinata's limitation of not supporting true folder uploads.
 * 
 * Flow:
 * 1. Contract baseURI points to manifest: ipfs://QmManifestHash/
 * 2. Contract tokenURI(0) returns: ipfs://QmManifestHash/0.json
 * 3. This API intercepts the request, reads manifest, and returns actual metadata
 * 
 * URL: /api/metadata/[contractAddress]/[tokenId]
 * Cache TTL: 300s (5 minutes) - Immutable metadata with long TTL
 */

interface ManifestEntry {
  [tokenId: string]: string; // tokenId -> ipfs://actualHash
}

// Cache for manifests to avoid repeated IPFS reads
const manifestCache = new Map<string, { data: ManifestEntry; timestamp: number }>();
const imageManifestCache = new Map<string, { data: Record<string, string>; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve image URL from image manifest or return original if already IPFS URL
 */
async function resolveImageUrl(
  imageValue: string,
  imageManifestHash: string | null,
  tokenId: string
): Promise<string> {
  // If already an IPFS URL, return as-is
  if (imageValue.startsWith('ipfs://')) {
    return imageValue;
  }

  // If no image manifest hash, return original value
  if (!imageManifestHash) {
    console.log(`⚠️ No imageManifestHash, returning original image: ${imageValue}`);
    return imageValue;
  }

  // Check cache first
  const cached = imageManifestCache.get(imageManifestHash);
  let imageManifest: Record<string, string>;

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✅ Using cached image manifest (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    imageManifest = cached.data;
  } else {
    // Fetch image manifest from IPFS
    console.log(`📥 Fetching image manifest from IPFS: ${imageManifestHash}`);
    const manifestUrl = `https://eu.orbitor.dev/ipfs/${imageManifestHash}`;
    
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        console.log(`❌ Image manifest not found at: ${manifestUrl}`);
        return imageValue;
      }

      imageManifest = await response.json();
      
      // Cache the manifest
      imageManifestCache.set(imageManifestHash, {
        data: imageManifest,
        timestamp: Date.now()
      });
      
      console.log(`✅ Image manifest loaded and cached (${Object.keys(imageManifest).length} images)`);
    } catch (error) {
      console.error(`❌ Failed to fetch image manifest:`, error);
      return imageValue;
    }
  }

  // Try to find image URL in manifest
  // Try exact match first (e.g., "1.png")
  let resolvedUrl = imageManifest[imageValue];
  
  // If not found, try with different extensions
  if (!resolvedUrl) {
    const baseName = imageValue.replace(/\.[^/.]+$/, ''); // Remove extension
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    
    for (const ext of extensions) {
      const tryName = `${baseName}.${ext}`;
      if (imageManifest[tryName]) {
        resolvedUrl = imageManifest[tryName];
        break;
      }
    }
  }
  
  // If still not found, try by token ID
  if (!resolvedUrl) {
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    for (const ext of extensions) {
      const tryName = `${tokenId}.${ext}`;
      if (imageManifest[tryName]) {
        resolvedUrl = imageManifest[tryName];
        break;
      }
    }
  }

  if (resolvedUrl) {
    console.log(`✅ Resolved image "${imageValue}" → "${resolvedUrl}"`);
    return resolvedUrl;
  }

  console.log(`⚠️ Image "${imageValue}" not found in manifest, returning original`);
  return imageValue;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { contractAddress: string; tokenId: string } }
) {
  try {
    let { contractAddress, tokenId } = params;

    // Handle tokenId with .json extension
    // e.g., "2.json" -> "2"
    if (tokenId.endsWith('.json')) {
      console.log(`📋 Detected .json extension in tokenId: ${tokenId}`);
      tokenId = tokenId.replace('.json', '');
      console.log(`📋 Cleaned tokenId: ${tokenId}`);
    }

    console.log(`📋 Metadata request: ${contractAddress} / Token ${tokenId}`);

    // Generate cache key with contractAddress and tokenId
    const cacheKey = getCacheKey(`/api/metadata/${contractAddress}/${tokenId}`, {});

    // Wrap database query and metadata fetching with cache (300s TTL for immutable metadata)
    return await cachedFetch(cacheKey, async () => {
    // Get baseURI from database for this contract
    const { prisma } = await import('@/lib/prisma');
    
    const launchpad = await prisma.launchpad.findFirst({
      where: {
        contractAddress: {
          equals: contractAddress,
          mode: 'insensitive'
        },
        status: {
          not: 'CANCELLED'  // Exclude cancelled collections
        }
      },
      select: {
        baseURI: true,
        name: true,
        manifestHash: true, // Metadata manifest hash
        imageManifestHash: true // Image manifest hash for resolving image URLs
      }
    });

    if (!launchpad) {
      console.log(`❌ Contract not found: ${contractAddress}`);
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    console.log(`📦 Collection: ${launchpad.name}`);
    console.log(`🔧 Collection type: ${launchpad.manifestHash ? 'Standard Collection (manifest-based)' : 'Open Edition or Direct IPFS'}`);
    console.log(`🔗 BaseURI: ${launchpad.baseURI}`);
    console.log(`🖼️ Image Manifest Hash: ${launchpad.imageManifestHash || 'N/A'}`);

    // Check if this contract uses manifest-based metadata
    if (!launchpad.manifestHash) {
      // No manifest, use direct baseURI (Open Edition or Standard Collection without manifest)
      console.log(`📍 Using direct baseURI (no manifest): ${launchpad.baseURI}`);
      const directUrl = `${launchpad.baseURI}${tokenId}.json`;
      console.log(`🔗 Direct metadata URL: ${directUrl}`);
      
      // Fetch and return the metadata
      const metadataUrl = directUrl.replace('ipfs://', 'https://eu.orbitor.dev/ipfs/');
      const response = await fetch(metadataUrl);
      
      if (!response.ok) {
        console.log(`❌ Metadata not found at: ${metadataUrl}`);
        return NextResponse.json(
          { error: 'Metadata not found' },
          { status: 404 }
        );
      }

      const metadata = await response.json();
      
      // Resolve image URL if needed
      if (metadata.image && launchpad.imageManifestHash) {
        metadata.image = await resolveImageUrl(
          metadata.image,
          launchpad.imageManifestHash,
          tokenId
        );
      }
      
      console.log(`✅ Metadata fetched successfully using direct baseURI`);
      return NextResponse.json(metadata);
    }

    // Use manifest-based resolution
    const manifestHash = launchpad.manifestHash;
    console.log(`📝 Using manifest resolution for Standard Collection`);
    console.log(`📝 Manifest hash: ${manifestHash}`);

    // Check cache first
    const cached = manifestCache.get(manifestHash);
    let manifest: ManifestEntry;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ Using cached manifest (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
      manifest = cached.data;
    } else {
      // Fetch manifest from IPFS
      console.log(`📥 Fetching manifest from IPFS (cache miss or expired)...`);
      const manifestUrl = `https://eu.orbitor.dev/ipfs/${manifestHash}`;
      
      const manifestResponse = await fetch(manifestUrl);
      if (!manifestResponse.ok) {
        console.log(`❌ Manifest not found at: ${manifestUrl}`);
        return NextResponse.json(
          { error: 'Manifest not found' },
          { status: 404 }
        );
      }

      manifest = await manifestResponse.json();
      
      // Cache the manifest
      manifestCache.set(manifestHash, {
        data: manifest,
        timestamp: Date.now()
      });
      
      console.log(`✅ Manifest loaded and cached (${Object.keys(manifest).length} tokens)`);
    }

    // Get actual metadata URL from manifest
    const actualMetadataUrl = manifest[tokenId];
    
    if (!actualMetadataUrl) {
      console.log(`❌ Token ${tokenId} not found in manifest (available tokens: ${Object.keys(manifest).slice(0, 5).join(', ')}...)`);
      return NextResponse.json(
        { error: `Token ${tokenId} not found in manifest` },
        { status: 404 }
      );
    }

    console.log(`🔗 Manifest resolved token ${tokenId} to: ${actualMetadataUrl}`);

    // Fetch actual metadata from IPFS
    const metadataGatewayUrl = actualMetadataUrl.replace(
      'ipfs://',
      'https://eu.orbitor.dev/ipfs/'
    );

    const metadataResponse = await fetch(metadataGatewayUrl);
    
    if (!metadataResponse.ok) {
      console.log(`❌ Metadata not found on IPFS at: ${metadataGatewayUrl}`);
      return NextResponse.json(
        { error: 'Metadata not found on IPFS' },
        { status: 404 }
      );
    }

    const metadata = await metadataResponse.json();
    
    // Resolve image URL if needed (when image is not already an IPFS URL)
    if (metadata.image && !metadata.image.startsWith('ipfs://')) {
      console.log(`🖼️ Resolving image URL: ${metadata.image}`);
      metadata.image = await resolveImageUrl(
        metadata.image,
        launchpad.imageManifestHash,
        tokenId
      );
    }
    
    console.log(`✅ Metadata resolved successfully for token ${tokenId} using manifest resolution`);
    console.log(`🖼️ Final image URL: ${metadata.image}`);

    // Return metadata with CORS headers for marketplace compatibility
    return NextResponse.json(metadata, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
    }, 300); // Cache for 300 seconds (5 minutes) - immutable metadata

  } catch (error) {
    console.error('❌ Metadata resolver error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
