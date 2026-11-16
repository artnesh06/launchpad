import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chainId = searchParams.get('chainId');
    const creatorAddress = searchParams.get('creatorAddress');

    // Generate cache key including all query parameters
    const cacheKey = getCacheKey('/api/admin/stats', {
      chainId,
      creatorAddress,
    });

    // Wrap expensive stats query with cache (30 seconds TTL for expensive queries)
    return await cachedFetch(cacheKey, async () => {

    // Build where clause
    const where: any = {};
    
    if (chainId) {
      where.chainId = parseInt(chainId);
    }

    // Add creator filter
    if (creatorAddress) {
      where.creator = {
        equals: creatorAddress,
        mode: 'insensitive',
      };
      // When querying by creator, include all statuses (including CANCELLED)
      // so creator can see their full statistics
    } else {
      // Exclude cancelled collections from public stats
      where.status = {
        not: 'CANCELLED'
      };
    }

    // Get all launchpads without pagination for accurate stats
    const launchpads = await prisma.launchpad.findMany({
      where,
      select: {
        status: true,
        volume: true,
        mintedCount: true,
        totalMaxSupply: true,
      },
    });

    // Calculate stats
    const total = launchpads.length;
    const active = launchpads.filter((lp) => lp.status === 'ACTIVE').length;
    
    // Calculate mint out (collections where mintedCount >= totalMaxSupply)
    const mintOut = launchpads.filter((lp) => {
      return lp.mintedCount >= lp.totalMaxSupply;
    }).length;
    
    // Calculate total mints across all collections
    const totalMints = launchpads.reduce((acc, lp) => {
      return acc + (lp.mintedCount || 0);
    }, 0);
    
    // Calculate total volume in ETH (convert from Wei)
    const volumeInWei = launchpads.reduce((acc, lp) => {
      const volume = lp.volume ? BigInt(lp.volume) : BigInt(0);
      return acc + volume;
    }, BigInt(0));

    // Convert Wei to ETH (1 ETH = 10^18 Wei)
    const volume = Number(volumeInWei) / 1e18;

    return NextResponse.json({
      success: true,
      data: {
        totalCollections: total,
        totalMints: totalMints,
        totalVolume: volume.toFixed(4),
        activeLaunchpads: active,
        completedLaunchpads: mintOut,
        // Legacy fields for backward compatibility
        total,
        active,
        mintOut,
        volume: parseFloat(volume.toFixed(4)),
      },
    });
    }, 30); // 30 seconds TTL for expensive stats queries
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stats',
      },
      { status: 500 }
    );
  }
}
