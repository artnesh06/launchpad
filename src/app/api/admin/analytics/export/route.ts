import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to convert data to CSV
function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'launchpads', 'analytics', 'mints'
    const chainId = searchParams.get('chainId');

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Export type is required',
        },
        { status: 400 }
      );
    }

    const where: any = {};
    if (chainId) {
      where.chainId = parseInt(chainId);
    }
    // Exclude cancelled collections from exports
    where.status = {
      not: 'CANCELLED'
    };

    let csvData = '';
    let filename = '';

    switch (type) {
      case 'launchpads': {
        const launchpads = await prisma.launchpad.findMany({
          where,
          select: {
            contractAddress: true,
            name: true,
            symbol: true,
            creator: true,
            chainId: true,
            status: true,
            totalMaxSupply: true,
            mintedCount: true,
            volume: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        const formattedData = launchpads.map(lp => ({
          contractAddress: lp.contractAddress,
          name: lp.name,
          symbol: lp.symbol,
          creator: lp.creator,
          chainId: lp.chainId,
          status: lp.status,
          totalMaxSupply: lp.totalMaxSupply,
          mintedCount: lp.mintedCount,
          volume: (Number(lp.volume) / 1e18).toFixed(4),
          createdAt: lp.createdAt.toISOString(),
        }));

        csvData = convertToCSV(formattedData, [
          'contractAddress',
          'name',
          'symbol',
          'creator',
          'chainId',
          'status',
          'totalMaxSupply',
          'mintedCount',
          'volume',
          'createdAt',
        ]);
        filename = `launchpads-${Date.now()}.csv`;
        break;
      }

      case 'analytics': {
        const days = parseInt(searchParams.get('days') || '30');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

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
            minter: true,
            txHash: true,
            launchpad: {
              select: {
                name: true,
                contractAddress: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        const formattedData = mints.map(mint => ({
          date: mint.createdAt.toISOString().split('T')[0],
          collection: mint.launchpad.name,
          contractAddress: mint.launchpad.contractAddress,
          minter: mint.minter,
          quantity: mint.quantity,
          price: (Number(mint.price) / 1e18).toFixed(4),
          volume: (Number(mint.price) * mint.quantity / 1e18).toFixed(4),
          txHash: mint.txHash,
        }));

        csvData = convertToCSV(formattedData, [
          'date',
          'collection',
          'contractAddress',
          'minter',
          'quantity',
          'price',
          'volume',
          'txHash',
        ]);
        filename = `analytics-${Date.now()}.csv`;
        break;
      }

      case 'top-collections': {
        const topCollections = await prisma.launchpad.findMany({
          where,
          select: {
            name: true,
            contractAddress: true,
            creator: true,
            volume: true,
            mintedCount: true,
            chainId: true,
          },
          orderBy: {
            volume: 'desc',
          },
          take: 100,
        });

        const formattedData = topCollections.map(collection => ({
          name: collection.name,
          contractAddress: collection.contractAddress,
          creator: collection.creator,
          volume: (Number(collection.volume) / 1e18).toFixed(4),
          mints: collection.mintedCount,
          chainId: collection.chainId,
        }));

        csvData = convertToCSV(formattedData, [
          'name',
          'contractAddress',
          'creator',
          'volume',
          'mints',
          'chainId',
        ]);
        filename = `top-collections-${Date.now()}.csv`;
        break;
      }

      case 'top-creators': {
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

        const sortedCreators = topCreatorsWithVolume
          .sort((a, b) => parseFloat(b.totalVolume) - parseFloat(a.totalVolume))
          .slice(0, 100);

        csvData = convertToCSV(sortedCreators, [
          'address',
          'totalVolume',
          'totalCollections',
          'totalMints',
        ]);
        filename = `top-creators-${Date.now()}.csv`;
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid export type',
          },
          { status: 400 }
        );
    }

    // Return CSV file
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
