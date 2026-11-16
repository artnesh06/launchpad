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
    const { reason } = body;

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

    await prisma.promoRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason
      }
    });

    return NextResponse.json({
      success: true,
      data: promoRequest
    });
  } catch (error) {
    console.error('Failed to reject promo request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject promo request' },
      { status: 500 }
    );
  }
}
