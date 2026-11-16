import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { formatEther } from 'viem';
import { ethers } from 'ethers';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
    try {
        // Verify admin authentication
        const authResult = await verifyAdminAuth(request);
        if (!authResult.authenticated) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        // Generate cache key including pagination parameters
        const cacheKey = getCacheKey('/api/admin/platform-fee/history', {
            page: page.toString(),
            limit: limit.toString(),
        });

        // Wrap platform fee history query with cache (30 seconds TTL)
        return await cachedFetch(cacheKey, async () => {
        const skip = (page - 1) * limit;

        // Get mints instead of activities for accurate data
        const mints = await prisma.mint.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limit,
            include: {
                launchpad: {
                    select: {
                        id: true,
                        name: true,
                        contractAddress: true,
                        chainId: true
                    }
                }
            }
        });

        const totalCount = await prisma.mint.count();

        // Get factories for chain info
        const factories = await prisma.launchpadFactory.findMany({
            where: { isActive: true }
        });

        // Chain names mapping
        const chainNames: Record<number, string> = {
            1: 'Ethereum',
            11155111: 'Sepolia',
            8453: 'Base',
            84532: 'Base Sepolia',
            6343: 'Chain 6343',
        };

        // Transform mints to transaction history
        const history = mints.map((mint: any) => {
            const launchpad = mint.launchpad;
            
            // Handle both Wei string and decimal formats
            let priceWei: bigint;
            let totalPriceWei: bigint;
            
            try {
              const priceStr = mint.price.includes('.') 
                ? ethers.parseEther(mint.price).toString() 
                : mint.price;
              priceWei = BigInt(priceStr);
              totalPriceWei = priceWei * BigInt(mint.quantity);
            } catch (error) {
              console.warn(`⚠️ Invalid price format: ${mint.price}, using 0`);
              priceWei = BigInt(0);
              totalPriceWei = BigInt(0);
            }

            return {
                id: mint.id,
                chainId: launchpad?.chainId || 0,
                chainName: launchpad ? (chainNames[launchpad.chainId] || `Chain ${launchpad.chainId}`) : 'Unknown',
                txHash: mint.txHash || '',
                from: mint.minter,
                amount: parseFloat(formatEther(totalPriceWei)).toFixed(4),
                quantity: mint.quantity,
                launchpadName: launchpad?.name,
                launchpadAddress: launchpad?.contractAddress,
                timestamp: mint.createdAt
            };
        });

        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({
            success: true,
            data: {
                items: history,
                pagination: {
                    current: page,
                    total: totalPages,
                    count: totalCount,
                    limit
                }
            }
        });
        }, 30); // 30 seconds TTL for platform fee history

    } catch (error) {
        console.error('Error fetching platform fee history:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch platform fee history',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
