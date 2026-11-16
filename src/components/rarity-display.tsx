'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { NFTRarity } from '@/types/alchemy';

interface RarityDisplayProps {
  rarity: NFTRarity;
  totalSupply: number;
  className?: string;
}

export function RarityDisplay({ rarity, totalSupply, className }: RarityDisplayProps) {
  // Calculate percentile (lower rank = more rare)
  const percentile = ((rarity.rank / rarity.maxRank) * 100).toFixed(1);
  
  // Determine rarity tier based on percentile
  const getRarityTier = (percentile: number): { label: string; color: string } => {
    if (percentile <= 1) return { label: 'Legendary', color: 'text-yellow-500' };
    if (percentile <= 5) return { label: 'Epic', color: 'text-purple-500' };
    if (percentile <= 15) return { label: 'Rare', color: 'text-blue-500' };
    if (percentile <= 40) return { label: 'Uncommon', color: 'text-green-500' };
    return { label: 'Common', color: 'text-muted-foreground' };
  };

  const tier = getRarityTier(parseFloat(percentile));

  return (
    <div className={cn('space-y-4 rounded-lg border border-[#2F3336] bg-[#0D0E11] p-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-lg font-bold text-white">Rarity</h3>
        <span className={cn('font-mono text-sm font-bold', tier.color)}>
          {tier.label}
        </span>
      </div>

      <div className="space-y-4">
        {/* Rank */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-[#B392F0]">Rank</span>
            <span className="font-mono text-sm font-semibold text-white">
              #{rarity.rank} / {rarity.maxRank}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#1E1F22]">
            <div
              className="h-full bg-[#B392F0] transition-all"
              style={{ width: `${100 - parseFloat(percentile)}%` }}
            />
          </div>
        </div>

        {/* Rarity Score */}
        <div className="flex items-center justify-between rounded-lg bg-[#1E1F22] p-3">
          <span className="font-mono text-sm text-[#B392F0]">Rarity Score</span>
          <span className="font-mono text-sm font-semibold text-white">
            {rarity.rarityScore.toFixed(2)}
          </span>
        </div>

        {/* Percentile */}
        <div className="flex items-center justify-between rounded-lg bg-[#1E1F22] p-3">
          <span className="font-mono text-sm text-[#B392F0]">Top Percentile</span>
          <span className="font-mono text-sm font-semibold text-white">
            {percentile}%
          </span>
        </div>

        {/* Total Supply Context */}
        <div className="pt-2 text-center">
          <p className="font-mono text-xs text-[#99A1AF]">
            Out of {totalSupply.toLocaleString()} total NFTs
          </p>
        </div>
      </div>
    </div>
  );
}
