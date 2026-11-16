import { authorizeCreatorOrAdmin } from '@/lib/creator-auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contractAddress: string }> }
) {
  try {
    const { contractAddress: identifier } = await params;
    const denied = await authorizeCreatorOrAdmin(request, { action: 'launchpad:status', target: identifier });
    if (denied) return denied;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({
        success: false,
        error: 'Status is required'
      }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status. Must be one of: ACTIVE, PAUSED, COMPLETED, CANCELLED'
      }, { status: 400 });
    }

    // Check if identifier is a contract address (starts with 0x) or database ID (UUID)
    const isContractAddress = identifier.startsWith('0x');

    // Update launchpad status
    const updatedLaunchpad = await prisma.launchpad.updateMany({
      where: isContractAddress ? {
        contractAddress: {
          equals: identifier,
          mode: 'insensitive'
        }
      } : {
        id: identifier
      },
      data: { 
        status: status.toUpperCase(),
        updatedAt: new Date()
      }
    });

    if (updatedLaunchpad.count === 0) {
      return NextResponse.json({
        success: false,
        error: 'Launchpad not found'
      }, { status: 404 });
    }

    // Fetch the updated launchpad
    const launchpad = await prisma.launchpad.findFirst({
      where: isContractAddress ? {
        contractAddress: {
          equals: identifier,
          mode: 'insensitive'
        }
      } : {
        id: identifier
      },
      include: {
        metadata: true,
        analytics: true,
        phases: {
          orderBy: { phaseIndex: 'asc' } as any  // Order by phaseIndex to match smart contract
        },
        _count: {
          select: { mints: true }
        }
      }
    });

    if (!launchpad) {
      return NextResponse.json({
        success: false,
        error: 'Launchpad not found after update'
      }, { status: 404 });
    }

    // Process the response to match AdminLaunchpad type
    const processedLaunchpad = {
      ...launchpad,
      mintedCount: launchpad._count.mints,
      volume: launchpad.volume ? Number(launchpad.volume).toString() : '0',
      mintPrice: launchpad.phases?.[0]?.price 
        ? (parseFloat(launchpad.phases[0].price) / 1e18).toString()
        : '0',
      mintPercentage: launchpad.totalMaxSupply > 0
        ? (launchpad._count.mints / launchpad.totalMaxSupply) * 100
        : 0,
      isComplete: launchpad._count.mints >= launchpad.totalMaxSupply,
      daysSinceCreated: Math.floor((Date.now() - launchpad.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    };

    return NextResponse.json({
      success: true,
      data: processedLaunchpad
    });
  } catch (error) {
    console.error('Error updating launchpad status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to update launchpad status',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
