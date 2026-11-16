'use client';

import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { Time03Icon } from '@hugeicons/core-free-icons';

interface QueuePositionIndicatorProps {
    position: number;
    totalInQueue: number;
    estimatedWaitTime?: number; // in seconds
    className?: string;
}

/**
 * Queue position indicator for pending operations
 * Requirements: 8.4
 */
export function QueuePositionIndicator({
    position,
    totalInQueue,
    estimatedWaitTime,
    className = '',
}: QueuePositionIndicatorProps) {
    const formatWaitTime = (seconds: number): string => {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    };

    return (
        <Badge
            variant="outline"
            className={`border-[#2F3336] bg-[#1E1F22] text-yellow-400 font-mono ${className}`}
        >
            <HugeiconsIcon icon={Time03Icon} size={12} className="mr-1" />
            <span className="text-xs">
                Queue: {position}/{totalInQueue}
                {estimatedWaitTime !== undefined && (
                    <span className="ml-1 text-gray-400">
                        (~{formatWaitTime(estimatedWaitTime)})
                    </span>
                )}
            </span>
        </Badge>
    );
}
