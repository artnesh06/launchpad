'use client';

import { TableRow, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MiniChart } from './mini-chart';
import { useIpfsToHttp } from '@/hooks/useIpfsToHttp';
import { formatPrice, formatVolume } from '@/lib/format-utils';

interface TrendingCollectionRowProps {
  rank: number;
  launchpad: any;
  chainName: string;
  onClick: () => void;
}

export function TrendingCollectionRow({ 
  rank, 
  launchpad, 
  chainName, 
  onClick 
}: TrendingCollectionRowProps) {
  // Generate avatar from first letter of name
  const avatar = launchpad.name?.charAt(0)?.toUpperCase() || '?';
  
  // Get cover image from metadata
  const coverImageRaw = launchpad.metadata?.image || launchpad.metadata?.coverImage;
  
  // Convert IPFS to HTTP via API
  const { httpUrl: coverImage } = useIpfsToHttp(coverImageRaw);

  // Safely convert to number
  const mintPrice = typeof launchpad.mintPrice === 'number' 
    ? launchpad.mintPrice 
    : Number(launchpad.mintPrice) || 0;
  
  // Convert volume from Wei to ETH
  const volumeInWei = typeof launchpad.volume === 'number' 
    ? launchpad.volume 
    : Number(launchpad.volume) || 0;
  const volume = volumeInWei / 1e18;
  
  const holders = launchpad.analytics?.uniqueHolders || 0;
  const volumeChange = typeof launchpad.analytics?.volumeChange24h === 'number'
    ? launchpad.analytics.volumeChange24h
    : Number(launchpad.analytics?.volumeChange24h) || 0;

  const minted24h = launchpad.analytics?.minted24h;
  const change = launchpad.volumeChange24h || volumeChange;

  return (
    <TableRow 
      onClick={onClick}
      className="border-b border-[#2F3336] hover:bg-[#1E192B] cursor-pointer transition-colors"
    >
      {/* Rank */}
      <TableCell className="text-[#8B949E] text-sm font-mono">
        {rank}
      </TableCell>

      {/* Collection */}
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 bg-[#2D253E] rounded-[5px]">
            {coverImage ? (
              <AvatarImage 
                src={coverImage} 
                alt={launchpad.name} 
                className="object-cover rounded-[5px]"
              />
            ) : null}
            <AvatarFallback className="bg-[#2D253E] rounded-[5px]">
              {avatar}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-white text-sm font-medium font-mono">
              {launchpad.name || 'Unknown'}
            </div>
            <div className="text-[#8B949E] text-xs font-mono">
              {chainName}
            </div>
          </div>
        </div>
      </TableCell>

      {/* Mint Price */}
      <TableCell className="text-white text-sm font-mono">
        {formatPrice(mintPrice)}
      </TableCell>

      {/* Minted */}
      <TableCell>
        <div className="text-white text-sm font-mono">
          {launchpad.mintedCount || 0}/{(launchpad.totalMaxSupply || 0).toLocaleString()}
        </div>
        {minted24h !== undefined && minted24h !== null && (
          <div className="text-[#8B949E] text-xs font-mono mt-1">
            +{minted24h} today
          </div>
        )}
      </TableCell>

      {/* Holders */}
      <TableCell className="text-white text-sm font-mono">
        {holders.toLocaleString()}
      </TableCell>

      {/* Volume */}
      <TableCell>
        <div className="text-white text-sm font-mono">
          {formatVolume(volume)}
        </div>
        {change !== 0 && (
          <Badge 
            variant={change >= 0 ? 'default' : 'destructive'}
            className={`mt-1 ${change >= 0 ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}`}
          >
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </Badge>
        )}
      </TableCell>

      {/* Chart */}
      <TableCell>
        {launchpad.chartData24h && launchpad.chartData24h.length > 0 ? (
          <MiniChart chartData={launchpad.chartData24h} />
        ) : (
          <div className="text-[#8B949E] text-xs font-mono">No data</div>
        )}
      </TableCell>
    </TableRow>
  );
}
