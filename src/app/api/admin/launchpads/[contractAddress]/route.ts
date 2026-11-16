import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

/**
 * Optimized endpoint for fetching single launchpad by contract address
 * Used by launchpad detail pages to avoid heavy queries
 * 
 * Supports both:
 * - Contract address: /api/admin/launchpads/0x123...
 * - Database ID: /api/admin/launchpads/uuid-123...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractAddress: string }> }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { contractAddress } = await params;
    const identifier = contractAddress;

    if (!identifier) {
      return NextResponse.json({
        success: false,
        error: 'Contract address or ID is required'
      }, { status: 400 });
    }

    // Generate cache key
    const cacheKey = `/api/launchpad/${identifier}`;

    // Return cached response if available (10 seconds TTL)
    return await cachedFetch(cacheKey, async () => {

    // Check if identifier is a contract address (starts with 0x) or database ID (UUID)
    const isContractAddress = identifier.startsWith('0x');

    // Get launchpad with relations
    const launchpad = await prisma.launchpad.findFirst({
      where: isContractAddress ? {
        contractAddress: {
          equals: identifier,
          mode: 'insensitive'
        },
        status: {
          not: 'CANCELLED'  // Exclude cancelled collections
        }
      } : {
        id: identifier,
        status: {
          not: 'CANCELLED'  // Exclude cancelled collections
        }
      },
      include: {
        metadata: true,
        analytics: true,
        phases: {
          orderBy: {
            phaseIndex: 'asc'  // Order by phaseIndex to match smart contract
          } as any
        },
        _count: {
          select: { mints: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!launchpad) {
      return NextResponse.json({
        success: false,
        error: 'Launchpad not found'
      }, { status: 404 });
    }

    // Get 7 days chart data for this launchpad only - based on latest data, not current time
    // First, find the latest mint timestamp for this launchpad
    const latestMint = await prisma.mint.findFirst({
      where: {
        launchpadId: launchpad.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    });

    // If no mints exist, use current time as fallback
    const endTime = latestMint ? new Date(latestMint.createdAt) : new Date();
    const sevenDaysAgo = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);

    const volumeData = await prisma.$queryRaw<Array<{
      day: Date;
      volume: bigint;
      mints: bigint;
    }>>`
      SELECT 
        DATE_TRUNC('day', "createdAt") as day,
        SUM(CAST(price AS DECIMAL)) as volume,
        COUNT(*) as mints
      FROM mints
      WHERE "launchpadId" = ${launchpad.id}
        AND "createdAt" >= ${sevenDaysAgo}
        AND "createdAt" <= ${endTime}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `;

    // Fill in missing days with 0 volume
    const filledChartData = [];
    for (let i = 0; i < 7; i++) {
      const dayTimestamp = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const existingData = volumeData.find(d => {
        const dataDate = new Date(d.day);
        return dataDate.getDate() === dayTimestamp.getDate() &&
               dataDate.getMonth() === dayTimestamp.getMonth() &&
               dataDate.getFullYear() === dayTimestamp.getFullYear();
      });

      filledChartData.push({
        timestamp: dayTimestamp.toISOString(),
        volume: existingData ? Number(existingData.volume) / 1e18 : 0,
        mints: existingData ? Number(existingData.mints) : 0
      });
    }

    // Calculate volume change percentage
    const firstHalfVolume = filledChartData.slice(0, 3).reduce((sum, d) => sum + d.volume, 0);
    const secondHalfVolume = filledChartData.slice(4, 7).reduce((sum, d) => sum + d.volume, 0);
    const volumeChange = firstHalfVolume > 0
      ? ((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100
      : 0;

    // Calculate total mints in 7 days
    const minted7d = filledChartData.reduce((sum, d) => sum + d.mints, 0) || 0;

    // Get mints in last 24 hours from database (rolling 24 hours)
    const minted24hResult = await prisma.$queryRaw<Array<{ minted24h: bigint }>>`
      SELECT COUNT(*) as minted24h
      FROM mints
      WHERE "launchpadId" = ${launchpad.id}
        AND "createdAt" >= NOW() - INTERVAL '24 hours'
    `;
    
    const minted24h = minted24hResult.length > 0 ? Number(minted24hResult[0].minted24h) : 0;

    // Convert Decimal to number
    const volumeValue = launchpad.volume ? Number(launchpad.volume) : 0;
    const totalVolumeValue = launchpad.analytics?.totalVolume
      ? Number(launchpad.analytics.totalVolume)
      : volumeValue;

    // Get mint price from active phase or analytics
    let mintPrice = 0;
    if (launchpad.phases && launchpad.phases.length > 0) {
      const activePhase = launchpad.phases.find(p => p.isActive);
      if (activePhase) {
        mintPrice = parseFloat(activePhase.price) / 1e18;
      } else {
        mintPrice = parseFloat(launchpad.phases[0].price) / 1e18;
      }
    } else if (launchpad.analytics?.avgMintPrice) {
      mintPrice = Number(launchpad.analytics.avgMintPrice);
    }

    const actualMintedCount = launchpad.mintedCount || launchpad._count.mints;

    const processedLaunchpad = {
      ...launchpad,
      mintedCount: actualMintedCount,
      volume: totalVolumeValue,
      mintPrice: mintPrice,
      status: launchpad.status.toLowerCase(),
      mintPercentage: launchpad.totalMaxSupply > 0
        ? (actualMintedCount / launchpad.totalMaxSupply) * 100
        : 0,
      isComplete: actualMintedCount >= launchpad.totalMaxSupply,
      daysSinceCreated: Math.floor((Date.now() - launchpad.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      chartData24h: filledChartData,
      volumeChange24h: Math.round(volumeChange * 100) / 100,
      analytics: {
        ...launchpad.analytics,
        minted24h: minted24h || 0,
        minted7d: minted7d || 0
      },
      phases: launchpad.phases?.map((phase: any, index: number) => ({
        id: phase.id,
        phaseIndex: phase.phaseIndex ?? index,  // Use stored phaseIndex from database, fallback to array index
        name: phase.name,
        phaseType: phase.phaseType,
        startTime: phase.startTime,
        endTime: phase.endTime,
        price: (parseFloat(phase.price) / 1e18).toString(),
        maxPerWallet: phase.maxMintPerWallet,
        totalLimit: phase.totalLimit,
        mintedCount: phase.mintedCount,
        isActive: phase.isActive,
        merkleRoot: phase.merkleRoot,
        requiresWhitelist: phase.phaseType === 'ALLOWLIST' || phase.phaseType === 'PRESALE'
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: processedLaunchpad
    });
    }, 10); // Cache for 10 seconds
  } catch (error) {
    console.error('Error fetching launchpad:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch launchpad',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
