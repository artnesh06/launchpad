import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';
import { resolveImagePath } from '@/lib/ipfs-utils';
import { formatRelativeTime, truncateAddress } from '@/utils/activity-helpers';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

// Type definitions for the API response
interface FormattedActivity {
  id: string;
  type: 'mint' | 'collection' | 'burn' | 'airdrop' | 'phase' | 'reveal' | 'admin' | 'metadata' | 'security';
  name: string;
  action: string;
  time: string;
  avatar: string;
  chainId: number;
  chainName: string;
  chainIcon?: string;
  txHash?: string;
  isFirst?: boolean;
  contractAddress?: string;
  tokenId?: string;
}

interface ActivityResponse {
  success: boolean;
  data: {
    activities: FormattedActivity[];
  };
  error?: string;
}

// Helper function to map ActivityType to frontend type
function mapActivityType(type: ActivityType): FormattedActivity['type'] | null {
  switch (type) {
    case 'MINT_OCCURRED':
      return 'mint';
    case 'LAUNCHPAD_CREATED':
      return 'collection';
    case 'BURN_OCCURRED':
      return 'burn';
    case 'AIRDROP_OCCURRED':
      return 'airdrop';
    case 'PHASE_CREATED':
    case 'PHASE_UPDATED':
      return 'phase';
    case 'COLLECTION_REVEALED':
      return 'reveal';
    case 'TREASURY_UPDATED':
    case 'EMERGENCY_WITHDRAW':
    case 'OWNERSHIP_TRANSFERRED':
    case 'FEE_UPDATED':
    case 'ROYALTY_UPDATED':
      return 'admin';
    case 'METADATA_UPDATED':
      return 'metadata';
    case 'CONTRACT_PAUSED':
    case 'CONTRACT_UNPAUSED':
    case 'TRANSFER_LOCK_UPDATED':
    case 'ROLE_GRANTED':
    case 'ROLE_REVOKED':
      return 'security';
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const typeParam = searchParams.get('type') || 'all';
    const chainParam = searchParams.get('chain') || 'all';
    const limitParam = searchParams.get('limit') || '3';

    // Generate cache key
    const cacheKey = getCacheKey('/api/activity/recent', {
      type: typeParam,
      chain: chainParam,
      limit: limitParam
    });

    // Return cached response if available (2 seconds TTL for activity feed)
    return await cachedFetch(cacheKey, async () => {

    // Validate type parameter
    const validTypes = ['mint', 'collection', 'burn', 'airdrop', 'phase', 'reveal', 'admin', 'metadata', 'security', 'all'];
    if (!validTypes.includes(typeParam)) {
      console.warn(`Invalid type parameter: ${typeParam}`);
      return NextResponse.json<ActivityResponse>(
        {
          success: false,
          data: { activities: [] },
          error: `Invalid type parameter. Must be one of: ${validTypes.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate and parse limit parameter
    const limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit < 1 || limit > 10) {
      console.warn(`Invalid limit parameter: ${limitParam}`);
      return NextResponse.json<ActivityResponse>(
        {
          success: false,
          data: { activities: [] },
          error: 'Invalid limit parameter. Must be between 1 and 10'
        },
        { status: 400 }
      );
    }

    // Parse chain parameter
    let chainId: number | null = null;
    if (chainParam !== 'all') {
      chainId = parseInt(chainParam, 10);
      if (isNaN(chainId)) {
        console.warn(`Invalid chain parameter: ${chainParam}`);
        return NextResponse.json<ActivityResponse>(
          {
            success: false,
            data: { activities: [] },
            error: 'Invalid chain parameter. Must be a number or "all"'
          },
          { status: 400 }
        );
      }

      // Validate that the chain exists with timeout
      try {
        const chainExists = await Promise.race([
          prisma.chain.findUnique({ where: { chainId } }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), 5000)
          )
        ]);

        if (!chainExists) {
          console.warn(`Chain not found: ${chainId}`);
          return NextResponse.json<ActivityResponse>(
            {
              success: false,
              data: { activities: [] },
              error: `Chain with ID ${chainId} not found`
            },
            { status: 404 }
          );
        }
      } catch (dbError) {
        console.error('Database error validating chain:', dbError);
        return NextResponse.json<ActivityResponse>(
          {
            success: false,
            data: { activities: [] },
            error: 'Database error validating chain'
          },
          { status: 503 }
        );
      }
    }

    // Build Prisma where clause
    const whereClause: any = {};

    // Filter by activity type
    if (typeParam === 'mint') {
      whereClause.type = 'MINT_OCCURRED';
    } else if (typeParam === 'collection') {
      whereClause.type = 'LAUNCHPAD_CREATED';
    } else if (typeParam === 'burn') {
      whereClause.type = 'BURN_OCCURRED';
    } else if (typeParam === 'airdrop') {
      whereClause.type = 'AIRDROP_OCCURRED';
    } else if (typeParam === 'phase') {
      whereClause.type = { in: ['PHASE_CREATED', 'PHASE_UPDATED'] };
    } else if (typeParam === 'reveal') {
      whereClause.type = 'COLLECTION_REVEALED';
    } else if (typeParam === 'admin') {
      whereClause.type = {
        in: ['TREASURY_UPDATED', 'EMERGENCY_WITHDRAW', 'OWNERSHIP_TRANSFERRED', 'FEE_UPDATED', 'ROYALTY_UPDATED']
      };
    } else if (typeParam === 'metadata') {
      whereClause.type = 'METADATA_UPDATED';
    } else if (typeParam === 'security') {
      whereClause.type = {
        in: ['CONTRACT_PAUSED', 'CONTRACT_UNPAUSED', 'TRANSFER_LOCK_UPDATED', 'ROLE_GRANTED', 'ROLE_REVOKED']
      };
    } else {
      // For 'all', include all types
      whereClause.type = {
        in: [
          'MINT_OCCURRED',
          'LAUNCHPAD_CREATED',
          'BURN_OCCURRED',
          'AIRDROP_OCCURRED',
          'PHASE_CREATED',
          'PHASE_UPDATED',
          'COLLECTION_REVEALED',
          'TREASURY_UPDATED',
          'EMERGENCY_WITHDRAW',
          'OWNERSHIP_TRANSFERRED',
          'FEE_UPDATED',
          'ROYALTY_UPDATED',
          'METADATA_UPDATED',
          'CONTRACT_PAUSED',
          'CONTRACT_UNPAUSED',
          'TRANSFER_LOCK_UPDATED',
          'ROLE_GRANTED',
          'ROLE_REVOKED'
        ]
      };
    }

    // Filter by chain
    if (chainId !== null) {
      whereClause.chainId = chainId;
    }

    // Exclude activities from cancelled collections
    // Get IDs of cancelled launchpads to exclude
    const cancelledLaunchpads = await prisma.launchpad.findMany({
      where: {
        status: 'CANCELLED',
        ...(chainId !== null && { chainId })
      },
      select: { id: true }
    });

    const cancelledIds = cancelledLaunchpads.map(lp => lp.id);
    
    if (cancelledIds.length > 0) {
      whereClause.launchpadId = {
        notIn: cancelledIds
      };
    }

    // Query activities from database with timeout
    let activities;
    try {
      activities = await Promise.race([
        prisma.activity.findMany({
          where: whereClause,
          include: {
            chain: true,
            factory: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]) as any[];
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json<ActivityResponse>(
        {
          success: false,
          data: { activities: [] },
          error: 'Database query failed'
        },
        { status: 503 }
      );
    }

    // Transform activities to FormattedActivity format
    const formattedActivities: FormattedActivity[] = activities.map((activity, index) => {
      const activityType = mapActivityType(activity.type);
      
      // Extract metadata
      const metadata = activity.metadata as any || {};
      
      // Get contract address from metadata
      let contractAddress = metadata.contractAddress || '';
      
      // Determine name and action based on activity type
      let name = '';
      let action = '';
      let avatar = '';

      if (activityType === 'mint') {
        name = metadata.collectionName || 'Unknown NFT';
        const minterShort = metadata.minterShort || truncateAddress(activity.actor);
        action = `Minted by ${minterShort}`;
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-nft.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      } else if (activityType === 'collection') {
        name = metadata.collectionName || 'Unknown Collection';
        const creatorShort = metadata.creatorShort || truncateAddress(activity.actor);
        action = `Created by ${creatorShort}`;
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-collection.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      } else if (activityType === 'burn') {
        name = metadata.collectionName || 'Unknown NFT';
        const ownerShort = metadata.ownerShort || truncateAddress(activity.actor);
        action = `Token #${metadata.tokenId || '?'} burned by ${ownerShort}`;
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-nft.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      } else if (activityType === 'airdrop') {
        name = metadata.collectionName || 'Unknown Collection';
        const operatorShort = metadata.operatorShort || truncateAddress(activity.actor);
        action = `Airdropped ${metadata.totalQuantity || '?'} to ${metadata.recipientCount || '?'} recipients by ${operatorShort}`;
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-collection.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      } else if (activityType === 'phase') {
        name = metadata.collectionName || 'Unknown Collection';
        const phaseName = metadata.phaseName || 'Phase';
        if (activity.type === 'PHASE_CREATED') {
          action = `Phase "${phaseName}" created`;
        } else {
          action = `Phase "${phaseName}" updated`;
        }
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-collection.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      } else if (activityType === 'reveal') {
        name = metadata.collectionName || 'Unknown Collection';
        action = 'Collection revealed';
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-collection.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      } else if (activityType === 'admin') {
        name = metadata.collectionName || 'Unknown Collection';
        if (activity.type === 'TREASURY_UPDATED') {
          const newTreasuryShort = metadata.newTreasuryShort || truncateAddress(metadata.newTreasury || '');
          action = `Treasury updated to ${newTreasuryShort}`;
        } else if (activity.type === 'EMERGENCY_WITHDRAW') {
          const recipientShort = metadata.recipientShort || truncateAddress(metadata.recipient || '');
          const amount = metadata.amountInEth || '0 ETH';
          action = `Withdrawn ${amount} to ${recipientShort}`;
        } else if (activity.type === 'OWNERSHIP_TRANSFERRED') {
          const newOwnerShort = metadata.newOwnerShort || truncateAddress(metadata.newOwner || '');
          action = `Ownership transferred to ${newOwnerShort}`;
        } else if (activity.type === 'FEE_UPDATED') {
          if (metadata.enabled !== undefined) {
            action = `Platform fee ${metadata.enabled ? 'enabled' : 'disabled'}`;
          } else if (metadata.newFeeInEth) {
            action = `Platform fee updated to ${metadata.newFeeInEth}`;
          } else {
            action = 'Fee updated';
          }
        } else if (activity.type === 'ROYALTY_UPDATED') {
          const recipientShort = metadata.recipientShort || truncateAddress(metadata.recipient || '');
          action = `Royalty updated: ${metadata.percentage || '?'}% to ${recipientShort}`;
        } else {
          action = 'Admin action';
        }
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-collection.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      } else if (activityType === 'metadata') {
        name = metadata.collectionName || 'Unknown Collection';
        const updateType = metadata.updateType || 'metadata';
        action = `${updateType} updated`;
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-collection.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      } else if (activityType === 'security') {
        name = metadata.collectionName || 'Unknown Collection';
        if (activity.type === 'CONTRACT_PAUSED') {
          action = 'Contract paused';
        } else if (activity.type === 'CONTRACT_UNPAUSED') {
          action = 'Contract unpaused';
        } else if (activity.type === 'TRANSFER_LOCK_UPDATED') {
          action = metadata.locked ? 'Transfers locked' : 'Transfers unlocked';
        } else if (activity.type === 'ROLE_GRANTED') {
          const accountShort = metadata.accountShort || truncateAddress(metadata.account || '');
          action = `Role granted to ${accountShort}`;
        } else if (activity.type === 'ROLE_REVOKED') {
          const accountShort = metadata.accountShort || truncateAddress(metadata.account || '');
          action = `Role revoked from ${accountShort}`;
        } else {
          action = 'Security action';
        }
        // Resolve image path for relative paths
        const rawImage = metadata.collectionImage || '/images/default-collection.png';
        avatar = resolveImagePath(rawImage, metadata.baseUri) || rawImage;
      }

      return {
        id: activity.id,
        type: activityType || 'mint',
        name,
        action,
        time: formatRelativeTime(activity.createdAt),
        avatar,
        chainId: activity.chainId,
        chainName: activity.chain.name,
        chainIcon: activity.chain.icon || undefined,
        txHash: activity.txHash || undefined,
        isFirst: index === 0,
        contractAddress: contractAddress || undefined,
        tokenId: metadata.tokenId?.toString() || undefined
      };
    });

    return NextResponse.json<ActivityResponse>({
      success: true,
      data: {
        activities: formattedActivities
      }
    });
    }, 1); // Cache for 1 second (real-time data)

  } catch (error) {
    console.error('Activity feed API error:', error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Categorize errors
      if (error.message.includes('timeout')) {
        statusCode = 504; // Gateway Timeout
        errorMessage = 'Request timeout';
      } else if (error.message.includes('not found')) {
        statusCode = 404; // Not Found
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        statusCode = 400; // Bad Request
      } else if (error.message.includes('database') || error.message.includes('connection')) {
        statusCode = 503; // Service Unavailable
      }
    }
    
    return NextResponse.json<ActivityResponse>(
      {
        success: false,
        data: { activities: [] },
        error: errorMessage
      },
      { status: statusCode }
    );
  }
}
