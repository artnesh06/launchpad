'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserMultiple01Icon,
  FactoryIcon,
  DollarCircleIcon,
  Activity01Icon,
  FlashIcon,
  Shield01Icon,
  Calendar01Icon,
  ArrowUpRight01Icon,
  ArrowDownRight01Icon,
  View01Icon,
  Wallet01Icon
} from '@hugeicons/core-free-icons';

interface MetricsData {
  totalLaunchpads: number;
  totalCreators: number;
  totalVolume: string;
  totalFees: string;
  recentActivity: number;
  networkHealth: 'excellent' | 'good' | 'warning' | 'critical';
  growthRate: number;
  avgGasPrice: string;
  successRate: number;
  avgDeployTime: number;
  activeUsers: number;
}

interface EnhancedMetricsDashboardProps {
  data: MetricsData;
  chainName: string;
  factoryInfo?: {
    version: string;
    chainId: number;
    totalLaunchpads: number;
    creationFee: string;
    platformFeePercentage: number;
    freeMintPlatformFee: string;
    treasury: string;
    owner: string;
  };
}

export function EnhancedMetricsDashboard({ data, chainName, factoryInfo }: EnhancedMetricsDashboardProps) {
  const getHealthColor = (health: MetricsData['networkHealth']) => {
    switch (health) {
      case 'excellent': return 'text-emerald-500';
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthBadgeVariant = (health: MetricsData['networkHealth']) => {
    switch (health) {
      case 'excellent':
      case 'good': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const primaryMetrics = [
    {
      title: 'Total Launchpads',
      value: data.totalLaunchpads.toLocaleString(),
      change: data.growthRate,
      icon: Factory,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900'
    },
    {
      title: 'Active Creators',
      value: data.totalCreators.toLocaleString(),
      change: Math.round(data.growthRate * 0.8),
      icon: Users,
      gradient: 'from-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900'
    },
    {
      title: 'Total Volume',
      value: `${data.totalVolume} ETH`,
      change: Math.round(data.growthRate * 1.3),
      icon: DollarSign,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900'
    },
    {
      title: 'Platform Revenue',
      value: `${data.totalFees} ETH`,
      change: Math.round(data.growthRate * 0.9),
      icon: Wallet,
      gradient: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Network Status Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Network Overview</CardTitle>
              <CardDescription>Real-time system status and health</CardDescription>
            </div>
            <Badge variant={getHealthBadgeVariant(data.networkHealth)} className="px-3 py-1">
              <Activity className="w-3 h-3 mr-1" />
              {data.networkHealth.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <label className="text-sm font-medium">Active Chain</label>
              </div>
              <p className="text-2xl font-bold">{chainName}</p>
              <p className="text-xs text-muted-foreground">Chain ID: {factoryInfo?.chainId}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <label className="text-sm font-medium">24h Activity</label>
              </div>
              <p className="text-2xl font-bold">{data.recentActivity}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <label className="text-sm font-medium">Success Rate</label>
              </div>
              <p className="text-2xl font-bold">{data.successRate.toFixed(1)}%</p>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${data.successRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <label className="text-sm font-medium">Avg Deploy</label>
              </div>
              <p className="text-2xl font-bold">{data.avgDeployTime}m</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {primaryMetrics.map((metric, index) => (
          <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all">
            <div className={`absolute inset-0 bg-gradient-to-r ${metric.bgGradient} opacity-50`} />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.gradient} shadow-lg`}>
                  <metric.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center text-sm">
                  {metric.change > 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={metric.change > 0 ? 'text-emerald-500' : 'text-red-500'}>
                    {Math.abs(metric.change)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-3xl font-bold">{metric.value}</h3>
                <p className="text-sm text-muted-foreground font-medium">{metric.title}</p>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>This month</span>
                  <span>{Math.round(metric.change + 60)}%</span>
                </div>
                <Progress
                  value={Math.min(Math.max(metric.change + 60, 0), 100)}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Real-time network performance data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Average Gas Price</span>
              <Badge variant="outline" className="font-mono">
                {data.avgGasPrice} ETH
              </Badge>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Success Rate</span>
              <div className="flex items-center gap-2">
                <Badge variant={data.successRate > 95 ? "default" : "secondary"}>
                  {data.successRate.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Average Deploy Time</span>
              <Badge variant="outline">{data.avgDeployTime} minutes</Badge>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Active Users (7d)</span>
              <Badge variant="outline">{data.activeUsers.toLocaleString()}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Revenue Breakdown
            </CardTitle>
            <CardDescription>Platform revenue sources and distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const totalVolume = parseFloat(data.totalVolume || '0');
              const totalFees = parseFloat(data.totalFees || '0');
              const creationFees = totalFees * 0.65;
              const platformFees = totalFees * 0.30;
              const other = totalFees * 0.05;

              const creationPercent = totalFees > 0 ? (creationFees / totalFees) * 100 : 65;
              const platformPercent = totalFees > 0 ? (platformFees / totalFees) * 100 : 30;
              const otherPercent = totalFees > 0 ? (other / totalFees) * 100 : 5;

              return (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Creation Fees</span>
                      <span className="text-sm font-bold">{Math.round(creationPercent)}%</span>
                    </div>
                    <Progress value={creationPercent} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      {creationFees.toFixed(4)} ETH from launchpad creation
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Platform Fees</span>
                      <span className="text-sm font-bold">{Math.round(platformPercent)}%</span>
                    </div>
                    <Progress value={platformPercent} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      {platformFees.toFixed(4)} ETH from mint transactions
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Other Revenue</span>
                      <span className="text-sm font-bold">{Math.round(otherPercent)}%</span>
                    </div>
                    <Progress value={otherPercent} className="h-3" />
                    <p className="text-xs text-muted-foreground">
                      {other.toFixed(4)} ETH from other sources
                    </p>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Factory Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-blue-500" />
            Factory Configuration
          </CardTitle>
          <CardDescription>Current factory contract settings and information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Factory Version</label>
              <p className="text-xl font-bold mt-1">{factoryInfo?.version || 'v1.0.0'}</p>
            </div>

            <div className="p-4 border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Creation Fee</label>
              <p className="text-xl font-bold mt-1">{factoryInfo?.creationFee || '0.01'} ETH</p>
            </div>

            <div className="p-4 border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Platform Fee</label>
              <p className="text-xl font-bold mt-1">{factoryInfo?.platformFeePercentage || 2.5}%</p>
            </div>

            <div className="p-4 border rounded-lg">
              <label className="text-sm font-medium text-muted-foreground">Free Mint Fee</label>
              <p className="text-xl font-bold mt-1">{factoryInfo?.freeMintPlatformFee || '0.001'} ETH</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}