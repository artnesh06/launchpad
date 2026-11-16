import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - List promo requests (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status: status as any } : {};

    const promoRequests = await prisma.promoRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: promoRequests
    });
  } catch (error) {
    console.error('Failed to fetch promo requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promo requests' },
      { status: 500 }
    );
  }
}

// POST - Create promo request (creator)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      promoCode,
      collectionName,
      collectionAddress,
      creator,
      chainId,
      chainName,
      image,
      thumbnail,
      twitter,
      discord,
      telegram,
      description
    } = body;

    // Validate required fields
    if (!promoCode || !collectionName || !creator || !chainId || !chainName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if promo code already exists
    const existing = await prisma.promoRequest.findUnique({
      where: { promoCode }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Promo code already exists' },
        { status: 400 }
      );
    }

    const promoRequest = await prisma.promoRequest.create({
      data: {
        promoCode,
        collectionName,
        collectionAddress,
        creator,
        chainId,
        chainName,
        image,
        thumbnail,
        twitter,
        discord,
        telegram,
        description
      }
    });

    return NextResponse.json({
      success: true,
      data: promoRequest
    });
  } catch (error) {
    console.error('Failed to create promo request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create promo request' },
      { status: 500 }
    );
  }
}
