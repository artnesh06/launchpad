'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/custom-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon } from '@hugeicons/core-free-icons';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { ChartSkeleton, TableSkeleton } from '@/components/admin/skeletons';
import { toast } from 'sonner';

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const { analytics, isLoading, error, refetch } = useAdminAnalytics({ days, chainId });

  const handleExport = async (type: string) => {
    try {
      const params = new URLSearchParams({ type });
      if (chainId) params.append('chainId', chainId.toString());
      if (type === 'analytics') params.append('days', days.toString());

      const response = await fetch(`/api/admin/analytics/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export completed successfully');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export data');
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">Analytics</h1>
          <p className="text-gray-400 font-mono">Platform analytics and insights</p>
        </div>
        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <p className="text-red-400 font-mono">Failed to load analytics</p>
            <Button onClick={() => refetch()} className="bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono">Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">Analytics</h1>
          <p className="text-gray-400 font-mono">Platform analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <CustomSelect
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            value={String(days)}
            onValueChange={(v) => setDays(Number(v))}
            containerClassName="w-40"
          />
          <CustomSelect
            options={[
              { value: 'all', label: 'All Chains' },
              { value: '1', label: 'Ethereum' },
              { value: '8453', label: 'Base' },
              { value: '11155111', label: 'Sepolia' },
            ]}
            value={chainId?.toString() || 'all'}
            onValueChange={(v) => setChainId(v === 'all' ? undefined : Number(v))}
            containerClassName="w-40"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-6">
          <ChartSkeleton height={300} showTitle={true} />
          <ChartSkeleton height={300} showTitle={true} />
          <TableSkeleton rows={5} columns={6} />
          <TableSkeleton rows={5} columns={5} />
        </div>
      ) : (
        <>
          {/* Volume Over Time Chart */}
          <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white font-mono">Volume Over Time</h2>
                <p className="text-sm text-gray-400 font-mono">Total trading volume in ETH</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('analytics')}
                className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
              >
                <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
                Export
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics?.volumeOverTime || []}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [`${value.toFixed(4)} ETH`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Mints Over Time Chart */}
          <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white font-mono">Mints Over Time</h2>
                <p className="text-sm text-gray-400 font-mono">Number of NFTs minted per day</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.mintsOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [value, 'Mints']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Mints"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Collections Table */}
          <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white font-mono">Top Collections by Volume</h2>
                <p className="text-sm text-gray-400 font-mono">Highest performing collections</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('top-collections')}
                className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
              >
                <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
                Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Contract Address</TableHead>
                    <TableHead className="text-right">Volume (ETH)</TableHead>
                    <TableHead className="text-right">Mints</TableHead>
                    <TableHead>Chain</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.topCollections && analytics.topCollections.length > 0 ? (
                    analytics.topCollections.map((collection, index) => (
                      <TableRow key={collection.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{collection.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {collection.contractAddress.slice(0, 6)}...
                          {collection.contractAddress.slice(-4)}
                        </TableCell>
                        <TableCell className="text-right">{collection.volume}</TableCell>
                        <TableCell className="text-right">{collection.mints}</TableCell>
                        <TableCell>{collection.chainId}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No collections found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Top Creators Table */}
          <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white font-mono">Top Creators by Volume</h2>
                <p className="text-sm text-gray-400 font-mono">Most successful creators</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('top-creators')}
                className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
              >
                <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
                Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Creator Address</TableHead>
                    <TableHead className="text-right">Total Volume (ETH)</TableHead>
                    <TableHead className="text-right">Collections</TableHead>
                    <TableHead className="text-right">Total Mints</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.topCreators && analytics.topCreators.length > 0 ? (
                    analytics.topCreators.map((creator, index) => (
                      <TableRow key={creator.address}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {creator.address.slice(0, 6)}...{creator.address.slice(-4)}
                        </TableCell>
                        <TableCell className="text-right">{creator.totalVolume}</TableCell>
                        <TableCell className="text-right">
                          {creator.totalCollections}
                        </TableCell>
                        <TableCell className="text-right">{creator.totalMints}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        No creators found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
