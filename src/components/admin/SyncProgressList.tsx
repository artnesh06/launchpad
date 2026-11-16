'use client';

import { SyncProgressIndicator } from './SyncProgressIndicator';

interface SyncProgress {
    operationId: string;
    operationType: string;
    status: 'pending' | 'in_progress' | 'success' | 'failed';
    progress: number;
    total: number;
    processed: number;
    failed: number;
    currentItem?: string;
    message?: string;
    startedAt: Date;
    estimatedCompletion?: Date;
}

interface SyncProgressListProps {
    operations: Map<string, SyncProgress>;
    maxVisible?: number;
    className?: string;
}

/**
 * List of active sync operations with real-time progress
 * Requirements: 3.6, 4.3
 */
export function SyncProgressList({
    operations,
    maxVisible = 5,
    className = '',
}: SyncProgressListProps) {
    const operationsArray = Array.from(operations.values());
    
    // Filter to show only in-progress and recent operations
    const activeOperations = operationsArray
        .filter(op => op.status === 'in_progress' || op.status === 'pending')
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, maxVisible);

    if (activeOperations.length === 0) {
        return null;
    }

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white font-mono">
                    Active Operations
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                    {activeOperations.length} running
                </span>
            </div>
            
            <div className="space-y-2">
                {activeOperations.map((operation) => (
                    <SyncProgressIndicator
                        key={operation.operationId}
                        operationId={operation.operationId}
                        operationType={operation.operationType}
                        status={operation.status}
                        progress={operation.progress}
                        total={operation.total}
                        processed={operation.processed}
                        failed={operation.failed}
                        currentItem={operation.currentItem}
                        message={operation.message}
                    />
                ))}
            </div>
        </div>
    );
}
