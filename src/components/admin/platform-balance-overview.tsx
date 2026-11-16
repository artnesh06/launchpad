'use client';

import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon, Loading03Icon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlatformFeeWithdrawCard } from './platform-fee-withdraw-card';
import { Skeleton } from '@/components/ui/skeleton';

interface Collection {
    contractAddress: string;
    name: string;
    chainId: number;
    chainName?: string;
}

export function PlatformBalanceOverview() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCollections = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Fetch all active collections
            const response = await fetch('/api/admin/launchpads?status=ACTIVE&limit=100');
            
            if (!response.ok) {
                throw new Error('Failed to fetch collections');
            }
            
            const data = await response.json();
            
            if (data.success && data.data?.items) {
                // Map to collection format with chain names
                const chainNames: Record<number, string> = {
                    1: 'Ethereum',
                    11155111: 'Sepolia',
                    137: 'Polygon',
                    80002: 'Polygon Amoy',
                    // Add more chains as needed
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

    if (isLoading) {
        return (
            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <CardTitle className="text-white font-mono flex items-center gap-2">
                        <HugeiconsIcon icon={Wallet01Icon} size={20} />
                        Platform Fee Balances
                    </CardTitle>
                    <CardDescription className="text-gray-400 font-mono">
                        Loading collections...
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-8 w-[150px]" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <CardTitle className="text-white font-mono flex items-center gap-2">
                        <HugeiconsIcon icon={Wallet01Icon} size={20} />
                        Platform Fee Balances
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                    <Button 
                        onClick={fetchCollections} 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                    >
                        <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (collections.length === 0) {
        return (
            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <CardTitle className="text-white font-mono flex items-center gap-2">
                        <HugeiconsIcon icon={Wallet01Icon} size={20} />
                        Platform Fee Balances
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-400 font-mono text-center py-8">
                        No active collections found
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white font-mono">Platform Fee Balances</h2>
                    <p className="text-sm text-gray-400 font-mono">
                        {collections.length} active collection{collections.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Button 
                    onClick={fetchCollections} 
                    variant="outline" 
                    size="sm"
                    className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                >
                    <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {collections.map((collection) => (
                    <PlatformFeeWithdrawCard
                        key={`${collection.chainId}-${collection.contractAddress}`}
                        contractAddress={collection.contractAddress}
                        chainId={collection.chainId}
                        chainName={`${collection.name} (${collection.chainName})`}
                        onWithdrawSuccess={fetchCollections}
                    />
                ))}
            </div>
        </div>
    );
}
