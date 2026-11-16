import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearAllCache } from '@/lib/hybrid-cache';

// PATCH - Update banner
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = await params;
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
      mintedDate,
      mintedLink,
      status,
      sequence,
      startDate,
      endDate
    } = body;

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(creator && { creator }),
        ...(network && { network }),
        ...(image && { image }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(type && { type }),
        ...(twitter !== undefined && { twitter }),
        ...(discord !== undefined && { discord }),
        ...(telegram !== undefined && { telegram }),
        ...(collectionAddress !== undefined && { collectionAddress }),
        ...(mintedDate !== undefined && { mintedDate: mintedDate ? new Date(mintedDate) : null }),
        ...(mintedLink !== undefined && { mintedLink }),
        ...(status && { status }),
        ...(sequence !== undefined && { sequence }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null })
      }
    });

    // Invalidate banner cache after successful update
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
    console.error('Failed to update banner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update banner' },
      { status: 500 }
    );
  }
}

// DELETE - Delete banner
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = await params;
    await prisma.banner.delete({
      where: { id }
    });

    // Invalidate banner cache after successful deletion
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
    console.error('Failed to delete banner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete banner' },
      { status: 500 }
    );
  }
}
