'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useAdminLaunchpads } from '@/hooks/useAdminLaunchpads';
import { useDebounce } from '@/hooks/use-debounce';
import { useListenerWebSocket } from '@/hooks/useListenerWebSocket';
import { listenerApiClient } from '@/lib/listener-api-client';
import { getChainName, SUPPORTED_CHAINS } from '@/config/chains';
import { TableSkeleton } from '@/components/admin/skeletons';
import { BulkOperationProgress } from '@/components/admin/BulkOperationProgress';
import { SyncProgressList } from '@/components/admin/SyncProgressList';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
    ArrowLeft01Icon, 
    ArrowRight01Icon, 
    Search01Icon,
    RefreshIcon,
    Loading03Icon,
    CloudUploadIcon,
    DatabaseIcon,
    CheckmarkCircle02Icon,
    AlertCircleIcon,
    Tick02Icon,
    Delete02Icon,
    Download01Icon,
    Time03Icon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { ActionPopover } from '@/components/action-popover';
import { BatchAirdropModal } from '@/components/admin/BatchAirdropModal';
import type { LaunchpadStatus } from '@prisma/client';
import type { AdminLaunchpad } from '@/types/admin';

// Track loading states for individual sync operations
interface SyncLoadingState {
    [key: string]: {
        syncNFTs?: boolean;
        syncMetadata?: boolean;
        syncMintedCount?: boolean;
    };
}

// Bulk operation progress tracking
interface BulkProgress {
    total: number;
    completed: number;
    failed: number;
    current?: string;
}

