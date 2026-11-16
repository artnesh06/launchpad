'use client';

import { useState, useCallback } from 'react';
import { adminApiClient } from '@/lib/admin-api-client';
import { displayError, displaySuccess } from '@/lib/admin-error-handler';
import type { SyncProgress, SyncResult, ApiResponse } from '@/types/admin';

export interface UseAdminSyncReturn {
  syncProgress: SyncProgress;
  syncLaunchpads: (chainId: number) => Promise<void>;
  syncSingleLaunchpad: (contractAddress: string, chainId: number) => Promise<void>;
}

/**
 * Hook to handle sync operations with progress tracking
 * Syncs launchpad data from blockchain to database
 * 
 * @returns Sync progress state and sync functions
 */
export function useAdminSync(): UseAdminSyncReturn {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'idle',
    progress: 0,
    total: 0,
    message: '',
  });

  const syncLaunchpads = useCallback(async (chainId: number) => {
    try {
      // Set syncing state
      setSyncProgress({
        status: 'syncing',
        progress: 0,
        total: 0,
        message: 'Fetching launchpads from blockchain...',
      });

      const response = await adminApiClient.post<ApiResponse<SyncResult>>(
        '/sync/launchpads',
        { chainId }
      );

      if (response.success && response.data) {
        const result = response.data;
        
        // Set success state
        setSyncProgress({
          status: 'success',
          progress: result.synced,
          total: result.synced + result.failed,
          message: `Successfully synced ${result.synced} launchpad${result.synced !== 1 ? 's' : ''}`,
        });

        displaySuccess(
          `Sync completed`,
          `${result.synced} launchpad${result.synced !== 1 ? 's' : ''} synced successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`
        );

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setSyncProgress({
            status: 'idle',
            progress: 0,
            total: 0,
            message: '',
          });
        }, 3000);
      } else {
        throw new Error(response.error || 'Failed to sync launchpads');
      }
    } catch (err) {
      // Set error state
      setSyncProgress({
        status: 'error',
        progress: 0,
        total: 0,
        message: err instanceof Error ? err.message : 'Sync failed',
      });

      displayError(err);

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSyncProgress({
          status: 'idle',
          progress: 0,
          total: 0,
          message: '',
        });
      }, 5000);
    }
  }, []);

  const syncSingleLaunchpad = useCallback(async (
    contractAddress: string,
    chainId: number
  ) => {
    try {
      // Set syncing state
      setSyncProgress({
        status: 'syncing',
        progress: 0,
        total: 1,
        message: 'Syncing launchpad...',
      });

      const response = await adminApiClient.post<ApiResponse<SyncResult>>(
        '/sync/launchpad',
        { contractAddress, chainId }
      );

      if (response.success && response.data) {
        const result = response.data;
        
        // Set success state
        setSyncProgress({
          status: 'success',
          progress: 1,
          total: 1,
          message: 'Launchpad synced successfully',
        });

        displaySuccess('Sync completed', 'Launchpad data updated successfully');

        // Reset to idle after 3 seconds
        setTimeout(() => {
          setSyncProgress({
            status: 'idle',
            progress: 0,
            total: 0,
            message: '',
          });
        }, 3000);
      } else {
        throw new Error(response.error || 'Failed to sync launchpad');
      }
    } catch (err) {
      // Set error state
      setSyncProgress({
        status: 'error',
        progress: 0,
        total: 1,
        message: err instanceof Error ? err.message : 'Sync failed',
      });

      displayError(err);

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSyncProgress({
          status: 'idle',
          progress: 0,
          total: 0,
          message: '',
        });
      }, 5000);
    }
  }, []);

  return {
    syncProgress,
    syncLaunchpads,
    syncSingleLaunchpad,
  };
}
