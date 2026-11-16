'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { NFTMetadata } from '@/types/alchemy';
import { NFTCard } from './nft-card';
import { NFTDetailModal } from './nft-detail-modal';
import { IpfsImage } from '@/components/ui/ipfs-image';

interface NFTGridProps {
  nfts: NFTMetadata[];
  loading?: boolean;
  onNFTClick?: (nft: NFTMetadata) => void;
  className?: string;
  layoutMode?: 'grid' | 'compact-grid' | 'table' | 'compact-table';
}

interface LazyNFTCardProps {
  nft: NFTMetadata;
}

function LazyNFTCard({ nft }: LazyNFTCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get raw image URL from different sources
  const rawImageUrl = useMemo(() => {
    return nft.image?.cachedUrl ||
      nft.image?.thumbnailUrl ||
      nft.image?.pngUrl ||
      nft.image?.originalUrl ||
      nft.raw?.metadata?.image;
  }, [nft]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the element is visible
        threshold: 0.01,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleCardClick = () => {
    setDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setDetailModalOpen(false);
  };

  return (
    <>
      <div ref={cardRef}>
        {isVisible ? (
          <NFTCard nft={nft} onClick={handleCardClick} />
        ) : (
          <div className="aspect-square w-full animate-pulse rounded-lg border border-[#2F3336] bg-muted" />
        )}
      </div>

      {detailModalOpen && (
        <NFTDetailModal
          open={detailModalOpen}
          onClose={handleCloseModal}
          contractAddress={nft.contract.address}
          tokenId={nft.tokenId}
          name={nft.name || `#${nft.tokenId}`}
          image={rawImageUrl}
          collection={{
            name: nft.contract.name,
            symbol: nft.contract.symbol,
          }}
        />
      )}
    </>
  );
}

export function NFTGrid({ nfts, loading = false, className, layoutMode = 'grid' }: NFTGridProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [headerWidth, setHeaderWidth] = useState<number>(0);
  const [headerLeft, setHeaderLeft] = useState<number>(0);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);

  // Sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      if (tableRef.current && headerRef.current && containerRef.current) {
        const tableRect = tableRef.current.getBoundingClientRect();
        
        // Sticky should be active when:
        // 1. Table top is above or at 55px (table has scrolled up enough)
        // 2. Table bottom is still below 55px (table hasn't scrolled past)
        const shouldStick = tableRect.top <= 55 && tableRect.bottom > 55;
        
        // Capture column widths and position BEFORE going sticky
        if (shouldStick && !isSticky) {
          if (headerRef.current) {
            const cells = headerRef.current.querySelectorAll('th');
            const widths = Array.from(cells).map(cell => cell.getBoundingClientRect().width);
            setColumnWidths(widths);
          }
          setHeaderWidth(tableRect.width);
          setHeaderLeft(tableRect.left);
        }
        
        // Update position on scroll even when sticky (important for horizontal scroll)
        if (shouldStick) {
          const currentTableRect = tableRef.current.getBoundingClientRect();
          setHeaderLeft(currentTableRect.left);
          setHeaderWidth(currentTableRect.width);
        }
        
        setIsSticky(shouldStick);
      }
    };

    // Set initial width and trigger initial check
    if (tableRef.current && headerRef.current) {
      const tableRect = tableRef.current.getBoundingClientRect();
      setHeaderWidth(tableRect.width);
      setHeaderLeft(tableRect.left);
      
      // Capture initial column widths
      const cells = headerRef.current.querySelectorAll('th');
      const widths = Array.from(cells).map(cell => cell.getBoundingClientRect().width);
      setColumnWidths(widths);
    }

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isSticky]);

  // Determine grid classes based on layout mode
  const gridClasses = useMemo(() => {
    switch (layoutMode) {
      case 'grid':
        return 'grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      case 'compact-grid':
        return 'grid gap-2 grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
      case 'table':
      case 'compact-table':
        return 'w-full';
      default:
        return 'grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    }
  }, [layoutMode]);

  // Check if table layout
  const isTableLayout = layoutMode === 'table' || layoutMode === 'compact-table';

  if (loading && nfts.length === 0) {
    return (
      <div className={cn(gridClasses, className)}>
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
      <div className="flex min-h-[400px] items-center justify-center rounded-lg bg-[#0D0E11]">
        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-white">No NFTs found</p>
          <p className="mt-2 font-mono text-sm text-[#99A1AF]">
            This collection doesn't have any NFTs yet
          </p>
        </div>
      </div>
    );
  }

  // Table layout
  if (isTableLayout) {
    const isCompact = layoutMode === 'compact-table';
    
    return (
      <div ref={containerRef} className={cn('w-full', className)}>
        <table ref={tableRef} className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead 
            ref={headerRef}
            className={`${isSticky ? 'fixed top-[55px] z-[100] bg-[#0D0E11]/95 backdrop-blur-[8px] border-y border-[#2F3336]' : 'relative'}`}
            style={isSticky ? { 
              width: `${headerWidth}px`,
              left: `${headerLeft}px`,
              tableLayout: 'fixed'
            } : undefined}
          >
            <tr className={`border-0 hover:bg-transparent h-auto ${isCompact ? 'text-xs' : 'text-sm'}`}>
              <th 
                className={`text-[#B392F0] font-normal font-mono h-auto text-left ${isCompact ? 'py-2 px-3' : 'py-2 px-4'} bg-transparent`}
                style={isSticky && columnWidths[0] ? { 
                  width: `${columnWidths[0]}px`, 
                  minWidth: `${columnWidths[0]}px`, 
                  maxWidth: `${columnWidths[0]}px`,
                  boxSizing: 'border-box'
                } : undefined}
              >
                #
              </th>
              <th 
                className={`text-[#B392F0] font-normal font-mono h-auto text-left ${isCompact ? 'py-2 px-3' : 'py-2 px-4'} bg-transparent`}
                style={isSticky && columnWidths[1] ? { 
                  width: `${columnWidths[1]}px`, 
                  minWidth: `${columnWidths[1]}px`, 
                  maxWidth: `${columnWidths[1]}px`,
                  boxSizing: 'border-box'
                } : undefined}
              >
                Item
              </th>
              <th 
                className={`text-[#B392F0] font-normal font-mono h-auto text-left ${isCompact ? 'py-2 px-3' : 'py-2 px-4'} bg-transparent`}
                style={isSticky && columnWidths[2] ? { 
                  width: `${columnWidths[2]}px`, 
                  minWidth: `${columnWidths[2]}px`, 
                  maxWidth: `${columnWidths[2]}px`,
                  boxSizing: 'border-box'
                } : undefined}
              >
                Name
              </th>
              <th 
                className={`text-[#B392F0] font-normal font-mono h-auto text-left ${isCompact ? 'py-2 px-3' : 'py-2 px-4'} bg-transparent`}
                style={isSticky && columnWidths[3] ? { 
                  width: `${columnWidths[3]}px`, 
                  minWidth: `${columnWidths[3]}px`, 
                  maxWidth: `${columnWidths[3]}px`,
                  boxSizing: 'border-box'
                } : undefined}
              >
                Token ID
              </th>
              <th 
                className={`text-[#B392F0] font-normal font-mono h-auto text-left ${isCompact ? 'py-2 px-3' : 'py-2 px-4'} bg-transparent`}
                style={isSticky && columnWidths[4] ? { 
                  width: `${columnWidths[4]}px`, 
                  minWidth: `${columnWidths[4]}px`, 
                  maxWidth: `${columnWidths[4]}px`,
                  boxSizing: 'border-box'
                } : undefined}
              >
                Owner
              </th>
              <th 
                className={`text-[#B392F0] font-normal font-mono h-auto text-left ${isCompact ? 'py-2 px-3' : 'py-2 px-4'} bg-transparent`}
                style={isSticky && columnWidths[5] ? { 
                  width: `${columnWidths[5]}px`, 
                  minWidth: `${columnWidths[5]}px`, 
                  maxWidth: `${columnWidths[5]}px`,
                  boxSizing: 'border-box'
                } : undefined}
              >
                Minted
              </th>
              <th 
                className={`text-[#B392F0] font-normal font-mono h-auto text-left ${isCompact ? 'py-2 px-3' : 'py-2 px-4'} bg-transparent`}
                style={isSticky && columnWidths[6] ? { 
                  width: `${columnWidths[6]}px`, 
                  minWidth: `${columnWidths[6]}px`, 
                  maxWidth: `${columnWidths[6]}px`,
                  boxSizing: 'border-box'
                } : undefined}
              >
                Tx Hash
              </th>
            </tr>
          </thead>

          {/* Spacer when header is fixed */}
          {isSticky && (
            <thead style={{ height: headerRef.current?.offsetHeight || 0, visibility: 'hidden' }}>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
          )}

          <tbody>
            {nfts.map((nft, index) => {
              const rawImageUrl = nft.image?.cachedUrl ||
                nft.image?.thumbnailUrl ||
                nft.image?.pngUrl ||
                nft.image?.originalUrl ||
                nft.raw?.metadata?.image;
              
              // Resolve relative image paths using tokenUri (no hook needed here)
              const { resolveImagePath } = require('@/lib/ipfs-utils');
              const resolvedImageUrl = resolveImagePath(rawImageUrl, nft.tokenUri);
              
              const attributes = nft.raw?.metadata?.attributes || [];
              const attributeCount = Array.isArray(attributes) ? attributes.length : 0;
              
              // Format mint info (if available)
              const mintAddress = nft.mint?.mintAddress;
              const formattedMinter = mintAddress 
                ? `${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`
                : '-';
              
              const mintTimestamp = nft.mint?.timestamp;
              const formattedMintDate = mintTimestamp 
                ? new Date(mintTimestamp).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })
                : '-';
              
              const mintBlockNumber = nft.mint?.blockNumber;
              const mintTxHash = nft.mint?.transactionHash;
              
              // Format last updated timestamp (fallback)
              const lastUpdated = nft.timeLastUpdated;
              const formattedLastUpdated = lastUpdated 
                ? new Date(lastUpdated).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })
                : '-';
              
              const formattedTime = lastUpdated
                ? new Date(lastUpdated).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : '';

              return (
                <tr 
                  key={`${nft.contract.address}-${nft.tokenId}`}
                  className="border-0 cursor-pointer group relative transition-all duration-300 hover:bg-[#1E192B]"
                  onClick={() => {
                    // Open modal or navigate
                  }}
                >
                  <td 
                    className={`text-[#99A1AF] font-mono ${isCompact ? 'text-xs py-3 px-3' : 'text-sm py-5 px-4'}`}
                    style={isSticky && columnWidths[0] ? { 
                      width: `${columnWidths[0]}px`, 
                      minWidth: `${columnWidths[0]}px`, 
                      maxWidth: `${columnWidths[0]}px`,
                      boxSizing: 'border-box'
                    } : undefined}
                  >
                    {index + 1}
                  </td>
                  <td 
                    className={isCompact ? 'py-1.5 px-3' : 'py-1.5 px-4'}
                    style={isSticky && columnWidths[1] ? { 
                      width: `${columnWidths[1]}px`, 
                      minWidth: `${columnWidths[1]}px`, 
                      maxWidth: `${columnWidths[1]}px`,
                      boxSizing: 'border-box'
                    } : undefined}
                  >
                    <div className={`${isCompact ? 'w-10 h-10' : 'w-16 h-16'} rounded-[5px] overflow-hidden bg-[#2D253E] flex-shrink-0`}>
                      <IpfsImage
                        src={resolvedImageUrl}
                        alt={nft.name || `#${nft.tokenId}`}
                        className="w-full h-full object-cover rounded-[5px]"
                        fallback={
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className={`${isCompact ? 'w-4 h-4' : 'w-6 h-6'} text-[#6A7282]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        }
                      />
                    </div>
                  </td>
                  <td 
                    className={`font-mono ${isCompact ? 'text-xs py-3 px-3' : 'text-sm py-5 px-4'} text-white`}
                    style={isSticky && columnWidths[2] ? { 
                      width: `${columnWidths[2]}px`, 
                      minWidth: `${columnWidths[2]}px`, 
                      maxWidth: `${columnWidths[2]}px`,
                      boxSizing: 'border-box'
                    } : undefined}
                  >
                    <div className="text-white font-medium leading-tight truncate max-w-[200px]">
                      {nft.name || 'Unnamed'}
                    </div>
                    {nft.description && !isCompact && (
                      <div className="text-[#6A7282] text-xs truncate max-w-[200px] mt-0.5">
                        {nft.description}
                      </div>
                    )}
                  </td>
                  <td 
                    className={`font-mono ${isCompact ? 'text-xs py-3 px-3' : 'text-sm py-5 px-4'} text-white`}
                    style={isSticky && columnWidths[3] ? { 
                      width: `${columnWidths[3]}px`, 
                      minWidth: `${columnWidths[3]}px`, 
                      maxWidth: `${columnWidths[3]}px`,
                      boxSizing: 'border-box'
                    } : undefined}
                  >
                    #{nft.tokenId}
                  </td>
                  <td 
                    className={`font-mono ${isCompact ? 'text-xs py-3 px-3' : 'text-sm py-5 px-4'} text-white`}
                    style={isSticky && columnWidths[4] ? { 
                      width: `${columnWidths[4]}px`, 
                      minWidth: `${columnWidths[4]}px`, 
                      maxWidth: `${columnWidths[4]}px`,
                      boxSizing: 'border-box'
                    } : undefined}
                  >
                    <span className="text-white font-medium leading-tight">
                      {formattedMinter}
                    </span>
                  </td>
                  <td 
                    className={`font-mono ${isCompact ? 'text-xs py-3 px-3' : 'text-sm py-5 px-4'} text-white`}
                    style={isSticky && columnWidths[5] ? { 
                      width: `${columnWidths[5]}px`, 
                      minWidth: `${columnWidths[5]}px`, 
                      maxWidth: `${columnWidths[5]}px`,
                      boxSizing: 'border-box'
                    } : undefined}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-medium leading-tight">
                        {mintTimestamp ? formattedMintDate : formattedLastUpdated}
                      </span>
                      {formattedTime && !isCompact && (
                        <span className="text-[#6A7282] text-xs">
                          {formattedTime}
                        </span>
                      )}
                    </div>
                  </td>
                  <td 
                    className={`font-mono ${isCompact ? 'text-xs py-3 px-3' : 'text-sm py-5 px-4'} text-white`}
                    style={isSticky && columnWidths[6] ? { 
                      width: `${columnWidths[6]}px`, 
                      minWidth: `${columnWidths[6]}px`, 
                      maxWidth: `${columnWidths[6]}px`,
                      boxSizing: 'border-box'
                    } : undefined}
                  >
                    {mintTxHash ? (
                      <a 
                        href={`https://etherscan.io/tx/${mintTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B392F0] hover:text-[#D4B5FF] transition-colors inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Tx ↗
                      </a>
                    ) : (
                      <span className="text-[#6A7282]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Grid layout
  return (
    <div className={cn(gridClasses, className)}>
      {nfts.map((nft) => (
        <LazyNFTCard
          key={`${nft.contract.address}-${nft.tokenId}`}
          nft={nft}
        />
      ))}
    </div>
  );
}
