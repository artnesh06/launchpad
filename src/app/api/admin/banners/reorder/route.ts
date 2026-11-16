import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { clearAllCache } from '@/lib/hybrid-cache';

// POST - Reorder banners
export async function POST(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { banners } = await request.json();

    if (!Array.isArray(banners)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid banners array' 
        },
        { status: 400 }
      );
    }

    // Update all banner sequences in a transaction
    await prisma.$transaction(
      banners.map(({ id, sequence }) =>
        prisma.banner.update({
          where: { id },
          data: { sequence }
        })
      )
    );

    // Invalidate banner cache after successful reordering
    try {
      await clearAllCache('/api/banners*');
      await clearAllCache('/api/admin/banners*');
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      // Don't fail the mutation if cache invalidation fails
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Reorder banners error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reorder banners' 
      },
      { status: 500 }
    );
  }
}
