/**
 * useLaunchpadSocket Hook
 * 
 * React hook for launchpad detail page real-time updates via WebSocket.
 * Subscribes to launchpad-specific room and receives mint/phase events.
 * 
 * Now using react-use-websocket for better performance and reliability.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';
import { websocketConfig } from '@/config/websocket';
import { useThrottle, useBatch } from './useWebSocketOptimization';
import { getThrottleInterval, debugLog } from '@/config/websocket-optimization';
import type {
  UseLaunchpadSocketOptions,
  UseLaunchpadSocketReturn,
  MintEventData,
  PhaseUpdateEventData,
  RecentMint,
  PhaseProgress,
} from '@/types/websocket';

/**
 * Hook for launchpad detail page real-time updates
 * 
 * @param options - Configuration options
 * @returns Real-time progress data and connection status
 */
export function useLaunchpadSocket(
  options: UseLaunchpadSocketOptions
): UseLaunchpadSocketReturn {
  const { contractAddress, enabled = true } = options;
  
  const { lastMessage, isConnected, joinRoom, leaveRoom } = useWebSocketConnection();
  
  // State
  const [totalMinted, setTotalMinted] = useState(0);
  const [mintedPercent, setMintedPercent] = useState(0);
  const [recentMints, setRecentMints] = useState<RecentMint[]>([]);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Track current room
  const currentRoomRef = useRef<string | null>(null);
  const maxRecentMints = 10;
  
  // Throttle totalMinted updates dengan centralized config
  const throttleInterval = getThrottleInterval('totalMinted');
  const throttledTotalMinted = useThrottle(totalMinted, throttleInterval);

  /**
   * Get room name for this launchpad
   */
  const getRoomName = useCallback(() => {
    return websocketConfig.rooms.launchpad(contractAddress);
  }, [contractAddress]);

  /**
   * Join/leave room based on connection status
   */
  useEffect(() => {
    if (!enabled || !isConnected || !contractAddress) {
      return;
    }

    const roomName = getRoomName();
    
    // Leave previous room if different
    if (currentRoomRef.current && currentRoomRef.current !== roomName) {
      console.log('[useLaunchpadSocket] Leaving previous room:', currentRoomRef.current);
      leaveRoom(currentRoomRef.current);
    }

    // Join new room
    console.log('[useLaunchpadSocket] Joining room:', roomName);
    joinRoom(roomName);
    currentRoomRef.current = roomName;

    // Cleanup
    return () => {
      if (currentRoomRef.current) {
        console.log('[useLaunchpadSocket] Leaving room:', currentRoomRef.current);
        leaveRoom(currentRoomRef.current);
        currentRoomRef.current = null;
      }
    };
  }, [enabled, isConnected, contractAddress, getRoomName, joinRoom, leaveRoom]);

  /**
   * Handle incoming WebSocket messages
   */
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const { event, data } = lastMessage;

      // Only process events for this contract
      if (data.contractAddress?.toLowerCase() !== contractAddress.toLowerCase()) {
        return;
      }

      switch (event) {
        case websocketConfig.events.mint:
          console.log('[useLaunchpadSocket] Mint event received:', data);
          
          // Update total minted
          setTotalMinted(prev => prev + data.quantity);
          
          // Add to recent mints
          setRecentMints(prev => [
            {
              tokenId: data.tokenId,
              minter: data.minter,
              timestamp: new Date(data.timestamp),
              imageUrl: data.imageUrl,
            },
            ...prev,
          ].slice(0, maxRecentMints));
          
          // Update phase progress if phase is specified
          if (data.phaseId) {
            setPhaseProgress(prev => {
              if (!prev || prev.phaseId !== data.phaseId) {
                return prev;
              }
              
              const newMinted = prev.minted + data.quantity;
              return {
                ...prev,
                minted: newMinted,
                percentage: prev.limit > 0 ? (newMinted / prev.limit) * 100 : 0,
              };
            });
          }
          break;

        case websocketConfig.events.batchMint:
          console.log('[useLaunchpadSocket] Batch mint event received:', data);
          
          // Update total minted
          setTotalMinted(prev => prev + data.totalQuantity);
          
          // Add all mints to recent mints
          const newRecentMints = data.tokenIds.map((tokenId: string) => ({
            tokenId,
            minter: data.minter,
            timestamp: new Date(data.timestamp),
            imageUrl: data.imageUrl,
          }));
          
          setRecentMints(prev => [
            ...newRecentMints,
            ...prev,
          ].slice(0, maxRecentMints));
          
          // Update phase progress if phase is specified
          if (data.phaseId) {
            setPhaseProgress(prev => {
              if (!prev || prev.phaseId !== data.phaseId) {
                return prev;
              }
              
              const newMinted = prev.minted + data.totalQuantity;
              return {
                ...prev,
                minted: newMinted,
                percentage: prev.limit > 0 ? (newMinted / prev.limit) * 100 : 0,
              };
            });
          }
          break;

        case websocketConfig.events.collectionUpdate:
          console.log('[useLaunchpadSocket] Collection update event received:', data);
          
          // Update total minted and percentage
          // Only update if the new value is higher to prevent stale data
          if (typeof data.totalMinted === 'number') {
            setTotalMinted(prev => {
              if (data.totalMinted > prev) {
                return data.totalMinted;
              }
              console.log(`[useLaunchpadSocket] Ignoring stale totalMinted: ${data.totalMinted} (current: ${prev})`);
              return prev;
            });
          }
          
          if (typeof data.mintedPercent === 'number') {
            setMintedPercent(data.mintedPercent);
          }
          break;

        case websocketConfig.events.phaseUpdate:
          console.log('[useLaunchpadSocket] Phase update event received:', data);
          
          // Update active phase
          if (data.isActive) {
            setActivePhase(data.phaseId);
          }
          
          // Update phase progress
          setPhaseProgress(prev => {
            if (prev && prev.phaseId === data.phaseId) {
              return {
                ...prev,
                minted: data.minted,
                percentage: prev.limit > 0 ? (data.minted / prev.limit) * 100 : 0,
              };
            }
            return prev;
          });
          break;

        default:
          console.log('[useLaunchpadSocket] Unknown event:', event);
      }
    } catch (err) {
      console.error('[useLaunchpadSocket] Error handling message:', err);
      setError(err as Error);
    }
  }, [lastMessage, contractAddress, maxRecentMints]);

  return {
    totalMinted: throttledTotalMinted, // Return throttled version
    mintedPercent,
    recentMints,
    activePhase,
    phaseProgress,
    isConnected,
    error,
  };
}
