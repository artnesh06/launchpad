import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';
import { BlockchainService } from '@/lib/blockchain/blockchain-service';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

const contractService = new BlockchainService();

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get('chainId') || '6343');

    // Generate cache key including chainId
    const cacheKey = getCacheKey('/api/admin/factory-details', {
      chainId: chainId.toString(),
    });

    // Wrap factory details query with cache (60 seconds TTL for factory data)
    return await cachedFetch(cacheKey, async () => {

    // Get individual function details that we might have missed
    const [
      deployedChainId,
      factoryVersion,
      owner,
      platformFeePercentage,
      platformTreasury,
      freeMintPlatformFee,
      totalLaunchpads,
      creationFee
    ] = await Promise.all([
      contractService.getDeployedChainId(chainId),
      contractService.getFactoryVersion(chainId),
      contractService.getOwner(chainId),
      contractService.getPlatformFeePercentage(chainId),
      contractService.getPlatformTreasury(chainId),
      contractService.getFreeMintPlatformFee(chainId),
      contractService.getTotalLaunchpads(chainId),
      contractService.getCreationFee(chainId)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        chainId,
        deployedChainId,
        factoryVersion,
        owner,
        platformFeePercentage,
        platformTreasury,
        freeMintPlatformFee,
        totalLaunchpads,
        creationFee
      }
    });
    }, 60); // 60 seconds TTL for factory details
  } catch (error) {
    console.error('Error fetching factory details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch factory details'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { action, chainId, index, launchpadAddress } = body;

    let result;

    switch (action) {
      case 'get_launchpad_by_index':
        if (typeof index !== 'number') {
          return NextResponse.json({
            success: false,
            error: 'Index is required and must be a number'
          }, { status: 400 });
        }
        result = await contractService.getLaunchpadByIndex(chainId, index);
        break;

      case 'get_launchpad_mapping':
        if (!launchpadAddress) {
          return NextResponse.json({
            success: false,
            error: 'Launchpad address is required'
          }, { status: 400 });
        }
        result = await contractService.getLaunchpadMapping(chainId, launchpadAddress);
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
    console.error('Error in factory details POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}