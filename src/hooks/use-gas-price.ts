'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { formatUnits } from 'viem';

export function useGasPrice(chainId?: number) {
  const [gasPrice, setGasPrice] = useState<string>('--');
  const [isLoading, setIsLoading] = useState(true);
  const currentChainId = useChainId();
  
  // Memoize targetChainId to prevent unnecessary re-renders
  const targetChainId = useMemo(() => chainId || currentChainId, [chainId, currentChainId]);
  
  const publicClient = usePublicClient({ chainId: targetChainId });
  
  // Use ref to store publicClient to avoid dependency issues
  const publicClientRef = useRef(publicClient);
  
  // Only update ref when publicClient actually changes (not on every render)
  useEffect(() => {
    publicClientRef.current = publicClient;
  }, [publicClient]);

  // Track if initial fetch is done
  const initialFetchDone = useRef(false);

  const fetchGasPrice = useCallback(async () => {
    try {
      const client = publicClientRef.current;
      if (!client) {
        setGasPrice('--');
        setIsLoading(false);
        return;
      }

      const price = await client.getGasPrice();
      
      // Convert from wei to gwei
      const priceInGwei = formatUnits(price, 9);
      const priceNum = parseFloat(priceInGwei);
      
      // Use appropriate decimal places based on gas price magnitude
      const formatted = priceNum < 0.1 
        ? priceNum.toFixed(4)
        : priceNum.toFixed(2);
      
      setGasPrice(formatted);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching gas price:', error);
      setGasPrice('--');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip if already fetched and chainId hasn't changed
    if (initialFetchDone.current) {
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const doFetch = async () => {
      if (!isMounted) return;
      await fetchGasPrice();
      initialFetchDone.current = true;
    };

    // Fetch immediately
    doFetch();

    // Update every 15 seconds
    intervalId = setInterval(() => {
      if (isMounted) fetchGasPrice();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [targetChainId, fetchGasPrice]);

  // Reset initialFetchDone when chainId changes
  useEffect(() => {
    initialFetchDone.current = false;
  }, [targetChainId]);

  return { gasPrice, isLoading };
}
