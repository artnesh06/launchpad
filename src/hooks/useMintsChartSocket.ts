/**
 * useMintsChartSocket Hook
 * 
 * Optimized hook untuk real-time mints chart updates
 * Menggunakan batching untuk aggregate multiple mint events
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';
import { websocketConfig } from '@/config/websocket';
import { useBatch } from './useWebSocketOptimization';
import { getBatchConfig, debugLog } from '@/config/websocket-optimization';
import type { MintEventData } from '@/types/websocket';

interface MintsChartData {
  timestamp: number;
  count: number;
}

interface UseMintsChartSocketOptions {
  chainFilter?: number | 'all';
  enabled?: boolean;
  batchSize?: number;
  batchInterval?: number;
}

interface UseMintsChartSocketReturn {
  chartData: MintsChartData[];
  totalMintsInPeriod: number;
  isConnected: boolean;
  error: Error | null;
}

/**
 * Hook untuk real-time mints chart dengan batching optimization
 */
export function useMintsChartSocket(
  options: UseMintsChartSocketOptions = {}
): UseMintsChartSocketReturn {
  const {
    chainFilter = 'all',
    enabled = true,
  } = options;

  // Get batch config dari centralized config
  const batchConfig = getBatchConfig('mintsChart');
  const { maxBatchSize = batchConfig.maxBatchSize, maxWaitTime = batchConfig.maxWaitTime } = options;

  const { lastMessage, isConnected, joinRoom, leaveRoom } = useWebSocketConnection();

  // State
  const [chartData, setChartData] = useState<MintsChartData[]>([]);
  const [totalMintsInPeriod, setTotalMintsInPeriod] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Track current room
  const currentRoomRef = useRef<string | null>(null);
  
  debugLog('useMintsChartSocket', `Using batch config: size=${maxBatchSize}, wait=${maxWaitTime}ms`);

  /**
   * Process batch of mint events
   */
  const processMintBatch = useCallback((batch: MintEventData[]) => {
    if (batch.length === 0) return;

    console.log('[useMintsChartSocket] Processing batch of', batch.length, 'mint events');

    // Aggregate total quantity
    const totalQuantity = batch.reduce((sum, mint) => sum + mint.quantity, 0);

    // Update chart data
    const now = Date.now();
    setChartData(prev => {
      const newData = [...prev, {
        timestamp: now,
        count: totalQuantity,
      }];

      // Keep only last 100 data points
      return newData.slice(-100);
    });

    // Update total
    setTotalMintsInPeriod(prev => prev + totalQuantity);
  }, []);

  // Setup batch processor
  const { addToBatch } = useBatch<MintEventData>({
    maxBatchSize: maxBatchSize,
    maxWaitTime: maxWaitTime,
    processor: processMintBatch,
  });

  /**
   * Get room name based on chain filter
   */
  const getRoomName = useCallback(() => {
    if (chainFilter === 'all') {
      return websocketConfig.rooms.homepage();
    }
    return websocketConfig.rooms.homepage(chainFilter);
  }, [chainFilter]);

  /**
   * Join/leave room based on connection status
   */
  useEffect(() => {
    if (!enabled || !isConnected) {
      return;
    }

    const roomName = getRoomName();

    // Leave previous room if different
    if (currentRoomRef.current && currentRoomRef.current !== roomName) {
      console.log('[useMintsChartSocket] Leaving previous room:', currentRoomRef.current);
      leaveRoom(currentRoomRef.current);
    }

    // Join new room
    console.log('[useMintsChartSocket] Joining room:', roomName);
    joinRoom(roomName);
    currentRoomRef.current = roomName;

    // Cleanup
    return () => {
      if (currentRoomRef.current) {
        console.log('[useMintsChartSocket] Leaving room:', currentRoomRef.current);
        leaveRoom(currentRoomRef.current);
        currentRoomRef.current = null;
      }
    };
  }, [enabled, isConnected, getRoomName, joinRoom, leaveRoom]);

  /**
   * Handle incoming WebSocket messages
   */
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const { event, data } = lastMessage;

      // Only process mint events
      if (event !== websocketConfig.events.mint && event !== websocketConfig.events.batchMint) {
        return;
      }

      // Filter by chain if needed
      if (chainFilter !== 'all' && data.chainId !== chainFilter) {
        return;
      }

      // Add to batch for processing
      if (event === websocketConfig.events.mint) {
        addToBatch(data);
      } else if (event === websocketConfig.events.batchMint) {
        // Convert batch mint to regular mint format
        addToBatch({
          ...data,
          tokenId: data.tokenIds[0],
          quantity: data.totalQuantity,
        });
      }
    } catch (err) {
      console.error('[useMintsChartSocket] Error handling message:', err);
      setError(err as Error);
    }
  }, [lastMessage, chainFilter, addToBatch]);

  return {
    chartData,
    totalMintsInPeriod,
    isConnected,
    error,
  };
}
