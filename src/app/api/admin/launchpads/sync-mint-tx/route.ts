import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { getChainConfig } from '@/config/chains';
import OddsLaunchpadABI from '@/../abi/OddsLaunchpad.json';
import { resolveImagePath } from '@/lib/ipfs-utils';

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { launchpadId, contractAddress, chainId, txHash } = body;

    if (!launchpadId || !contractAddress || !chainId || !txHash) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: launchpadId, contractAddress, chainId, txHash'
      }, { status: 400 });
    }

    // Normalize contract address to lowercase to prevent duplicates
    const normalizedContractAddress = contractAddress.toLowerCase();

    console.log(`🔄 Syncing mint transaction: ${txHash}`);

    // Check if already exists (check by txHash for batch mints)
    const existingMints = await prisma.mint.findMany({
      where: { txHash }
    });

    if (existingMints.length > 0) {
      console.log(`✅ Mint already synced (${existingMints.length} NFTs)`);
      
      // Still update launchpad stats
      const mints = await prisma.mint.findMany({
        where: { launchpadId },
        select: {
          price: true,
          minter: true,
          tokenId: true
        }
      });

      // Count unique tokens (not mint records, to handle duplicate mints)
      const uniqueTokenIds = new Set(mints.map(m => m.tokenId));
      const actualMintedCount = uniqueTokenIds.size;

      // Convert price from string (Wei) to BigInt safely
      const totalVolumeSum = mints.reduce((sum, mint) => {
        try {
          const priceWei = mint.price.includes('.') 
            ? ethers.parseEther(mint.price).toString() 
            : mint.price;
          return sum + BigInt(priceWei);
        } catch (error) {
          console.warn(`⚠️ Invalid price format: ${mint.price}, skipping`);
          return sum;
        }
      }, BigInt(0));

      await prisma.launchpad.update({
        where: { id: launchpadId },
        data: {
          mintedCount: actualMintedCount, // Use unique token count
          volume: totalVolumeSum.toString(),
          lastMintAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Mint already synced',
        data: {
          totalMinted: actualMintedCount, // Use unique token count
          mintedNFTs: existingMints.length,
          alreadyExists: true
        }
      });
    }

    // Get chain config
    const chain = getChainConfig(chainId);
    if (!chain) {
      return NextResponse.json({
        success: false,
        error: `Chain ${chainId} not supported`
      }, { status: 400 });
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

    // Retry mechanism for getting transaction (with exponential backoff)
    let tx = null;
    let receipt = null;
    const maxRetries = 5;
    const baseDelay = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        tx = await provider.getTransaction(txHash);
        receipt = await provider.getTransactionReceipt(txHash);

        if (tx && receipt) {
          console.log(`✅ Transaction found on attempt ${attempt + 1}`);
          break;
        }

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`⏳ Transaction not confirmed yet, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching transaction on attempt ${attempt + 1}:`, error);
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!tx || !receipt) {
      return NextResponse.json({
        success: false,
        error: 'Transaction not found or not confirmed yet after retries',
        message: 'The transaction may still be pending. Please try again in a few moments.'
      }, { status: 404 });
    }

    // Find ALL Transfer events in the receipt (for batch mints)
    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    const transferLogs = receipt.logs.filter(log => 
      log.topics[0] === transferTopic && 
      log.address.toLowerCase() === normalizedContractAddress
    );

    if (transferLogs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No Transfer event found in transaction'
      }, { status: 400 });
    }

    console.log(`📦 Found ${transferLogs.length} Transfer events (batch mint)`);

    // Parse all Transfer events
    const iface = new ethers.Interface(OddsLaunchpadABI);
    const mintedNFTs: Array<{ to: string; tokenId: number }> = [];

    for (const transferLog of transferLogs) {
      const parsedLog = iface.parseLog({
        topics: [...transferLog.topics],
        data: transferLog.data
      });

      if (parsedLog && parsedLog.args[0] === ethers.ZeroAddress) {
        // This is a mint (from zero address)
        const to = parsedLog.args[1] as string;
        const tokenId = Number(parsedLog.args[2]);
        mintedNFTs.push({ to, tokenId });
      }
    }

    if (mintedNFTs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No mint events found (all transfers are between users)'
      }, { status: 400 });
    }

    console.log(`🎫 Processing ${mintedNFTs.length} minted NFTs`);

    // Get actual mint price from contract (excluding platform fee)
    // tx.value includes platform fee, so we need to get the actual mint cost
    const contract = new ethers.Contract(normalizedContractAddress, OddsLaunchpadABI, provider);
    
    // Decode the transaction input to get phaseId (reuse iface from above)
    let phaseId = 0;
    let actualMintCost = BigInt(0);
    
    try {
      const decodedData = iface.parseTransaction({ data: tx.data });
      if (decodedData && decodedData.name === 'mint') {
        phaseId = Number(decodedData.args[0]);
        const quantity = Number(decodedData.args[1]);
        
        // Get actual mint cost from contract (excluding platform fee)
        const [mintCost, platformFee, totalCost, isFreeMint] = await contract.calculateMintCost(phaseId, quantity);
        actualMintCost = BigInt(mintCost.toString());
        
        console.log(`💰 Mint cost breakdown:`);
        console.log(`  - Mint cost (to creator): ${ethers.formatEther(mintCost)} ETH`);
        console.log(`  - Platform fee: ${ethers.formatEther(platformFee)} ETH`);
        console.log(`  - Total paid: ${ethers.formatEther(totalCost)} ETH`);
        console.log(`  - Is free mint: ${isFreeMint}`);
      }
    } catch (decodeError) {
      console.warn('⚠️ Could not decode transaction data, using tx.value as fallback');
      actualMintCost = BigInt(tx.value.toString());
    }

    // Calculate price per NFT (actual mint cost / quantity, excluding platform fee)
    const pricePerNFT = mintedNFTs.length > 0 ? actualMintCost / BigInt(mintedNFTs.length) : actualMintCost;

    // Get block timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    const mintTimestamp = block ? new Date(Number(block.timestamp) * 1000) : new Date();

    // Get launchpad with phases to determine active phase
    const launchpadWithPhases = await prisma.launchpad.findUnique({
      where: { id: launchpadId },
      include: {
        phases: {
          orderBy: { phaseIndex: 'asc' } as any  // Order by phaseIndex to match smart contract
        }
      }
    });

    // Determine active phase at mint time
    let activePhaseId: string | null = null;
    if (launchpadWithPhases?.phases && launchpadWithPhases.phases.length > 0) {
      const activePhase = launchpadWithPhases.phases.find(phase => {
        const startTime = new Date(phase.startTime);
        const endTime = phase.endTime ? new Date(phase.endTime) : new Date('2099-12-31');
        return mintTimestamp >= startTime && mintTimestamp <= endTime;
      });
      
      if (activePhase) {
        activePhaseId = activePhase.id;
      }
    }

    // Create mint records for each NFT
    // For batch mints, we need to handle the unique txHash constraint
    // We'll create individual records with unique identifiers
    const createdMints = [];
    
    for (let i = 0; i < mintedNFTs.length; i++) {
      const nft = mintedNFTs[i];
      
      // Check if this specific NFT mint already exists
      const existingMint = await prisma.mint.findFirst({
        where: {
          launchpadId,
          tokenId: nft.tokenId,
          minter: nft.to
        }
      });

      if (existingMint) {
        console.log(`⚠️ Mint already exists for tokenId ${nft.tokenId}`);
        createdMints.push(existingMint);
        continue;
      }

      // For batch mints (multiple NFTs in one tx), append index to make txHash unique
      // This is a workaround for the unique constraint on txHash
      const uniqueTxHash = mintedNFTs.length > 1 ? `${txHash}-${i}` : txHash;

      const mintRecord = await prisma.mint.create({
        data: {
          launchpadId,
          phaseId: activePhaseId,
          minter: nft.to,
          tokenId: nft.tokenId,
          quantity: 1,
          price: pricePerNFT.toString(),
          txHash: uniqueTxHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          createdAt: mintTimestamp
        }
      });
      createdMints.push(mintRecord);

      // Fetch and save NFT metadata
      try {
        const tokenIdStr = nft.tokenId.toString();
        
        // Check if NFT metadata already exists
        const existingNFT = await prisma.nFT.findUnique({
          where: {
            contractAddress_tokenId_chainId: {
              contractAddress: normalizedContractAddress,
              tokenId: tokenIdStr,
              chainId: chainId
            }
          }
        });

        if (!existingNFT) {
          console.log(`📥 Fetching metadata for token ${tokenIdStr}...`);
          
          // Get tokenURI from contract
          let tokenUri = '';
          try {
            tokenUri = await contract.tokenURI(nft.tokenId);
          } catch (e) {
            console.warn(`⚠️ Could not fetch tokenURI for token ${tokenIdStr}`);
          }

          // Fetch metadata from tokenURI
          let metadata: any = null;
          let imageUrl: string | null = null;
          
          if (tokenUri) {
            try {
              // Convert IPFS to HTTP
              let fetchUrl = tokenUri;
              if (tokenUri.startsWith('ipfs://')) {
                fetchUrl = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
              }

              const metadataResponse = await fetch(fetchUrl, {
                headers: { 'Accept': 'application/json' }
              });

              if (metadataResponse.ok) {
                metadata = await metadataResponse.json();
                imageUrl = metadata.image || null;
                
                // Convert IPFS image URL to HTTP
                if (imageUrl && imageUrl.startsWith('ipfs://')) {
                  imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                }
                
                console.log(`✅ Fetched metadata for token ${tokenIdStr}`);
              }
            } catch (fetchError) {
              console.warn(`⚠️ Failed to fetch metadata for token ${tokenIdStr}:`, fetchError);
            }
          }

          // Upsert NFT record (create or update if exists)
          await prisma.nFT.upsert({
            where: {
              contractAddress_tokenId_chainId: {
                contractAddress: normalizedContractAddress,
                tokenId: tokenIdStr,
                chainId: chainId
              }
            },
            create: {
              contractAddress: normalizedContractAddress,
              tokenId: tokenIdStr,
              chainId: chainId,
              tokenType: 'ERC721',
              name: metadata?.name || null,
              description: metadata?.description || null,
              tokenUri: tokenUri || null,
              imageCachedUrl: imageUrl,
              imageThumbnailUrl: imageUrl,
              imageOriginalUrl: imageUrl,
              rawMetadata: metadata,
              rawTokenUri: tokenUri || null,
              timeLastUpdated: new Date(),
              mintAddress: nft.to,
              mintBlockNumber: receipt.blockNumber,
              mintTimestamp: mintTimestamp
            },
            update: {
              // Update metadata if it changed
              name: metadata?.name || null,
              description: metadata?.description || null,
              tokenUri: tokenUri || null,
              imageCachedUrl: imageUrl,
              imageThumbnailUrl: imageUrl,
              imageOriginalUrl: imageUrl,
              rawMetadata: metadata,
              rawTokenUri: tokenUri || null,
              timeLastUpdated: new Date()
            }
          });
          
          console.log(`✅ Saved/Updated NFT metadata for token ${tokenIdStr}`);
        }
      } catch (nftError) {
        console.warn(`⚠️ Failed to save NFT metadata (non-critical):`, nftError);
        // Don't fail the sync if NFT metadata save fails
      }
    }

    // Create activity record (one activity for the whole batch)
    try {
      const launchpad = await prisma.launchpad.findUnique({
        where: { id: launchpadId },
        include: { metadata: true, factory: true }
      });

      if (launchpad) {
        const minter = mintedNFTs[0].to;
        const minterShort = `${minter.slice(0, 6)}...${minter.slice(-4)}`;
        
        const existingActivity = await prisma.activity.findFirst({
          where: {
            txHash,
            type: 'MINT_OCCURRED'
          }
        });

        if (!existingActivity) {
          // Resolve collection image path
          const collectionImage = launchpad.metadata?.image 
            ? resolveImagePath(launchpad.metadata.image, launchpad.metadata.baseUri)
            : null;

          await prisma.activity.create({
            data: {
              chainId,
              factoryId: launchpad.factoryId,
              launchpadId,
              type: 'MINT_OCCURRED',
              actor: minter,
              description: mintedNFTs.length > 1 
                ? `Minted ${mintedNFTs.length}x by ${minterShort}`
                : `Minted by ${minterShort}`,
              txHash, // Original transaction hash (same for all NFTs in batch)
              blockNumber: receipt.blockNumber,
              metadata: {
                contractAddress: launchpad.contractAddress, // Add contract address to metadata
                tokenIds: mintedNFTs.map(n => n.tokenId.toString()),
                quantity: mintedNFTs.length,
                actualMintCost: actualMintCost.toString(), // Actual mint price (to creator)
                totalPaid: BigInt(tx.value.toString()).toString(), // Total including platform fee
                pricePerNFT: pricePerNFT.toString(), // Actual price per NFT (to creator)
                isBatchMint: mintedNFTs.length > 1,
                isFreeMint: actualMintCost === BigInt(0),
                collectionName: launchpad.name,
                collectionSymbol: launchpad.symbol,
                collectionImage,
                minterShort
              },
              createdAt: mintTimestamp
            }
          });
        }
      }
    } catch (activityError) {
      console.warn(`⚠️ Failed to create activity record (non-critical):`, activityError);
    }

    // Update launchpad stats
    const mints = await prisma.mint.findMany({
      where: { launchpadId },
      select: {
        price: true,
        minter: true
      }
    });

    // Calculate total volume (sum of actual mint prices, excluding platform fees)
    // Free mints have price = 0, so they won't contribute to volume
    const totalVolumeSum = mints.reduce((sum, mint) => {
      try {
        const priceWei = mint.price.includes('.') 
          ? ethers.parseEther(mint.price).toString() 
          : mint.price;
        return sum + BigInt(priceWei);
      } catch (error) {
        console.warn(`⚠️ Invalid price format: ${mint.price}, skipping`);
        return sum;
      }
    }, BigInt(0));
    
    const uniqueMintersSet = new Set(mints.map(m => m.minter));
    
    // Count unique tokens (not mint records, to handle duplicate mints)
    const uniqueTokenIds = new Set(mints.map(m => m.tokenId));
    const actualMintedCount = uniqueTokenIds.size;
    
    // Calculate average price only from paid mints (price > 0)
    const paidMints = mints.filter(m => {
      try {
        const priceWei = m.price.includes('.') 
          ? ethers.parseEther(m.price).toString() 
          : m.price;
        return BigInt(priceWei) > BigInt(0);
      } catch {
        return false;
      }
    });
    
    const avgPrice = paidMints.length > 0 
      ? paidMints.reduce((sum, mint) => {
          try {
            const priceWei = mint.price.includes('.') 
              ? ethers.parseEther(mint.price).toString() 
              : mint.price;
            return sum + BigInt(priceWei);
          } catch {
            return sum;
          }
        }, BigInt(0)) / BigInt(paidMints.length)
      : BigInt(0);

    await prisma.launchpad.update({
      where: { id: launchpadId },
      data: {
        mintedCount: actualMintedCount, // Use unique token count, not mint record count
        volume: totalVolumeSum.toString(), // Only actual mint revenue, not platform fees
        lastMintAt: new Date()
      }
    });

    // Update analytics
    await prisma.launchpadAnalytics.update({
      where: { launchpadId },
      data: {
        totalVolume: totalVolumeSum.toString(), // Only actual mint revenue
        totalMints: actualMintedCount, // Use unique token count
        uniqueHolders: uniqueMintersSet.size,
        avgMintPrice: avgPrice.toString(), // Average of paid mints only
        calculatedAt: new Date()
      }
    });

    console.log(`✅ Mint synced successfully (${mintedNFTs.length} NFTs)`);

    return NextResponse.json({
      success: true,
      message: `Mint synced successfully (${mintedNFTs.length} NFTs)`,
      data: {
        totalMinted: actualMintedCount, // Use unique token count
        mintedNFTs: mintedNFTs.length,
        tokenIds: mintedNFTs.map(n => n.tokenId),
        minters: Array.from(new Set(mintedNFTs.map(n => n.to))),
        txHash: txHash, // Original transaction hash
        actualMintCost: actualMintCost.toString(), // Actual mint revenue (to creator)
        totalPaid: tx.value.toString(), // Total including platform fee
        pricePerNFT: pricePerNFT.toString(), // Actual price per NFT (to creator)
        isFreeMint: actualMintCost === BigInt(0),
        totalVolume: totalVolumeSum.toString(), // Total mint revenue (excluding platform fees)
        uniqueHolders: uniqueMintersSet.size
      }
    });

  } catch (error) {
    console.error('❌ Error syncing mint:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync mint',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
