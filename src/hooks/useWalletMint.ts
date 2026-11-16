/**
 * useWalletMint Hook
 * 
 * React hook for tracking user's own mints with animation support.
 * Listens to the shared WebSocket connection and filters events by wallet address.
 * 
 * Uses the same WebSocket connection as useLaunchpadSocket for consistency.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';
import { websocketConfig } from '@/config/websocket';
import type {
  UseWalletMintOptions,
  UseWalletMintReturn,
  UserMint,
} from '@/types/websocket';

/**
 * Hook for tracking user's mints with animation
 * 
 * @param options - Configuration options
 * @returns User's mints and animation state
 */
export function useWalletMint(
  options: UseWalletMintOptions = {}
): UseWalletMintReturn {
  const { walletAddress, contractAddress, enabled = true } = options;
  
  const { lastMessage, isConnected } = useWebSocketConnection();
  
  // State
  const [userMints, setUserMints] = useState<UserMint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  // Track processed events and animation timeouts
  const animationTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all animation timeouts
      animationTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutRef.current.clear();
    };
  }, []);

  /**
   * Handle incoming WebSocket messages
   * Filter by wallet address to only show user's own mints
   */
  useEffect(() => {
    if (!lastMessage || !walletAddress || !enabled) return;

    try {
      const { event, data } = lastMessage;
      
      // Create unique event key to prevent duplicate processing
      const eventKey = `${event}-${data.transactionHash}-${data.tokenId || data.tokenIds?.join(',')}`;
      
      // Skip if already processed
      if (processedEventsRef.current.has(eventKey)) {
        return;
      }

      // Only process mint events
      if (event !== websocketConfig.events.mint && event !== websocketConfig.events.batchMint) {
        return;
      }

      console.log('[useWalletMint] Received event:', event, {
        minter: data.minter,
        walletAddress,
        minterLower: data.minter?.toLowerCase(),
        walletLower: walletAddress.toLowerCase(),
        isMatch: data.minter?.toLowerCase() === walletAddress.toLowerCase(),
        contractAddress: data.contractAddress,
        expectedContract: contractAddress,
      });

      // Check if this mint is from the connected wallet
      if (data.minter?.toLowerCase() !== walletAddress.toLowerCase()) {
        console.log('[useWalletMint] Mint not from connected wallet, ignoring');
        return;
      }

      // Filter by contract if specified
      if (contractAddress && data.contractAddress?.toLowerCase() !== contractAddress.toLowerCase()) {
        console.log('[useWalletMint] Mint not from expected contract, ignoring');
        return;
      }

      // Mark as processed
      processedEventsRef.current.add(eventKey);
      
      // Clean up old processed events (keep last 100)
      if (processedEventsRef.current.size > 100) {
        const entries = Array.from(processedEventsRef.current);
        processedEventsRef.current = new Set(entries.slice(-50));
      }

      if (event === websocketConfig.events.mint) {
        console.log('[useWalletMint] ✅ User mint detected:', data.tokenId);
        
        // Create user mint entry
        const userMint: UserMint = {
          tokenId: data.tokenId,
          contractAddress: data.contractAddress,
          imageUrl: data.imageUrl || '',
          timestamp: new Date(data.timestamp),
          animationState: 'entering',
        };

        // Add to user mints
        setUserMints(prev => [userMint, ...prev]);

        // Transition to visible after animation
        const enterTimeout = setTimeout(() => {
          setUserMints(current =>
            current.map(mint =>
              mint.tokenId === data.tokenId && mint.contractAddress === data.contractAddress
                ? { ...mint, animationState: 'visible' }
                : mint
            )
          );
        }, 500);

        animationTimeoutRef.current.set(`mint-${data.tokenId}`, enterTimeout);

      } else if (event === websocketConfig.events.batchMint) {
        console.log('[useWalletMint] ✅ User batch mint detected:', data.tokenIds?.length, 'NFTs');
        
        // Create user mint entries for all tokens
        const newMints: UserMint[] = (data.tokenIds || []).map((tokenId: string) => ({
          tokenId,
          contractAddress: data.contractAddress,
          imageUrl: data.imageUrl || '',
          timestamp: new Date(data.timestamp),
          animationState: 'entering' as const,
        }));

        // Add all to user mints
        setUserMints(prev => [...newMints, ...prev]);

        // Transition to visible after animation
        const enterTimeout = setTimeout(() => {
          setUserMints(current =>
            current.map(mint => {
              const isNew = newMints.some(
                n => n.tokenId === mint.tokenId && n.contractAddress === mint.contractAddress
              );
              return isNew ? { ...mint, animationState: 'visible' } : mint;
            })
          );
        }, 500);

        animationTimeoutRef.current.set(`batch-${Date.now()}`, enterTimeout);
      }

    } catch (err) {
      console.error('[useWalletMint] Error handling message:', err);
      setError(err as Error);
    }
  }, [lastMessage, walletAddress, contractAddress, enabled]);

  // Computed values
  const mintCount = userMints.length;
  const showAnimation = userMints.some(mint => mint.animationState !== 'visible');
  const animatingMints = userMints.filter(mint => mint.animationState !== 'visible');

  return {
    userMints,
    mintCount,
    showAnimation,
    animatingMints,
    isConnected,
    error,
  };
}
