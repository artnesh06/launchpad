import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { getChainConfig } from '@/config/chains';
import OddsLaunchpadABI from '@/../abi/OddsLaunchpad.json';
import { syncQueue } from '@/lib/sync-queue';
import { resolveImagePath } from '@/lib/ipfs-utils';
import { syncSingleNFT } from '@/lib/onchain-nft-sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { launchpadId, contractAddress, chainId, txHash } = body;

    if (!launchpadId || !contractAddress || !chainId || !txHash) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: launchpadId, contractAddress, chainId, txHash'
      }, { status: 400 });
    }

    // Check if already in queue
    const existingJob = syncQueue.get(txHash);
    if (existingJob) {
      return NextResponse.json({
        success: true,
        message: 'Sync job already queued',
        jobId: txHash,
        status: existingJob.status,
        result: existingJob.result,
        error: existingJob.error
      });
    }

    // Add to queue
    syncQueue.set(txHash, { status: 'pending' });

    // Process async (don't await)
    processSyncJob(launchpadId, contractAddress, chainId, txHash).catch(error => {
      console.error(`❌ Async sync failed for ${txHash}:`, error);
      syncQueue.set(txHash, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Sync job queued successfully',
      jobId: txHash,
      status: 'pending'
    });

  } catch (error) {
    console.error('❌ Error queuing sync job:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to queue sync job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET method removed - use /status endpoint instead

async function processSyncJob(
  launchpadId: string,
  contractAddress: string,
  chainId: number,
  txHash: string
) {
  syncQueue.set(txHash, { status: 'processing' });

  try {
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
          minter: true
        }
      });

      // Convert price from string (Wei) to BigInt safely
      const totalVolumeSum = mints.reduce((sum, mint) => {
        try {
          // Parse as Wei string (should be integer)
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
          mintedCount: mints.length,
          volume: totalVolumeSum.toString(),
          lastMintAt: new Date()
        }
      });

      const result = {
        success: true,
        message: 'Mint already synced',
        data: {
          totalMinted: mints.length,
          mintedNFTs: existingMints.length,
          alreadyExists: true
        }
      };

      syncQueue.set(txHash, { status: 'completed', result });
      setTimeout(() => syncQueue.delete(txHash), 5 * 60 * 1000);
      return;
    }

    // Get chain config
    const chain = getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not supported`);
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
          const delay = baseDelay * Math.pow(2, attempt);
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
      throw new Error('Transaction not found or not confirmed yet after retries');
    }

    // Normalize contract address to lowercase
    const normalizedContractAddress = contractAddress.toLowerCase();

    // Find ALL Transfer events in the receipt (for batch mints)
    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    const transferLogs = receipt.logs.filter(log => 
      log.topics[0] === transferTopic && 
      log.address.toLowerCase() === normalizedContractAddress
    );

    if (transferLogs.length === 0) {
      throw new Error('No Transfer event found in transaction');
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
        const to = parsedLog.args[1] as string;
        const tokenId = Number(parsedLog.args[2]);
        mintedNFTs.push({ to, tokenId });
      }
    }

    if (mintedNFTs.length === 0) {
      throw new Error('No mint events found (all transfers are between users)');
    }

    console.log(`🎫 Processing ${mintedNFTs.length} minted NFTs`);

    // Get actual mint price from contract
    const contract = new ethers.Contract(normalizedContractAddress, OddsLaunchpadABI, provider);
    
    let phaseId = 0;
    let actualMintCost = BigInt(0);
    
    try {
      const decodedData = iface.parseTransaction({ data: tx.data });
      if (decodedData && decodedData.name === 'mint') {
        phaseId = Number(decodedData.args[0]);
        const quantity = Number(decodedData.args[1]);
        
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
    const createdMints = [];
    
    for (let i = 0; i < mintedNFTs.length; i++) {
      const nft = mintedNFTs[i];
      
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

      // Sync NFT metadata from on-chain
      try {
        console.log(`📥 Syncing NFT metadata for token ${nft.tokenId}...`);
        const chain = getChainConfig(chainId);
        if (chain) {
          await syncSingleNFT(
            contractAddress.toLowerCase(),
            nft.tokenId.toString(),
            chainId,
            chain.rpcUrl
          );
          console.log(`✅ NFT metadata synced for token ${nft.tokenId}`);
        }
      } catch (nftError) {
        console.warn(`⚠️ Failed to sync NFT metadata for token ${nft.tokenId}:`, nftError);
        // Don't fail the mint sync if NFT metadata sync fails
      }
    }

    // Create activity record
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
              txHash,
              blockNumber: receipt.blockNumber,
              metadata: {
                contractAddress: launchpad.contractAddress, // Add contract address to metadata
                tokenIds: mintedNFTs.map(n => n.tokenId.toString()),
                quantity: mintedNFTs.length,
                actualMintCost: actualMintCost.toString(),
                totalPaid: BigInt(tx.value.toString()).toString(),
                pricePerNFT: pricePerNFT.toString(),
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
    
    const uniqueMintersSet = new Set(mints.map(m => m.minter));
    
    // Filter paid mints safely
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
        mintedCount: mints.length,
        volume: totalVolumeSum.toString(),
        lastMintAt: new Date()
      }
    });

    // Update analytics
    await prisma.launchpadAnalytics.update({
      where: { launchpadId },
      data: {
        totalVolume: totalVolumeSum.toString(),
        totalMints: mints.length,
        uniqueHolders: uniqueMintersSet.size,
        avgMintPrice: avgPrice.toString(),
        calculatedAt: new Date()
      }
    });

    console.log(`✅ Mint synced successfully (${mintedNFTs.length} NFTs)`);

    const result = {
      success: true,
      message: `Mint synced successfully (${mintedNFTs.length} NFTs)`,
      data: {
        totalMinted: mints.length,
        mintedNFTs: mintedNFTs.length,
        tokenIds: mintedNFTs.map(n => n.tokenId),
        minters: Array.from(new Set(mintedNFTs.map(n => n.to))),
        txHash: txHash,
        actualMintCost: actualMintCost.toString(),
        totalPaid: tx.value.toString(),
        pricePerNFT: pricePerNFT.toString(),
        isFreeMint: actualMintCost === BigInt(0),
        totalVolume: totalVolumeSum.toString(),
        uniqueHolders: uniqueMintersSet.size
      }
    };

    syncQueue.set(txHash, { status: 'completed', result });
    
    // Clean up after 5 minutes
    setTimeout(() => {
      syncQueue.delete(txHash);
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error(`❌ Error processing sync job for ${txHash}:`, error);
    syncQueue.set(txHash, { 
      status: 'failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
