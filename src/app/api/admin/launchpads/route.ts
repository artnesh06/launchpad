import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { BlockchainService } from '@/lib/blockchain/blockchain-service';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

const contractService = new BlockchainService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get('chainId');
    const chainId = chainIdParam ? parseInt(chainIdParam) : null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skipParam = searchParams.get('skip');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const contractAddress = searchParams.get('contractAddress') || '';
    const creatorAddress = searchParams.get('creatorAddress') || '';
    // Get timezone offset from client (in minutes, e.g., -420 for UTC+7)
    const tzOffsetParam = searchParams.get('tzOffset');
    const tzOffset = tzOffsetParam ? parseInt(tzOffsetParam) : 0;

    // Generate cache key
    const cacheKey = getCacheKey('/api/admin/launchpads', {
      chainId, page, limit, search, status, sortBy, sortOrder, 
      contractAddress, creatorAddress, tzOffset
    });

    // Return cached response if available (5 seconds TTL)
    return await cachedFetch(cacheKey, async () => {
      // Debug log untuk memastikan sorting parameter
      console.log('🔍 Launchpads Query:', { sortBy, sortOrder, page, chainId, creatorAddress });

      // Use skip parameter if provided, otherwise calculate from page
      const skip = skipParam ? parseInt(skipParam) : (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Priority to contractAddress if provided (unique field)
    if (contractAddress) {
      where.contractAddress = {
        equals: contractAddress,
        mode: 'insensitive'
      };
      // When querying by contractAddress, we expect a single result
      // but still maintain array format for consistency
    } else if (chainId !== null) {
      // Only filter by chainId if it's explicitly provided
      where.chainId = chainId;
    }
    // If chainId is null (not provided), don't filter by chain - show all chains

    // Add creator address filter (case-insensitive)
    if (creatorAddress) {
      where.creator = {
        equals: creatorAddress,
        mode: 'insensitive'
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { symbol: { contains: search, mode: 'insensitive' } },
        { contractAddress: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status.toUpperCase();
    } else if (!creatorAddress) {
      // Only exclude cancelled collections by default when:
      // 1. No specific status filter is applied
      // 2. Not querying by creator address (creator needs to see all their collections)
      where.status = {
        not: 'CANCELLED'
      };
    }
    // If creatorAddress is provided and no status filter, show all statuses including CANCELLED

    // Get launchpads from database
    // When querying by contractAddress, skip pagination (unique field)
    const queryOptions: any = {
      where,
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
    };

    // When querying by contractAddress, use the most recent one if duplicates exist
    if (contractAddress) {
      queryOptions.orderBy = { createdAt: 'desc' };
      queryOptions.take = 1;
    } else {
      queryOptions.skip = skip;
      queryOptions.take = limit;
      
      // Handle special sorting cases
      if (sortBy === 'trending') {
        // For trending, we'll use a raw query to sort by minted24h
        // Skip the normal query and use raw query below
      } else if (sortBy === 'minted24h') {
        // For minted24h, we'll use a raw query to sort by mints in last 24 hours
        // Skip the normal query and use raw query below
      } else if (sortBy === 'volume') {
        // Sort by volume and then by minted count
        queryOptions.orderBy = [
          { volume: sortOrder },
          { mintedCount: 'desc' }
        ];
      } else if (sortBy === 'mintedCount') {
        // Sort by minted count
        queryOptions.orderBy = { mintedCount: sortOrder };
      } else if (sortBy === 'mintPrice') {
        // Sort by mint price - will be calculated from phases after fetch
        // For now, use createdAt as placeholder, we'll sort in memory
        queryOptions.orderBy = { createdAt: 'desc' };
      } else if (sortBy === 'analytics.uniqueHolders') {
        // Sort by holders - need to handle nested relation
        queryOptions.orderBy = {
          analytics: {
            uniqueHolders: sortOrder
          }
        };
      } else if (sortBy === 'createdAt') {
        // Explicit handling for createdAt sorting
        queryOptions.orderBy = { createdAt: sortOrder };
      } else {
        queryOptions.orderBy = { [sortBy]: sortOrder };
      }
    }

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

    let launchpads: LaunchpadWithRelations[];
    let total: number;

    // For trending sort, use raw query to sort by minted24h from mints table
    if (sortBy === 'trending' && !contractAddress) {
      // Get launchpad IDs sorted by minted24h desc (last 24 hours rolling), then volume desc
      const trendingIds = await prisma.$queryRawUnsafe<Array<{ id: string; minted24h: bigint }>>(
        `SELECT 
          l.id,
          COALESCE(m24.minted24h, 0) as minted24h
        FROM launchpads l
        LEFT JOIN (
          SELECT 
            "launchpadId",
            COUNT(*) as minted24h
          FROM mints
          WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
          GROUP BY "launchpadId"
        ) m24 ON l.id = m24."launchpadId"
        WHERE l.status = 'ACTIVE'
        ${chainId !== null ? `AND l."chainId" = ${chainId}` : ''}
        ORDER BY minted24h DESC, l.volume DESC
        LIMIT ${limit}
        OFFSET ${skip}`
      );

      const trendingLaunchpadIds = trendingIds.map(t => t.id);
      
      // Fetch full launchpad data for these IDs
      if (trendingLaunchpadIds.length > 0) {
        const launchpadsUnsorted = await prisma.launchpad.findMany({
          where: { id: { in: trendingLaunchpadIds } },
          include: {
            metadata: true,
            analytics: true,
            phases: { orderBy: { phaseIndex: 'asc' } as any },  // Order by phaseIndex to match smart contract
            _count: { select: { mints: true } }
          }
        }) as LaunchpadWithRelations[];
        
        // Maintain the order from raw query
        const idToMinted24h = new Map(trendingIds.map(t => [t.id, Number(t.minted24h)]));
        launchpads = trendingLaunchpadIds
          .map(id => launchpadsUnsorted.find(lp => lp.id === id)!)
          .filter(Boolean);
        
        // Store minted24h for later use
        (launchpads as any).__minted24hMap = idToMinted24h;
      } else {
        launchpads = [];
      }
      
      // Get total count
      total = await prisma.launchpad.count({ where });
    } else if (sortBy === 'minted24h' && !contractAddress) {
      // For minted24h sort, use raw query to sort by mints in last 24 hours
      const offsetHours = -tzOffset / 60;
      
      // Get launchpad IDs sorted by minted24h (last 24 hours)
      const minted24hIds = await prisma.$queryRawUnsafe<Array<{ id: string; minted24h: bigint }>>(
        `SELECT 
          l.id,
          COALESCE(m24.minted24h, 0) as minted24h
        FROM launchpads l
        LEFT JOIN (
          SELECT 
            "launchpadId",
            COUNT(*) as minted24h
          FROM mints
          WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
          GROUP BY "launchpadId"
        ) m24 ON l.id = m24."launchpadId"
        WHERE l.status = 'ACTIVE'
        ${chainId !== null ? `AND l."chainId" = ${chainId}` : ''}
        ORDER BY minted24h ${sortOrder.toUpperCase()}, l.volume DESC
        LIMIT ${limit}
        OFFSET ${skip}`
      );

      const minted24hLaunchpadIds = minted24hIds.map(t => t.id);
      
      // Fetch full launchpad data for these IDs
      if (minted24hLaunchpadIds.length > 0) {
        const launchpadsUnsorted = await prisma.launchpad.findMany({
          where: { id: { in: minted24hLaunchpadIds } },
          include: {
            metadata: true,
            analytics: true,
            phases: { orderBy: { phaseIndex: 'asc' } as any },
            _count: { select: { mints: true } }
          }
        }) as LaunchpadWithRelations[];
        
        // Maintain the order from raw query
        const idToMinted24h = new Map(minted24hIds.map(t => [t.id, Number(t.minted24h)]));
        launchpads = minted24hLaunchpadIds
          .map(id => launchpadsUnsorted.find(lp => lp.id === id)!)
          .filter(Boolean);
        
        // Store minted24h for later use
        (launchpads as any).__minted24hMap = idToMinted24h;
      } else {
        launchpads = [];
      }
      
      // Get total count
      total = await prisma.launchpad.count({ where });
    } else {
      // Normal query for non-trending sorts
      [launchpads, total] = await Promise.all([
        prisma.launchpad.findMany(queryOptions) as Promise<LaunchpadWithRelations[]>,
        prisma.launchpad.count({ where })
      ]);
    }

    // Debug log untuk melihat hasil sorting
    if (launchpads.length > 0) {
      console.log('📊 First 3 launchpads createdAt:', launchpads.slice(0, 3).map(lp => ({
        name: lp.name,
        createdAt: lp.createdAt
      })));
    }

    // Get 7 days chart data for all launchpads - based on latest data per launchpad
    const launchpadIds = launchpads.map(lp => lp.id);

    // Skip chart data query if no launchpads found
    let volumeData: Array<{
      launchpadId: string;
      day: Date;
      volume: bigint;
      mints: bigint;
    }> = [];
    
    // Get minted24h data for all launchpads (last 24 hours rolling)
    let minted24hData: Map<string, number> = new Map();
    
    if (launchpadIds.length > 0) {
      // Query for minted in last 24 hours (rolling)
      const minted24hResults = await prisma.$queryRaw<Array<{
        launchpadId: string;
        minted24h: bigint;
      }>>`
        SELECT 
          "launchpadId",
          COUNT(*) as minted24h
        FROM mints
        WHERE "launchpadId" = ANY(${launchpadIds}::text[])
          AND "createdAt" >= NOW() - INTERVAL '24 hours'
        GROUP BY "launchpadId"
      `;
      
      // Convert to Map for easy lookup
      minted24hData = new Map(
        minted24hResults.map(r => [r.launchpadId, Number(r.minted24h)])
      );
      
      // Get daily volume data for the last 7 days (including today)
      // Use client timezone offset to group by local date
      // tzOffset is in minutes (negative for east of UTC, e.g., -420 for UTC+7)
      // To convert UTC to local time, we ADD the offset hours
      // For UTC+7 (tzOffset=-420): offsetHours = 7, so we add 7 hours to UTC
      const offsetHours = -tzOffset / 60;
      
      // Use $queryRawUnsafe because we need to interpolate offset in GROUP BY
      volumeData = await prisma.$queryRawUnsafe<Array<{
        launchpadId: string;
        day: Date;
        volume: bigint;
        mints: bigint;
      }>>(
        `SELECT 
          m."launchpadId",
          DATE_TRUNC('day', m."createdAt" + INTERVAL '${offsetHours} hours') as day,
          SUM(CAST(m.price AS DECIMAL)) as volume,
          COUNT(*) as mints
        FROM mints m
        WHERE m."launchpadId" = ANY($1::text[])
          AND m."createdAt" >= NOW() - INTERVAL '6 days'
          AND m."createdAt" <= NOW()
        GROUP BY m."launchpadId", DATE_TRUNC('day', m."createdAt" + INTERVAL '${offsetHours} hours')
        ORDER BY day ASC`,
        launchpadIds
      );
    }

    // Group chart data by launchpad
    const chartDataByLaunchpad = volumeData.reduce((acc, item) => {
      if (!acc[item.launchpadId]) {
        acc[item.launchpadId] = [];
      }
      acc[item.launchpadId].push({
        timestamp: item.day,
        volume: Number(item.volume) / 1e18,
        mints: Number(item.mints)
      });
      return acc;
    }, {} as Record<string, Array<{ timestamp: Date; volume: number; mints: number }>>);

    // Debug: Log chart data for first launchpad
    if (launchpadIds.length > 0 && volumeData.length > 0) {
      const firstLaunchpadId = launchpadIds[0];
      const firstChartData = chartDataByLaunchpad[firstLaunchpadId];
      const offsetHours = -tzOffset / 60;
      console.log('📊 Chart data from DB:', {
        launchpadId: firstLaunchpadId,
        clientTzOffset: tzOffset,
        offsetHoursApplied: offsetHours,
        dataPoints: firstChartData?.length || 0,
        rawDates: firstChartData?.map(d => ({
          date: new Date(d.timestamp).toISOString(),
          mints: d.mints
        })) || []
      });
    }
    
    // Debug: Log if no data found
    if (launchpadIds.length > 0 && volumeData.length === 0) {
      console.log('⚠️ No chart data found from database query');
      console.log('Query parameters:', {
        launchpadCount: launchpadIds.length,
        sampleLaunchpadId: launchpadIds[0],
        queryRange: 'NOW() - INTERVAL \'6 days\' to NOW()'
      });
    }

    // Debug: Check mint data for first launchpad before processing
    if (launchpadIds.length > 0) {
      const firstLaunchpadId = launchpadIds[0];
      const mintCount = await prisma.mint.count({
        where: { launchpadId: firstLaunchpadId }
      });
      
      const recentMints = await prisma.mint.findMany({
        where: { launchpadId: firstLaunchpadId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          createdAt: true,
          quantity: true,
          price: true
        }
      });
      
      console.log('🔍 Database mint check:', {
        launchpadId: firstLaunchpadId,
        totalMintsInDB: mintCount,
        recentMintsInDB: recentMints.map(m => ({
          date: m.createdAt.toISOString().split('T')[0],
          time: m.createdAt.toISOString(),
          quantity: m.quantity
        }))
      });
    }

    // Process with additional computed data
    let processedLaunchpads = launchpads.map(launchpad => {
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

      // Get chart data for this launchpad
      const chartData = chartDataByLaunchpad[launchpad.id] || [];

      // Use current time as endpoint for chart data to ensure latest mints are included
      // Calculate 7 days window: today and 6 days before
      // Apply client timezone offset to show correct "today" for user's local time
      const nowUTC = new Date();
      // tzOffset is in minutes (negative for east of UTC, e.g., -420 for UTC+7)
      // We need to add the offset to get local time, but tzOffset from JS is inverted
      // So for UTC+7, JS gives -420, we subtract it to get local time
      const localNow = new Date(nowUTC.getTime() - (tzOffset * 60 * 1000));
      const today = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()));
      
      const sixDaysAgo = new Date(today);
      sixDaysAgo.setUTCDate(today.getUTCDate() - 6); // 6 days before today

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

      // Debug: Log filled chart data for first launchpad
      if (launchpad.id === launchpadIds[0] && filledChartData.length > 0) {
        console.log('📈 Filled chart data:', {
          name: launchpad.name,
          launchpadId: launchpad.id,
          serverNow: new Date().toISOString(),
          clientTzOffset: tzOffset,
          localNow: localNow.toISOString(),
          todayLocal: today.toISOString().split('T')[0],
          startDate: sixDaysAgo.toISOString().split('T')[0],
          rawChartDataFromDB: chartData.map(d => ({
            date: new Date(d.timestamp).toISOString().split('T')[0],
            mints: d.mints
          })),
          totalMints: filledChartData.reduce((sum, d) => sum + d.mints, 0),
          lastDayMints: filledChartData[filledChartData.length - 1].mints,
          dates: filledChartData.map(d => ({
            date: new Date(d.timestamp).toISOString().split('T')[0],
            mints: d.mints
          }))
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

      // Get mints in last 24 hours from database query (rolling 24 hours)
      // Use the stored value from raw query if available (for trending/minted24h sort)
      const minted24hFromMap = (launchpads as any).__minted24hMap?.get(launchpad.id);
      const minted24h = minted24hFromMap !== undefined 
        ? minted24hFromMap 
        : (minted24hData.get(launchpad.id) || 0);

      // Calculate total volume in 7 days (same period as chart) - already in ETH
      const volume7d = filledChartData.reduce((sum, d) => sum + d.volume, 0) || 0;

      // Use mintedCount from database (already updated by sync) or fallback to _count.mints
      const actualMintedCount = launchpad.mintedCount || launchpad._count.mints;

      return {
        ...launchpad,
        mintedCount: actualMintedCount,
        volume: volume7d, // Volume 7d in ETH (same period as chart)
        mintPrice: mintPrice,
        status: launchpad.status.toLowerCase(),
        // Add computed fields
        mintPercentage: launchpad.totalMaxSupply > 0
          ? (actualMintedCount / launchpad.totalMaxSupply) * 100
          : 0,
        isComplete: actualMintedCount >= launchpad.totalMaxSupply,
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
        // IMPORTANT: Phases are ordered by phaseIndex which matches smart contract order
        phases: launchpad.phases?.map((phase: any, index: number) => ({
          id: phase.id,
          phaseIndex: phase.phaseIndex ?? index, // Use stored phaseIndex from database, fallback to array index
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
    });

    // Handle in-memory sorting for mintPrice (since it's calculated from phases)
    if (sortBy === 'mintPrice' && !contractAddress) {
      processedLaunchpads.sort((a, b) => {
        const priceA = a.mintPrice || 0;
        const priceB = b.mintPrice || 0;
        return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
      });
    }

      return NextResponse.json({
        success: true,
        data: {
          items: processedLaunchpads,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: total,
            limit
          }
        }
      });
    }, 60); // Cache for 60 seconds - increased to reduce database load
  } catch (error) {
    console.error('Error fetching launchpads:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch launchpads',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { action, chainId, ...params } = body;

    if (!chainId) {
      return NextResponse.json({
        success: false,
        error: 'Chain ID is required'
      }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'sync':
        // Sync all launchpads from blockchain
        const addresses = await contractService.getAllLaunchpads(chainId);
        result = { syncedCount: addresses.length };
        break;

      case 'create':
        // This would require a signed transaction from the frontend
        return NextResponse.json({
          success: false,
          error: 'Launchpad creation must be done through frontend with wallet signature'
        }, { status: 400 });

      case 'update_status':
        // Update launchpad status
        const { launchpadId, status } = params;
        if (!launchpadId || !status) {
          return NextResponse.json({
            success: false,
            error: 'Launchpad ID and status are required'
          }, { status: 400 });
        }

        result = await prisma.launchpad.update({
          where: { id: launchpadId },
          data: { status: status.toUpperCase() }
        });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in launchpads POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}