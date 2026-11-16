import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const chainId = searchParams.get('chainId');
    const days = parseInt(searchParams.get('days') || '30');

    // Generate cache key including all query parameters
    const cacheKey = getCacheKey('/api/admin/analytics', {
      chainId,
      days: days.toString(),
    });

    // Wrap expensive analytics query with cache (30 seconds TTL for expensive queries)
    return await cachedFetch(cacheKey, async () => {

    // Build where clause
    const where: any = {};
    if (chainId) {
      where.chainId = parseInt(chainId);
    }
    // Exclude cancelled collections from analytics
    where.status = {
      not: 'CANCELLED'
    };

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch volume over time (from mints)
    const mints = await prisma.mint.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(chainId && {
          launchpad: {
            chainId: parseInt(chainId),
          },
        }),
      },
      select: {
        createdAt: true,
        price: true,
        quantity: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group mints by day for volume over time
    const volumeByDay = new Map<string, bigint>();
    const mintsByDay = new Map<string, number>();

    mints.forEach((mint) => {
      const dateKey = mint.createdAt.toISOString().split('T')[0];
      
      // Calculate volume - handle both Wei string and decimal formats
      try {
        const priceWei = mint.price.includes('.') 
          ? ethers.parseEther(mint.price).toString() 
          : mint.price;
        const mintVolume = BigInt(priceWei) * BigInt(mint.quantity);
        volumeByDay.set(dateKey, (volumeByDay.get(dateKey) || BigInt(0)) + mintVolume);
      } catch (error) {
        console.warn(`⚠️ Invalid price format for mint: ${mint.price}, skipping volume calculation`);
      }
      
      // Count mints
      mintsByDay.set(dateKey, (mintsByDay.get(dateKey) || 0) + mint.quantity);
    });

    // Convert to time series format
    const volumeOverTime = Array.from(volumeByDay.entries())
      .map(([timestamp, value]) => ({
        timestamp,
        value: Number(value) / 1e18, // Convert Wei to ETH
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const mintsOverTime = Array.from(mintsByDay.entries())
      .map(([timestamp, value]) => ({
        timestamp,
        value,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Fetch top collections by volume
    const topCollections = await prisma.launchpad.findMany({
      where,
      select: {
        id: true,
        name: true,
        contractAddress: true,
        volume: true,
        mintedCount: true,
        chainId: true,
      },
      orderBy: {
        volume: 'desc',
      },
      take: 10,
    });

    const formattedTopCollections = topCollections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      contractAddress: collection.contractAddress,
      volume: (Number(collection.volume) / 1e18).toFixed(4),
      mints: collection.mintedCount,
      chainId: collection.chainId,
    }));

    // Fetch top creators by volume
    const creatorsData = await prisma.launchpad.groupBy({
      by: ['creator'],
      where,
      _sum: {
        mintedCount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get volume for each creator
    const topCreatorsWithVolume = await Promise.all(
      creatorsData.map(async (creator) => {
        const launchpads = await prisma.launchpad.findMany({
          where: {
            creator: creator.creator,
            ...where,
          },
          select: {
            volume: true,
          },
        });

        const totalVolume = launchpads.reduce((acc, lp) => {
          return acc + BigInt(lp.volume || '0');
        }, BigInt(0));

        return {
          address: creator.creator,
          totalVolume: (Number(totalVolume) / 1e18).toFixed(4),
          totalCollections: creator._count.id,
          totalMints: creator._sum.mintedCount || 0,
        };
      })
    );

    // Sort by volume and take top 10
    const topCreators = topCreatorsWithVolume
      .sort((a, b) => parseFloat(b.totalVolume) - parseFloat(a.totalVolume))
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        volumeOverTime,
        mintsOverTime,
        topCollections: formattedTopCollections,
        topCreators,
      },
    });
    }, 30); // 30 seconds TTL for expensive analytics queries
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
