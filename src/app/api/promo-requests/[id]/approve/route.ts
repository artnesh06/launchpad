import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { id } = await params;
    const body = await request.json();
    const { startDate, endDate, sequence } = body;

    // Get promo request
    const promoRequest = await prisma.promoRequest.findUnique({
      where: { id }
    });

    if (!promoRequest) {
      return NextResponse.json(
        { success: false, error: 'Promo request not found' },
        { status: 404 }
      );
    }

    if (promoRequest.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Promo request already processed' },
        { status: 400 }
      );
    }

    // Create banner from promo request
    const banner = await prisma.banner.create({
      data: {
        title: promoRequest.collectionName,
        creator: promoRequest.creator,
        network: promoRequest.chainName,
        image: promoRequest.image || '',
        thumbnail: promoRequest.thumbnail || promoRequest.image,
        type: 'IMAGE',
        twitter: promoRequest.twitter,
        discord: promoRequest.discord,
        telegram: promoRequest.telegram,
        collectionAddress: promoRequest.collectionAddress,
        promoCode: promoRequest.promoCode,
        status: startDate && new Date(startDate) > new Date() ? 'SCHEDULED' : 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        sequence: sequence || 0
      }
    });

    // Update promo request status
    await prisma.promoRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        bannerId: banner.id
      }
    });

    return NextResponse.json({
      success: true,
      data: { promoRequest, banner }
    });
  } catch (error) {
    console.error('Failed to approve promo request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve promo request' },
      { status: 500 }
    );
  }
}
