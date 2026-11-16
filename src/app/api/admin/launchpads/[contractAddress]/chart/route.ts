import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contractAddress: string }> }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { contractAddress: identifier } = await context.params;

    // Check if identifier is a contract address (starts with 0x) or database ID (UUID)
    const isContractAddress = identifier.startsWith('0x');

    // Get launchpad ID
    const launchpad = await prisma.launchpad.findFirst({
      where: isContractAddress ? {
        contractAddress: {
          equals: identifier,
          mode: 'insensitive'
        }
      } : {
        id: identifier
      },
      select: { id: true }
    });

    if (!launchpad) {
      return NextResponse.json({
        success: false,
        error: 'Launchpad not found'
      }, { status: 404 });
    }

    const launchpadId = launchpad.id;

    // Get 24 hours of volume data
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get hourly volume data for the last 24 hours
    const volumeData = await prisma.$queryRaw<Array<{
      hour: Date;
      volume: bigint;
      mints: bigint;
    }>>`
      SELECT 
        DATE_TRUNC('hour', "createdAt") as hour,
        SUM(CAST(price AS DECIMAL)) as volume,
        COUNT(*) as mints
      FROM mints
      WHERE "launchpadId" = ${launchpadId}
        AND "createdAt" >= ${twentyFourHoursAgo}
      GROUP BY DATE_TRUNC('hour', "createdAt")
      ORDER BY hour ASC
    `;

    // Format data for chart
    const chartData = volumeData.map(item => ({
      timestamp: item.hour,
      volume: Number(item.volume) / 1e18, // Convert from wei to ETH
      mints: Number(item.mints)
    }));

    // Fill in missing hours with 0 volume
    const filledData: Array<{ timestamp: string; volume: number; mints: number }> = [];
    for (let i = 0; i < 24; i++) {
      const hourTimestamp = new Date(twentyFourHoursAgo.getTime() + i * 60 * 60 * 1000);
      const existingData = chartData.find(d =>
        new Date(d.timestamp).getHours() === hourTimestamp.getHours()
      );

      filledData.push({
        timestamp: hourTimestamp.toISOString(),
        volume: existingData?.volume || 0,
        mints: existingData?.mints || 0
      });
    }

    // Calculate volume change percentage
    const firstHalfVolume = filledData.slice(0, 12).reduce((sum, d) => sum + d.volume, 0);
    const secondHalfVolume = filledData.slice(12, 24).reduce((sum, d) => sum + d.volume, 0);
    const volumeChange = firstHalfVolume > 0
      ? ((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        launchpadId,
        period: '24h',
        chartData: filledData,
        summary: {
          totalVolume: filledData.reduce((sum, d) => sum + d.volume, 0),
          totalMints: filledData.reduce((sum, d) => sum + d.mints, 0),
          volumeChange: Math.round(volumeChange * 100) / 100,
          peakVolume: Math.max(...filledData.map(d => d.volume)),
          peakTime: filledData.find(d => d.volume === Math.max(...filledData.map(d => d.volume)))?.timestamp
        }
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chart data'
    }, { status: 500 });
  }
}
