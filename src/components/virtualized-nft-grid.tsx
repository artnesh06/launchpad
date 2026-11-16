'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { NFTMetadata } from '@/types/alchemy';
import { NFTCard } from './nft-card';

interface VirtualizedNFTGridProps {
  nfts: NFTMetadata[];
  loading?: boolean;
  onNFTClick: (nft: NFTMetadata) => void;
  className?: string;
}

const ITEM_HEIGHT = 400; // Approximate height of each NFT card including gap
const OVERSCAN = 2; // Number of rows to render outside viewport

export function VirtualizedNFTGrid({ 
  nfts, 
  loading = false, 
  onNFTClick, 
  className 
}: VirtualizedNFTGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [columns, setColumns] = useState(4);

  // Calculate number of columns based on viewport width
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumns(1);
      } else if (width < 1024) {
        setColumns(2);
      } else {
        setColumns(4);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Calculate visible range based on scroll position
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;
    const containerTop = containerRef.current.offsetTop;

    const startRow = Math.max(0, Math.floor((scrollTop - containerTop) / ITEM_HEIGHT) - OVERSCAN);
    const endRow = Math.ceil((scrollTop + viewportHeight - containerTop) / ITEM_HEIGHT) + OVERSCAN;

    const startIndex = startRow * columns;
    const endIndex = Math.min(nfts.length, endRow * columns);

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [columns, nfts.length]);

  // Update visible range on scroll
  useEffect(() => {
    updateVisibleRange();

    const handleScroll = () => {
      requestAnimationFrame(updateVisibleRange);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateVisibleRange]);

  // Update visible range when NFTs change
  useEffect(() => {
    updateVisibleRange();
  }, [nfts.length, updateVisibleRange]);

  if (loading && nfts.length === 0) {
    return (
      <div className={cn('grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', className)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3"
          >
            <div className="aspect-square w-full animate-pulse rounded-lg border border-[#2F3336] bg-[#1E1F22]" />
            <div className="space-y-2 px-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-[#1E1F22]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#1E1F22]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-[#2F3336] bg-[#0D0E11]">
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-white">No NFTs found</p>
          <p className="mt-2 font-mono text-sm text-[#99A1AF]">
            This collection doesn't have any NFTs yet
          </p>
        </div>
      </div>
    );
  }

  const totalRows = Math.ceil(nfts.length / columns);
  const totalHeight = totalRows * ITEM_HEIGHT;
  const visibleNFTs = nfts.slice(visibleRange.start, visibleRange.end);
  const offsetY = Math.floor(visibleRange.start / columns) * ITEM_HEIGHT;

  return (
    <div 
      ref={containerRef} 
      className={cn('relative', className)}
      style={{ height: `${totalHeight}px` }}
      role="grid"
      aria-label="NFT collection grid"
    >
      <div 
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        style={{ 
          transform: `translateY(${offsetY}px)`,
          position: 'absolute',
          width: '100%'
        }}
      >
        {visibleNFTs.map((nft) => (
          <div key={`${nft.contract.address}-${nft.tokenId}`} role="gridcell">
            <NFTCard
              nft={nft}
              onClick={() => onNFTClick(nft)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
