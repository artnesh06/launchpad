'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useAdminFactory } from '@/hooks/useAdminFactory';
import { useAdminSync } from '@/hooks/useAdminSync';
import { SUPPORTED_CHAINS, getDefaultChain } from '@/config/chains';
import { formatEther } from 'ethers';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading01Icon } from '@hugeicons/core-free-icons';
export default function FactoryPage() {
    const [selectedChainId, setSelectedChainId] = useState<number>(getDefaultChain().id);
    const { factoryInfo, isLoading, error, refetch } = useAdminFactory(selectedChainId);
    const { syncProgress, syncLaunchpads } = useAdminSync();

    const handleSyncAll = async () => {
        await syncLaunchpads(selectedChainId);
        // Refetch factory info after sync to update total launchpads count
        await refetch();
    };

    const formatFee = (fee: string) => {
        try {
            if (fee === '0' || !fee) return '0 ETH';
            const ethValue = formatEther(fee);
            return `${ethValue} ETH`;
        } catch {
            return fee;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white font-mono">Factory Management</h1>
                    <p className="text-gray-400 font-mono">Manage contract factory settings and operations</p>
                </div>
                
                {/* Chain Selector */}
                <div className="flex items-center gap-2">
                    <label htmlFor="chain-select" className="text-sm text-gray-600">Chain:</label>
                    <select
                        id="chain-select"
                        value={selectedChainId}
                        onChange={(e) => setSelectedChainId(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {Object.values(SUPPORTED_CHAINS).map((chain) => (
                            <option key={chain.id} value={chain.id}>
                                {chain.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Factory Info */}
            <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white font-mono">Factory Information</h2>
                    <Button 
                        onClick={refetch} 
                        variant="outline" 
                        size="sm"
                        disabled={isLoading}
                        className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                    >
                        {isLoading ? (
                            <>
                                <HugeiconsIcon icon={Loading01Icon} size={16} className="mr-2 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            'Refresh'
                        )}
                    </Button>
                </div>

                {isLoading && !factoryInfo ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-5 w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-red-600 mb-2">Failed to load factory information</p>
                        <Button onClick={refetch} variant="outline" size="sm">
                            Try Again
                        </Button>
                    </div>
                ) : factoryInfo ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-sm text-gray-600">Contract Address</p>
                            <p className="mt-1 font-mono text-sm text-gray-900 break-all">
                                {factoryInfo.contractAddress}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <Badge className="mt-1" variant={factoryInfo.isActive ? 'default' : 'destructive'}>
                                {factoryInfo.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Owner</p>
                            <p className="mt-1 font-mono text-sm text-gray-900 break-all">
                                {factoryInfo.owner}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Treasury</p>
                            <p className="mt-1 font-mono text-sm text-gray-900 break-all">
                                {factoryInfo.treasury}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Creation Fee</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                {formatFee(factoryInfo.creationFee)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Platform Fee</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                {factoryInfo.platformFeePercentage}%
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Free Mint Fee</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                {formatFee(factoryInfo.freeMintFee)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Launchpads</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                {factoryInfo.totalLaunchpads}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Version</p>
                            <p className="mt-1 text-sm text-gray-900">
                                {factoryInfo.version}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Last Updated</p>
                            <p className="mt-1 text-sm text-gray-900">
                                {new Date(factoryInfo.updatedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ) : null}
            </Card>

            {/* Sync Operations */}
            <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
                <h2 className="text-lg font-semibold text-white font-mono mb-4">Sync Operations</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-900">Sync All Launchpads</p>
                            <p className="text-sm text-gray-500">
                                Fetch and update all launchpad data from the blockchain
                            </p>
                        </div>
                        <Button 
                            onClick={handleSyncAll}
                            disabled={syncProgress.status === 'syncing' || isLoading}
                        >
                            {syncProgress.status === 'syncing' ? (
                                <>
                                    <HugeiconsIcon icon={Loading01Icon} size={16} className="mr-2 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                'Sync All'
                            )}
                        </Button>
                    </div>

                    {/* Sync Progress */}
                    {syncProgress.status !== 'idle' && (
                        <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-900">
                                    {syncProgress.status === 'syncing' && 'Syncing...'}
                                    {syncProgress.status === 'success' && 'Sync Completed'}
                                    {syncProgress.status === 'error' && 'Sync Failed'}
                                </p>
                                {syncProgress.total > 0 && (
                                    <p className="text-sm text-gray-600">
                                        {syncProgress.progress} / {syncProgress.total}
                                    </p>
                                )}
                            </div>
                            
                            {syncProgress.message && (
                                <p className="text-sm text-gray-600 mb-2">
                                    {syncProgress.message}
                                </p>
                            )}

                            {syncProgress.status === 'syncing' && syncProgress.total > 0 && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                            width: `${(syncProgress.progress / syncProgress.total) * 100}%` 
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* Template Management */}
            <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
                <h2 className="text-lg font-semibold text-white font-mono mb-4">Template Management</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div>
                            <p className="font-medium text-gray-900">Standard NFT Template</p>
                            <p className="text-sm text-gray-500">ERC-721 compliant template</p>
                        </div>
                        <Badge variant="default">Approved</Badge>
                    </div>
                    <div className="mt-4">
                        <Button>Approve New Template</Button>
                    </div>
                </div>
            </Card>

            {/* Role Management */}
            <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
                <h2 className="text-lg font-semibold text-white font-mono mb-4">Role Management</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Admin Roles</p>
                            <p className="mt-1 text-sm text-gray-900">Manage admin access and permissions</p>
                        </div>
                        <Button variant="outline">Manage Roles</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
