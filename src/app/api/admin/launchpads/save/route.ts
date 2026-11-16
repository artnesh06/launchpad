import { authorizeCreatorOrAdmin } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Fetch collection metadata from contractURI (IPFS or HTTP)
 * Used to extract image, name, description for LaunchpadMetadata
 */
async function fetchContractMetadata(contractURI: string): Promise<{
  image?: string;
  name?: string;
  description?: string;
  external_link?: string;
} | null> {
  if (!contractURI) return null;
  
  try {
    let fetchUrl = contractURI;
    
    // Convert IPFS URL to HTTP gateway
    if (contractURI.startsWith('ipfs://')) {
      fetchUrl = contractURI.replace('ipfs://', 'https://eu.orbitor.dev/ipfs/');
    }
    
    console.log(`📥 Fetching contract metadata from: ${fetchUrl}`);
    
    const response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NFT-Launchpad-Frontend/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch contract metadata: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const metadata = await response.json();
    console.log(`✅ Contract metadata fetched successfully:`, {
      name: metadata.name,
      hasImage: !!metadata.image,
      hasDescription: !!metadata.description
    });
    
    return {
      image: metadata.image,
      name: metadata.name,
      description: metadata.description,
      external_link: metadata.external_link
    };
  } catch (error) {
    console.error(`❌ Error fetching contract metadata from ${contractURI}:`, error);
    return null;
  }
}

/**
 * Validates the launchpad save request data
 * @throws Error with descriptive message if validation fails
 */
