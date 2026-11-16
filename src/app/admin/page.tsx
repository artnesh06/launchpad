'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Layers01Icon, Wallet01Icon, Activity01Icon, ArrowUpRight01Icon, ArrowDownRight01Icon, Add01Icon, AlertCircleIcon, BarChartIcon, DollarCircleIcon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useAdminActivity } from '@/hooks/useAdminActivity';
import { StatCardSkeleton } from '@/components/admin/skeletons';
import { PlatformBalanceOverview } from '@/components/admin/platform-balance-overview';
import Link from 'next/link';

export default function AdminDashboard() {
    const { stats, isLoading, error, refetch } = useAdminStats();
    const { 
        activities, 
        isLoading: isLoadingActivities, 
        error: activitiesError, 
        refetch: refetchActivities 
    } = useAdminActivity(10);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white font-mono">Dashboard</h1>
                    <p className="text-gray-400 font-mono">Welcome back to your admin panel</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {isLoading ? (
                    // Loading state - show skeleton cards
                    <>
                        {[1, 2, 3, 4].map((i) => (
                            <StatCardSkeleton key={i} />
                        ))}
                    </>
                ) : error ? (
                    // Error state - show error message
                    <div className="col-span-full">
                        <Alert variant="destructive">
                            <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                            <AlertTitle>Error loading statistics</AlertTitle>
                            <AlertDescription className="flex items-center justify-between">
                                <span>{error.message}</span>
                                <Button variant="outline" size="sm" onClick={refetch}>
                                    Retry
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                ) : stats ? (
                    // Success state - show real data
                    <>
                        <Card className="bg-[#0D0E11] border-[#2F3336]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                                    Total Collections
                                </CardTitle>
                                <HugeiconsIcon icon={Layers01Icon} size={16} className="text-[#B392F0]" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white font-mono">{stats.totalCollections || 0}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                    {stats.volumeChange !== undefined && (
                                        <span className={`flex items-center ${stats.volumeChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {stats.volumeChange >= 0 ? (
                                                <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowDownRight01Icon} size={12} />
                                            )}
                                            {Math.abs(stats.volumeChange)}%
                                        </span>
                                    )}
                                    <span>From last month</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0D0E11] border-[#2F3336]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                                    Total Mints
                                </CardTitle>
                                <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} className="text-[#B392F0]" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white font-mono">{(stats.totalMints || 0).toLocaleString()}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                    {stats.mintsChange !== undefined && (
                                        <span className={`flex items-center ${stats.mintsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {stats.mintsChange >= 0 ? (
                                                <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} />
                                            ) : (
                                                <HugeiconsIcon icon={ArrowDownRight01Icon} size={12} />
                                            )}
                                            {Math.abs(stats.mintsChange)}%
                                        </span>
                                    )}
                                    <span>From last month</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0D0E11] border-[#2F3336]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                                    Total Volume
                                </CardTitle>
                                <HugeiconsIcon icon={Wallet01Icon} size={16} className="text-[#B392F0]" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white font-mono">{stats.totalVolume || '0'} ETH</div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                    <span>All chains</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0D0E11] border-[#2F3336]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-[#B392F0] font-mono">
                                    Active Launchpads
                                </CardTitle>
                                <HugeiconsIcon icon={Activity01Icon} size={16} className="text-[#B392F0]" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white font-mono">{stats.activeLaunchpads || 0}</div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                                    <span>{stats.completedLaunchpads || 0} completed</span>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Activity */}
                <Card className="col-span-4 bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <CardTitle className="text-white font-mono">Recent Activity</CardTitle>
                        <CardDescription className="text-gray-400 font-mono">Latest updates from your platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingActivities ? (
                            // Loading state
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-[200px]" />
                                            <Skeleton className="h-3 w-[150px]" />
                                        </div>
                                        <Skeleton className="h-5 w-[80px]" />
                                    </div>
                                ))}
                            </div>
                        ) : activitiesError ? (
                            // Error state
                            <Alert variant="destructive">
                                <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                                <AlertTitle>Error loading activities</AlertTitle>
                                <AlertDescription className="flex items-center justify-between">
                                    <span>{activitiesError.message}</span>
                                    <Button variant="outline" size="sm" onClick={refetchActivities}>
                                        Retry
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        ) : activities.length === 0 ? (
                            // Empty state
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <HugeiconsIcon icon={Activity01Icon} size={48} className="text-gray-600 mb-4" />
                                <p className="text-sm text-gray-400 font-mono">No recent activity</p>
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                    Activity will appear here as users interact with the platform
                                </p>
                            </div>
                        ) : (
                            // Success state - show real data
                            <div className="space-y-4">
                                {activities.map((activity) => (
                                    <div key={activity.id} className="flex items-center justify-between border-b border-[#2F3336] pb-3 last:border-0 last:pb-0">
                                        <div className="space-y-1 flex-1">
                                            <p className="text-sm font-medium leading-none text-white font-mono">
                                                {activity.type.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-sm text-gray-400 font-mono">
                                                {activity.description}
                                            </p>
                                            {activity.chainName && (
                                                <p className="text-xs text-gray-500 font-mono">
                                                    Chain: {activity.chainName}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs border-[#2F3336] text-gray-400 font-mono">
                                                {(activity as any).relativeTime || 'Recently'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="col-span-3 bg-[#0D0E11] border-[#2F3336]">
                    <CardHeader>
                        <CardTitle className="text-white font-mono">Quick Actions</CardTitle>
                        <CardDescription className="text-gray-400 font-mono">Common tasks and shortcuts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Link href="/admin/banners">
                            <Button variant="outline" className="w-full justify-start border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono">
                                <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                                Create Banner
                            </Button>
                        </Link>
                        <Link href="/admin/collections">
                            <Button variant="outline" className="w-full justify-start border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono">
                                <HugeiconsIcon icon={Layers01Icon} size={16} className="mr-2" />
                                Manage Collections
                            </Button>
                        </Link>
                        <Link href="/admin/platform-fee">
                            <Button variant="outline" className="w-full justify-start border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono">
                                <HugeiconsIcon icon={DollarCircleIcon} size={16} className="mr-2" />
                                Platform Fee
                            </Button>
                        </Link>
                        <Link href="/admin/analytics">
                            <Button variant="outline" className="w-full justify-start border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono">
                                <HugeiconsIcon icon={BarChartIcon} size={16} className="mr-2" />
                                View Analytics
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Fee Balances */}
            <PlatformBalanceOverview />
        </div>
    );
}
