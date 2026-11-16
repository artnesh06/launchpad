'use client';

import { useState, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon, Loading03Icon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlatformBalance } from '@/hooks/admin/usePlatformBalance';
import { Skeleton } from '@/components/ui/skeleton';

interface Collection {
    contractAddress: string;
    name: string;
    chainId: number;
    chainName?: string;
}

interface BalanceData {
    [key: string]: number; // key: contractAddress, value: balance
}

export function PlatformBalanceSummary() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [balances, setBalances] = useState<BalanceData>({});

    const fetchCollections = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await fetch('/api/admin/launchpads?status=ACTIVE&limit=100');
            
            if (!response.ok) {
                throw new Error('Failed to fetch collections');
            }
            
            const data = await response.json();
            
            if (data.success && data.data?.items) {
                const chainNames: Record<number, string> = {
                    1: 'Ethereum',
                    11155111: 'Sepolia',
                    137: 'Polygon',
                    80002: 'Polygon Amoy',
                    6343: 'Chain 6343',
                };
                
                setCollections(data.data.items.map((item: any) => ({
                    contractAddress: item.contractAddress,
                    name: item.name,
                    chainId: item.chainId,
                    chainName: chainNames[item.chainId] || `Chain ${item.chainId}`
                })));
            }
        } catch (err) {
            console.error('Error fetching collections:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    // Component to fetch balance for each collection
    function CollectionBalance({ collection }: { collection: Collection }) {
        const { balance, isLoading: isLoadingBalance } = usePlatformBalance(
            collection.contractAddress, 
            collection.chainId
        );

        useEffect(() => {
            if (balance && !isLoadingBalance) {
                const balanceNum = parseFloat(balance.balance);
                const key = `${collection.chainId}-${collection.contractAddress}`;
                
                setBalances(prev => {
                    // Only update if value changed
                    if (prev[key] !== balanceNum) {
                        return {
                            ...prev,
                            [key]: balanceNum
                        };
                    }
                    return prev;
                });
            }
        }, [balance?.balance, isLoadingBalance, collection.contractAddress, collection.chainId]);

        return null;
    }

    // Calculate totals from balances
    const totalBalance = Object.values(balances).reduce((sum, bal) => sum + bal, 0);
    
    const balancesByChain = collections.reduce((acc, collection) => {
        const key = `${collection.chainId}-${collection.contractAddress}`;
        const balance = balances[key] || 0;
        const chainName = collection.chainName || `Chain ${collection.chainId}`;
        
        if (!acc[chainName]) {
            acc[chainName] = 0;
        }
        acc[chainName] += balance;
        
        return acc;
    }, {} as Record<string, number>);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-[#0D0E11] border-[#2F3336]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-4 rounded" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[120px] mb-2" />
                            <Skeleton className="h-3 w-[80px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                    <span>{error}</span>
                    <Button variant="outline" size="sm" onClick={fetchCollections}>
                        <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <>
            {/* Hidden components to fetch balances */}
            {collections.map((collection) => (
                <CollectionBalance
                    key={`${collection.chainId}-${collection.contractAddress}`}
                    collection={collection}
                />
            ))}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                            Total Available Balance
                        </CardTitle>
                        <HugeiconsIcon icon={Wallet01Icon} size={16} className="text-[#B392F0]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white font-mono">
                            {totalBalance.toFixed(6)} ETH
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-1">
                            Real-time from {collections.length} collections
                        </p>
                    </CardContent>
                </Card>

                {Object.entries(balancesByChain)
                    .filter(([_, balance]) => balance > 0)
                    .map(([chainName, balance]) => (
                        <Card key={chainName} className="bg-[#0D0E11] border-[#2F3336]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                                    {chainName}
                                </CardTitle>
                                <HugeiconsIcon icon={Wallet01Icon} size={16} className="text-[#B392F0]" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white font-mono">
                                    {balance.toFixed(6)} ETH
                                </div>
                                <p className="text-xs text-gray-400 font-mono mt-1">
                                    Available to withdraw
                                </p>
                            </CardContent>
                        </Card>
                    ))}
            </div>
        </>
    );
}
