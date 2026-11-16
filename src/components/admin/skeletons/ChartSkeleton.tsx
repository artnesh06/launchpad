import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface ChartSkeletonProps {
  height?: number;
  showTitle?: boolean;
}

export function ChartSkeleton({ height = 300, showTitle = true }: ChartSkeletonProps) {
  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[150px] mt-2" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {/* Chart bars/lines simulation */}
          <div className="flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1"
                style={{
                  height: `${Math.random() * 60 + 40}%`
                }}
              />
            ))}
          </div>
          {/* X-axis labels */}
          <div className="flex justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-12" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
