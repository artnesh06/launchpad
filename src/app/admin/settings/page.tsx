'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useListenerWebSocket } from '@/hooks/useListenerWebSocket';
import { listenerApiClient, type HealthStatus, type ChainStatus, type SystemStats } from '@/lib/listener-api-client';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    RefreshIcon,
    Loading03Icon,
    CheckmarkCircle02Icon,
    AlertCircleIcon,
    Wifi01Icon,
    WifiDisconnectedIcon,
    DatabaseIcon,
    CloudIcon,
    Cpu01Icon,
    Clock01Icon,
    ArrowUpRight01Icon,
} from '@hugeicons/core-free-icons';

// Health threshold constants
const THRESHOLDS = {
    memoryWarning: 80, // percentage
    memoryCritical: 90,
    dbConnectionsWarning: 80, // percentage of max
    dbConnectionsCritical: 95,
    uptimeWarning: 3600, // 1 hour in seconds
};

export default function AdminSettingsPage() {
    // State for health data
    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [chainStatuses, setChainStatuses] = useState<ChainStatus[]>([]);
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

    // Loading and error states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    
    // Restart states
    const [restartAllDialogOpen, setRestartAllDialogOpen] = useState(false);
    const [restartAllLoading, setRestartAllLoading] = useState(false);
    const [restartChainLoading, setRestartChainLoading] = useState<Record<number, boolean>>({});

    // WebSocket connection for real-time updates
    const {
        isConnected: wsConnected,
        connectionStatus,
        healthStatus: wsHealthStatus,
        chainStatuses: wsChainStatuses,
        subscribeToHealthUpdates,
        reconnectAttempts,
        lastError: wsLastError,
    } = useListenerWebSocket();

    // Fetch initial data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [health, chains, stats] = await Promise.all([
                listenerApiClient.getHealth(),
                listenerApiClient.getChainStatuses(),
                listenerApiClient.getSystemStats().catch(() => null), // Stats might not be available
            ]);

            setHealthStatus(health);
            setChainStatuses(chains);
            setSystemStats(stats);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch service status';
            setError(message);
            toast.error('Failed to fetch service status', { description: message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Subscribe to health updates when connected
    useEffect(() => {
        if (wsConnected) {
            subscribeToHealthUpdates();
        }
    }, [wsConnected, subscribeToHealthUpdates]);

    // Update health status from WebSocket
    useEffect(() => {
        if (wsHealthStatus) {
            setHealthStatus(wsHealthStatus);
        }
    }, [wsHealthStatus]);

    // Update chain statuses from WebSocket
    useEffect(() => {
        if (wsChainStatuses.length > 0) {
            setChainStatuses(wsChainStatuses);
        }
    }, [wsChainStatuses]);

    // Retry handler
    const handleRetry = useCallback(async () => {
        setIsRetrying(true);
        await fetchData();
        setIsRetrying(false);
    }, [fetchData]);

    // Restart chain listener handler
    const handleRestartChain = useCallback(async (chainId: number) => {
        setRestartChainLoading(prev => ({ ...prev, [chainId]: true }));

        try {
            const result = await listenerApiClient.restartChainListener(chainId);
            if (result.success) {
                toast.success(`Chain ${chainId} listener restarted`, {
                    description: result.message,
                });
                // Refresh chain statuses
                const chains = await listenerApiClient.getChainStatuses();
                setChainStatuses(chains);
            } else {
                throw new Error(result.message || 'Restart failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to restart chain listener';
            toast.error('Restart failed', { description: message });
        } finally {
            setRestartChainLoading(prev => ({ ...prev, [chainId]: false }));
        }
    }, []);

    // Restart all listeners handler
    const handleRestartAll = useCallback(async () => {
        setRestartAllLoading(true);

        try {
            const result = await listenerApiClient.restartAllListeners();
            if (result.success) {
                toast.success('All listeners restarted', {
                    description: result.message,
                });
                // Refresh all data
                await fetchData();
            } else {
                throw new Error(result.message || 'Restart failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to restart all listeners';
            toast.error('Restart failed', { description: message });
        } finally {
            setRestartAllLoading(false);
            setRestartAllDialogOpen(false);
        }
    }, [fetchData]);

    // Utility functions
    const formatUptime = (seconds: number | undefined): string => {
        if (!seconds) return 'N/A';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const formatMemory = (mb: number | undefined): string => {
        if (!mb) return 'N/A';
        if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
        return `${mb.toFixed(0)} MB`;
    };

    const getMemoryPercentage = (): number => {
        if (!healthStatus?.memory) return 0;
        return (healthStatus.memory.heapUsedMB / healthStatus.memory.heapTotalMB) * 100;
    };

    const getDbConnectionPercentage = (): number => {
        if (!healthStatus?.database) return 0;
        return (healthStatus.database.activeConnections / healthStatus.database.maxConnections) * 100;
    };

    const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'healthy':
                return 'default';
            case 'degraded':
                return 'secondary';
            case 'unhealthy':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    const getConnectionStatusColor = (): string => {
        switch (connectionStatus) {
            case 'connected':
                return 'text-green-500';
            case 'connecting':
            case 'reconnecting':
                return 'text-yellow-500';
            case 'disconnected':
            case 'error':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    const isMemoryWarning = getMemoryPercentage() >= THRESHOLDS.memoryWarning;
    const isMemoryCritical = getMemoryPercentage() >= THRESHOLDS.memoryCritical;
    const isDbWarning = getDbConnectionPercentage() >= THRESHOLDS.dbConnectionsWarning;
    const isDbCritical = getDbConnectionPercentage() >= THRESHOLDS.dbConnectionsCritical;
    const isUptimeWarning = (healthStatus?.uptime || 0) < THRESHOLDS.uptimeWarning;

    // Error state (Task 8.8)
    if (error && !healthStatus) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white font-mono">Listener Service Settings</h1>
                    <p className="text-gray-400 font-mono">Monitor and control the NFT listener service</p>
                </div>

                <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <HugeiconsIcon icon={AlertCircleIcon} size={48} className="text-red-500" />
                        <h2 className="text-lg font-semibold text-white font-mono">Service Unreachable</h2>
                        <p className="text-gray-400 font-mono text-center max-w-md">
                            {error}
                        </p>
                        <Button
                            onClick={handleRetry}
                            disabled={isRetrying}
                            className="bg-[#B392F0] hover:bg-[#9B7AD9] text-white font-mono"
                        >
                            {isRetrying ? (
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                            ) : (
                                <HugeiconsIcon icon={RefreshIcon} size={16} className="mr-2" />
                            )}
                            Retry Connection
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // Loading state
    if (isLoading && !healthStatus) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white font-mono">Listener Service Settings</h1>
                    <p className="text-gray-400 font-mono">Monitor and control the NFT listener service</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="p-6 bg-[#0D0E11] border-[#2F3336] animate-pulse">
                            <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
                            <div className="h-8 bg-gray-700 rounded w-2/3" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white font-mono">Listener Service Settings</h1>
                    <p className="text-gray-400 font-mono">Monitor and control the NFT listener service</p>
                </div>
                
                {/* Refresh Button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                >
                    {isRetrying ? (
                        <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                    ) : (
                        <HugeiconsIcon icon={RefreshIcon} size={16} />
                    )}
                    Refresh
                </Button>
            </div>

            {/* Task 8.4: WebSocket Connection Indicator */}
            <Card className="p-4 bg-[#0D0E11] border-[#2F3336]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <HugeiconsIcon 
                            icon={wsConnected ? Wifi01Icon : WifiDisconnectedIcon} 
                            size={24} 
                            className={getConnectionStatusColor()} 
                        />
                        <div>
                            <h3 className="text-sm font-medium text-white font-mono">WebSocket Connection</h3>
                            <p className="text-xs text-gray-400 font-mono capitalize">{connectionStatus}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {reconnectAttempts > 0 && (
                            <span className="text-xs text-yellow-500 font-mono">
                                Reconnect attempts: {reconnectAttempts}
                            </span>
                        )}
                        {wsLastError && (
                            <span className="text-xs text-red-500 font-mono truncate max-w-[200px]">
                                {wsLastError}
                            </span>
                        )}
                        <Badge variant={wsConnected ? 'default' : 'destructive'}>
                            {wsConnected ? 'Connected' : 'Disconnected'}
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* Task 8.1: Listener Service Status Section */}
            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white font-mono">Listener Service Status</CardTitle>
                            <CardDescription className="font-mono">Health status, uptime, and memory usage</CardDescription>
                        </div>
                        <Badge variant={getStatusBadgeVariant(healthStatus?.status || 'unknown')}>
                            {healthStatus?.status || 'Unknown'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Uptime */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={Clock01Icon} size={16} className="text-gray-400" />
                                <span className="text-sm text-gray-400 font-mono">Uptime</span>
                                {isUptimeWarning && (
                                    <HugeiconsIcon icon={AlertCircleIcon} size={14} className="text-yellow-500" />
                                )}
                            </div>
                            <p className={`text-2xl font-bold font-mono ${isUptimeWarning ? 'text-yellow-500' : 'text-white'}`}>
                                {formatUptime(healthStatus?.uptime)}
                            </p>
                        </div>

                        {/* Memory Usage */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={Cpu01Icon} size={16} className="text-gray-400" />
                                <span className="text-sm text-gray-400 font-mono">Memory Usage</span>
                                {(isMemoryWarning || isMemoryCritical) && (
                                    <HugeiconsIcon 
                                        icon={AlertCircleIcon} 
                                        size={14} 
                                        className={isMemoryCritical ? 'text-red-500' : 'text-yellow-500'} 
                                    />
                                )}
                            </div>
                            <p className={`text-2xl font-bold font-mono ${
                                isMemoryCritical ? 'text-red-500' : isMemoryWarning ? 'text-yellow-500' : 'text-white'
                            }`}>
                                {formatMemory(healthStatus?.memory?.heapUsedMB)} / {formatMemory(healthStatus?.memory?.heapTotalMB)}
                            </p>
                            <Progress 
                                value={getMemoryPercentage()} 
                                className={`h-2 ${isMemoryCritical ? '[&>div]:bg-red-500' : isMemoryWarning ? '[&>div]:bg-yellow-500' : ''}`}
                            />
                            <p className="text-xs text-gray-500 font-mono">{getMemoryPercentage().toFixed(1)}% used</p>
                        </div>

                        {/* Active Chains */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon icon={CloudIcon} size={16} className="text-gray-400" />
                                <span className="text-sm text-gray-400 font-mono">Active Chains</span>
                            </div>
                            <p className="text-2xl font-bold text-white font-mono">
                                {healthStatus?.chains?.active || 0} / {healthStatus?.chains?.total || 0}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                                {healthStatus?.launchpads || 0} launchpads monitored
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Task 8.2: Chain Listeners Status Section */}
            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white font-mono">Chain Listeners</CardTitle>
                            <CardDescription className="font-mono">Status of blockchain event listeners</CardDescription>
                        </div>
                        {/* Task 8.3: Restart All Listeners Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestartAllDialogOpen(true)}
                            disabled={restartAllLoading}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            {restartAllLoading ? (
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                            ) : (
                                <HugeiconsIcon icon={RefreshIcon} size={16} className="mr-2" />
                            )}
                            Restart All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {chainStatuses.length === 0 ? (
                        <p className="text-gray-400 font-mono text-center py-4">No chain listeners configured</p>
                    ) : (
                        <div className="space-y-3">
                            {chainStatuses.map((chain) => (
                                <div 
                                    key={chain.chainId}
                                    className="flex items-center justify-between p-4 bg-[#1E1F22] rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${chain.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div>
                                            <h4 className="text-sm font-medium text-white font-mono">
                                                {chain.chainName || `Chain ${chain.chainId}`}
                                            </h4>
                                            <p className="text-xs text-gray-400 font-mono">
                                                Chain ID: {chain.chainId} • {chain.launchpadCount} launchpads
                                            </p>
                                            {chain.error && (
                                                <p className="text-xs text-red-500 font-mono mt-1">{chain.error}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={chain.isRunning ? 'default' : 'destructive'}>
                                            {chain.isRunning ? 'Running' : 'Stopped'}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRestartChain(chain.chainId)}
                                            disabled={restartChainLoading[chain.chainId]}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            {restartChainLoading[chain.chainId] ? (
                                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                                            ) : (
                                                <HugeiconsIcon icon={RefreshIcon} size={16} />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Task 8.5 & 8.6: Database and Queue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Task 8.5: Database Stats Section */}
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <CardTitle className="text-white font-mono flex items-center gap-2">
                            <HugeiconsIcon icon={DatabaseIcon} size={20} />
                            Database Connections
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400 font-mono">Active Connections</span>
                                <span className={`text-lg font-bold font-mono ${
                                    isDbCritical ? 'text-red-500' : isDbWarning ? 'text-yellow-500' : 'text-white'
                                }`}>
                                    {healthStatus?.database?.activeConnections || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400 font-mono">Max Connections</span>
                                <span className="text-lg font-bold text-white font-mono">
                                    {healthStatus?.database?.maxConnections || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400 font-mono">Waiting</span>
                                <span className="text-lg font-bold text-white font-mono">
                                    {healthStatus?.database?.waiting || 0}
                                </span>
                            </div>
                            <Progress 
                                value={getDbConnectionPercentage()} 
                                className={`h-2 ${isDbCritical ? '[&>div]:bg-red-500' : isDbWarning ? '[&>div]:bg-yellow-500' : ''}`}
                            />
                            <p className="text-xs text-gray-500 font-mono">{getDbConnectionPercentage().toFixed(1)}% capacity used</p>
                            
                            {/* Task 8.7: Health threshold warning */}
                            {(isDbWarning || isDbCritical) && (
                                <div className={`flex items-center gap-2 p-2 rounded ${
                                    isDbCritical ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                    <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                    <span className="text-xs font-mono">
                                        {isDbCritical ? 'Critical: Database connections near limit!' : 'Warning: High database connection usage'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Task 8.6: Queue Status Section (if Redis configured) */}
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <CardTitle className="text-white font-mono flex items-center gap-2">
                            <HugeiconsIcon icon={ArrowUpRight01Icon} size={20} />
                            Queue Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {healthStatus?.queue ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400 font-mono">Queue Initialized</span>
                                    <Badge variant={healthStatus.queue.initialized ? 'default' : 'secondary'}>
                                        {healthStatus.queue.initialized ? 'Yes' : 'No'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400 font-mono">Worker Active</span>
                                    <Badge variant={healthStatus.queue.workerActive ? 'default' : 'destructive'}>
                                        {healthStatus.queue.workerActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <HugeiconsIcon icon={CloudIcon} size={32} className="text-gray-600 mb-2" />
                                <p className="text-gray-400 font-mono text-sm">Redis queue not configured</p>
                                <p className="text-gray-500 font-mono text-xs mt-1">
                                    Configure REDIS_URL to enable queue features
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* System Stats (if available) */}
            {systemStats && (
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <CardTitle className="text-white font-mono">System Statistics</CardTitle>
                        <CardDescription className="font-mono">Overall system metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <span className="text-sm text-gray-400 font-mono">Total Launchpads</span>
                                <p className="text-2xl font-bold text-white font-mono">{systemStats.totalLaunchpads}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm text-gray-400 font-mono">Total NFTs</span>
                                <p className="text-2xl font-bold text-white font-mono">{systemStats.totalNFTs.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm text-gray-400 font-mono">Total Mints</span>
                                <p className="text-2xl font-bold text-white font-mono">{systemStats.totalMints.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm text-gray-400 font-mono">Last Sync</span>
                                <p className="text-lg font-bold text-white font-mono">
                                    {systemStats.lastSyncTime ? new Date(systemStats.lastSyncTime).toLocaleString() : 'Never'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Task 8.7: Health Threshold Warnings Summary */}
            {(isMemoryWarning || isDbWarning || isUptimeWarning) && (
                <Card className="bg-[#0D0E11] border-yellow-500/50">
                    <CardHeader>
                        <CardTitle className="text-yellow-500 font-mono flex items-center gap-2">
                            <HugeiconsIcon icon={AlertCircleIcon} size={20} />
                            Health Warnings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {isMemoryCritical && (
                                <div className="flex items-center gap-2 text-red-500">
                                    <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                    <span className="text-sm font-mono">Critical: Memory usage at {getMemoryPercentage().toFixed(1)}%</span>
                                </div>
                            )}
                            {isMemoryWarning && !isMemoryCritical && (
                                <div className="flex items-center gap-2 text-yellow-500">
                                    <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                    <span className="text-sm font-mono">Warning: Memory usage at {getMemoryPercentage().toFixed(1)}%</span>
                                </div>
                            )}
                            {isDbCritical && (
                                <div className="flex items-center gap-2 text-red-500">
                                    <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                    <span className="text-sm font-mono">Critical: Database connections at {getDbConnectionPercentage().toFixed(1)}%</span>
                                </div>
                            )}
                            {isDbWarning && !isDbCritical && (
                                <div className="flex items-center gap-2 text-yellow-500">
                                    <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                    <span className="text-sm font-mono">Warning: Database connections at {getDbConnectionPercentage().toFixed(1)}%</span>
                                </div>
                            )}
                            {isUptimeWarning && (
                                <div className="flex items-center gap-2 text-yellow-500">
                                    <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                    <span className="text-sm font-mono">Warning: Service recently restarted (uptime: {formatUptime(healthStatus?.uptime)})</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Task 8.3: Restart All Confirmation Dialog */}
            <AlertDialog open={restartAllDialogOpen} onOpenChange={setRestartAllDialogOpen}>
                <AlertDialogContent className="bg-[#0D0E11] border-[#2F3336]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white font-mono">Restart All Listeners?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400 font-mono">
                            This will restart all chain listeners. Active sync operations may be interrupted.
                            The service will automatically reconnect to all chains.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel 
                            onClick={() => setRestartAllDialogOpen(false)}
                            className="bg-transparent border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRestartAll}
                            disabled={restartAllLoading}
                            className="bg-[#B392F0] hover:bg-[#9B7AD9] text-white font-mono"
                        >
                            {restartAllLoading ? (
                                <>
                                    <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                                    Restarting...
                                </>
                            ) : (
                                'Restart All'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
