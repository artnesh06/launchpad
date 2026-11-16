/**
 * NFT Owner API Route
 * 
 * Get NFTs owned by a wallet address using Alchemy
 * GET /api/nft/owner?address=0x...&pageSize=10&pageKey=...&chainId=1
 * 
 * Cache: 5 seconds TTL (user-specific data, needs freshness)
 */

import { NextRequest } from 'next/server';
import {
  createAlchemyService,
  parseIntSafe,
  successResponse,
  errorResponse,
  handleApiError,
} from '@/lib/alchemy-api-helpers';
import { cachedFetch, getCacheKey } from '@/lib/hybrid-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const pageSize = parseIntSafe(searchParams.get('pageSize'), 20);
    const pageKey = searchParams.get('pageKey') || undefined;
    const contractAddresses = searchParams.get('contractAddresses')?.split(',');
    const chainId = searchParams.get('chainId') || undefined;

    // Validate required params
    if (!address) {
      return errorResponse('Wallet address is required', undefined, 400);
    }

    // Generate cache key with wallet address and query parameters
    const cacheKey = getCacheKey('/api/nft/owner', {
      address,
      pageSize: pageSize.toString(),
      pageKey,
      contractAddresses: contractAddresses?.join(','),
      chainId
    });

    // Wrap Alchemy API call with cache (5 seconds TTL for user-specific data)
    return await cachedFetch(cacheKey, async () => {
      // Initialize Alchemy service with chain support
      const alchemyService = createAlchemyService(chainId);

      // Get NFTs for owner - return raw Alchemy response
      const result = await alchemyService.getNFTsForOwner(address, {
        pageSize,
        pageKey,
        contractAddresses,
        withMetadata: true,
      });

      // Return raw Alchemy response
      return successResponse(result);
    }, 5); // 5 seconds TTL for user-specific data
  } catch (error) {
    return handleApiError(error, 'Fetch NFTs for owner');
  }
}
