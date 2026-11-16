import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '6343');
    const format = searchParams.get('format') || 'csv';

    const launchpads = await prisma.launchpad.findMany({
      where: { chainId },
      include: {
        metadata: true,
        analytics: true,
        _count: { select: { mints: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Name',
        'Symbol', 
        'Contract Address',
        'Creator',
        'Total Supply',
        'Minted Count',
        'Volume (ETH)',
        'Status',
        'Created At',
        'Website',
        'Twitter',
        'Featured',
        'Verified'
      ];

      const csvRows = launchpads.map(lp => [
        lp.name,
        lp.symbol,
        lp.contractAddress,
        lp.creator,
        lp.totalMaxSupply.toString(),
        lp._count.mints.toString(),
        lp.analytics?.totalVolume?.toString() || '0',
        lp.status,
        lp.createdAt.toISOString(),
        lp.metadata?.website || '',
        lp.metadata?.twitter || '',
        lp.metadata?.featured ? 'Yes' : 'No',
        lp.metadata?.verified ? 'Yes' : 'No'
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
          'Content-Disposition': `attachment; filename="launchpads-${chainId}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    if (format === 'json') {
      const jsonData = {
        exportedAt: new Date().toISOString(),
        chainId,
        totalCount: launchpads.length,
        launchpads: launchpads.map(lp => ({
          id: lp.id,
          name: lp.name,
          symbol: lp.symbol,
          contractAddress: lp.contractAddress,
          creator: lp.creator,
          description: lp.description,
          totalMaxSupply: lp.totalMaxSupply,
          mintedCount: lp._count.mints,
          volume: lp.analytics?.totalVolume?.toString() || '0',
          status: lp.status,
          createdAt: lp.createdAt.toISOString(),
          metadata: {
            website: lp.metadata?.website,
            twitter: lp.metadata?.twitter,
            discord: lp.metadata?.discord,
            featured: lp.metadata?.featured,
            verified: lp.metadata?.verified
          },
          analytics: {
            totalVolume: lp.analytics?.totalVolume?.toString() || '0',
            totalMints: lp.analytics?.totalMints || 0,
            uniqueHolders: lp.analytics?.uniqueHolders || 0,
            views: lp.analytics?.views || 0,
            likes: lp.analytics?.likes || 0
          }
        }))
      };

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="launchpads-${chainId}-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unsupported format. Use csv or json.'
    }, { status: 400 });

  } catch (error) {
    console.error('Error exporting launchpads:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export launchpads'
    }, { status: 500 });
  }
}