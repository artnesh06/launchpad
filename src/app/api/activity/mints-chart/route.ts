import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

interface MintsChartData {
  date: string;
  mints: number;
}

interface MintsChartResponse {
  success: boolean;
  data: MintsChartData[];
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') || '1';
    const chainParam = searchParams.get('chain') || 'all';

    // Generate cache key with query parameters
    const cacheKey = getCacheKey('/api/activity/mints-chart', {
      days: daysParam,
      chain: chainParam
    });

    // Return cached response if available (5 seconds TTL for chart data)
    return await cachedFetch(cacheKey, async () => {

    // Validate days parameter
    const days = parseInt(daysParam, 10);
    if (isNaN(days) || days < 1 || days > 30) {
      return NextResponse.json<MintsChartResponse>(
        {
          success: false,
          data: [],
          error: 'Invalid days parameter. Must be between 1 and 30'
        },
        { status: 400 }
      );
    }

    // Parse chain parameter
    let chainId: number | null = null;
    if (chainParam !== 'all') {
      chainId = parseInt(chainParam, 10);
      if (isNaN(chainId)) {
        return NextResponse.json<MintsChartResponse>(
          {
            success: false,
            data: [],
            error: 'Invalid chain parameter. Must be a number or "all"'
          },
          { status: 400 }
        );
      }
    }

    // Build where clause untuk mencari data terakhir
    // Exclude activities from cancelled collections
    const whereClause: any = {
      type: 'MINT_OCCURRED',
      launchpadId: {
        not: null
      }
    };

    if (chainId !== null) {
      whereClause.chainId = chainId;
    }

    // Get IDs of cancelled launchpads to exclude
    const cancelledLaunchpads = await prisma.launchpad.findMany({
      where: {
        status: 'CANCELLED',
        ...(chainId !== null && { chainId })
      },
      select: { id: true }
    });

    const cancelledIds = cancelledLaunchpads.map(lp => lp.id);
    
    if (cancelledIds.length > 0) {
      whereClause.launchpadId = {
        notIn: cancelledIds
      };
    }

    // Cari data mint terakhir untuk menentukan range 7 hari
    const latestMint = await prisma.activity.findFirst({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    });

    // Jika tidak ada data, return empty
    if (!latestMint) {
      return NextResponse.json<MintsChartResponse>({
        success: true,
        data: []
      });
    }

    // Hitung range dari data terakhir berdasarkan parameter days
    const endDate = new Date(latestMint.createdAt);
    // Set ke akhir hari untuk include semua data hari terakhir
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1)); // days - 1 karena include hari terakhir
    // Set ke awal hari
    startDate.setHours(0, 0, 0, 0);

    // Update where clause dengan range
    whereClause.createdAt = {
      gte: startDate,
      lte: endDate
    };

    // Query mint activities dalam range
    const mintActivities = await prisma.activity.findMany({
      where: whereClause,
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group mints by day
    const mintsByDay: Record<string, number> = {};

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayKey = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      mintsByDay[dayKey] = 0;
    }

    // Count mints per day
    mintActivities.forEach((activity) => {
      const activityDate = new Date(activity.createdAt);
      const dayKey = activityDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      if (mintsByDay[dayKey] !== undefined) {
        mintsByDay[dayKey]++;
      }
    });

    // Convert to array format for chart
    const chartData: MintsChartData[] = Object.entries(mintsByDay).map(([date, mints]) => ({
      date,
      mints
    }));

    return NextResponse.json<MintsChartResponse>({
      success: true,
      data: chartData
    });
    }, 5); // Cache for 5 seconds (frequent updates)

  } catch (error) {
    console.error('Mints chart API error:', error);
    
    return NextResponse.json<MintsChartResponse>(
      {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
