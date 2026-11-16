import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
/**
 * Collection Sync API Route
 * 
 * Sync NFT holdings for a specific collection
 * POST /api/admin/collections/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS } from '@/config/chains';

// Standard ERC721 ABI for Transfer events
const ERC721_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
];

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { contractAddress, chainId } = body;

    if (!contractAddress || !chainId) {
      return NextResponse.json(
        { success: false, error: 'Contract address and chain ID are required' },
        { status: 400 }
      );
    }

    // Get chain config
    const chain = Object.values(SUPPORTED_CHAINS).find((c) => c.id === chainId);
    if (!chain) {
      return NextResponse.json(
        { success: false, error: 'Unsupported chain' },
        { status: 400 }
      );
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);

    console.log(`🔄 Starting sync for collection ${contractAddress} on chain ${chainId}`);

    // Get or create NFT contract record
    let nftContract = await prisma.nFTContract.findUnique({
      where: {
        address_chainId: {
          address: contractAddress.toLowerCase(),
          chainId,
        },
      },
    });

    if (!nftContract) {
      // Create contract record
      try {
        const name = await contract.name();
        const symbol = await contract.symbol();
        let totalSupply = '0';
        
        try {
          const supply = await contract.totalSupply();
          totalSupply = supply.toString();
        } catch (e) {
          console.warn('Could not fetch totalSupply, using 0');
        }

        nftContract = await prisma.nFTContract.create({
          data: {
            chainId,
            address: contractAddress.toLowerCase(),
            name,
            symbol,
            totalSupply,
            tokenType: 'ERC721',
          },
        });
      } catch (error) {
        console.error('Error creating contract record:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to create contract record' },
          { status: 500 }
        );
      }
    }

    // Get all Transfer events from the contract
    const transferFilter = contract.filters.Transfer();
    const currentBlock = await provider.getBlockNumber();
    
    // Fetch events in chunks to avoid rate limits
    const CHUNK_SIZE = 5000;
    let fromBlock = 0;
    let processedCount = 0;
    let errorCount = 0;

    console.log(`📊 Fetching Transfer events from block 0 to ${currentBlock}`);

    while (fromBlock <= currentBlock) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE, currentBlock);
      
      try {
        const events = await contract.queryFilter(transferFilter, fromBlock, toBlock);
        console.log(`   Found ${events.length} events in blocks ${fromBlock}-${toBlock}`);

        // Process each transfer event
        for (const event of events) {
          try {
            if (!('args' in event) || !event.args) continue;

            const [from, to, tokenId] = event.args;
            const tokenIdStr = tokenId.toString();

            // Get block timestamp
            const block = await provider.getBlock(event.blockNumber);
            if (!block) continue;

            const blockTimestamp = new Date(block.timestamp * 1000);

            // Determine transfer type
            const transferType = from === ethers.ZeroAddress ? 'MINT' : 
                               to === ethers.ZeroAddress ? 'BURN' : 'TRANSFER';

            // Get or create NFT record
            let nft = await prisma.nFT.findUnique({
              where: {
                contractAddress_tokenId_chainId: {
                  contractAddress: contractAddress.toLowerCase(),
                  tokenId: tokenIdStr,
                  chainId,
                },
              },
            });

            if (!nft) {
              // Try to fetch metadata
              let tokenUri = '';
              try {
                tokenUri = await contract.tokenURI(tokenId);
              } catch (e) {
                console.warn(`Could not fetch tokenURI for token ${tokenIdStr}`);
              }

              nft = await prisma.nFT.create({
                data: {
                  chainId,
                  contractAddress: contractAddress.toLowerCase(),
                  tokenId: tokenIdStr,
                  tokenType: 'ERC721',
                  tokenUri,
                  mintAddress: from === ethers.ZeroAddress ? to : undefined,
                  mintBlockNumber: from === ethers.ZeroAddress ? event.blockNumber : undefined,
                  mintTimestamp: from === ethers.ZeroAddress ? blockTimestamp : undefined,
                  mintTransactionHash: from === ethers.ZeroAddress ? event.transactionHash : undefined,
                },
              });
            }

            // Create transfer record
            await prisma.nFTTransfer.upsert({
              where: {
                txHash_logIndex: {
                  txHash: event.transactionHash,
                  logIndex: event.index,
                },
              },
              create: {
                chainId,
                nftId: nft.id,
                fromAddress: from.toLowerCase(),
                toAddress: to.toLowerCase(),
                quantity: '1',
                txHash: event.transactionHash,
                blockNumber: event.blockNumber,
                blockTimestamp,
                logIndex: event.index,
                transferType,
              },
              update: {},
            });

            // Update ownership
            if (transferType !== 'BURN') {
              // Mark previous ownership as not current
              await prisma.nFTOwnership.updateMany({
                where: {
                  nftId: nft.id,
                  isCurrent: true,
                },
                data: {
                  isCurrent: false,
                },
              });

              // Create new ownership record
              await prisma.nFTOwnership.create({
                data: {
                  nftId: nft.id,
                  ownerAddress: to.toLowerCase(),
                  balance: '1',
                  acquiredAt: blockTimestamp,
                  acquiredBlock: event.blockNumber,
                  acquiredTxHash: event.transactionHash,
                  isCurrent: true,
                },
              });
            } else {
              // Mark all ownership as not current for burned tokens
              await prisma.nFTOwnership.updateMany({
                where: {
                  nftId: nft.id,
                },
                data: {
                  isCurrent: false,
                },
              });
            }

            processedCount++;
          } catch (error) {
            console.error(`Error processing event:`, error);
            errorCount++;
          }
        }

        fromBlock = toBlock + 1;
      } catch (error) {
        console.error(`Error fetching events for blocks ${fromBlock}-${toBlock}:`, error);
        fromBlock = toBlock + 1;
        errorCount++;
      }
    }

    console.log(`✅ Sync complete: processed ${processedCount} transfers, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      data: {
        processedCount,
        errorCount,
        message: `Synced ${processedCount} NFT transfers`,
      },
    });
  } catch (error) {
    console.error('Failed to sync collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync collection',
      },
      { status: 500 }
    );
  }
}
