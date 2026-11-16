/**
 * useHomepageSocket Hook
 * 
 * React hook for homepage real-time updates via WebSocket.
 * Subscribes to homepage room and receives mint/collection events.
 * 
 * Now using react-use-websocket for better performance and reliability.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';
import { websocketConfig } from '@/config/websocket';
import { useDebounce } from './useWebSocketOptimization';
import { getDebounceDelay, debugLog } from '@/config/websocket-optimization';
import type {
  UseHomepageSocketOptions,
  UseHomepageSocketReturn,
  MintEventData,
  NewCollectionEventData,
  TrendingUpdate,
} from '@/types/websocket';

/**
 * Hook for homepage real-time updates
 * 
 * @param options - Configuration options
 * @returns Real-time data and connection status
 */
export function useHomepageSocket(
  options: UseHomepageSocketOptions = {}
): UseHomepageSocketReturn {
  const { chainFilter = 'all', enabled = true } = options;
  
  const { lastMessage, isConnected, joinRoom, leaveRoom, useFallbackPolling } = 
    useWebSocketConnection();
  
  // State
  const [latestMint, setLatestMint] = useState<MintEventData | null>(null);
  const [latestCollection, setLatestCollection] = useState<NewCollectionEventData | null>(null);
  const [trendingUpdates, setTrendingUpdates] = useState<TrendingUpdate[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  // Track current room
  const currentRoomRef = useRef<string | null>(null);
  
  // Debounce trending updates dengan centralized config
  const debounceDelay = getDebounceDelay('trendingUpdates');
  const debouncedTrendingUpdates = useDebounce(trendingUpdates, debounceDelay);
  
  debugLog('useHomepageSocket', `Using debounce delay: ${debounceDelay}ms`);

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
   * Manual refresh function
   */
  const refresh = useCallback(() => {
    setLatestMint(null);
    setLatestCollection(null);
    setTrendingUpdates([]);
    setError(null);
  }, []);

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
      console.log('[useHomepageSocket] Leaving previous room:', currentRoomRef.current);
      leaveRoom(currentRoomRef.current);
    }

    // Join new room
    console.log('[useHomepageSocket] Joining room:', roomName);
    joinRoom(roomName);
    currentRoomRef.current = roomName;

    // Cleanup
    return () => {
      if (currentRoomRef.current) {
        console.log('[useHomepageSocket] Leaving room:', currentRoomRef.current);
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

      switch (event) {
        case websocketConfig.events.mint:
          console.log('[useHomepageSocket] Mint event received:', data);
          
          // Filter by chain if needed
          if (chainFilter !== 'all' && data.chainId !== chainFilter) {
            return;
          }
          
          setLatestMint(data);
          
          // Update trending data
          setTrendingUpdates(prev => {
            const existing = prev.find(
              item => item.contractAddress.toLowerCase() === data.contractAddress.toLowerCase()
            );
            
            if (existing) {
              return prev.map(item =>
                item.contractAddress.toLowerCase() === data.contractAddress.toLowerCase()
                  ? {
                      ...item,
                      mintedCount: item.mintedCount + data.quantity,
                      timestamp: new Date(data.timestamp),
                    }
                  : item
              );
            } else {
              return [
                {
                  contractAddress: data.contractAddress,
                  mintedCount: data.quantity,
                  volume: 0,
                  holders: 0,
                  timestamp: new Date(data.timestamp),
                },
                ...prev,
              ].slice(0, 10);
            }
          });
          break;

        case websocketConfig.events.batchMint:
          console.log('[useHomepageSocket] Batch mint event received:', data);
          
          // Filter by chain if needed
          if (chainFilter !== 'all' && data.chainId !== chainFilter) {
            return;
          }
          
          // Use first token ID for display
          setLatestMint({
            ...data,
            tokenId: data.tokenIds[0],
            quantity: data.totalQuantity,
          });
          
          // Update trending data with total quantity
          setTrendingUpdates(prev => {
            const existing = prev.find(
              item => item.contractAddress.toLowerCase() === data.contractAddress.toLowerCase()
            );
            
            if (existing) {
              return prev.map(item =>
                item.contractAddress.toLowerCase() === data.contractAddress.toLowerCase()
                  ? {
                      ...item,
                      mintedCount: item.mintedCount + data.totalQuantity,
                      timestamp: new Date(data.timestamp),
                    }
                  : item
              );
            } else {
              return [
                {
                  contractAddress: data.contractAddress,
                  mintedCount: data.totalQuantity,
                  volume: 0,
                  holders: 0,
                  timestamp: new Date(data.timestamp),
                },
                ...prev,
              ].slice(0, 10);
            }
          });
          break;

        case websocketConfig.events.collectionNew:
          console.log('[useHomepageSocket] New collection event received:', data);
          
          if (chainFilter !== 'all' && data.chainId !== chainFilter) {
            return;
          }
          
          setLatestCollection(data);
          break;

        case websocketConfig.events.collectionUpdate:
          console.log('[useHomepageSocket] Collection update event received:', data);
          
          if (chainFilter !== 'all' && data.chainId !== chainFilter) {
            return;
          }
          
          // Update trending data with volume and holders
          setTrendingUpdates(prev => {
            const existing = prev.find(
              item => item.contractAddress.toLowerCase() === data.contractAddress.toLowerCase()
            );
            
            if (existing) {
              return prev.map(item =>
                item.contractAddress.toLowerCase() === data.contractAddress.toLowerCase()
                  ? {
                      ...item,
                      volume: data.volume || item.volume,
                      holders: data.holders || item.holders,
                      timestamp: new Date(data.timestamp),
                    }
                  : item
              );
            }
            
            return prev;
          });
          break;

        default:
          console.log('[useHomepageSocket] Unknown event:', event);
      }
    } catch (err) {
      console.error('[useHomepageSocket] Error handling message:', err);
      setError(err as Error);
    }
  }, [lastMessage, chainFilter]);

  return {
    latestMint,
    latestCollection,
    trendingUpdates: debouncedTrendingUpdates, // Return debounced version
    isConnected,
    useFallbackPolling,
    error,
    refresh,
  };
}
