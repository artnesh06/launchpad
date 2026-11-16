import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

// GET - List active banners (public endpoint)
// Cache TTL: 300s (5 minutes) - Static content that rarely changes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ACTIVE';
    
    // Generate cache key with status parameter
    const cacheKey = getCacheKey('/api/banners', { status });
    
    // Wrap database query with cache
    return await cachedFetch(cacheKey, async () => {
      const now = new Date();

    // Build where clause with date filtering
    const where: any = {};
    
    if (status === 'ACTIVE') {
      where.OR = [
        {
          status: 'ACTIVE',
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: now }, endDate: null },
            { startDate: null, endDate: { gte: now } },
            { startDate: { lte: now }, endDate: { gte: now } }
          ]
        },
        {
          status: 'SCHEDULED',
          startDate: { lte: now },
          OR: [
            { endDate: null },
            { endDate: { gte: now } }
          ]
        }
      ];
    } else {
      where.status = status as any;
    }

    const banners = await prisma.banner.findMany({
      where,
      include: {
        launchpad: {
          select: {
            id: true,
            name: true,
            contractAddress: true,
            totalMaxSupply: true,
            mintedCount: true,
            status: true
          }
        }
      },
      orderBy: { sequence: 'asc' }
    });

    // Map database fields to frontend expected format
    const mappedBanners = banners.map((banner) => ({
      id: banner.id,
      banner_id: banner.sequence || 0,
      banner_title: banner.title,
      banner_creator: banner.creator,
      banner_network: banner.network,
      banner_image: banner.image,
      banner_thumbnail: banner.thumbnail || banner.image,
      banner_type: banner.type === 'VIDEO' ? 'V' : 'I',
      banner_twiter: banner.twitter || '',
      banner_discord: banner.discord || '',
      banner_telegram: banner.telegram || '',
      banner_collection_address: banner.collectionAddress || '',
      banner_minted_date: banner.mintedDate?.toISOString() || null,
      banner_minted_link: banner.mintedLink || '',
      banner_status: banner.status,
      banner_seqn: banner.sequence || 0,
      launchpad: banner.launchpad ? {
        collectionAddress: banner.launchpad.contractAddress,
        name: banner.launchpad.name,
        totalMaxSupply: banner.launchpad.totalMaxSupply,
        mintedCount: banner.launchpad.mintedCount,
        status: banner.launchpad.status
      } : undefined
    }));

      return NextResponse.json({
        success: true,
        data: mappedBanners
      });
    }, 300); // TTL: 300 seconds (5 minutes) for static content
  } catch (error) {
    console.error('Failed to fetch banners:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch banners' 
      },
      { status: 500 }
    );
  }
}
