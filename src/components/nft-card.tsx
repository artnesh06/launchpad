'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { NFTMetadata } from '@/types/alchemy';
import { IpfsImage } from '@/components/ui/ipfs-image';
import { resolveImagePath } from '@/lib/ipfs-utils';

interface NFTCardProps {
  nft: NFTMetadata;
  onClick: () => void;
  className?: string;
}

export function NFTCard({ nft, onClick, className }: NFTCardProps) {
  // Get raw image URL from different sources
  const rawImageUrl = useMemo(() => {
    const imageUrl = nft.image?.cachedUrl ||
      nft.image?.thumbnailUrl ||
      nft.image?.pngUrl ||
      nft.image?.originalUrl ||
      nft.raw?.metadata?.image;
    
    // Resolve relative paths using tokenUri
    return resolveImagePath(imageUrl, nft.tokenUri);
  }, [nft]);

  // Generate fallback text from token ID or name
  const getFallbackText = (): string => {
    if (nft.name) {
      return nft.name.charAt(0)?.toUpperCase() || '?';
    }
    return '#';
  };

  const displayName = nft.name || `#${nft.tokenId}`;

  // Format token ID - handle large numbers and hex format
  const formatTokenId = (id: string) => {
    // Convert hex to decimal if needed
    let displayId = id;
    if (id.startsWith('0x')) {
      displayId = parseInt(id, 16).toString();
    }

    // For very long token IDs, truncate them
    if (displayId.length > 10) {
      return `${displayId.slice(0, 6)}...`;
    }
    return displayId;
  };

  return (
    <Card 
      onClick={onClick}
      className="w-full bg-[#0D0E11] border border-[#2F3336] rounded-[8px] p-0 overflow-hidden flex flex-col gap-2 cursor-pointer hover:bg-[#1E192B] transition-colors"
    >
      {/* NFT Image */}
      <div className="w-full aspect-square bg-gradient-to-br from-[#2D253E] to-[#1E192B] rounded-t-[8px] overflow-hidden relative">
        <IpfsImage
          src={rawImageUrl}
          alt={displayName}
          className="w-full h-full object-cover"
          showLoader={true}
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-white/40 text-6xl font-mono font-bold">
                {getFallbackText()}
              </div>
            </div>
          }
        />
      </div>

      {/* NFT Info */}
      <div className="px-2 pb-2">
        {/* Name and Token ID Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-white text-sm font-medium font-mono leading-[14px] truncate flex-1" title={displayName}>
            {displayName}
          </div>
          <div className="flex items-center gap-1 bg-[#1E192B] rounded-[5px] px-2 py-0.5 h-[19px] flex-shrink-0">
            <svg width="6" height="7" viewBox="0 0 6 7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="6" y1="0" x2="6" y2="7" stroke="#05DF72" strokeWidth="2" />
              <line x1="3" y1="1.56" x2="3" y2="7" stroke="#05DF72" strokeWidth="1" />
              <line x1="0" y1="3.89" x2="0" y2="7" stroke="#05DF72" strokeWidth="2" />
            </svg>
            <span className="text-[#05DF72] text-xs font-normal font-mono leading-none">
              #{formatTokenId(nft.tokenId)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
