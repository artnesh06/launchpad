import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const contractAddress = address;
    
    // Get timezone offset from client (in minutes, e.g., -420 for UTC+7)
    const { searchParams } = new URL(request.url);
    const tzOffsetParam = searchParams.get('tzOffset');
    const tzOffset = tzOffsetParam ? parseInt(tzOffsetParam) : 0;

    // Generate cache key including contract address and chainId if present
    const cacheKey = getCacheKey(`/api/collections/${contractAddress}`, {
      tzOffset: tzOffsetParam || '0'
    });

    // Wrap database query with cache (TTL: 10 seconds for moderate updates)
    return await cachedFetch(cacheKey, async () => {
      if (!contractAddress) {
        return NextResponse.json({
          success: false,
          error: 'Contract address is required'
        }, { status: 400 });
      }

      // Query database for collection by contract address (case-insensitive)
      type LaunchpadWithRelations = Prisma.LaunchpadGetPayload<{
        include: {
          metadata: true;
          analytics: true;
          phases: true;
          _count: {
            select: { mints: true };
          };
        };
      }>;

      const launchpad = await prisma.launchpad.findFirst({
        where: {
          contractAddress: {
            equals: contractAddress,
            mode: 'insensitive'
          },
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
        }
      }) as LaunchpadWithRelations | null;

      if (!launchpad) {
        return NextResponse.json({
          success: false,
          error: 'Collection not found'
        }, { status: 404 });
      }

      // Get 7 days chart data - use current time to ensure real-time data
      // Calculate 7 days window: today and 6 days before
      // Apply client timezone offset to show correct "today" for user's local time
      const nowUTC = new Date();
      const localNow = new Date(nowUTC.getTime() - (tzOffset * 60 * 1000));
      const today = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()));
      
      const sixDaysAgo = new Date(today);
      sixDaysAgo.setUTCDate(today.getUTCDate() - 6); // 6 days before today
      
      const endTime = new Date(); // Current time for query

      // Get daily volume data for the last 7 days
      // Use client timezone offset to group by local date
      // tzOffset is in minutes (negative for east of UTC, e.g., -420 for UTC+7)
      // To convert UTC to local time, we ADD the offset hours
      const offsetHours = -tzOffset / 60;
      
      // Use $queryRawUnsafe because we need to interpolate offset in GROUP BY
      const volumeData = await prisma.$queryRawUnsafe<Array<{
        launchpadId: string;
        day: Date;
        volume: bigint;
        mints: bigint;
      }>>(
        `SELECT 
          "launchpadId",
          DATE_TRUNC('day', "createdAt" + INTERVAL '${offsetHours} hours') as day,
          SUM(CAST(price AS DECIMAL)) as volume,
          COUNT(*) as mints
        FROM mints
        WHERE "launchpadId" = $1
          AND "createdAt" >= $2
          AND "createdAt" <= $3
        GROUP BY "launchpadId", DATE_TRUNC('day', "createdAt" + INTERVAL '${offsetHours} hours')
        ORDER BY day ASC`,
        launchpad.id,
        sixDaysAgo,
        endTime
      );

      // Process chart data
      const chartData = volumeData.map(item => ({
        timestamp: item.day,
        volume: Number(item.volume) / 1e18,
        mints: Number(item.mints)
      }));

      // Fill in missing days with 0 volume (7 days total: 6 days ago + today)
      const filledChartData = [];
      for (let i = 0; i < 7; i++) {
        const dayTimestamp = new Date(sixDaysAgo);
        dayTimestamp.setUTCDate(sixDaysAgo.getUTCDate() + i);
        
        // Format as YYYY-MM-DD for comparison to avoid timezone issues
        const dayStr = dayTimestamp.toISOString().split('T')[0];
        
        const existingData = chartData.find(d => {
          const dataDate = new Date(d.timestamp);
          const dataStr = dataDate.toISOString().split('T')[0];
          return dayStr === dataStr;
        });

        filledChartData.push({
          timestamp: dayTimestamp.toISOString(),
          volume: existingData?.volume || 0,
          mints: existingData?.mints || 0
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
        // Get price from first active phase
        const activePhase = launchpad.phases.find(p => p.isActive);
        if (activePhase) {
          mintPrice = parseFloat(activePhase.price) / 1e18; // Convert from wei to ETH
        } else {
          mintPrice = parseFloat(launchpad.phases[0].price) / 1e18; // Fallback to first phase
        }
      } else if (launchpad.analytics?.avgMintPrice) {
        // Fallback to average mint price
        mintPrice = Number(launchpad.analytics.avgMintPrice);
      }

      // Format response data consistently with admin endpoint
      const formattedData = {
        ...launchpad,
        mintedCount: launchpad._count.mints,
        volume: totalVolumeValue,
        mintPrice: mintPrice,
        status: launchpad.status.toLowerCase(),
        // Add computed fields
        mintPercentage: launchpad.totalMaxSupply > 0
          ? (launchpad._count.mints / launchpad.totalMaxSupply) * 100
          : 0,
        isComplete: launchpad._count.mints >= launchpad.totalMaxSupply,
        daysSinceCreated: Math.floor((Date.now() - launchpad.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        // Add chart data (7 days)
        chartData24h: filledChartData,
        volumeChange24h: Math.round(volumeChange * 100) / 100,
        // Add analytics with minted in last 24 hours
        analytics: {
          ...launchpad.analytics,
          minted24h: minted24h || 0,
          minted7d: minted7d || 0
        },
        // Format phases for frontend
        phases: launchpad.phases?.map((phase: any, index: number) => ({
          id: phase.id,
          phaseIndex: phase.phaseIndex ?? index,  // Use stored phaseIndex from database, fallback to array index
          name: phase.name,
          phaseType: phase.phaseType,
          startTime: phase.startTime,
          endTime: phase.endTime,
          price: (parseFloat(phase.price) / 1e18).toString(), // Convert wei to ETH
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
        data: formattedData
      });
    }, 10); // TTL: 10 seconds (moderate updates for collection data)
  } catch (error) {
    console.error('Error fetching collection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
