import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 10;

    // Generate cache key including pagination parameter
    const cacheKey = getCacheKey('/api/admin/activities', {
      limit: limit.toString(),
    });

    // Wrap activities query with cache (5 seconds TTL for activity logs)
    return await cachedFetch(cacheKey, async () => {

    // Fetch recent activities
    const activities = await prisma.activity.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        chainId: true,
        type: true,
        actor: true,
        description: true,
        txHash: true,
        blockNumber: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Add chain names to activities
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      11155111: 'Sepolia',
      8453: 'Base',
      84532: 'Base Sepolia',
      42161: 'Arbitrum',
      10: 'Optimism',
      137: 'Polygon',
      43114: 'Avalanche',
      56: 'BSC',
      250: 'Fantom',
      100: 'Gnosis',
      1284: 'Moonbeam',
      1285: 'Moonriver',
      42220: 'Celo',
      1313161554: 'Aurora',
      25: 'Cronos',
      288: 'Boba',
      1088: 'Metis',
      1101: 'Polygon zkEVM',
      324: 'zkSync Era',
      59144: 'Linea',
      534352: 'Scroll',
      5000: 'Mantle',
    };

    const activitiesWithChainName = activities.map((activity) => ({
      ...activity,
      chainName: chainNames[activity.chainId] || `Chain ${activity.chainId}`,
    }));

    return NextResponse.json({
      success: true,
      data: activitiesWithChainName,
    });
    }, 5); // 5 seconds TTL for activity logs
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch activities',
      },
      { status: 500 }
    );
  }
}
