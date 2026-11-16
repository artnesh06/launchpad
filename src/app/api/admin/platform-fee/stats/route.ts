import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { formatEther } from 'viem';
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

        // Generate cache key for platform fee stats
        const cacheKey = getCacheKey('/api/admin/platform-fee/stats', {});

        // Wrap expensive platform fee stats query with cache (30 seconds TTL)
        return await cachedFetch(cacheKey, async () => {

        // Get all mints with launchpad data to get chainId
        const mints = await prisma.mint.findMany({
            select: {
                price: true,
                quantity: true,
                createdAt: true,
                launchpadId: true,
                launchpad: {
                    select: {
                        chainId: true,
                        contractAddress: true,
                    }
                }
            }
        });

        // NOTE: Platform fee calculation
        // The actual platform fee (flatFee) is stored in each collection's smart contract
        // and can vary per collection. This API provides ESTIMATED statistics based on
        // mint transaction counts, NOT actual platform fee amounts.
        // 
        // For ACCURATE real-time balances, use the "Available Balances" section which
        // queries getPendingBalance() directly from each contract.
        //
        // This historical data uses an estimated average of 0.001 ETH per mint for
        // statistical purposes only.
        
        // Estimated average flat fee per mint (for statistical estimation only)
        const ESTIMATED_FLAT_FEE_WEI = BigInt('1000000000000000'); // 0.001 ETH

        // Calculate estimated total collected fees from actual mints
        let totalCollectedWei = BigInt(0);
        const byChain: Record<number, {
            chainId: number;
            chainName: string;
            collected: bigint;
            transactions: number;
        }> = {};

        // Get chain names
        const chainNames: Record<number, string> = {
            1: 'Ethereum',
            11155111: 'Sepolia',
            8453: 'Base',
            84532: 'Base Sepolia',
            6343: 'Chain 6343',
        };

        // Calculate fees from each mint
        for (const mint of mints) {
            if (!mint.launchpad) continue;

            // Estimated fee per mint transaction
            const feeWei = ESTIMATED_FLAT_FEE_WEI * BigInt(mint.quantity);
            
            totalCollectedWei += feeWei;

            const chainId = mint.launchpad.chainId;
            if (!byChain[chainId]) {
                byChain[chainId] = {
                    chainId: chainId,
                    chainName: chainNames[chainId] || `Chain ${chainId}`,
                    collected: BigInt(0),
                    transactions: 0
                };
            }

            byChain[chainId].collected += feeWei;
            byChain[chainId].transactions += 1;
        }

        // Get monthly data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentMints = mints.filter(m => m.createdAt >= thirtyDaysAgo);

        let monthlyCollectedWei = BigInt(0);
        for (const mint of recentMints) {
            const feeWei = ESTIMATED_FLAT_FEE_WEI * BigInt(mint.quantity);
            monthlyCollectedWei += feeWei;
        }

        // Calculate previous month for comparison
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const previousMonthMints = mints.filter(m => 
            m.createdAt >= sixtyDaysAgo && m.createdAt < thirtyDaysAgo
        );

        let previousMonthCollectedWei = BigInt(0);
        for (const mint of previousMonthMints) {
            const feeWei = ESTIMATED_FLAT_FEE_WEI * BigInt(mint.quantity);
            previousMonthCollectedWei += feeWei;
        }

        // Calculate monthly change percentage
        let monthlyChange = 0;
        if (previousMonthCollectedWei > 0) {
            const change = Number(monthlyCollectedWei - previousMonthCollectedWei);
            const previous = Number(previousMonthCollectedWei);
            monthlyChange = Math.round((change / previous) * 100);
        }

        // Format by chain data
        const byChainArray = Object.values(byChain).map(chain => {
            const percentage = totalCollectedWei > 0 
                ? Math.round((Number(chain.collected) / Number(totalCollectedWei)) * 100)
                : 0;

            return {
                chainId: chain.chainId,
                chainName: chain.chainName,
                collected: parseFloat(formatEther(chain.collected)).toFixed(4),
                transactions: chain.transactions,
                percentage
            };
        }).sort((a, b) => parseFloat(b.collected) - parseFloat(a.collected));

        const stats = {
            totalCollected: parseFloat(formatEther(totalCollectedWei)).toFixed(4),
            monthlyCollected: parseFloat(formatEther(monthlyCollectedWei)).toFixed(4),
            monthlyChange,
            totalTransactions: mints.length,
            byChain: byChainArray,
            note: 'These are ESTIMATED statistics based on mint counts with assumed 0.001 ETH per mint. Actual platform fees vary per collection. For accurate real-time balances, see "Available Balances" section which queries directly from smart contracts.'
        };

        return NextResponse.json({
            success: true,
            data: stats
        });
        }, 30); // 30 seconds TTL for expensive platform fee stats

    } catch (error) {
        console.error('Error fetching platform fee stats:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch platform fee stats',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
