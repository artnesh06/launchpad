'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';

interface PlatformFeeConfig {
  flatFee: bigint;
  platformTreasury: string;
  enabled: boolean;
}

export function usePlatformFee(contractAddress?: string, chainId?: number) {
  const [platformFee, setPlatformFee] = useState<string>('--');
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient({ chainId });

  useEffect(() => {
    let isMounted = true;

    const fetchPlatformFee = async () => {
      try {
        if (!publicClient || !contractAddress) {
          setPlatformFee('--');
          setIsLoading(false);
          return;
        }

        // Import ABI
        const OddsLaunchpadABI = (await import('@/../abi/OddsLaunchpad.json')).default;

        // Call getPlatformFeeConfig
        const feeConfig = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: OddsLaunchpadABI,
          functionName: 'getPlatformFeeConfig',
        }) as PlatformFeeConfig;

        if (isMounted) {
          if (feeConfig.enabled && feeConfig.flatFee > BigInt(0)) {
            // Convert from wei to ETH
            const feeInEth = formatEther(feeConfig.flatFee);
            setPlatformFee(feeInEth);
          } else {
            setPlatformFee('0');
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching platform fee:', error);
        if (isMounted) {
          setPlatformFee('--');
          setIsLoading(false);
        }
      }
    };

    fetchPlatformFee();

    return () => {
      isMounted = false;
    };
  }, [publicClient, contractAddress, chainId]);

  return { platformFee, isLoading };
}
