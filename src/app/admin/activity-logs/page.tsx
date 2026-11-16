'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { DatePicker } from '@/components/ui/date-picker';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
    Activity01Icon, 
    AlertCircleIcon, 
    RefreshIcon,
    CheckmarkCircle01Icon,
    Cancel01Icon,
    Loading03Icon,
    FilterIcon,
    Cancel02Icon,
    ArrowDown01Icon,
    ArrowRight01Icon,
    Reload01Icon
} from '@hugeicons/core-free-icons';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { listenerApiClient, ActivityLog, ActivityLogFilters } from '@/lib/listener-api-client';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export default function ActivityLogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [retryingLogs, setRetryingLogs] = useState<Set<string>>(new Set());
    const limit = 20;

    // Filter states
    const [contractAddress, setContractAddress] = useState('');
    const [operationType, setOperationType] = useState<ActivityLog['operationType'] | ''>('');
    const [status, setStatus] = useState<ActivityLog['status'] | ''>('');
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();
    const [showFilters, setShowFilters] = useState(false);

    const fetchLogs = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const filters: ActivityLogFilters = {
                page,
                limit,
            };

            // Add filters if they are set
            if (contractAddress.trim()) {
                filters.contractAddress = contractAddress.trim();
            }
            if (operationType) {
                filters.operationType = operationType;
            }
            if (status) {
                filters.status = status;
            }
            if (fromDate) {
                filters.fromDate = format(fromDate, 'yyyy-MM-dd');
            }
            if (toDate) {
                filters.toDate = format(toDate, 'yyyy-MM-dd');
            }
            
            const response = await listenerApiClient.getActivityLogs(filters);
            
            setLogs(response.items);
            setTotalPages(response.pagination.totalPages);
        } catch (err) {
            console.error('Error fetching activity logs:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch activity logs');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, contractAddress, operationType, status, fromDate, toDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const clearFilters = () => {
        setContractAddress('');
        setOperationType('');
        setStatus('');
        setFromDate(undefined);
        setToDate(undefined);
        setPage(1);
    };

    const hasActiveFilters = contractAddress || operationType || status || fromDate || toDate;

    const toggleRowExpansion = (logId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    const retryOperation = async (log: ActivityLog) => {
        if (!log.chainId || !log.contractAddress) {
            toast.error('Cannot retry: Missing chain ID or contract address');
            return;
        }

        setRetryingLogs(prev => new Set(prev).add(log.id));

        try {
            let result;
            
            switch (log.operationType) {
                case 'sync_nfts':
                    result = await listenerApiClient.syncNFTs(log.chainId, log.contractAddress);
                    break;
                case 'sync_metadata':
                    result = await listenerApiClient.refreshMetadata(log.chainId, log.contractAddress);
                    break;
                case 'sync_minted_count':
                    result = await listenerApiClient.syncMintedCount();
                    break;
                case 'rescan':
                    // For rescan, we need block range from metadata
                    const fromBlock = (log.metadata as { fromBlock?: number })?.fromBlock;
                    const toBlock = (log.metadata as { toBlock?: number })?.toBlock;
                    if (!fromBlock) {
                        toast.error('Cannot retry rescan: Missing block range information');
                        return;
                    }
                    result = await listenerApiClient.rescanHistory(log.chainId, log.contractAddress, fromBlock, toBlock);
                    break;
                default:
                    toast.error(`Cannot retry operation type: ${log.operationType}`);
                    return;
            }

            if (result.success) {
                toast.success('Operation retried successfully');
                // Refresh the logs to show the new operation
                fetchLogs();
            } else {
                toast.error('Retry failed: ' + (result as { message?: string }).message);
            }
        } catch (err) {
            console.error('Error retrying operation:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to retry operation');
        } finally {
            setRetryingLogs(prev => {
                const newSet = new Set(prev);
                newSet.delete(log.id);
                return newSet;
            });
        }
    };

    const getStatusBadge = (status: ActivityLog['status']) => {
        switch (status) {
            case 'success':
                return (
                    <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} className="mr-1" />
                        Success
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10">
                        <HugeiconsIcon icon={Cancel01Icon} size={12} className="mr-1" />
                        Failed
                    </Badge>
                );
            case 'in_progress':
                return (
                    <Badge variant="outline" className="border-blue-500/50 text-blue-400 bg-blue-500/10">
                        <HugeiconsIcon icon={Loading03Icon} size={12} className="mr-1 animate-spin" />
                        In Progress
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10">
                        Pending
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getOperationTypeLabel = (type: ActivityLog['operationType']) => {
        const labels: Record<ActivityLog['operationType'], string> = {
            sync_nfts: 'Sync NFTs',
            sync_metadata: 'Sync Metadata',
            sync_minted_count: 'Sync Minted Count',
            rescan: 'Historical Rescan',
            restart: 'Restart Listener',
            register: 'Register Launchpad',
            remove: 'Remove Launchpad',
        };
        return labels[type] || type;
    };

    const formatDuration = (duration?: number) => {
        if (!duration) return 'N/A';
        if (duration < 1000) return `${duration}ms`;
        if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
        return `${(duration / 60000).toFixed(1)}m`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white font-mono">Activity Logs</h1>
                    <p className="text-gray-400 font-mono">Monitor sync operations and system activities</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowFilters(!showFilters)}
                        variant="outline"
                        className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                    >
                        <HugeiconsIcon icon={FilterIcon} size={16} className="mr-2" />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                        {hasActiveFilters && (
                            <Badge variant="outline" className="ml-2 border-[#B392F0] text-[#B392F0] bg-[#B392F0]/10">
                                Active
                            </Badge>
                        )}
                    </Button>
                    <Button
                        onClick={fetchLogs}
                        variant="outline"
                        className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        disabled={isLoading}
                    >
                        <HugeiconsIcon icon={RefreshIcon} size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <CardTitle className="text-white font-mono">Filters</CardTitle>
                        <CardDescription className="text-gray-400 font-mono">
                            Filter activity logs by collection, operation type, status, or date range
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[#B392F0] font-mono font-bold text-[15px] mb-2">
                                    Contract Address
                                </label>
                                <Input
                                    placeholder="0x..."
                                    value={contractAddress}
                                    onChange={(e) => setContractAddress(e.target.value)}
                                    className="bg-[#0D0E11] border-[#2F3336] text-white font-mono"
                                />
                            </div>

                            <CustomSelect
                                label="Operation Type"
                                value={operationType}
                                onValueChange={(value) => setOperationType(value as ActivityLog['operationType'] | '')}
                                options={[
                                    { value: '', label: 'All Operations' },
                                    { value: 'sync_nfts', label: 'Sync NFTs' },
                                    { value: 'sync_metadata', label: 'Sync Metadata' },
                                    { value: 'sync_minted_count', label: 'Sync Minted Count' },
                                    { value: 'rescan', label: 'Historical Rescan' },
                                    { value: 'restart', label: 'Restart Listener' },
                                    { value: 'register', label: 'Register Launchpad' },
                                    { value: 'remove', label: 'Remove Launchpad' },
                                ]}
                                placeholder="Select operation type"
                            />

                            <CustomSelect
                                label="Status"
                                value={status}
                                onValueChange={(value) => setStatus(value as ActivityLog['status'] | '')}
                                options={[
                                    { value: '', label: 'All Statuses' },
                                    { value: 'success', label: 'Success' },
                                    { value: 'failed', label: 'Failed' },
                                    { value: 'in_progress', label: 'In Progress' },
                                    { value: 'pending', label: 'Pending' },
                                ]}
                                placeholder="Select status"
                            />

                            <DatePicker
                                label="From Date"
                                date={fromDate}
                                onDateChange={setFromDate}
                                placeholder="Select start date"
                            />

                            <DatePicker
                                label="To Date"
                                date={toDate}
                                onDateChange={setToDate}
                                placeholder="Select end date"
                            />

                            <div className="flex items-end">
                                <Button
                                    onClick={clearFilters}
                                    variant="outline"
                                    className="w-full border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                                    disabled={!hasActiveFilters}
                                >
                                    <HugeiconsIcon icon={Cancel02Icon} size={16} className="mr-2" />
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-[#0D0E11] border-[#2F3336]">
                <CardHeader>
                    <CardTitle className="text-white font-mono">Recent Operations</CardTitle>
                    <CardDescription className="text-gray-400 font-mono">
                        View all sync operations, registrations, and system activities
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <Alert variant="destructive">
                            <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                            <AlertTitle>Error loading activity logs</AlertTitle>
                            <AlertDescription className="flex items-center justify-between">
                                <span>{error}</span>
                                <Button variant="outline" size="sm" onClick={fetchLogs}>
                                    Retry
                                </Button>
                            </AlertDescription>
                        </Alert>
                    ) : isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between border-b border-[#2F3336] pb-4">
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-[200px]" />
                                        <Skeleton className="h-3 w-[300px]" />
                                    </div>
                                    <Skeleton className="h-6 w-[80px]" />
                                </div>
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <HugeiconsIcon icon={Activity01Icon} size={48} className="text-gray-600 mb-4" />
                            <p className="text-sm text-gray-400 font-mono">No activity logs found</p>
                            <p className="text-xs text-gray-500 font-mono mt-1">
                                Activity logs will appear here as operations are performed
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-[#2F3336] hover:bg-[#1E1F22]">
                                        <TableHead className="text-gray-400 font-mono">Operation</TableHead>
                                        <TableHead className="text-gray-400 font-mono">Status</TableHead>
                                        <TableHead className="text-gray-400 font-mono">Chain</TableHead>
                                        <TableHead className="text-gray-400 font-mono">Contract</TableHead>
                                        <TableHead className="text-gray-400 font-mono">Duration</TableHead>
                                        <TableHead className="text-gray-400 font-mono">Items</TableHead>
                                        <TableHead className="text-gray-400 font-mono">Started</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => {
                                        const isExpanded = expandedRows.has(log.id);
                                        const hasError = log.status === 'failed' && log.errorMessage;
                                        
                                        return (
                                            <>
                                                <TableRow 
                                                    key={log.id} 
                                                    className="border-[#2F3336] hover:bg-[#1E1F22]"
                                                >
                                                    <TableCell className="font-mono text-white">
                                                        <div className="flex items-center gap-2">
                                                            {hasError && (
                                                                <button
                                                                    onClick={() => toggleRowExpansion(log.id)}
                                                                    className="text-gray-400 hover:text-white transition-colors"
                                                                >
                                                                    <HugeiconsIcon 
                                                                        icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon} 
                                                                        size={16} 
                                                                    />
                                                                </button>
                                                            )}
                                                            {getOperationTypeLabel(log.operationType)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(log.status)}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-gray-400">
                                                        {log.chainId ? `Chain ${log.chainId}` : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-gray-400">
                                                        {log.contractAddress ? (
                                                            <span className="text-xs">
                                                                {log.contractAddress.slice(0, 6)}...{log.contractAddress.slice(-4)}
                                                            </span>
                                                        ) : (
                                                            'N/A'
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-gray-400">
                                                        {formatDuration(log.duration)}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-gray-400">
                                                        {log.itemsProcessed !== undefined ? (
                                                            <span>
                                                                {log.itemsProcessed}
                                                                {log.itemsFailed ? (
                                                                    <span className="text-red-400"> ({log.itemsFailed} failed)</span>
                                                                ) : null}
                                                            </span>
                                                        ) : (
                                                            'N/A'
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-gray-400 text-xs">
                                                        {formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}
                                                    </TableCell>
                                                </TableRow>
                                                
                                                {/* Expandable Error Details Row */}
                                                {hasError && isExpanded && (
                                                    <TableRow key={`${log.id}-details`} className="border-[#2F3336] bg-[#1E1F22]/50">
                                                        <TableCell colSpan={7} className="p-4">
                                                            <div className="space-y-2">
                                                                <div className="flex items-start gap-2">
                                                                    <HugeiconsIcon 
                                                                        icon={AlertCircleIcon} 
                                                                        size={16} 
                                                                        className="text-red-400 mt-0.5" 
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium text-red-400 font-mono mb-1">
                                                                            Error Details
                                                                        </p>
                                                                        <p className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                                                                            {log.errorMessage}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Retry Button for retryable operations */}
                                                                {['sync_nfts', 'sync_metadata', 'sync_minted_count', 'rescan'].includes(log.operationType) && (
                                                                    <div className="mt-3 pt-3 border-t border-[#2F3336]">
                                                                        <Button
                                                                            onClick={() => retryOperation(log)}
                                                                            disabled={retryingLogs.has(log.id)}
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                                                                        >
                                                                            <HugeiconsIcon 
                                                                                icon={Reload01Icon} 
                                                                                size={14} 
                                                                                className={`mr-2 ${retryingLogs.has(log.id) ? 'animate-spin' : ''}`} 
                                                                            />
                                                                            {retryingLogs.has(log.id) ? 'Retrying...' : 'Retry Operation'}
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                                
                                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-[#2F3336]">
                                                                        <p className="text-xs font-medium text-gray-400 font-mono mb-2">
                                                                            Additional Information
                                                                        </p>
                                                                        <pre className="text-xs text-gray-400 font-mono bg-[#0D0E11] p-2 rounded overflow-x-auto">
                                                                            {JSON.stringify(log.metadata, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!isLoading && !error && logs.length > 0 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#2F3336]">
                            <p className="text-sm text-gray-400 font-mono">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