export default function CollectionsPage() {
    const router = useRouter();
    const { address: connectedAddress } = useAccount();
    const [page, setPage] = useState(1);
    const [chainId, setChainId] = useState<number | undefined>(undefined);
    const [status, setStatus] = useState<LaunchpadStatus | undefined>(undefined);
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 300);
    
    // Sync loading states
    const [syncLoading, setSyncLoading] = useState<SyncLoadingState>({});
    const [syncAllLoading, setSyncAllLoading] = useState(false);
    const [syncAllProgress, setSyncAllProgress] = useState<BulkProgress | null>(null);
    
    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkSyncLoading, setBulkSyncLoading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

    // Status update dialog state (Task 7.6)
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
        launchpad: AdminLaunchpad;
        newStatus: string;
    } | null>(null);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

    // Register launchpad modal state (Task 7.7)
    const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
    const [registerChainId, setRegisterChainId] = useState<string>('');
    const [registerContractAddress, setRegisterContractAddress] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);

    // Remove from monitoring state (Task 7.8)
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [pendingRemove, setPendingRemove] = useState<AdminLaunchpad | null>(null);
    const [removeLoading, setRemoveLoading] = useState(false);

    // Export state (Task 10)
    const [exportLoading, setExportLoading] = useState<Record<string, boolean>>({});

    // Batch Airdrop state
    const [airdropDialogOpen, setAirdropDialogOpen] = useState(false);
    const [selectedAirdropLaunchpad, setSelectedAirdropLaunchpad] = useState<AdminLaunchpad | null>(null);

    // Rescan state (Task 11)
    const [rescanDialogOpen, setRescanDialogOpen] = useState(false);
    const [pendingRescan, setPendingRescan] = useState<AdminLaunchpad | null>(null);
    const [rescanFromBlock, setRescanFromBlock] = useState('');
    const [rescanToBlock, setRescanToBlock] = useState('');
    const [rescanLoading, setRescanLoading] = useState(false);
    const [rescanError, setRescanError] = useState<string | null>(null);
    const [rescanProgress, setRescanProgress] = useState<number | null>(null);
    const [rescanSummary, setRescanSummary] = useState<{ eventsFound: number } | null>(null);

    // WebSocket connection for real-time updates
    const { isConnected, syncProgress } = useListenerWebSocket();

    const { launchpads, pagination, isLoading, error, updateStatus, refetch } = useAdminLaunchpads({
        page,
        limit: 10,
        chainId,
        status,
        search: debouncedSearch,
    });

    // Chain filter options
    const chainOptions = [
        { value: 'all', label: 'All Chains' },
        ...Object.values(SUPPORTED_CHAINS).map(chain => ({
            value: String(chain.id),
            label: chain.name,
            icon: chain.icon,
        })),
    ];

    // Status filter options
    const statusOptions = [
        { value: 'all', label: 'All Status' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'PAUSED', label: 'Paused' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'CANCELLED', label: 'Cancelled' },
    ];

    const handleChainChange = (value: string) => {
        setChainId(value === 'all' ? undefined : Number(value));
        setPage(1);
    };

    const handleStatusFilterChange = (value: string) => {
        setStatus(value === 'all' ? undefined : value as LaunchpadStatus);
        setPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value);
        setPage(1);
    };

    const handleRowClick = (launchpadId: string) => {
        router.push(`/admin/collections/${launchpadId}`);
    };

    // ============ Status Update Handlers (Task 7.6) ============

    /**
     * Handle status change - show dialog for ACTIVE/COMPLETED to offer sync
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
     */
    const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>, launchpad: AdminLaunchpad) => {
        const newStatus = e.target.value;
        
        // For ACTIVE or COMPLETED, show dialog to offer sync
        if (newStatus === 'ACTIVE' || newStatus === 'COMPLETED') {
            setPendingStatusUpdate({ launchpad, newStatus });
            setStatusDialogOpen(true);
        } else {
            // For PAUSED or CANCELLED, update directly
            handleDirectStatusUpdate(launchpad.id, newStatus);
        }
    }, []);

    /**
     * Direct status update without sync
     */
    const handleDirectStatusUpdate = useCallback(async (launchpadId: string, newStatus: string) => {
        try {
            await updateStatus(launchpadId, newStatus);
            toast.success(`Status updated to ${newStatus}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update status';
            toast.error('Status update failed', { description: message });
        }
    }, [updateStatus]);

    /**
     * Confirm status update with optional sync
     * Requirements: 6.1, 6.2
     */
    const handleConfirmStatusUpdate = useCallback(async (triggerSync: boolean) => {
        if (!pendingStatusUpdate) return;

        const { launchpad, newStatus } = pendingStatusUpdate;
        setStatusUpdateLoading(true);

        try {
            // Update status first
            await updateStatus(launchpad.id, newStatus);
            toast.success(`Status updated to ${newStatus}`);

            // Trigger sync if requested
            if (triggerSync) {
                if (newStatus === 'ACTIVE') {
                    // Sync NFTs for ACTIVE status
                    toast.loading(`Syncing NFTs for ${launchpad.name}...`, { id: 'status-sync' });
                    const result = await listenerApiClient.syncNFTs(launchpad.chainId, launchpad.contractAddress);
                    if (result.success) {
                        toast.success(`Synced ${result.synced || 0} NFTs`, { id: 'status-sync' });
                    } else {
                        toast.error('Sync failed', { id: 'status-sync' });
                    }
                } else if (newStatus === 'COMPLETED') {
                    // Sync minted count for COMPLETED status
                    toast.loading(`Syncing final minted count...`, { id: 'status-sync' });
                    const result = await listenerApiClient.syncMintedCount();
                    if (result.success) {
                        toast.success(`Minted count synced`, { id: 'status-sync' });
                    } else {
                        toast.error('Sync failed', { id: 'status-sync' });
                    }
                }
                await refetch();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Operation failed';
            toast.error('Error', { description: message });
        } finally {
            setStatusUpdateLoading(false);
            setStatusDialogOpen(false);
            setPendingStatusUpdate(null);
        }
    }, [pendingStatusUpdate, updateStatus, refetch]);

    /**
     * Cancel status update dialog
     */
    const handleCancelStatusUpdate = useCallback(() => {
        setStatusDialogOpen(false);
        setPendingStatusUpdate(null);
    }, []);

    // ============ Register Launchpad Handlers (Task 7.7) ============

    /**
     * Validate Ethereum address format
     */
    const isValidAddress = (address: string): boolean => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    /**
     * Open register launchpad dialog
     * Requirements: 9.1
     */
    const handleOpenRegisterDialog = useCallback(() => {
        setRegisterChainId('');
        setRegisterContractAddress('');
        setRegisterError(null);
        setRegisterDialogOpen(true);
    }, []);

    /**
     * Close register launchpad dialog
     */
    const handleCloseRegisterDialog = useCallback(() => {
        setRegisterDialogOpen(false);
        setRegisterChainId('');
        setRegisterContractAddress('');
        setRegisterError(null);
    }, []);

    /**
     * Submit register launchpad form
     * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
     */
    const handleRegisterLaunchpad = useCallback(async () => {
        // Validate inputs
        if (!registerChainId) {
            setRegisterError('Please select a chain');
            return;
        }
        if (!registerContractAddress) {
            setRegisterError('Please enter a contract address');
            return;
        }
        if (!isValidAddress(registerContractAddress)) {
            setRegisterError('Invalid contract address format');
            return;
        }

        setRegisterLoading(true);
        setRegisterError(null);

        try {
            const result = await listenerApiClient.registerLaunchpad(
                Number(registerChainId),
                registerContractAddress
            );

            if (result.success) {
                toast.success('Launchpad registered successfully', {
                    description: result.launchpad?.name || 'New launchpad added to monitoring',
                });
                handleCloseRegisterDialog();
                await refetch();
            } else {
                throw new Error(result.message || 'Registration failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to register launchpad';
            setRegisterError(message);
            toast.error('Registration failed', { description: message });
        } finally {
            setRegisterLoading(false);
        }
    }, [registerChainId, registerContractAddress, refetch, handleCloseRegisterDialog]);

    // ============ Batch Airdrop Handlers ============

    /**
     * Open batch airdrop dialog
     */
    const handleOpenAirdropDialog = useCallback((e: React.MouseEvent, launchpad: AdminLaunchpad) => {
        e.stopPropagation();
        setSelectedAirdropLaunchpad(launchpad);
        setAirdropDialogOpen(true);
    }, []);

    /**
     * Close batch airdrop dialog
     */
    const handleCloseAirdropDialog = useCallback(() => {
        setAirdropDialogOpen(false);
        setSelectedAirdropLaunchpad(null);
    }, []);

    // ============ Toggle Platform Fee Handler ============

    /**
     * Toggle platform fee for a collection
     */
    const handleTogglePlatformFee = useCallback(async (e: React.MouseEvent, launchpad: AdminLaunchpad) => {
        e.stopPropagation();
        
        const key = launchpad.id;
        setSyncLoading(prev => ({
            ...prev,
            [key]: { ...prev[key], togglePlatformFee: true }
        }));

        try {
            toast.loading(`Toggling platform fee for ${launchpad.name}...`, { id: 'toggle-fee' });

            const { ContractService } = await import('@/lib/contract-service');
            const contractService = new ContractService();
            
            // Get current platform fee status
            const contract = await contractService.getNFTCollectionContract(launchpad.chainId, launchpad.contractAddress);
            const isPlatformFeeEnabled = await contract.isPlatformFeeEnabled();
            
            console.log('Current platform fee status:', isPlatformFeeEnabled);
            console.log('Toggling to:', !isPlatformFeeEnabled);

            // Try static call first to validate
            try {
                await contract.togglePlatformFee.staticCall();
                console.log('✅ Static call successful, proceeding with transaction');
            } catch (staticError: any) {
                console.error('❌ Static call failed:', staticError);
                
                let errorMessage = 'Transaction will fail';
                if (staticError.reason) {
                    errorMessage = staticError.reason;
                } else if (staticError.message) {
                    errorMessage = staticError.message;
                }
                
                if (errorMessage.includes('Unauthorized') || errorMessage.includes('Ownable')) {
                    errorMessage = 'Only contract owner can toggle platform fee';
                }
                
                toast.error('Transaction Validation Failed', {
                    id: 'toggle-fee',
                    description: errorMessage
                });
                return;
            }

            // Call togglePlatformFee function
            toast.loading('Please confirm transaction in your wallet...', { id: 'toggle-fee' });
            const tx = await contract.togglePlatformFee();
            
            console.log('Transaction sent:', tx.hash);
            toast.loading('Waiting for confirmation...', { id: 'toggle-fee' });
            
            // Wait for transaction confirmation
            await tx.wait();
            
            const newStatus = !isPlatformFeeEnabled ? 'enabled' : 'disabled';
            
            toast.success(`Platform fee ${newStatus}!`, {
                id: 'toggle-fee',
                description: `Platform fee is now ${newStatus} for ${launchpad.name}`,
                duration: 5000,
            });

            // Refetch to update the table
            await refetch();
        } catch (err: any) {
            console.error('Failed to toggle platform fee:', err);
            
            let message = 'Failed to toggle platform fee';
            if (err.message?.includes('user rejected')) {
                message = 'Transaction rejected by user';
            } else if (err.message?.includes('Unauthorized') || err.message?.includes('Ownable')) {
                message = 'Only contract owner can toggle platform fee';
            } else if (err.message) {
                message = err.message;
            }
            
            toast.error('Toggle Failed', {
                id: 'toggle-fee',
                description: message,
            });
        } finally {
            setSyncLoading(prev => ({
                ...prev,
                [key]: { ...prev[key], togglePlatformFee: false }
            }));
        }
    }, [refetch]);

    // ============ Remove from Monitoring Handlers (Task 7.8) ============

    /**
     * Open remove confirmation dialog
     * Requirements: 10.1
     */
    const handleOpenRemoveDialog = useCallback((e: React.MouseEvent, launchpad: AdminLaunchpad) => {
        e.stopPropagation();
        setPendingRemove(launchpad);
        setRemoveDialogOpen(true);
    }, []);

    /**
     * Close remove confirmation dialog
     */
    const handleCloseRemoveDialog = useCallback(() => {
        setRemoveDialogOpen(false);
        setPendingRemove(null);
    }, []);

    /**
     * Confirm remove from monitoring
     * Requirements: 10.2, 10.3, 10.4, 10.5
     */
    const handleConfirmRemove = useCallback(async () => {
        if (!pendingRemove) return;

        setRemoveLoading(true);

        try {
            const result = await listenerApiClient.removeLaunchpad(
                pendingRemove.chainId,
                pendingRemove.contractAddress
            );

            if (result.success) {
                toast.success('Launchpad removed from monitoring', {
                    description: `${pendingRemove.name} will no longer be monitored`,
                });
                handleCloseRemoveDialog();
                await refetch();
            } else {
                throw new Error(result.message || 'Removal failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove launchpad';
            toast.error('Removal failed', { description: message });
        } finally {
            setRemoveLoading(false);
        }
    }, [pendingRemove, refetch, handleCloseRemoveDialog]);

    // ============ Selection Helpers ============

    /**
     * Get selected launchpads
     */
    const selectedLaunchpads = useMemo(() => {
        return launchpads.filter(lp => selectedIds.has(lp.id));
    }, [launchpads, selectedIds]);

    // ============ Export Handlers (Task 10) ============

    /**
     * Export collection data in specified format
     * Requirements: 12.1, 12.4
     */
    const handleExport = useCallback(async (
        e: React.MouseEvent,
        launchpad: AdminLaunchpad,
        format: 'csv' | 'json'
    ) => {
        e.stopPropagation();
        
        const key = `${launchpad.id}-${format}`;
        setExportLoading(prev => ({ ...prev, [key]: true }));

        try {
            const blob = await listenerApiClient.exportData(
                launchpad.chainId,
                launchpad.contractAddress,
                { format }
            );

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${launchpad.name.replace(/\s+/g, '_')}_export_${Date.now()}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(`Exported ${launchpad.name} as ${format.toUpperCase()}`, {
                description: 'Download started',
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to export data';
            toast.error(`Export failed for ${launchpad.name}`, {
                description: message,
            });
        } finally {
            setExportLoading(prev => ({ ...prev, [key]: false }));
        }
    }, []);

    /**
     * Bulk export for selected collections
     * Requirements: 12.3
     */
    const handleBulkExport = useCallback(async (format: 'csv' | 'json') => {
        if (selectedLaunchpads.length === 0) {
            toast.error('No collections selected');
            return;
        }

        const key = `bulk-${format}`;
        setExportLoading(prev => ({ ...prev, [key]: true }));

        try {
            let successCount = 0;
            let failedCount = 0;

            for (const launchpad of selectedLaunchpads) {
                try {
                    const blob = await listenerApiClient.exportData(
                        launchpad.chainId,
                        launchpad.contractAddress,
                        { format }
                    );

                    // Create download link
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${launchpad.name.replace(/\s+/g, '_')}_export_${Date.now()}.${format}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);

                    successCount++;
                    
                    // Small delay between downloads to avoid browser blocking
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    failedCount++;
                    console.error(`Failed to export ${launchpad.name}:`, err);
                }
            }

            if (failedCount === 0) {
                toast.success(`Successfully exported ${successCount} collections as ${format.toUpperCase()}`);
            } else if (successCount === 0) {
                toast.error(`Failed to export all ${failedCount} collections`);
            } else {
                toast.warning(`Exported ${successCount} collections, ${failedCount} failed`);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Bulk export failed';
            toast.error('Bulk export failed', { description: message });
        } finally {
            setExportLoading(prev => ({ ...prev, [key]: false }));
        }
    }, [selectedLaunchpads]);

    // ============ Historical Rescan Handlers (Task 11) ============

    /**
     * Open rescan dialog
     * Requirements: 13.1
     */
    const handleOpenRescanDialog = useCallback((e: React.MouseEvent, launchpad: AdminLaunchpad) => {
        e.stopPropagation();
        setPendingRescan(launchpad);
        setRescanFromBlock('');
        setRescanToBlock('');
        setRescanError(null);
        setRescanProgress(null);
        setRescanSummary(null);
        setRescanDialogOpen(true);
    }, []);

    /**
     * Close rescan dialog
     */
    const handleCloseRescanDialog = useCallback(() => {
        if (!rescanLoading) {
            setRescanDialogOpen(false);
            setPendingRescan(null);
            setRescanFromBlock('');
            setRescanToBlock('');
            setRescanError(null);
            setRescanProgress(null);
            setRescanSummary(null);
        }
    }, [rescanLoading]);

    /**
     * Start historical rescan
     * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
     */
    const handleStartRescan = useCallback(async () => {
        if (!pendingRescan) return;

        // Validate inputs
        if (!rescanFromBlock) {
            setRescanError('Please enter a starting block number');
            return;
        }

        const fromBlock = parseInt(rescanFromBlock);
        if (isNaN(fromBlock) || fromBlock < 0) {
            setRescanError('Invalid starting block number');
            return;
        }

        let toBlock: number | undefined;
        if (rescanToBlock) {
            toBlock = parseInt(rescanToBlock);
            if (isNaN(toBlock) || toBlock < 0) {
                setRescanError('Invalid ending block number');
                return;
            }
            if (toBlock < fromBlock) {
                setRescanError('Ending block must be greater than or equal to starting block');
                return;
            }
        }

        setRescanLoading(true);
        setRescanError(null);
        setRescanProgress(0);
        setRescanSummary(null);

        try {
            // Subscribe to progress updates via WebSocket
            const operationId = `rescan-${pendingRescan.chainId}-${pendingRescan.contractAddress}-${Date.now()}`;
            
            // Start the rescan
            const result = await listenerApiClient.rescanHistory(
                pendingRescan.chainId,
                pendingRescan.contractAddress,
                fromBlock,
                toBlock
            );

            if (result.success) {
                // Show summary
                setRescanSummary({
                    eventsFound: result.eventsFound || 0,
                });
                setRescanProgress(100);
                
                toast.success(`Rescan completed for ${pendingRescan.name}`, {
                    description: `Found ${result.eventsFound || 0} events`,
                });
                
                // Refetch data
                await refetch();
            } else {
                throw new Error(result.message || 'Rescan failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to rescan history';
            setRescanError(message);
            toast.error(`Rescan failed for ${pendingRescan.name}`, {
                description: message,
            });
        } finally {
            setRescanLoading(false);
        }
    }, [pendingRescan, rescanFromBlock, rescanToBlock, refetch]);

    /**
     * Monitor rescan progress from WebSocket
     * Requirements: 13.3
     */
    const rescanOperationId = pendingRescan 
        ? `rescan-${pendingRescan.chainId}-${pendingRescan.contractAddress}`
        : null;
    
    const rescanProgressData = rescanOperationId && syncProgress.has(rescanOperationId)
        ? syncProgress.get(rescanOperationId)
        : null;

    // Update progress from WebSocket
    if (rescanProgressData && rescanLoading) {
        if (rescanProgressData.progress !== rescanProgress) {
            setRescanProgress(rescanProgressData.progress);
        }
    }

    const handleStatusUpdate = async (e: React.MouseEvent, launchpadId: string, newStatus: string) => {
        e.stopPropagation();
        try {
            await updateStatus(launchpadId, newStatus);
        } catch (err) {
            // Error is already handled by the hook
        }
    };

    // ============ Sync Action Handlers (Task 7.1 & 7.2) ============

    /**
     * Sync NFTs for a specific collection
     * Requirements: 1.2, 1.5, 1.6
     */
    const handleSyncNFTs = useCallback(async (e: React.MouseEvent, launchpad: AdminLaunchpad) => {
        e.stopPropagation();
        
        const key = launchpad.id;
        setSyncLoading(prev => ({
            ...prev,
            [key]: { ...prev[key], syncNFTs: true }
        }));

        try {
            const result = await listenerApiClient.syncNFTs(launchpad.chainId, launchpad.contractAddress);
            
            if (result.success) {
                toast.success(`Synced ${result.synced || 0} NFTs for ${launchpad.name}`, {
                    description: result.total ? `Total: ${result.total} NFTs` : undefined,
                });
                // Refetch to update the table
                await refetch();
            } else {
                throw new Error('Sync failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to sync NFTs';
            toast.error(`Failed to sync NFTs for ${launchpad.name}`, {
                description: message,
            });
        } finally {
            setSyncLoading(prev => ({
                ...prev,
                [key]: { ...prev[key], syncNFTs: false }
            }));
        }
    }, [refetch]);

    /**
     * Sync Metadata for a specific collection
     * Requirements: 1.3, 1.5, 1.6
     */
    const handleSyncMetadata = useCallback(async (e: React.MouseEvent, launchpad: AdminLaunchpad) => {
        e.stopPropagation();
        
        const key = launchpad.id;
        setSyncLoading(prev => ({
            ...prev,
            [key]: { ...prev[key], syncMetadata: true }
        }));

        try {
            const result = await listenerApiClient.refreshMetadata(launchpad.chainId, launchpad.contractAddress);
            
            if (result.success) {
                toast.success(`Metadata refreshed for ${launchpad.name}`, {
                    description: result.message,
                });
                await refetch();
            } else {
                throw new Error(result.message || 'Refresh failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to refresh metadata';
            toast.error(`Failed to refresh metadata for ${launchpad.name}`, {
                description: message,
            });
        } finally {
            setSyncLoading(prev => ({
                ...prev,
                [key]: { ...prev[key], syncMetadata: false }
            }));
        }
    }, [refetch]);

    /**
     * Sync Minted Count for a specific collection
     * Requirements: 1.4, 1.5, 1.6
     */
    const handleSyncMintedCount = useCallback(async (e: React.MouseEvent, launchpad: AdminLaunchpad) => {
        e.stopPropagation();
        
        const key = launchpad.id;
        setSyncLoading(prev => ({
            ...prev,
            [key]: { ...prev[key], syncMintedCount: true }
        }));

        try {
            // Note: The API syncs all launchpads, but we show feedback for this specific one
            const result = await listenerApiClient.syncMintedCount();
            
            if (result.success) {
                // Find the specific launchpad result
                const launchpadResult = result.details?.find(
                    d => d.contractAddress.toLowerCase() === launchpad.contractAddress.toLowerCase()
                );
                
                if (launchpadResult) {
                    if (launchpadResult.status === 'fixed') {
                        toast.success(`Minted count updated for ${launchpad.name}`, {
                            description: `${launchpadResult.oldValue} → ${launchpadResult.newValue}`,
                        });
                    } else {
                        toast.success(`Minted count already correct for ${launchpad.name}`, {
                            description: `Current: ${launchpadResult.newValue}`,
                        });
                    }
                } else {
                    toast.success(`Minted count sync completed`, {
                        description: `Fixed: ${result.fixed}, Already correct: ${result.alreadyCorrect}`,
                    });
                }
                await refetch();
            } else {
                throw new Error('Sync failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to sync minted count';
            toast.error(`Failed to sync minted count for ${launchpad.name}`, {
                description: message,
            });
        } finally {
            setSyncLoading(prev => ({
                ...prev,
                [key]: { ...prev[key], syncMintedCount: false }
            }));
        }
    }, [refetch]);

    /**
     * Check if any sync operation is in progress for a launchpad
     */
    const isAnySyncLoading = (launchpadId: string): boolean => {
        const state = syncLoading[launchpadId];
        return !!(state?.syncNFTs || state?.syncMetadata || state?.syncMintedCount);
    };

    // ============ Bulk Selection Handlers (Task 7.3) ============

    /**
     * Toggle selection for a single launchpad
     */
    const toggleSelection = useCallback((launchpadId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(launchpadId)) {
                newSet.delete(launchpadId);
            } else {
                newSet.add(launchpadId);
            }
            return newSet;
        });
    }, []);

    /**
     * Toggle select all launchpads on current page
     */
    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === launchpads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(launchpads.map(lp => lp.id)));
        }
    }, [launchpads, selectedIds.size]);

    /**
     * Check if all launchpads on current page are selected
     */
    const isAllSelected = useMemo(() => {
        return launchpads.length > 0 && selectedIds.size === launchpads.length;
    }, [launchpads.length, selectedIds.size]);

    /**
     * Check if some (but not all) launchpads are selected
     */
    const isSomeSelected = useMemo(() => {
        return selectedIds.size > 0 && selectedIds.size < launchpads.length;
    }, [launchpads.length, selectedIds.size]);

    /**
     * Bulk Sync NFTs for selected collections
     * Requirements: 4.1, 4.2, 4.3, 4.4
     */
    const handleBulkSyncNFTs = useCallback(async () => {
        if (selectedLaunchpads.length === 0) {
            toast.error('No collections selected');
            return;
        }

        setBulkSyncLoading(true);
        setBulkProgress({
            total: selectedLaunchpads.length,
            completed: 0,
            failed: 0,
        });

        const results: { success: boolean; name: string; error?: string }[] = [];

        for (const launchpad of selectedLaunchpads) {
            setBulkProgress(prev => prev ? { ...prev, current: launchpad.name } : null);
            
            try {
                const result = await listenerApiClient.syncNFTs(launchpad.chainId, launchpad.contractAddress);
                results.push({ success: result.success, name: launchpad.name });
                
                setBulkProgress(prev => prev ? {
                    ...prev,
                    completed: prev.completed + 1,
                } : null);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                results.push({ success: false, name: launchpad.name, error: message });
                
                setBulkProgress(prev => prev ? {
                    ...prev,
                    completed: prev.completed + 1,
                    failed: prev.failed + 1,
                } : null);
            }
        }

        // Show summary
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        if (failedCount === 0) {
            toast.success(`Successfully synced ${successCount} collections`);
        } else if (successCount === 0) {
            toast.error(`Failed to sync all ${failedCount} collections`);
        } else {
            toast.warning(`Synced ${successCount} collections, ${failedCount} failed`, {
                description: results.filter(r => !r.success).map(r => r.name).join(', '),
            });
        }

        setBulkSyncLoading(false);
        setBulkProgress(null);
        setSelectedIds(new Set());
        await refetch();
    }, [selectedLaunchpads, refetch]);

    // ============ Sync All Handler (Task 7.4) ============

    /**
     * Sync All NFTs across all chains
     * Requirements: 1.7, 4.5
     */
    const handleSyncAll = useCallback(async () => {
        setSyncAllLoading(true);
        setSyncAllProgress({
            total: 0,
            completed: 0,
            failed: 0,
            current: 'Starting sync...',
        });

        try {
            const results = await listenerApiClient.syncAllNFTs();
            
            const successCount = results.filter(r => r.success).length;
            const failedCount = results.filter(r => !r.success).length;
            const totalSynced = results.reduce((acc, r) => acc + (r.synced || 0), 0);

            if (failedCount === 0) {
                toast.success(`Sync completed: ${totalSynced} NFTs synced across ${successCount} chains`);
            } else {
                toast.warning(`Sync completed with errors`, {
                    description: `${successCount} chains succeeded, ${failedCount} failed`,
                });
            }

            await refetch();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to sync all NFTs';
            toast.error('Sync All failed', { description: message });
        } finally {
            setSyncAllLoading(false);
            setSyncAllProgress(null);
        }
    }, [refetch]);

    // ============ Utility Functions ============

    /**
     * Format last sync timestamp for display
     * Requirements: 8.3
     */
    const formatLastSync = (date: Date | string | null | undefined): string => {
        if (!date) return 'Never';
        
        const syncDate = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffMs = now.getTime() - syncDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return syncDate.toLocaleDateString();
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatVolume = (volume: number) => {
        if (volume === 0) return '0 ETH';
        // Convert from Wei to ETH
        const ethValue = volume / 1e18;
        return `${ethValue.toFixed(4)} ETH`;
    };

    // ============ Sync Actions Helper ============
    
    /**
     * Get sync actions for a launchpad
     */
    const getSyncActions = useCallback((launchpad: AdminLaunchpad) => {
        const loadingState = syncLoading[launchpad.id] || {};
        const anyLoading = isAnySyncLoading(launchpad.id);
        
        return [
            {
                label: 'Batch Airdrop',
                onClick: () => handleOpenAirdropDialog(new MouseEvent('click') as any, launchpad),
                disabled: anyLoading
            },
            {
                label: 'Toggle Platform Fee',
                onClick: () => handleTogglePlatformFee(new MouseEvent('click') as any, launchpad),
                disabled: anyLoading
            },
            {
                label: 'Sync NFTs',
                onClick: () => handleSyncNFTs(new MouseEvent('click') as any, launchpad),
                disabled: loadingState.syncNFTs || anyLoading
            },
            {
                label: 'Sync Metadata',
                onClick: () => handleSyncMetadata(new MouseEvent('click') as any, launchpad),
                disabled: loadingState.syncMetadata || anyLoading
            },
            {
                label: 'Sync Minted Count',
                onClick: () => handleSyncMintedCount(new MouseEvent('click') as any, launchpad),
                disabled: loadingState.syncMintedCount || anyLoading
            },
            {
                label: 'Remove from Monitoring',
                onClick: () => handleOpenRemoveDialog(new MouseEvent('click') as any, launchpad),
                disabled: anyLoading
            },
            {
                label: 'Export as CSV',
                onClick: () => handleExport(new MouseEvent('click') as any, launchpad, 'csv'),
                disabled: anyLoading || exportLoading[`${launchpad.id}-csv`] || exportLoading[`${launchpad.id}-json`]
            },
            {
                label: 'Export as JSON',
                onClick: () => handleExport(new MouseEvent('click') as any, launchpad, 'json'),
                disabled: anyLoading || exportLoading[`${launchpad.id}-csv`] || exportLoading[`${launchpad.id}-json`]
            },
            {
                label: 'Rescan History',
                onClick: () => handleOpenRescanDialog(new MouseEvent('click') as any, launchpad),
                disabled: anyLoading
            }
        ];
    }, [syncLoading, exportLoading, handleSyncNFTs, handleSyncMetadata, handleSyncMintedCount, handleOpenAirdropDialog, handleTogglePlatformFee, handleOpenRemoveDialog, handleExport, handleOpenRescanDialog]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white font-mono">Collections</h1>
                    <p className="text-gray-400 font-mono">Manage all NFT collections and sync NFT holdings</p>
                </div>
                
                {/* WebSocket Connection Status */}
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-gray-400 font-mono">
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 bg-[#0D0E11] border-[#2F3336]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search by name or address..."
                            value={searchInput}
                            onChange={handleSearchChange}
                            className="pl-10 bg-transparent border-[#2F3336] text-white placeholder:text-gray-500 font-mono"
                        />
                    </div>
                    <CustomSelect
                        options={chainOptions}
                        value={String(chainId || 'all')}
                        onValueChange={handleChainChange}
                        placeholder="Select Chain"
                    />
                    <CustomSelect
                        options={statusOptions}
                        value={status || 'all'}
                        onValueChange={handleStatusFilterChange}
                        placeholder="Select Status"
                    />
                </div>
            </Card>

            {/* Bulk Actions Bar (Task 7.3 & 7.4) */}
            <Card className="p-4 bg-[#0D0E11] border-[#2F3336]">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        {selectedIds.size > 0 && (
                            <span className="text-sm text-gray-400 font-mono">
                                {selectedIds.size} selected
                            </span>
                        )}
                        
                        {/* Bulk Sync NFTs Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkSyncNFTs}
                            disabled={selectedIds.size === 0 || bulkSyncLoading}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            {bulkSyncLoading ? (
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                            ) : (
                                <HugeiconsIcon icon={DatabaseIcon} size={16} />
                            )}
                            Bulk Sync NFTs
                        </Button>
                        
                        {/* Bulk Export Dropdown (Task 10.3) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={selectedIds.size === 0 || exportLoading['bulk-csv'] || exportLoading['bulk-json']}
                                    className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                                >
                                    {(exportLoading['bulk-csv'] || exportLoading['bulk-json']) ? (
                                        <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                                    ) : (
                                        <HugeiconsIcon icon={Download01Icon} size={16} />
                                    )}
                                    Bulk Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#0D0E11] border-[#2F3336]">
                                <DropdownMenuItem
                                    onClick={() => handleBulkExport('csv')}
                                    className="text-white hover:bg-[#1E1F22] cursor-pointer font-mono"
                                >
                                    Export as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleBulkExport('json')}
                                    className="text-white hover:bg-[#1E1F22] cursor-pointer font-mono"
                                >
                                    Export as JSON
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Register Launchpad Button (Task 7.7) */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenRegisterDialog}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            <HugeiconsIcon icon={DatabaseIcon} size={16} />
                            Register Launchpad
                        </Button>
                        
                        {/* Sync All Button */}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleSyncAll}
                            disabled={syncAllLoading}
                            className="bg-[#B392F0] hover:bg-[#9B7AD9] text-black font-mono"
                        >
                            {syncAllLoading ? (
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                            ) : (
                                <HugeiconsIcon icon={RefreshIcon} size={16} />
                            )}
                            Sync All NFTs
                        </Button>
                    </div>
                </div>
                
                {/* Bulk Progress Bar */}
                {bulkProgress && (
                    <BulkOperationProgress
                        total={bulkProgress.total}
                        completed={bulkProgress.completed}
                        failed={bulkProgress.failed}
                        current={bulkProgress.current}
                        operationType="Sync NFTs"
                        className="mt-4"
                    />
                )}
                
                {/* Sync All Progress */}
                {syncAllProgress && (
                    <BulkOperationProgress
                        total={syncAllProgress.total || 1}
                        completed={syncAllProgress.completed}
                        failed={syncAllProgress.failed}
                        current={syncAllProgress.current}
                        operationType="Sync All"
                        className="mt-4"
                    />
                )}
                
                {/* Active Sync Operations (Task 13.1) */}
                {syncProgress.size > 0 && (
                    <SyncProgressList
                        operations={syncProgress}
                        maxVisible={3}
                        className="mt-4"
                    />
                )}
            </Card>

            {/* Table */}
            {isLoading ? (
                <TableSkeleton rows={10} columns={7} />
            ) : (
                <Card className="bg-[#0D0E11] border-[#2F3336]">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#1E1F22] border-b border-[#2F3336]">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Select all"
                                            className={isSomeSelected ? 'data-[state=checked]:bg-[#B392F0]/50' : ''}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">Creator</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">Chain</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">Minted/Supply</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">Volume</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">Last Sync</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">Sync Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1E1F22]">
                                {launchpads.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-gray-400 font-mono">
                                        No collections found
                                    </td>
                                </tr>
                            ) : (
                                launchpads.map((launchpad) => {
                                    const loadingState = syncLoading[launchpad.id] || {};
                                    const anyLoading = isAnySyncLoading(launchpad.id);
                                    const isSelected = selectedIds.has(launchpad.id);
                                    
                                    return (
                                    <tr 
                                        key={launchpad.id} 
                                        className={`hover:bg-[#1E1F22] cursor-pointer ${isSelected ? 'bg-[#1E1F22]/50' : ''}`}
                                        onClick={() => handleRowClick(launchpad.id)}
                                    >
                                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelection(launchpad.id)}
                                                aria-label={`Select ${launchpad.name}`}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-white font-mono">{launchpad.name}</div>
                                            <div className="text-xs text-gray-400 font-mono">{formatAddress(launchpad.contractAddress)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                                            {formatAddress(launchpad.creator)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                                            {getChainName(launchpad.chainId)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={launchpad.status}
                                                onChange={(e) => handleStatusChange(e, launchpad)}
                                                className="text-sm border border-[#2F3336] bg-[#0D0E11] text-white rounded px-2 py-1 font-mono"
                                            >
                                                <option value="ACTIVE">Active</option>
                                                <option value="PAUSED">Paused</option>
                                                <option value="COMPLETED">Completed</option>
                                                <option value="CANCELLED">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                                            {launchpad.mintedCount}/{launchpad.totalMaxSupply}
                                            <div className="text-xs text-gray-500">
                                                {launchpad.mintPercentage.toFixed(1)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium font-mono">
                                            {formatVolume(launchpad.volume)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                                            {formatLastSync(launchpad.lastSyncAt || launchpad.updatedAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <ActionPopover actions={getSyncActions(launchpad)} />
                                        </td>
                                    </tr>
                                    );
                                })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {launchpads.length > 0 && (
                    <div className="px-6 py-4 border-t border-[#2F3336] flex items-center justify-between">
                        <div className="text-sm text-gray-400 font-mono">
                            Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                            {Math.min(pagination.current * pagination.limit, pagination.count)} of{' '}
                            {pagination.count} results
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={pagination.current === 1}
                                className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                            >
                                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                                Previous
                            </Button>
                            <div className="text-sm text-gray-400 font-mono">
                                Page {pagination.current} of {pagination.total}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(pagination.total, p + 1))}
                                disabled={pagination.current === pagination.total}
                                className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                            >
                                Next
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            </Button>
                        </div>
                    </div>
                    )}
                </Card>
            )}

            {/* Status Update Dialog (Task 7.6) */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
                    <DialogHeader>
                        <DialogTitle className="font-mono">Update Collection Status</DialogTitle>
                        <DialogDescription className="text-gray-400 font-mono">
                            {pendingStatusUpdate && (
                                <>
                                    Change status of <span className="text-white">{pendingStatusUpdate.launchpad.name}</span> to{' '}
                                    <span className="text-[#B392F0]">{pendingStatusUpdate.newStatus}</span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        {pendingStatusUpdate?.newStatus === 'ACTIVE' && (
                            <p className="text-sm text-gray-400 font-mono">
                                Would you like to sync NFTs for this collection after updating the status?
                                This will ensure all NFT data is up to date.
                            </p>
                        )}
                        {pendingStatusUpdate?.newStatus === 'COMPLETED' && (
                            <p className="text-sm text-gray-400 font-mono">
                                Would you like to sync the final minted count after updating the status?
                                This will ensure the minted count matches the blockchain.
                            </p>
                        )}
                    </div>
                    
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCancelStatusUpdate}
                            disabled={statusUpdateLoading}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleConfirmStatusUpdate(false)}
                            disabled={statusUpdateLoading}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            {statusUpdateLoading ? (
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                            ) : null}
                            Update Only
                        </Button>
                        <Button
                            onClick={() => handleConfirmStatusUpdate(true)}
                            disabled={statusUpdateLoading}
                            className="bg-[#B392F0] hover:bg-[#9B7AD9] text-black font-mono"
                        >
                            {statusUpdateLoading ? (
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                            ) : (
                                <HugeiconsIcon icon={RefreshIcon} size={16} className="mr-2" />
                            )}
                            Update & Sync
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Register Launchpad Dialog (Task 7.7) */}
            <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
                <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
                    <DialogHeader>
                        <DialogTitle className="font-mono">Register Launchpad</DialogTitle>
                        <DialogDescription className="text-gray-400 font-mono">
                            Add a launchpad that wasn&apos;t auto-discovered to start monitoring.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        {/* Chain Selection */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 font-mono">Chain</label>
                            <CustomSelect
                                options={Object.values(SUPPORTED_CHAINS).map(chain => ({
                                    value: String(chain.id),
                                    label: chain.name,
                                    icon: chain.icon,
                                }))}
                                value={registerChainId}
                                onValueChange={setRegisterChainId}
                                placeholder="Select Chain"
                            />
                        </div>
                        
                        {/* Contract Address Input */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 font-mono">Contract Address</label>
                            <Input
                                placeholder="0x..."
                                value={registerContractAddress}
                                onChange={(e) => setRegisterContractAddress(e.target.value)}
                                className="bg-transparent border-[#2F3336] text-white placeholder:text-gray-500 font-mono"
                            />
                        </div>
                        
                        {/* Error Message */}
                        {registerError && (
                            <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
                                <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                {registerError}
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCloseRegisterDialog}
                            disabled={registerLoading}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRegisterLaunchpad}
                            disabled={registerLoading || !registerChainId || !registerContractAddress}
                            className="bg-[#B392F0] hover:bg-[#9B7AD9] text-black font-mono"
                        >
                            {registerLoading ? (
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                            ) : (
                                <HugeiconsIcon icon={DatabaseIcon} size={16} className="mr-2" />
                            )}
                            Register
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove from Monitoring Confirmation Dialog (Task 7.8) */}
            <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-red-400">Remove from Monitoring</DialogTitle>
                        <DialogDescription className="text-gray-400 font-mono">
                            {pendingRemove && (
                                <>
                                    Are you sure you want to stop monitoring{' '}
                                    <span className="text-white">{pendingRemove.name}</span>?
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <div className="bg-[#1E1F22] border border-[#2F3336] rounded-lg p-4 space-y-2">
                            <p className="text-sm text-gray-400 font-mono">
                                This action will:
                            </p>
                            <ul className="text-sm text-gray-400 font-mono list-disc list-inside space-y-1">
                                <li>Stop monitoring this launchpad for new events</li>
                                <li>Mark the launchpad as &quot;REMOVED&quot; status</li>
                                <li>Preserve all existing data (soft delete)</li>
                            </ul>
                            <p className="text-sm text-yellow-400 font-mono mt-2">
                                You can re-enable monitoring later by registering the launchpad again.
                            </p>
                        </div>
                    </div>
                    
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCloseRemoveDialog}
                            disabled={removeLoading}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmRemove}
                            disabled={removeLoading}
                            className="bg-red-500 hover:bg-red-600 text-white font-mono"
                        >
                            {removeLoading ? (
                                <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                            ) : (
                                <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                            )}
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Historical Rescan Dialog (Task 11.2, 11.3, 11.4) */}
            <Dialog open={rescanDialogOpen} onOpenChange={setRescanDialogOpen}>
                <DialogContent className="bg-[#0D0E11] border-[#2F3336] text-white">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-yellow-400">Rescan Historical Events</DialogTitle>
                        <DialogDescription className="text-gray-400 font-mono">
                            {pendingRescan && (
                                <>
                                    Scan historical blockchain events for{' '}
                                    <span className="text-white">{pendingRescan.name}</span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        {/* Block Range Inputs */}
                        <div className="space-y-2">
                            <Label htmlFor="fromBlock" className="text-sm text-gray-400 font-mono">
                                From Block *
                            </Label>
                            <Input
                                id="fromBlock"
                                type="number"
                                placeholder="e.g., 1000000"
                                value={rescanFromBlock}
                                onChange={(e) => setRescanFromBlock(e.target.value)}
                                disabled={rescanLoading}
                                className="bg-transparent border-[#2F3336] text-white placeholder:text-gray-500 font-mono"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="toBlock" className="text-sm text-gray-400 font-mono">
                                To Block (optional, defaults to latest)
                            </Label>
                            <Input
                                id="toBlock"
                                type="number"
                                placeholder="e.g., 2000000"
                                value={rescanToBlock}
                                onChange={(e) => setRescanToBlock(e.target.value)}
                                disabled={rescanLoading}
                                className="bg-transparent border-[#2F3336] text-white placeholder:text-gray-500 font-mono"
                            />
                        </div>
                        
                        {/* Info Box */}
                        <div className="bg-[#1E1F22] border border-[#2F3336] rounded-lg p-4 space-y-2">
                            <p className="text-sm text-gray-400 font-mono">
                                This will scan historical blockchain events in the specified block range.
                                The process may take several minutes depending on the range.
                            </p>
                            <p className="text-sm text-yellow-400 font-mono">
                                Note: Rate limits will be handled automatically with backoff.
                            </p>
                        </div>
                        
                        {/* Progress Bar (Task 11.3) */}
                        {rescanLoading && rescanProgress !== null && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-gray-400 font-mono">
                                    <span>Scanning blocks...</span>
                                    <span>{rescanProgress}%</span>
                                </div>
                                <Progress value={rescanProgress} className="h-2" />
                            </div>
                        )}
                        
                        {/* Summary (Task 11.4) */}
                        {rescanSummary && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-green-400 font-mono">
                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} />
                                    <span className="font-semibold">Rescan Complete</span>
                                </div>
                                <p className="text-sm text-gray-400 font-mono mt-2">
                                    Found {rescanSummary.eventsFound} events in the specified range
                                </p>
                            </div>
                        )}
                        
                        {/* Error Message */}
                        {rescanError && (
                            <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
                                <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                {rescanError}
                            </div>
                        )}
                    </div>
                    
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCloseRescanDialog}
                            disabled={rescanLoading}
                            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
                        >
                            {rescanSummary ? 'Close' : 'Cancel'}
                        </Button>
                        {!rescanSummary && (
                            <Button
                                onClick={handleStartRescan}
                                disabled={rescanLoading || !rescanFromBlock}
                                className="bg-yellow-500 hover:bg-yellow-600 text-black font-mono"
                            >
                                {rescanLoading ? (
                                    <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin mr-2" />
                                ) : (
                                    <HugeiconsIcon icon={Time03Icon} size={16} className="mr-2" />
                                )}
                                Start Rescan
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Airdrop Modal */}
            {selectedAirdropLaunchpad && (
                <BatchAirdropModal
                    open={airdropDialogOpen}
                    onOpenChange={handleCloseAirdropDialog}
                    launchpadId={selectedAirdropLaunchpad.id}
                    contractAddress={selectedAirdropLaunchpad.contractAddress}
                    chainId={selectedAirdropLaunchpad.chainId}
                    collectionName={selectedAirdropLaunchpad.name}
                    creator={selectedAirdropLaunchpad.creator}
                />
            )}
        </div>
    );
}
