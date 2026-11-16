'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Search01Icon, 
  FilterIcon, 
  Download01Icon, 
  ArrowUpRight01Icon, 
  View01Icon, 
  MoreHorizontalIcon,
  Calendar01Icon,
  UserMultiple01Icon,
  Coins01Icon
} from '@hugeicons/core-free-icons';
import { formatVolume } from '@/lib/format-utils';

interface LaunchpadInfo {
  launchpadAddress: string;
  creator: string;
  name: string;
  symbol: string;
  createdAt: number;
  totalSupply: number;
  mintedCount?: number;
  volume?: number;
  status: 'active' | 'completed' | 'paused';
}

interface LaunchpadTableProps {
  launchpads: LaunchpadInfo[];
  onRefresh?: () => void;
  chainName: string;
  blockExplorer: string;
}

export function LaunchpadTable({ 
  launchpads, 
  onRefresh, 
  chainName, 
  blockExplorer 
}: LaunchpadTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'volume' | 'supply'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedLaunchpads = useMemo(() => {
    let filtered = launchpads.filter(launchpad => {
      const matchesSearch = launchpad.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           launchpad.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           launchpad.creator.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || launchpad.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'volume':
          comparison = (a.volume || 0) - (b.volume || 0);
          break;
        case 'supply':
          comparison = a.totalSupply - b.totalSupply;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [launchpads, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getStatusColor = (status: LaunchpadInfo['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'paused': return 'destructive';
      default: return 'outline';
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Symbol', 'Creator', 'Address', 'Created', 'Supply', 'Volume', 'Status'],
      ...filteredAndSortedLaunchpads.map(lp => [
        lp.name,
        lp.symbol,
        lp.creator,
        lp.launchpadAddress,
        new Date(lp.createdAt).toISOString(),
        lp.totalSupply.toString(),
        (lp.volume || 0).toString(),
        lp.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `launchpads-${chainName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Heading title="Launchpad Management" description={`${filteredAndSortedLaunchpads.length} of ${launchpads.length} launchpads on ${chainName}`} />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, symbol, or creator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('active')}
          >
            Active
          </Button>
          <Button
            variant={filterStatus === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('completed')}
          >
            Completed
          </Button>
          <Button
            variant={filterStatus === 'paused' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('paused')}
          >
            Paused
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="font-semibold"
                >
                  Collection
                  {sortBy === 'name' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </th>
              <th className="text-left py-3 px-2">Creator</th>
              <th className="text-left py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('supply')}
                  className="font-semibold"
                >
                  Supply
                  {sortBy === 'supply' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </th>
              <th className="text-left py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('volume')}
                  className="font-semibold"
                >
                  Volume
                  {sortBy === 'volume' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('created')}
                  className="font-semibold"
                >
                  Created
                  {sortBy === 'created' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              </th>
              <th className="text-right py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLaunchpads.map((launchpad) => (
              <tr key={launchpad.launchpadAddress} className="border-b hover:bg-muted/50">
                <td className="py-4 px-2">
                  <div>
                    <div className="font-medium">{launchpad.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {launchpad.symbol}
                      </Badge>
                      {launchpad.mintedCount && (
                        <span className="text-xs text-muted-foreground">
                          {launchpad.mintedCount} minted
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="font-mono text-sm">
                    {launchpad.creator.slice(0, 6)}...{launchpad.creator.slice(-4)}
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">
                      {launchpad.totalSupply.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">
                      {launchpad.volume ? `${formatVolume(launchpad.volume)} ETH` : 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <Badge variant={getStatusColor(launchpad.status)}>
                    {launchpad.status}
                  </Badge>
                </td>
                <td className="py-4 px-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(launchpad.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`${blockExplorer}/address/${launchpad.launchpadAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedLaunchpads.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No launchpads found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredAndSortedLaunchpads.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div>
              Total Supply: {filteredAndSortedLaunchpads.reduce((acc, lp) => acc + lp.totalSupply, 0).toLocaleString()}
            </div>
            <div>
              Total Volume: {formatVolume(filteredAndSortedLaunchpads.reduce((acc, lp) => acc + (lp.volume || 0), 0))} ETH
            </div>
            <div>
              Active: {filteredAndSortedLaunchpads.filter(lp => lp.status === 'active').length}
            </div>
            <div>
              Completed: {filteredAndSortedLaunchpads.filter(lp => lp.status === 'completed').length}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}