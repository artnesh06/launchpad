import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { BlockchainService } from '@/lib/blockchain/blockchain-service';
import { prisma } from '@/lib/prisma';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

const contractService = new BlockchainService();

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '6343');

    // Generate cache key including chainId
    const cacheKey = getCacheKey('/api/admin/factory-info', {
      chainId: chainId.toString(),
    });

    // Wrap factory info query with cache (60 seconds TTL for factory data)
    return await cachedFetch(cacheKey, async () => {

    // Get factory info from contract
    const factoryInfo = await contractService.getFactoryInfo(chainId);
    const platformFeeInfo = await contractService.getPlatformFeeInfo(chainId);

    // Get additional data from database
    const factory = await prisma.launchpadFactory.findFirst({
      where: { chainId },
      include: {
        _count: {
          select: { launchpads: true }
        }
      }
    });

    const response = {
      ...factoryInfo,
      platformFeeInfo,
      databaseStats: {
        totalLaunchpads: factory?._count.launchpads || 0,
        lastUpdated: factory?.updatedAt
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });
    }, 60); // 60 seconds TTL for factory info
  } catch (error) {
    console.error('Error fetching factory info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch factory information'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { action, chainId, ...params } = body;

    if (!chainId) {
      return NextResponse.json({
        success: false,
        error: 'Chain ID is required'
      }, { status: 400 });
    }

    let result;
    
    switch (action) {
      case 'sync':
        // Force sync factory data from blockchain
        result = await contractService.getFactoryInfo(chainId);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in factory info POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}