'use client';

import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, CheckmarkCircle02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';

interface BulkOperationProgressProps {
    total: number;
    completed: number;
    failed: number;
    current?: string;
    operationType: string;
    className?: string;
}

/**
 * Bulk operation progress indicator
 * Requirements: 4.3
 */
export function BulkOperationProgress({
    total,
    completed,
    failed,
    current,
    operationType,
    className = '',
}: BulkOperationProgressProps) {
    const progress = total > 0 ? (completed / total) * 100 : 0;
    const isComplete = completed === total;
    const hasFailures = failed > 0;

    return (
        <Card className={`bg-[#0D0E11] border-[#2F3336] p-4 ${className}`}>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isComplete ? (
                            hasFailures ? (
                                <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-yellow-400" />
                            ) : (
                                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-green-400" />
                            )
                        ) : (
                            <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin text-blue-400" />
                        )}
                        <span className="text-sm font-medium text-white font-mono">
                            Bulk {operationType}
                        </span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">
                        {completed}/{total} completed
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                        <span>{Math.round(progress)}%</span>
                        {failed > 0 && (
                            <span className="text-red-400">
                                {failed} failed
                            </span>
                        )}
                    </div>
                </div>

                {/* Current Item */}
                {current && !isComplete && (
                    <div className="text-xs text-gray-500 font-mono truncate">
                        Processing: {current}
                    </div>
                )}

                {/* Completion Message */}
                {isComplete && (
                    <div className={`text-xs font-mono ${hasFailures ? 'text-yellow-400' : 'text-green-400'}`}>
                        {hasFailures
                            ? `Completed with ${failed} failure${failed !== 1 ? 's' : ''}`
                            : 'All operations completed successfully'}
                    </div>
                )}
            </div>
        </Card>
    );
}
