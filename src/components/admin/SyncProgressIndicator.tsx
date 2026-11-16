'use client';

import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, CheckmarkCircle02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';

interface SyncProgressIndicatorProps {
    operationId: string;
    operationType: string;
    status: 'pending' | 'in_progress' | 'success' | 'failed';
    progress: number; // 0-100
    total?: number;
    processed?: number;
    failed?: number;
    currentItem?: string;
    message?: string;
    className?: string;
}

/**
 * Real-time sync progress indicator component
 * Requirements: 3.6, 4.3
 */
export function SyncProgressIndicator({
    operationId,
    operationType,
    status,
    progress,
    total,
    processed,
    failed,
    currentItem,
    message,
    className = '',
}: SyncProgressIndicatorProps) {
    const getStatusIcon = () => {
        switch (status) {
            case 'in_progress':
                return <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin text-blue-400" />;
            case 'success':
                return <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-green-400" />;
            case 'failed':
                return <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-red-400" />;
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'in_progress':
                return 'text-blue-400';
            case 'success':
                return 'text-green-400';
            case 'failed':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'pending':
                return 'Pending';
            case 'in_progress':
                return 'In Progress';
            case 'success':
                return 'Completed';
            case 'failed':
                return 'Failed';
            default:
                return 'Unknown';
        }
    };

    return (
        <Card className={`bg-[#0D0E11] border-[#2F3336] p-4 ${className}`}>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <span className="text-sm font-medium text-white font-mono">
                            {operationType}
                        </span>
                    </div>
                    <span className={`text-xs font-mono ${getStatusColor()}`}>
                        {getStatusText()}
                    </span>
                </div>

                {/* Progress Bar */}
                {status === 'in_progress' && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}

                {/* Stats */}
                {(total !== undefined || processed !== undefined) && (
                    <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                        {total !== undefined && processed !== undefined && (
                            <span>
                                {processed}/{total} items
                            </span>
                        )}
                        {failed !== undefined && failed > 0 && (
                            <span className="text-red-400">
                                {failed} failed
                            </span>
                        )}
                    </div>
                )}

                {/* Current Item */}
                {currentItem && status === 'in_progress' && (
                    <div className="text-xs text-gray-500 font-mono truncate">
                        Processing: {currentItem}
                    </div>
                )}

                {/* Message */}
                {message && (
                    <div className={`text-xs font-mono ${status === 'failed' ? 'text-red-400' : 'text-gray-400'}`}>
                        {message}
                    </div>
                )}
            </div>
        </Card>
    );
}
