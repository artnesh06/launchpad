import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '6343');
    const period = searchParams.get('period') || '7d';
    const format = searchParams.get('format') || 'csv';

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get analytics data
    const [
      launchpads,
      activities,
      totalVolume,
      totalCreators
    ] = await Promise.all([
      prisma.launchpad.findMany({
        where: {
          chainId,
          createdAt: { gte: startDate }
        },
        include: {
          analytics: true,
          metadata: true,
          _count: { select: { mints: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),

      prisma.activity.findMany({
        where: {
          chainId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Get analytics data for manual sum (totalVolume is now String)
      prisma.launchpadAnalytics.findMany({
        where: {
          launchpad: { chainId },
          updatedAt: { gte: startDate }
        },
        select: { totalVolume: true }
      }),

      prisma.launchpad.findMany({
        where: {
          chainId,
          createdAt: { gte: startDate }
        },
        select: { creator: true },
        distinct: ['creator']
      })
    ]);

    // Calculate total volume manually (now String type)
    const totalVolumeSum = totalVolume.reduce((sum, item) => {
      return sum + BigInt((item.totalVolume as unknown as string) || '0');
    }, BigInt(0));

    if (format === 'csv') {
      // Generate Analytics CSV
      const csvHeaders = [
        'Date',
        'New Launchpads',
        'Total Volume (ETH)',
        'Total Mints',
        'Unique Creators',
        'Activities Count',
        'Top Performer Name',
        'Top Performer Volume'
      ];

      // Group data by date
      const dailyData: Record<string, any> = {};

      launchpads.forEach(lp => {
        const date = lp.createdAt.toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = {
            newLaunchpads: 0,
            totalVolume: 0,
            totalMints: 0,
            creators: new Set(),
            activities: 0,
            topPerformer: { name: '', volume: 0 }
          };
        }

        dailyData[date].newLaunchpads++;
        // Convert wei string to number for aggregation
        const volumeWei = BigInt((lp.analytics?.totalVolume as unknown as string) || '0');
        dailyData[date].totalVolume += Number(volumeWei);
        dailyData[date].totalMints += lp._count.mints;
        dailyData[date].creators.add(lp.creator);

        const lpVolume = Number(BigInt((lp.analytics?.totalVolume as unknown as string) || '0'));
        if (lpVolume > dailyData[date].topPerformer.volume) {
          dailyData[date].topPerformer = {
            name: lp.name,
            volume: lpVolume
          };
        }
      });

      // Add activities count
      activities.forEach(activity => {
        const date = activity.createdAt.toISOString().split('T')[0];
        if (dailyData[date]) {
          dailyData[date].activities++;
        }
      });

      const csvRows = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]: [string, any]) => [
          date,
          data.newLaunchpads,
          (data.totalVolume / 1e18).toFixed(4),
          data.totalMints,
          data.creators.size,
          data.activities,
          data.topPerformer.name,
          (data.topPerformer.volume / 1e18).toFixed(4)
        ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field =>
          typeof field === 'string' && field.includes(',')
            ? `"${field}"`
            : field
        ).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${chainId}-${period}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    if (format === 'json') {
      const analyticsData = {
        exportedAt: new Date().toISOString(),
        chainId,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        summary: {
          totalLaunchpads: launchpads.length,
          totalCreators: totalCreators.length,
          totalVolume: (Number(totalVolumeSum) / 1e18).toFixed(4),
          totalActivities: activities.length,
          totalMints: launchpads.reduce((sum, lp) => sum + lp._count.mints, 0)
        },
        launchpads: launchpads.map(lp => ({
          name: lp.name,
          symbol: lp.symbol,
          contractAddress: lp.contractAddress,
          creator: lp.creator,
          createdAt: lp.createdAt.toISOString(),
          totalSupply: lp.totalMaxSupply,
          mintedCount: lp._count.mints,
          volume: (Number(BigInt((lp.analytics?.totalVolume as unknown as string) || '0')) / 1e18).toFixed(4),
          status: lp.status,
          verified: lp.metadata?.verified || false,
          featured: lp.metadata?.featured || false
        })),
        activities: activities.map(activity => ({
          type: activity.type,
          description: activity.description,
          actor: activity.actor,
          txHash: activity.txHash,
          createdAt: activity.createdAt.toISOString()
        })),
        topPerformers: launchpads
          .sort((a, b) => {
            const volumeA = BigInt((a.analytics?.totalVolume as unknown as string) || '0');
            const volumeB = BigInt((b.analytics?.totalVolume as unknown as string) || '0');
            return volumeB > volumeA ? 1 : volumeB < volumeA ? -1 : 0;
          })
          .slice(0, 10)
          .map(lp => ({
            name: lp.name,
            symbol: lp.symbol,
            volume: (Number(BigInt((lp.analytics?.totalVolume as unknown as string) || '0')) / 1e18).toFixed(4),
            mints: lp._count.mints
          }))
      };

      return new NextResponse(JSON.stringify(analyticsData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="analytics-${chainId}-${period}-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unsupported format. Use csv or json.'
    }, { status: 400 });

  } catch (error) {
    console.error('Error exporting analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export analytics'
    }, { status: 500 });
  }
}