function validateSaveRequest(data: {
  contractAddress: string;
  baseURI: string;
  manifestHash?: string | null;
  chainId: number;
  name: string;
  symbol: string;
}): void {
  // Validate contract address format (0x + 40 hex characters)
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(data.contractAddress)) {
    throw new Error(
      `Invalid contract address format: ${data.contractAddress}. Expected format: 0x followed by 40 hexadecimal characters.`
    );
  }

  // Check baseURI doesn't contain placeholder
  if (data.baseURI.includes('CONTRACT_ADDRESS')) {
    throw new Error(
      `BaseURI contains unresolved placeholder "CONTRACT_ADDRESS". The contract address must be resolved before saving.`
    );
  }

  // Check baseURI starts with valid protocol
  const validProtocols = ['http://', 'https://', 'ipfs://'];
  const hasValidProtocol = validProtocols.some(protocol => 
    data.baseURI.startsWith(protocol)
  );
  
  if (!hasValidProtocol) {
    throw new Error(
      `Invalid baseURI format: ${data.baseURI}. BaseURI must start with http://, https://, or ipfs://`
    );
  }

  // Check manifestHash is present for Standard Collections
  // Standard Collections use the metadata resolver API pattern
  if (data.baseURI.includes('/api/metadata/') && !data.manifestHash) {
    throw new Error(
      `ManifestHash is required for Standard Collections. BaseURI "${data.baseURI}" indicates a Standard Collection but manifestHash is missing.`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      chainId,
      contractAddress,
      creator,
      name,
      symbol,
      description,
      baseURI,
      unrevealedURI,
      contractURI,
      externalLink,
      totalMaxSupply,
      treasury,
      royaltyRecipient,
      royaltyPercentage,
      deployTxHash,
      manifestHash, // IPFS hash of manifest JSON
      imageManifestHash, // IPFS hash of image manifest JSON for image URL resolution
      isShuffleEnabled, // Token ID shuffling feature
      metadata,
      phases,
      whitelists
    } = body;

    // Validate required fields
    if (!chainId || !contractAddress || !name || !symbol) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: chainId, contractAddress, name, symbol'
      }, { status: 400 });
    }

    // Only an admin or the wallet that owns the collection (DB creator / on-chain owner()) may save it.
    const denied = await authorizeCreatorOrAdmin(request, {
      action: 'launchpad:save',
      target: String(contractAddress),
      chainId: Number(chainId),
    });
    if (denied) return denied;

    // Validate save request data
    try {
      validateSaveRequest({
        contractAddress,
        baseURI,
        manifestHash,
        chainId,
        name,
        symbol
      });
      console.log('✅ Validation passed for launchpad save request');
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : 'Validation failed';
      console.error('❌ Validation failed:', errorMessage);
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: errorMessage
      }, { status: 400 });
    }

    // Normalize contract address to lowercase to prevent duplicates
    const normalizedContractAddress = contractAddress.toLowerCase();

    // Find factory for this chain
    const factory = await prisma.launchpadFactory.findFirst({
      where: { chainId }
    });

    if (!factory) {
      return NextResponse.json({
        success: false,
        error: `Factory not found for chain ID: ${chainId}`
      }, { status: 404 });
    }

    // Create or update launchpad
    const launchpad = await prisma.launchpad.upsert({
      where: { contractAddress: normalizedContractAddress },
      update: {
        name,
        symbol,
        description,
        baseURI,
        unrevealedURI,
        contractURI,
        externalLink,
        totalMaxSupply,
        treasury,
        royaltyRecipient,
        royaltyPercentage,
        deployTxHash,
        manifestHash,
        imageManifestHash,
        isShuffleEnabled: isShuffleEnabled ?? false,
        lastSyncAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        chainId,
        factoryId: factory.id,
        contractAddress: normalizedContractAddress,
        creator: creator || treasury,
        name,
        symbol,
        description,
        baseURI,
        unrevealedURI,
        contractURI,
        externalLink,
        totalMaxSupply,
        treasury,
        manifestHash,
        imageManifestHash,
        royaltyRecipient,
        royaltyPercentage,
        deployTxHash,
        isShuffleEnabled: isShuffleEnabled ?? false,
        status: 'ACTIVE',
        lastSyncAt: new Date()
      }
    });

    // Create or update metadata
    // For Standard Collection: If metadata.image is not provided, fetch from contractURI
    let finalMetadataImage = metadata?.image;
    let finalMetadataBanner = metadata?.bannerImage;
    
    // If no image provided but contractURI exists, fetch metadata from contractURI
    if (!finalMetadataImage && contractURI) {
      console.log('📥 No metadata image provided, fetching from contractURI...');
      const contractMetadata = await fetchContractMetadata(contractURI);
      
      if (contractMetadata?.image) {
        // Keep IPFS URL as-is (no conversion to HTTP gateway)
        finalMetadataImage = contractMetadata.image;
        console.log(`✅ Collection image extracted from contractURI: ${finalMetadataImage}`);
      }
    }
    
    // Create or update LaunchpadMetadata if we have any metadata to save
    if (finalMetadataImage || finalMetadataBanner || metadata?.website || metadata?.twitter || metadata?.discord || metadata?.telegram) {
      await prisma.launchpadMetadata.upsert({
        where: { launchpadId: launchpad.id },
        update: {
          image: finalMetadataImage || undefined,
          bannerImage: finalMetadataBanner || undefined,
          website: metadata?.website || undefined,
          twitter: metadata?.twitter || undefined,
          discord: metadata?.discord || undefined,
          telegram: metadata?.telegram || undefined,
          updatedAt: new Date()
        },
        create: {
          launchpadId: launchpad.id,
          image: finalMetadataImage || null,
          bannerImage: finalMetadataBanner || null,
          website: metadata?.website || null,
          twitter: metadata?.twitter || null,
          discord: metadata?.discord || null,
          telegram: metadata?.telegram || null
        }
      });
      
      console.log('✅ LaunchpadMetadata saved:', {
        image: finalMetadataImage ? 'Set' : 'Not set',
        bannerImage: finalMetadataBanner ? 'Set' : 'Not set'
      });
    }

    // Create analytics entry if it doesn't exist
    await prisma.launchpadAnalytics.upsert({
      where: { launchpadId: launchpad.id },
      update: {},
      create: {
        launchpadId: launchpad.id
      }
    });

    // Create phases if provided
    if (phases && Array.isArray(phases) && phases.length > 0) {
      console.log(`Creating ${phases.length} phases for launchpad ${launchpad.id}`);

      // Delete existing phases for this launchpad
      await prisma.launchpadPhase.deleteMany({
        where: { launchpadId: launchpad.id }
      });

      // Create new phases with phaseIndex
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        const ethers = await import('ethers');
        
        // Map phaseType to valid Prisma enum values
        let phaseType = 'PUBLIC';
        if (phase.phaseType === 'WHITELIST') {
          phaseType = 'ALLOWLIST'; // Map WHITELIST to ALLOWLIST
        } else if (phase.phaseType === 'PUBLIC') {
          phaseType = 'PUBLIC';
        } else if (phase.phaseType === 'PRESALE') {
          phaseType = 'PRESALE';
        } else if (phase.phaseType === 'FREE') {
          phaseType = 'FREE';
        }
        
        await prisma.launchpadPhase.create({
          data: {
            launchpadId: launchpad.id,
            phaseIndex: i,  // Store the index to match smart contract order
            name: phase.name,
            phaseType: phaseType as any,
            startTime: new Date(phase.startTime),
            endTime: phase.endTime ? new Date(phase.endTime) : null,
            price: ethers.ethers.parseEther(phase.price.toString()).toString(),
            maxMintPerWallet: phase.maxMintPerWallet || null,
            totalLimit: phase.totalLimit || null,
            isActive: phase.isActive !== false,
            merkleRoot: phase.merkleRoot || null
          }
        });
      }

      console.log(`✅ Created ${phases.length} phases successfully`);
    }

    // Create whitelist entries if provided
    if (whitelists && Array.isArray(whitelists) && whitelists.length > 0) {
      console.log(`Creating ${whitelists.length} whitelist entries for launchpad ${launchpad.id}`);

      // Delete existing whitelist entries for this launchpad
      await prisma.launchpadWhitelist.deleteMany({
        where: { launchpadId: launchpad.id }
      });

      // Create new whitelist entries in batches
      const batchSize = 100;
      for (let i = 0; i < whitelists.length; i += batchSize) {
        const batch = whitelists.slice(i, i + batchSize);
        await prisma.launchpadWhitelist.createMany({
          data: batch.map((entry: any) => ({
            launchpadId: launchpad.id,
            phaseId: entry.phaseId,
            address: entry.address.toLowerCase(),
            allocation: entry.allocation || 1
          })),
          skipDuplicates: true
        });
      }

      console.log(`✅ Created ${whitelists.length} whitelist entries successfully`);
    }

    // Check if activity already exists for this transaction
    // Listener backend creates activity when detecting LaunchpadCreated event
    // We should not create duplicate activity here
    const existingActivity = deployTxHash ? await prisma.activity.findFirst({
      where: {
        txHash: deployTxHash,
        type: 'LAUNCHPAD_CREATED'
      }
    }) : null;

    // Only create activity if it doesn't exist yet (for manual saves without txHash)
    if (!existingActivity && !deployTxHash) {
      console.log('📝 Creating activity record (manual save without txHash)');
      
      // Get the saved metadata to ensure collectionImage matches launchpad_metadata.image
      const savedMetadata = await prisma.launchpadMetadata.findUnique({
        where: { launchpadId: launchpad.id },
        select: { image: true }
      });
      
      await prisma.activity.create({
        data: {
          chainId,
          type: 'LAUNCHPAD_CREATED',
          actor: creator || treasury,
          description: `Created launchpad: ${name} (${symbol})`,
          txHash: null,
          metadata: {
            collectionName: name,
            collectionSymbol: symbol,
            collectionImage: savedMetadata?.image || null, // Get from launchpad_metadata.image
            creatorShort: (creator || treasury).slice(0, 6) + '...' + (creator || treasury).slice(-4),
            contractAddress: normalizedContractAddress
          }
        }
      });
    } else if (existingActivity) {
      console.log('✅ Activity already exists for this transaction (created by listener), skipping duplicate');
    } else {
      console.log('✅ Activity will be created by listener when detecting blockchain event');
    }

    // Log successful save
    console.log('✅ Successfully saved launchpad to database:', {
      contractAddress: normalizedContractAddress,
      name,
      symbol,
      baseURI,
      manifestHash: manifestHash || 'N/A',
      imageManifestHash: imageManifestHash || 'N/A',
      phasesCreated: phases?.length || 0,
      whitelistsCreated: whitelists?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: {
        launchpad,
        phasesCreated: phases?.length || 0,
        whitelistsCreated: whitelists?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error saving launchpad:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: 'Failed to save launchpad',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
