'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApiClient } from '@/lib/admin-api-client';
import { displayError } from '@/lib/admin-error-handler';
import type { FactoryInfo, ApiResponse } from '@/types/admin';

export interface UseAdminFactoryReturn {
  factoryInfo: FactoryInfo | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch factory information from the API
 * Fetches factory contract details including address, owner, treasury, and fees
 * 
 * @param chainId - The chain ID to fetch factory info for
 * @returns Factory info, loading state, error state, and refetch function
 */
export function useAdminFactory(chainId: number): UseAdminFactoryReturn {
  const [factoryInfo, setFactoryInfo] = useState<FactoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFactoryInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await adminApiClient.get<ApiResponse<any>>(
        '/factory-info',
        { chainId }
      );

      if (response.success && response.data) {
        const data = response.data;
        
        // Transform the API response to match FactoryInfo interface
        const factoryData: FactoryInfo = {
          id: data.databaseStats?.id || '',
          chainId: chainId,
          contractAddress: data.address || data.contractAddress || '',
          version: data.version || 'Unknown',
          owner: data.owner || '',
          treasury: data.platformFeeInfo?.treasury || data.treasury || '',
          creationFee: data.creationFeeAmount || data.creationFee || '0',
          platformFeePercentage: data.platformFeeInfo?.percentage || 0,
          freeMintFee: data.platformFeeInfo?.freeMintFee || '0',
          totalLaunchpads: data.databaseStats?.totalLaunchpads || data.totalCollections || 0,
          isActive: true,
          deployedAt: data.databaseStats?.deployedAt,
          createdAt: data.databaseStats?.createdAt || new Date(),
          updatedAt: data.databaseStats?.lastUpdated || new Date(),
        };

        setFactoryInfo(factoryData);
      } else {
        throw new Error(response.error || 'Failed to fetch factory information');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch factory information');
      setError(errorObj);
      displayError(err);
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    fetchFactoryInfo();
  }, [fetchFactoryInfo]);

  return {
    factoryInfo,
    isLoading,
    error,
    refetch: fetchFactoryInfo,
  };
}
