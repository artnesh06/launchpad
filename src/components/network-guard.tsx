'use client';

import { useEffect, useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert01Icon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { getChainName, SUPPORTED_CHAINS } from '@/config/chains';

interface NetworkGuardProps {
    requiredChainId?: number;
    contractAddress?: string;
    showBanner?: boolean;
}

export function NetworkGuard({ requiredChainId, contractAddress, showBanner = true }: NetworkGuardProps) {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const [isWrongNetwork, setIsWrongNetwork] = useState(false);
    const [detectedChainId, setDetectedChainId] = useState<number | null>(null);
    const [switching, setSwitching] = useState(false);

    useEffect(() => {
        const detectNetwork = async () => {
            if (!isConnected || !contractAddress) {
                setIsWrongNetwork(false);
                return;
            }

            // If requiredChainId is provided, use it
            if (requiredChainId) {
                const wrongNetwork = chainId !== requiredChainId;
                setIsWrongNetwork(wrongNetwork);
                setDetectedChainId(requiredChainId);
                return;
            }

            // Otherwise, detect from contract address by querying all chains
            try {
                for (const chain of Object.values(SUPPORTED_CHAINS)) {
                    const response = await fetch(`/api/admin/launchpads?chainId=${chain.id}&contractAddress=${contractAddress}`);
                    const result = await response.json();

                    if (result.success && result.data.launchpads && result.data.launchpads.length > 0) {
                        const launchpad = result.data.launchpads[0];
                        const wrongNetwork = chainId !== launchpad.chainId;
                        setIsWrongNetwork(wrongNetwork);
                        setDetectedChainId(launchpad.chainId);
                        return;
                    }
                }
            } catch (error) {
                console.error('Failed to detect network:', error);
            }
        };

        detectNetwork();
    }, [isConnected, chainId, contractAddress, requiredChainId]);

    const handleSwitchNetwork = async () => {
        if (!detectedChainId) return;

        setSwitching(true);
        try {
            // Switch to the required chain
            await switchChain({ chainId: detectedChainId });
        } catch (error) {
            console.error('Failed to switch network:', error);
        } finally {
            setSwitching(false);
        }
    };

    if (!isConnected || !isWrongNetwork || !detectedChainId) {
        return null;
    }

    const requiredChainName = getChainName(detectedChainId);
    const currentChainName = chainId ? getChainName(Number(chainId)) : 'Unknown';

    if (!showBanner) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <HugeiconsIcon icon={Alert01Icon} size={20} className="flex-shrink-0 animate-pulse" />
                        <div className="flex-1">
                            <p className="font-bold text-sm">Wrong Network Detected</p>
                            <p className="text-xs opacity-90">
                                You're on <span className="font-semibold">{currentChainName}</span> but this collection is on{' '}
                                <span className="font-semibold">{requiredChainName}</span>
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSwitchNetwork}
                        disabled={switching}
                        size="sm"
                        className="bg-white text-orange-600 hover:bg-gray-100 font-bold flex-shrink-0"
                    >
                        {switching ? (
                            <>
                                <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2 animate-spin" />
                                Switching...
                            </>
                        ) : (
                            <>
                                <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
                                Switch to {requiredChainName}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to check if user is on wrong network
 */
export function useNetworkGuard(requiredChainId?: number, contractAddress?: string) {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const [isWrongNetwork, setIsWrongNetwork] = useState(false);
    const [detectedChainId, setDetectedChainId] = useState<number | null>(null);

    useEffect(() => {
        const detectNetwork = async () => {
            if (!isConnected || !contractAddress) {
                setIsWrongNetwork(false);
                return;
            }

            if (requiredChainId) {
                const wrongNetwork = chainId !== requiredChainId;
                setIsWrongNetwork(wrongNetwork);
                setDetectedChainId(requiredChainId);
                return;
            }

            try {
                for (const chain of Object.values(SUPPORTED_CHAINS)) {
                    const response = await fetch(`/api/admin/launchpads?chainId=${chain.id}&contractAddress=${contractAddress}`);
                    const result = await response.json();

                    if (result.success && result.data.launchpads && result.data.launchpads.length > 0) {
                        const launchpad = result.data.launchpads[0];
                        const wrongNetwork = chainId !== launchpad.chainId;
                        setIsWrongNetwork(wrongNetwork);
                        setDetectedChainId(launchpad.chainId);
                        return;
                    }
                }
            } catch (error) {
                console.error('Failed to detect network:', error);
            }
        };

        detectNetwork();
    }, [isConnected, chainId, contractAddress, requiredChainId]);

    return {
        isWrongNetwork,
        detectedChainId,
        currentChainId: chainId,
        requiredChainName: detectedChainId ? getChainName(detectedChainId) : null,
        currentChainName: chainId ? getChainName(Number(chainId)) : null
    };
}
