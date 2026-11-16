import { NextRequest } from 'next/server';
import { ethers } from 'ethers';
import { getChainConfig } from '@/config/chains';
import OddsLaunchpadABI from '@/../abi/OddsLaunchpad.json';
import { makeRpcUrlAbsolute } from '@/lib/rpc-proxy';
import { prisma } from '@/lib/prisma';

export const maxDuration = 300; // 5 minutes for Pro plan, remove if on hobby

// Helper: Get holders from Alchemy API (fastest method)
async function getHoldersFromAlchemy(contractAddress: string, chainId: number) {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    throw new Error('Alchemy API key not configured');
  }

  // Map chainId to Alchemy network
  const networkMap: Record<number, string> = {
    1: 'eth-mainnet',
    11155111: 'eth-sepolia',
    137: 'polygon-mainnet',
    80001: 'polygon-mumbai',
    10: 'opt-mainnet',
    420: 'opt-goerli',
    42161: 'arb-mainnet',
    421613: 'arb-goerli',
  };

  const network = networkMap[chainId];
  if (!network) {
    return null; // Alchemy doesn't support this chain
  }

  const url = `https://${network}.g.alchemy.com/nft/v3/${alchemyKey}/getOwnersForContract`;
  const holders = new Map<string, { address: string; tokenIds: string[]; balance: number }>();
  let pageKey: string | undefined;

  do {
    const params = new URLSearchParams({
      contractAddress,
      withTokenBalances: 'true',
    });
    if (pageKey) params.append('pageKey', pageKey);

    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process owners
    for (const owner of data.owners || []) {
      const address = owner.ownerAddress;
      const tokenBalances = owner.tokenBalances || [];
      
      if (!holders.has(address.toLowerCase())) {
        holders.set(address.toLowerCase(), {
          address,
          tokenIds: [],
          balance: 0,
        });
      }

      const holder = holders.get(address.toLowerCase())!;
      for (const tb of tokenBalances) {
        const balance = parseInt(tb.balance || '1');
        holder.balance += balance;
        holder.tokenIds.push(tb.tokenId);
      }
    }

    pageKey = data.pageKey;
  } while (pageKey);

  return Array.from(holders.values());
}

// Helper: Get holders from database (if we have NFT indexer data)
async function getHoldersFromDatabase(contractAddress: string, chainId: number) {
  const ownerships = await prisma.nFTOwnership.findMany({
    where: {
      nft: {
        contractAddress: contractAddress.toLowerCase(),
        chainId,
      },
      isCurrent: true,
    },
    include: {
      nft: {
        select: {
          tokenId: true,
        },
      },
    },
  });

  const holdersMap = new Map<string, { address: string; tokenIds: string[]; balance: number }>();

  for (const ownership of ownerships) {
    const address = ownership.ownerAddress;
    const addressLower = address.toLowerCase();

    if (!holdersMap.has(addressLower)) {
      holdersMap.set(addressLower, {
        address,
        tokenIds: [],
        balance: 0,
      });
    }

    const holder = holdersMap.get(addressLower)!;
    holder.tokenIds.push(ownership.nft.tokenId);
    holder.balance += parseInt(ownership.balance);
  }

  return Array.from(holdersMap.values());
}

// Helper: Get holders from blockchain (slowest, fallback method)
async function getHoldersFromBlockchain(
  contractAddress: string,
  chainId: number,
  onProgress: (current: number, total: number) => void
) {
  const chain = getChainConfig(chainId);
  if (!chain) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const rpcUrl = makeRpcUrlAbsolute(chain.rpcUrl);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, provider);

  const totalSupply = await contract.totalSupply();
  const totalSupplyNum = Number(totalSupply);

  if (totalSupplyNum === 0) {
    throw new Error('No tokens minted yet');
  }

  const holdersMap = new Map<string, { address: string; tokenIds: number[]; balance: number }>();
  const batchSize = 100;

  for (let i = 0; i < totalSupplyNum; i += batchSize) {
    const batch = [];
    const end = Math.min(i + batchSize, totalSupplyNum);

    for (let tokenId = i; tokenId < end; tokenId++) {
      batch.push(
        contract
          .ownerOf(tokenId)
          .then((owner: string) => ({ tokenId, owner }))
          .catch(() => null)
      );
    }

    const results = await Promise.all(batch);

    results.forEach((result) => {
      if (result && result.owner) {
        const { tokenId, owner } = result;
        const ownerLower = owner.toLowerCase();

        if (!holdersMap.has(ownerLower)) {
          holdersMap.set(ownerLower, { address: owner, tokenIds: [], balance: 0 });
        }

        const holder = holdersMap.get(ownerLower)!;
        holder.tokenIds.push(tokenId);
        holder.balance++;
      }
    });

    onProgress(end, totalSupplyNum);
  }

  return Array.from(holdersMap.values()).map((h) => ({
    ...h,
    tokenIds: h.tokenIds.map(String),
  }));
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { contractAddress, chainId } = await request.json();

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Starting snapshot...' })}\n\n`)
        );

        let holders: Array<{ address: string; tokenIds: string[]; balance: number }> = [];
        let method = '';

        // Try Alchemy first (fastest)
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Trying Alchemy API...' })}\n\n`)
          );
          const alchemyHolders = await getHoldersFromAlchemy(contractAddress, chainId);
          if (alchemyHolders && alchemyHolders.length > 0) {
            holders = alchemyHolders;
            method = 'Alchemy API';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'status', message: '✅ Using Alchemy API (fast)' })}\n\n`)
            );
          }
        } catch (error: any) {
          console.log('Alchemy failed:', error.message);
        }

        // Try database if Alchemy failed
        if (holders.length === 0) {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Trying database...' })}\n\n`)
            );
            const dbHolders = await getHoldersFromDatabase(contractAddress, chainId);
            if (dbHolders.length > 0) {
              holders = dbHolders;
              method = 'Database';
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'status', message: '✅ Using database (medium)' })}\n\n`)
              );
            }
          } catch (error: any) {
            console.log('Database failed:', error.message);
          }
        }

        // Fallback to blockchain scan
        if (holders.length === 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'status', message: 'Using blockchain scan (slow)...' })}\n\n`
            )
          );
          method = 'Blockchain';

          holders = await getHoldersFromBlockchain(contractAddress, chainId, (current, total) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'progress', current, total })}\n\n`)
            );
          });
        }

        // Sort by balance
        holders.sort((a, b) => b.balance - a.balance);

        // Generate CSV
        const csvContent = [
          ['Address', 'Balance', 'Token IDs'].join(','),
          ...holders.map((h) => [h.address, h.balance, `"${h.tokenIds.join(';')}"`].join(',')),
        ].join('\n');

        // Send final result
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'complete', csv: csvContent, holders: holders.length, method })}\n\n`
          )
        );
        controller.close();
      } catch (error: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
