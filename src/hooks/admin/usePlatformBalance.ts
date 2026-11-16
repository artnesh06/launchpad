import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { OddsLaunchpadABI } from '@/abi/OddsLaunchpad';

export interface PlatformBalance {
    balance: string;
    balanceWei: bigint;
    platformTreasury: string;
    isEnabled: boolean;
    flatFee: string;
}

export function usePlatformBalance(contractAddress?: string, chainId?: number) {
    const { address } = useAccount();
    const [balance, setBalance] = useState<PlatformBalance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Get platform fee config
    const { data: feeConfig, isLoading: isLoadingConfig, error: configError } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi: OddsLaunchpadABI,
        functionName: 'getPlatformFeeConfig',
        chainId: chainId,
        query: {
            enabled: !!contractAddress && !!chainId,
        }
    });

    // Get pending balance for platform treasury
    const { data: pendingBalance, isLoading: isLoadingBalance, error: balanceError } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi: OddsLaunchpadABI,
        functionName: 'getPendingBalance',
        args: feeConfig ? [(feeConfig as any).platformTreasury] : undefined,
        chainId: chainId,
        query: {
            enabled: !!contractAddress && !!feeConfig && !!chainId,
        }
    });

    useEffect(() => {
        if (isLoadingConfig || isLoadingBalance) {
            setIsLoading(true);
            return;
        }

        if (configError || balanceError) {
            setError(configError || balanceError);
            setIsLoading(false);
            return;
        }

        if (feeConfig && pendingBalance !== undefined) {
            const config = feeConfig as any;
            setBalance({
                balance: formatEther(pendingBalance as bigint),
                balanceWei: pendingBalance as bigint,
                platformTreasury: config.platformTreasury,
                isEnabled: config.enabled,
                flatFee: formatEther(config.flatFee),
            });
            setIsLoading(false);
        }
    }, [feeConfig, pendingBalance, isLoadingConfig, isLoadingBalance, configError, balanceError]);

    return {
        balance,
        isLoading,
        error,
    };
}
