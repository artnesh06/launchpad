import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BlockchainService } from '@/lib/blockchain/blockchain-service';

const contractService = new BlockchainService();

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
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
      isShuffleEnabled, // Token ID shuffling feature
      metadata,
      phases,
      whitelists,
      syncFromBlockchain = true
    } = body;

    // Validate required fields
    if (!chainId || !contractAddress) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: chainId, contractAddress'
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

    let launchpadData: any = {
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
      isShuffleEnabled: isShuffleEnabled ?? false
    };

    // If syncFromBlockchain is true, fetch data from blockchain
    if (syncFromBlockchain) {
      console.log(`🔄 Fetching data from blockchain for ${contractAddress}...`);
      
      try {
        const blockchainData = await contractService.getLaunchpadInfo(chainId, normalizedContractAddress);
        
        if (blockchainData) {
          // Merge blockchain data with provided data (provided data takes precedence)
          // Note: blockchainData only contains: launchpadAddress, creator, name, symbol, createdAt, totalSupply, royaltyRecipient, royaltyPercentage
          launchpadData = {
            name: name || blockchainData.name,
            symbol: symbol || blockchainData.symbol,
            description: description, // Not available from blockchain
            baseURI: baseURI, // Not available from blockchain
            unrevealedURI: unrevealedURI, // Not available from blockchain
            contractURI: contractURI, // Not available from blockchain
            externalLink: externalLink, // Not available from blockchain
            totalMaxSupply: totalMaxSupply || blockchainData.totalSupply,
            treasury: treasury || blockchainData.creator, // Use creator as fallback
            royaltyRecipient: royaltyRecipient || blockchainData.royaltyRecipient,
            royaltyPercentage: royaltyPercentage ?? blockchainData.royaltyPercentage,
            deployTxHash: deployTxHash,
            creator: creator || blockchainData.creator
          };
          
          console.log(`✅ Blockchain data fetched successfully`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch blockchain data, using provided data:`, error);
      }
    }

    // Validate that we have at least name and symbol
    if (!launchpadData.name || !launchpadData.symbol) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, symbol (either provide them or enable syncFromBlockchain)'
      }, { status: 400 });
    }

    // Create or update launchpad
    const launchpad = await prisma.launchpad.upsert({
      where: { contractAddress: normalizedContractAddress },
      update: {
        name: launchpadData.name,
        symbol: launchpadData.symbol,
        description: launchpadData.description,
        baseURI: launchpadData.baseURI,
        unrevealedURI: launchpadData.unrevealedURI,
        contractURI: launchpadData.contractURI,
        externalLink: launchpadData.externalLink,
        totalMaxSupply: launchpadData.totalMaxSupply,
        treasury: launchpadData.treasury,
        royaltyRecipient: launchpadData.royaltyRecipient,
        royaltyPercentage: launchpadData.royaltyPercentage,
        deployTxHash: launchpadData.deployTxHash,
        isShuffleEnabled: launchpadData.isShuffleEnabled,
        lastSyncAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        chainId,
        factoryId: factory.id,
        contractAddress: normalizedContractAddress,
        creator: launchpadData.creator || launchpadData.treasury,
        name: launchpadData.name,
        symbol: launchpadData.symbol,
        description: launchpadData.description,
        baseURI: launchpadData.baseURI,
        unrevealedURI: launchpadData.unrevealedURI,
        contractURI: launchpadData.contractURI,
        externalLink: launchpadData.externalLink,
        totalMaxSupply: launchpadData.totalMaxSupply,
        treasury: launchpadData.treasury,
        royaltyRecipient: launchpadData.royaltyRecipient,
        royaltyPercentage: launchpadData.royaltyPercentage,
        deployTxHash: launchpadData.deployTxHash,
        isShuffleEnabled: launchpadData.isShuffleEnabled,
        status: 'ACTIVE',
        lastSyncAt: new Date()
      }
    });

    // Create or update metadata
    // Keep IPFS URLs as-is (no conversion to HTTP gateway)
    let finalMetadataImage = metadata?.image || null;
    let finalMetadataBanner = metadata?.bannerImage || null;
    
    if (metadata) {
      await prisma.launchpadMetadata.upsert({
        where: { launchpadId: launchpad.id },
        update: {
          image: finalMetadataImage,
          bannerImage: finalMetadataBanner,
          website: metadata.website,
          twitter: metadata.twitter,
          discord: metadata.discord,
          telegram: metadata.telegram,
          updatedAt: new Date()
        },
        create: {
          launchpadId: launchpad.id,
          image: finalMetadataImage,
          bannerImage: finalMetadataBanner,
          website: metadata.website,
          twitter: metadata.twitter,
          discord: metadata.discord,
          telegram: metadata.telegram
        }
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
    let phasesCreated = 0;
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
          phaseType = 'ALLOWLIST';
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
        phasesCreated++;
      }

      console.log(`✅ Created ${phasesCreated} phases successfully`);
    }

    // Create whitelist entries if provided
    let whitelistsCreated = 0;
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

      whitelistsCreated = whitelists.length;
      console.log(`✅ Created ${whitelistsCreated} whitelist entries successfully`);
    }

    // Log activity with metadata
    // Get the saved metadata to ensure collectionImage matches launchpad_metadata.image
    const savedMetadata = await prisma.launchpadMetadata.findUnique({
      where: { launchpadId: launchpad.id },
      select: { image: true }
    });
    
    await prisma.activity.create({
      data: {
        chainId,
        type: 'LAUNCHPAD_CREATED',
        actor: launchpadData.creator || launchpadData.treasury,
        description: `Created launchpad: ${launchpadData.name} (${launchpadData.symbol})`,
        txHash: launchpadData.deployTxHash,
        metadata: {
          collectionName: launchpadData.name,
          collectionSymbol: launchpadData.symbol,
          collectionImage: savedMetadata?.image || null, // Get from launchpad_metadata.image
          creatorShort: (launchpadData.creator || launchpadData.treasury).slice(0, 6) + '...' + (launchpadData.creator || launchpadData.treasury).slice(-4),
          contractAddress: normalizedContractAddress
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        launchpad,
        phasesCreated,
        whitelistsCreated,
        syncedFromBlockchain: syncFromBlockchain
      }
    });

  } catch (error) {
    console.error('Error saving launchpad:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: 'Failed to save launchpad',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
