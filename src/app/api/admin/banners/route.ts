import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey, clearAllCache } from '@/lib/hybrid-cache';

// GET - List all banners (admin)
// Cache TTL: 300s (5 minutes) - Static content that rarely changes
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    // Generate cache key for admin banners
    const cacheKey = getCacheKey('/api/admin/banners', {});
    
    // Wrap database query with cache
    return await cachedFetch(cacheKey, async () => {
      const banners = await prisma.banner.findMany({
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

      return NextResponse.json({
        success: true,
        data: banners
      });
    }, 300); // TTL: 300 seconds (5 minutes) for static content
  } catch (error) {
    console.error('Failed to fetch banners:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch banners' },
      { status: 500 }
    );
  }
}

// POST - Create banner
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const {
      title,
      creator,
      network,
      image,
      thumbnail,
      type,
      twitter,
      discord,
      telegram,
      collectionAddress,
      launchpadId,
      mintedDate,
      mintedLink,
      status,
      sequence,
      startDate,
      endDate,
      promoCode
    } = body;

    const banner = await prisma.banner.create({
      data: {
        title,
        creator,
        network: network || 'evm',
        image,
        thumbnail,
        type: type || 'IMAGE',
        twitter,
        discord,
        telegram,
        collectionAddress,
        launchpadId,
        mintedDate: mintedDate ? new Date(mintedDate) : null,
        mintedLink,
        status: status || 'ACTIVE',
        sequence: sequence || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        promoCode
      }
    });

    // Invalidate banner cache after successful creation
    try {
      await clearAllCache('/api/banners*');
      await clearAllCache('/api/admin/banners*');
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      // Don't fail the mutation if cache invalidation fails
    }

    return NextResponse.json({
      success: true,
      data: banner
    });
  } catch (error) {
    console.error('Failed to create banner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create banner' },
      { status: 500 }
    );
  }
}
