'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MiniChart } from './mini-chart';
import { useRouter } from 'next/navigation';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { LiveDataFooter } from './live-data-footer';
import { getChainName } from '@/config/chains';
import { formatPrice as formatPriceUtil, formatVolume } from '@/lib/format-utils';
import { NFTHoldingGrid, type NFTHoldingGridRef } from './nft-holding-grid';
import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';
import { TrendingTableSkeleton } from '@/components/skeletons/trending-table-skeleton';
import { MintDrawer } from '@/components/mint-drawer';
import { useHomepageSocket } from '@/hooks/useHomepageSocket';
import { AnimatedCounter } from '@/components/animated-counter';

interface Phase {
  id: string;
  name: string;
  phaseType: string;
  startTime: string;
  endTime: string;
  price: string;
  maxPerWallet: number;
  totalLimit: number;
  mintedCount: number;
  isActive: boolean;
  merkleRoot?: string;
  requiresWhitelist: boolean;
  phaseIndex?: number;
}

interface NFTCollection {
  rank: number;
  name: string;
  collection: string;
  mintPrice: string;
  minted: string;
  mintedCount: number; // Add numeric value for animation
  totalSupply: number; // Add total supply for animation
  minted24h?: number;
  holders: number;
  volume: string;
  volumeNumeric: number; // Add numeric value for animation
  change: number;
  avatar: string;
  image?: string;
  launchpadId: string;
  contractAddress: string;
  chainId: number;
  chartData?: Array<{
    timestamp: string;
    volume: number;
    mints: number;
  }>;
  phases?: Phase[];
  activePhase?: Phase;
}

interface LaunchpadData {
  id: string;
  contractAddress: string;
  creator: string;
  name: string;
  symbol: string;
  description?: string;
  totalMaxSupply: number;
  mintedCount: number;
  volume: number;
  status: string;
  createdAt: string;
  chainId: number;
  mintPrice?: number;
  metadata?: {
    image?: string;
    coverImage?: string;
  };
  analytics?: {
    uniqueHolders?: number;
    volumeChange24h?: number;
    minted24h?: number;
  };
  chartData24h?: Array<{
    timestamp: string;
    volume: number;
    mints: number;
  }>;
  volumeChange24h?: number;
  phases?: Phase[];
}

interface CollectionTableProps {
  collections: NFTCollection[];
  loading: boolean;
  ethPrice: number | null;
}

interface CollectionTableProps {
  collections: NFTCollection[];
  loading: boolean;
  ethPrice: number | null;
  onSort: (sortBy: string) => void;
  currentSort: { field: string; order: 'asc' | 'desc' };
  isConnected: boolean;
  address: string | undefined;
  switchChain: any;
  currentChainId: number;
}

function CollectionTable({ collections, loading, ethPrice, onSort, currentSort, isConnected, address, switchChain, currentChainId }: CollectionTableProps) {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [mintDrawerOpen, setMintDrawerOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<NFTCollection | null>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [headerWidth, setHeaderWidth] = useState<number>(0);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current && tableRef.current) {
        const headerRect = headerRef.current.getBoundingClientRect();
        const tableRect = tableRef.current.getBoundingClientRect();
        
        // Sticky should be active when:
        // 1. Table top is above or at 55px (table has scrolled up enough)
        // 2. Table bottom is still below 55px (table hasn't scrolled past)
        const shouldStick = tableRect.top <= 55 && tableRect.bottom > 55;
        
        // Capture column widths before going sticky
        if (shouldStick && !isSticky && headerRef.current) {
          const cells = headerRef.current.querySelectorAll('th');
          const widths = Array.from(cells).map(cell => cell.offsetWidth);
          setColumnWidths(widths);
          setHeaderWidth(tableRef.current.offsetWidth);
        }
        
        setIsSticky(shouldStick);
      }
    };

    // Set initial width
    if (tableRef.current) {
      setHeaderWidth(tableRef.current.offsetWidth);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isSticky]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const handleRowClick = (collection: NFTCollection) => {
    // Check if collection is sold out
    const mintedParts = collection.minted.split('/');
    const currentMinted = parseInt(mintedParts[0].replace(/,/g, ''));
    const totalSupply = parseInt(mintedParts[1].replace(/,/g, ''));
    const isSoldOut = currentMinted >= totalSupply;

    // Navigate to launchpad if not sold out, otherwise to collection page
    const targetUrl = isSoldOut 
      ? `/collection/${collection.contractAddress}`
      : `/l/${collection.contractAddress}`;
    
    console.log('Navigating to:', targetUrl, `(Sold out: ${isSoldOut})`);
    router.push(targetUrl);
  };

  const handleOpenMintDrawer = (collection: NFTCollection, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If drawer is already open for the same collection, close it
    if (mintDrawerOpen && selectedCollection?.contractAddress === collection.contractAddress) {
      handleCloseMintDrawer();
    } else {
      // Otherwise, open drawer for this collection
      setSelectedCollection(collection);
      setMintDrawerOpen(true);
    }
  };

  const handleCloseMintDrawer = () => {
    setMintDrawerOpen(false);
    setSelectedCollection(null);
  };



  const getSortIcon = (field: string) => {
    if (currentSort.field !== field || currentSort.field === 'trending') {
      return <span className="ml-1 text-[#6A7282]">↕</span>;
    }
    return currentSort.order === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };



  return (
    <Card className="bg-transparent border-none rounded-none p-0">
      <div className="relative">
        <Table ref={tableRef}>
          <TableHeader 
            ref={headerRef}
            className={`${isSticky ? 'fixed top-[55px] z-[100] bg-[#0D0E11]/60 backdrop-blur-[8px] border-b border-[#2F3336]' : 'relative '}`}
            style={isSticky ? { 
              width: `${headerWidth}px`,
              left: '50%',
              transform: 'translateX(-50%)'
            } : undefined}
          >
            <TableRow className="border-none hover:bg-transparent h-auto">
              <TableHead 
                className={`text-[#B392F0] text-sm font-normal font-mono h-auto py-2 px-4 w-[60px] ${isSticky ? 'bg-transparent' : 'bg-transparent'}`}
                style={isSticky && columnWidths[0] ? { width: `${columnWidths[0]}px`, minWidth: `${columnWidths[0]}px`, maxWidth: `${columnWidths[0]}px` } : undefined}
              >
                #
              </TableHead>
              <TableHead 
                className={`text-[#B392F0] text-sm font-normal font-mono h-auto py-2 px-4 ${isSticky ? 'bg-transparent' : 'bg-transparent'}`}
                style={isSticky && columnWidths[1] ? { width: `${columnWidths[1]}px`, minWidth: `${columnWidths[1]}px`, maxWidth: `${columnWidths[1]}px` } : undefined}
              >
                Name
              </TableHead>
              <TableHead 
                className={`text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-3 w-[110px] cursor-pointer hover:text-white transition-colors select-none ${isSticky ? 'bg-transparent' : 'bg-transparent'}`}
                onClick={() => onSort('mintPrice')}
                style={isSticky && columnWidths[2] ? { width: `${columnWidths[2]}px`, minWidth: `${columnWidths[2]}px`, maxWidth: `${columnWidths[2]}px` } : undefined}
              >
                Mint Price{getSortIcon('mintPrice')}
              </TableHead>
              <TableHead 
                className={`text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-3 w-[110px] cursor-pointer hover:text-white transition-colors select-none ${isSticky ? 'bg-transparent' : 'bg-transparent'}`}
                onClick={() => onSort('holders')}
                style={isSticky && columnWidths[3] ? { width: `${columnWidths[3]}px`, minWidth: `${columnWidths[3]}px`, maxWidth: `${columnWidths[3]}px` } : undefined}
              >
                Holders{getSortIcon('holders')}
              </TableHead>
              <TableHead 
                className={`text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-3 w-[110px] cursor-pointer hover:text-white transition-colors select-none ${isSticky ? 'bg-transparent' : 'bg-transparent'}`}
                onClick={() => onSort('minted')}
                style={isSticky && columnWidths[4] ? { width: `${columnWidths[4]}px`, minWidth: `${columnWidths[4]}px`, maxWidth: `${columnWidths[4]}px` } : undefined}
              >
                Minted{getSortIcon('minted')}
              </TableHead>
              <TableHead 
                className={`text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-3 w-[110px] cursor-pointer hover:text-white transition-colors select-none ${isSticky ? 'bg-transparent' : 'bg-transparent'}`}
                onClick={() => onSort('volume')}
                style={isSticky && columnWidths[5] ? { width: `${columnWidths[5]}px`, minWidth: `${columnWidths[5]}px`, maxWidth: `${columnWidths[5]}px` } : undefined}
              >
                Volume{getSortIcon('volume')}
              </TableHead>
              <TableHead 
                className={`text-[#B392F0] text-sm font-normal text-right font-mono h-auto py-2 px-4 w-[110px] ${isSticky ? 'bg-transparent' : 'bg-transparent'}`}
                style={isSticky && columnWidths[6] ? { width: `${columnWidths[6]}px`, minWidth: `${columnWidths[6]}px`, maxWidth: `${columnWidths[6]}px` } : undefined}
              >
                Chart
              </TableHead>
            </TableRow>
          </TableHeader>
          {/* Spacer when header is fixed */}
          {isSticky && <thead style={{ height: headerRef.current?.offsetHeight, visibility: 'hidden' }}><tr><th></th></tr></thead>}
        <TableBody>
          {collections.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-[#99A1AF]">
                No collections found
              </TableCell>
            </TableRow>
          ) : (
            collections.map((collection) => {
              const isDrawerOpen = mintDrawerOpen && selectedCollection?.contractAddress === collection.contractAddress;
              const isHovered = hoveredRow === collection.rank;
              const shouldHighlight = isDrawerOpen || isHovered;
              
              // Check if collection is sold out
              const mintedParts = collection.minted.split('/');
              const currentMinted = parseInt(mintedParts[0].replace(/,/g, ''));
              const totalSupply = parseInt(mintedParts[1].replace(/,/g, ''));
              const isSoldOut = currentMinted >= totalSupply;
              
              return (
              <TableRow
                key={collection.rank}
                onClick={() => handleRowClick(collection)}
                onMouseEnter={() => setHoveredRow(collection.rank)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`border-0 cursor-pointer group relative transition-all duration-300 hover:bg-[#1E192B] ${
                  shouldHighlight ? 'bg-[#1E192B]' : ''
                }`}
              >
                <TableCell className="text-[#99A1AF] text-sm py-[20px] px-4 font-mono w-[60px]">
                  {collection.rank}
                </TableCell>
                <TableCell className="py-[7.5px] px-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-16 h-16 bg-[#2D253E] rounded-[5px] flex-shrink-0">
                      {collection.image ? (
                        <AvatarImage
                          src={collection.image}
                          alt={collection.name}
                          className="object-cover rounded-[5px]"
                        />
                      ) : null}
                      <AvatarFallback className="bg-[#2D253E] text-2xl rounded-[5px]">
                        {collection.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="text-white font-medium text-base font-mono leading-tight truncate">
                        {collection.name.length > 20 ? collection.name.substring(0, 20) + '...' : collection.name}
                      </div>
                      <Badge variant="outline" className="text-[#6A7282] text-xs border-none bg-transparent px-0 font-medium w-fit h-5 flex items-center justify-center">
                        {collection.collection}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right py-[11.5px] px-3 w-[110px]">
                  <div className="text-white text-sm font-medium font-mono whitespace-nowrap leading-5">{formatPriceUtil(collection.mintPrice)} ETH</div>
                  <div className="text-[#6A7282] text-xs font-mono whitespace-nowrap leading-5">
                    {ethPrice ? formatPrice(parseFloat(collection.mintPrice) * ethPrice) : '0'} USD
                  </div>
                </TableCell>
                <TableCell className="text-right text-white text-sm py-[11.5px] px-3 font-mono relative w-[110px]">
                  <div className={`transition-opacity leading-5 ${shouldHighlight && !isSoldOut ? 'opacity-0' : ''}`}>
                    <AnimatedCounter value={collection.holders} className="text-white text-sm font-medium font-mono" />
                  </div>
                  <div className={`transition-opacity leading-5 ${shouldHighlight && !isSoldOut ? 'opacity-0' : ''}`}>&nbsp;</div>
                  {!isSoldOut && (
                    <button 
                      className={`absolute right-0 inset-0 flex items-center justify-center gap-1.5 transition-all duration-200 bg-white text-black font-bold text-base px-6 py-1 rounded-md mx-auto w-fit h-fit my-auto hover:shadow-lg hover:shadow-white/20 active:scale-95 ${
                        shouldHighlight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                      }`}
                      onClick={(e) => handleOpenMintDrawer(collection, e)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8.5 1L3 9H8L7.5 15L13 7H8L8.5 1Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
                      </svg>
                      MINT
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-right py-[11.5px] px-3 w-[110px]">
                  <div className="text-white text-sm font-medium font-mono whitespace-nowrap leading-5 transition-all duration-300">
                    <AnimatedCounter 
                      value={collection.mintedCount} 
                      className="text-white text-sm font-medium font-mono"
                      formatter={(v) => `${v.toLocaleString()}/${collection.totalSupply.toLocaleString()}`}
                    />
                  </div>
                  <div className={`text-xs font-mono whitespace-nowrap leading-5 transition-all duration-300 ${(collection?.minted24h ?? 0) >= 0 ? 'text-[#05DF72]' : 'text-red-400'
                    }`}>
                    <AnimatedCounter 
                      value={collection.minted24h || 0}
                      className="text-xs font-mono"
                      formatter={(v) => `${v > 0 ? '+' : ''}${v}`}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-right py-[11.5px] px-3 w-[110px]">
                  <div className="text-white text-sm font-medium font-mono whitespace-nowrap leading-5">
                    <AnimatedCounter 
                      value={collection.volumeNumeric}
                      className="text-white text-sm font-medium font-mono"
                      formatter={(v) => `${formatVolume(v)} ETH`}
                    />
                  </div>
                  <div className="text-[#6A7282] text-xs font-mono whitespace-nowrap leading-5">
                    {ethPrice ? formatPrice(collection.volumeNumeric * ethPrice) : '0'} USD
                  </div>
                </TableCell>
                <TableCell className="text-right py-[18px] px-4 w-[110px]">
                  <div className="flex items-center justify-end">
                    <MiniChart chartData={collection.chartData} width={67} height={20} />
                  </div>
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
      </div>

      {/* Mint Drawer */}
      <MintDrawer
        open={mintDrawerOpen}
        onClose={handleCloseMintDrawer}
        collection={selectedCollection}
        isConnected={isConnected}
        address={address}
        switchChain={switchChain}
        currentChainId={currentChainId}
      />
    </Card>
  );
}

// Helper function to map LaunchpadData to NFTCollection
function mapLaunchpadToCollection(launchpad: LaunchpadData, index: number): NFTCollection {
  const chainName = getChainName(launchpad.chainId);

  // Safely convert to number with validation
  const mintPrice = typeof launchpad.mintPrice === 'number' 
    ? launchpad.mintPrice 
    : (launchpad.mintPrice ? Number(launchpad.mintPrice) : 0);
  
  // Volume is already in ETH from API (volume 7d)
  // Ensure we handle all possible data types (number, string, undefined, null)
  let volume = 0;
  if (typeof launchpad.volume === 'number') {
    volume = launchpad.volume;
  } else if (typeof launchpad.volume === 'string') {
    const parsed = parseFloat(launchpad.volume);
    volume = isNaN(parsed) ? 0 : parsed;
  }
  
  const holders = launchpad.analytics?.uniqueHolders || 0;
  const volumeChange = typeof launchpad.analytics?.volumeChange24h === 'number'
    ? launchpad.analytics.volumeChange24h
    : (launchpad.analytics?.volumeChange24h ? Number(launchpad.analytics.volumeChange24h) : 0);

  // Generate avatar from first letter of name
  const avatar = launchpad.name?.charAt(0)?.toUpperCase() || '?';

  // Get cover image from metadata and convert IPFS to HTTP
  const coverImageRaw = launchpad.metadata?.image || launchpad.metadata?.coverImage;
  const coverImage = coverImageRaw ? ipfsToHttp(coverImageRaw) : undefined;

  // Get active phase
  const activePhase = launchpad.phases?.find(phase => phase.isActive);

  return {
    rank: index + 1,
    name: launchpad.name || 'Unknown',
    collection: chainName,
    mintPrice: formatPriceUtil(mintPrice),
    minted: `${launchpad.mintedCount || 0}/${(launchpad.totalMaxSupply || 0).toLocaleString()}`,
    mintedCount: launchpad.mintedCount || 0,
    totalSupply: launchpad.totalMaxSupply || 0,
    minted24h: launchpad.analytics?.minted24h,
    holders: holders,
    volume: formatVolume(volume),
    volumeNumeric: volume,
    change: launchpad.volumeChange24h || volumeChange,
    avatar: avatar,
    image: coverImage || undefined,
    launchpadId: launchpad.id,
    contractAddress: launchpad.contractAddress,
    chainId: launchpad.chainId,
    chartData: launchpad.chartData24h,
    phases: launchpad.phases,
    activePhase: activePhase
  };
}

interface NFTTrendingTableProps {
  chainFilter?: number | 'all';
}

function NFTTrendingTableInner({ chainFilter = 'all' }: NFTTrendingTableProps) {
  // Wagmi hooks
  const { isConnected, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const currentChainId = useChainId();
  
  const [trendingCollections, setTrendingCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  
  // Pagination states
  const [trendingLimit, setTrendingLimit] = useState(10);
  const [trendingTotal, setTrendingTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Sorting states - default to minted24h desc (trending by 24h activity)
  const [sortField, setSortField] = useState<string>('minted24h');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Holding tab pagination states
  const [holdingHasMore, setHoldingHasMore] = useState(false);
  const [holdingLoading, setHoldingLoading] = useState(false);
  const holdingGridRef = useRef<NFTHoldingGridRef>(null);

  // AbortController ref to cancel previous requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Track previous values to detect actual changes
  const prevChainFilterRef = useRef(chainFilter);
  const prevSortFieldRef = useRef(sortField);
  const prevSortOrderRef = useRef(sortOrder);
  
  // Store current limit in ref to avoid stale closures
  const trendingLimitRef = useRef(trendingLimit);
  useEffect(() => {
    trendingLimitRef.current = trendingLimit;
  }, [trendingLimit]);

  // WebSocket hook for real-time updates
  const { latestMint, trendingUpdates, isConnected: wsConnected } = useHomepageSocket({
    chainFilter: chainFilter,
    enabled: true,
  });

  const fetchCollections = useCallback(async (isRefresh = false, isLoadMore = false) => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      // Only show loading state on initial load, not on refresh or load more
      if (!isRefresh && !isLoadMore) {
        setLoading(true);
      }

      // Use ref value to get current limit without causing re-renders
      const currentTrendingLimit = trendingLimitRef.current;

      // Build query params based on chainFilter
      // Don't send chainId parameter when filter is 'all' to get all chains
      const params = new URLSearchParams({
        limit: currentTrendingLimit.toString(),
        status: 'active',
        sortBy: sortField === 'trending' ? 'trending' : sortField === 'minted' ? 'mintedCount' : sortField === 'holders' ? 'analytics.uniqueHolders' : sortField === 'minted24h' ? 'minted24h' : sortField,
        sortOrder: sortOrder,
        // Send client timezone offset so server can calculate correct "today"
        tzOffset: new Date().getTimezoneOffset().toString(),
      });

      // Only add chainId if not 'all'
      if (chainFilter !== 'all') {
        params.append('chainId', chainFilter.toString());
      }
      
      // Fetch trending collections (active status, sorted by selected field)
      const trendingResponse = await fetch(
        `/api/admin/launchpads?${params.toString()}`,
        { signal: abortController.signal }
      );
      const trendingResult = await trendingResponse.json();

      if (!trendingResponse.ok) {
        console.error('Trending API error:', trendingResult);
        console.error('Error details:', trendingResult.details);
      }

      if (trendingResult.success && trendingResult.data.items) {
        const mappedTrending = trendingResult.data.items.map((lp: LaunchpadData, index: number) =>
          mapLaunchpadToCollection(lp, index)
        );
        setTrendingCollections(mappedTrending);
        setTrendingTotal(trendingResult.data.pagination?.count || mappedTrending.length);
      } else {
        setTrendingCollections([]);
        setTrendingTotal(0);
      }


    } catch (error) {
      // Ignore abort errors (they're expected when switching chains quickly)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted (chain switched)');
        return;
      }
      
      console.error('Failed to fetch collections:', error);
      // Only clear collections on initial load error, keep existing data on refresh error
      if (!isRefresh) {
        setTrendingCollections([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsInitialLoad(false);
    }
  }, [chainFilter, sortField, sortOrder]);

  // Handle real-time mint updates from WebSocket - fetch fresh data from API
  useEffect(() => {
    if (latestMint && latestMint.contractAddress) {
      console.log('[NFTTrendingTable] Real-time mint update, fetching fresh data:', latestMint.contractAddress);
      
      // Fetch fresh data for this collection from API
      const fetchCollectionData = async () => {
        try {
          const params = new URLSearchParams({
            contractAddress: latestMint.contractAddress,
            tzOffset: new Date().getTimezoneOffset().toString(),
          });
          
          const response = await fetch(`/api/admin/launchpads?${params.toString()}`);
          const result = await response.json();
          
          if (result.success && result.data.items && result.data.items.length > 0) {
            const updatedLaunchpad = result.data.items[0];
            
            setTrendingCollections(prev => {
              // Check if collection exists in current view
              const collectionIndex = prev.findIndex(
                c => c.contractAddress.toLowerCase() === latestMint.contractAddress.toLowerCase()
              );
              
              // Only update if collection is in current view (don't reset pagination)
              if (collectionIndex === -1) {
                return prev; // Collection not in current view, don't update
              }
              
              return prev.map(collection => {
                if (collection.contractAddress.toLowerCase() === latestMint.contractAddress.toLowerCase()) {
                  // Map the fresh data to collection format
                  const updatedCollection = mapLaunchpadToCollection(updatedLaunchpad, collection.rank - 1);
                  
                  console.log('[NFTTrendingTable] Updated collection from API:', {
                    name: updatedCollection.name,
                    oldMinted: collection.minted,
                    newMinted: updatedCollection.minted,
                    oldVolume: collection.volume,
                    oldVolumeNumeric: collection.volumeNumeric,
                    newVolume: updatedCollection.volume,
                    newVolumeNumeric: updatedCollection.volumeNumeric,
                    rawVolume: updatedLaunchpad.volume,
                  });
                  
                  return {
                    ...updatedCollection,
                    rank: collection.rank, // Preserve rank
                  };
                }
                return collection;
              });
            });
          }
        } catch (error) {
          console.error('[NFTTrendingTable] Failed to fetch updated collection data:', error);
        }
      };
      
      fetchCollectionData();
    }
  }, [latestMint]);

  // Handle trending updates from WebSocket - fetch fresh data from API
  useEffect(() => {
    if (trendingUpdates && trendingUpdates.length > 0) {
      // Get unique contract addresses from updates
      const addressesToUpdate = Array.from(new Set(trendingUpdates.map(u => u.contractAddress.toLowerCase())));
      
      // Fetch fresh data for each updated collection
      addressesToUpdate.forEach(async (contractAddress) => {
        try {
          const params = new URLSearchParams({
            contractAddress: contractAddress,
            tzOffset: new Date().getTimezoneOffset().toString(),
          });
          
          const response = await fetch(`/api/admin/launchpads?${params.toString()}`);
          const result = await response.json();
          
          if (result.success && result.data.items && result.data.items.length > 0) {
            const updatedLaunchpad = result.data.items[0];
            
            setTrendingCollections(prev => {
              // Check if collection exists in current view
              const collectionIndex = prev.findIndex(
                c => c.contractAddress.toLowerCase() === contractAddress
              );
              
              // Only update if collection is in current view (don't reset pagination)
              if (collectionIndex === -1) {
                return prev; // Collection not in current view, don't update
              }
              
              return prev.map(collection => {
                if (collection.contractAddress.toLowerCase() === contractAddress) {
                  const updatedCollection = mapLaunchpadToCollection(updatedLaunchpad, collection.rank - 1);
                  return {
                    ...updatedCollection,
                    rank: collection.rank,
                  };
                }
                return collection;
              });
            });
          }
        } catch (error) {
          console.error('[NFTTrendingTable] Failed to fetch updated collection data:', error);
        }
      });
    }
  }, [trendingUpdates]);

  // Fetch ETH price using fallback API
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('/api/crypto-price?symbol=ETH&currency=USD');
        const data = await response.json();
        if (data.success && data.data?.price) {
          setEthPrice(data.data.price);
        }
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    };

    fetchEthPrice();
    
    // Update price every 60 seconds
    const priceInterval = setInterval(fetchEthPrice, 60000);
    
    return () => clearInterval(priceInterval);
  }, []);

  useEffect(() => {
    // Check if chain or sort actually changed
    const chainChanged = prevChainFilterRef.current !== chainFilter;
    const sortChanged = prevSortFieldRef.current !== sortField || prevSortOrderRef.current !== sortOrder;
    
    // Reset pagination ONLY when chain or sort actually changes
    if (chainChanged || sortChanged) {
      console.log('[NFTTrendingTable] Resetting pagination due to filter/sort change');
      setTrendingLimit(10);
      
      // Update refs
      prevChainFilterRef.current = chainFilter;
      prevSortFieldRef.current = sortField;
      prevSortOrderRef.current = sortOrder;
    }
    
    // Debounce the fetch to avoid race conditions
    const timer = setTimeout(() => {
      console.log('[NFTTrendingTable] Fetching collections (initial/filter change)');
      fetchCollections(false, false);
    }, 300);

    // Auto-refresh every 30 seconds (pass true to indicate it's a refresh)
    // Don't reset pagination on auto-refresh
    const interval = setInterval(() => {
      console.log('[NFTTrendingTable] Auto-refresh (30s interval)');
      fetchCollections(true, false);
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      // Abort any pending requests when component unmounts or chain changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainFilter, sortField, sortOrder]);

  // Fetch when trendingLimit changes (for load more)
  useEffect(() => {
    if (loadingMore) {
      console.log('[NFTTrendingTable] Load more triggered, limit:', trendingLimitRef.current);
      fetchCollections(false, true);
    }
    // Only run when loadingMore flag changes, not when fetchCollections changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore]);

  // Load more handlers
  const handleLoadMoreTrending = () => {
    console.log('[NFTTrendingTable] Load more button clicked');
    setLoadingMore(true);
    setTrendingLimit(prev => prev + 10);
  };

  const handleLoadMoreHolding = () => {
    if (holdingGridRef.current) {
      holdingGridRef.current.loadMore();
    }
  };

  // Handle holding grid pagination state updates
  const handleHoldingPaginationUpdate = (hasMore: boolean, loading: boolean) => {
    setHoldingHasMore(hasMore);
    setHoldingLoading(loading);
  };

  // Handle sorting with 3 states: asc -> desc -> reset to default (trending)
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: desc -> asc -> reset to default
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else if (sortOrder === 'asc') {
        // Reset to default (trending)
        setSortField('trending');
        setSortOrder('desc');
      }
    } else {
      // Set new field with default desc order
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const [activeTab, setActiveTab] = useState('trending');

  return (
    <Tabs defaultValue="trending" onValueChange={setActiveTab} className="border border-[#2F3336]">
      {/* Tab Headers */}
      <TabsList className="bg-transparent px-5 h-auto w-auto rounded-none pt-[22px] pb-[18px]">
        <TabsTrigger
          value="trending"
          className="bg-transparent border-0 rounded-none px-0 mr-8 data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:text-[#B392F0] text-[#6A7282] hover:text-white text-base data-[state=active]:shadow-none font-mono"
        >
          Trending
        </TabsTrigger>
        <TabsTrigger
          value="holding"
          className="bg-transparent border-0 rounded-none px-0 data-[state=active]:font-semibold data-[state=active]:bg-transparent data-[state=active]:text-[#B392F0] text-[#6A7282] hover:text-white text-base data-[state=active]:shadow-none font-mono"
        >
          Holdings
        </TabsTrigger>
      </TabsList>

      {/* Tab Contents */}
      <TabsContent value="trending" className='!mt-0 !mb-0'>
        {loading ? (
          <TrendingTableSkeleton />
        ) : (
          <CollectionTable 
            collections={trendingCollections} 
            loading={loading} 
            ethPrice={ethPrice}
            onSort={handleSort}
            currentSort={{ field: sortField, order: sortOrder }}
            isConnected={isConnected}
            address={address}
            switchChain={switchChain}
            currentChainId={currentChainId}
          />
        )}
      </TabsContent>

      <TabsContent value="holding" className='!mt-0 !mb-0'>
        <NFTHoldingGrid 
          ref={holdingGridRef}
          chainFilter={chainFilter}
          onLoadMore={handleHoldingPaginationUpdate}
        />
      </TabsContent>

      {/* Live Data Footer with Load More - Show for both tabs */}
      <LiveDataFooter 
        onLoadMore={activeTab === 'trending' ? handleLoadMoreTrending : handleLoadMoreHolding}
        hasMore={activeTab === 'trending' ? trendingCollections.length < trendingTotal : holdingHasMore}
        loading={activeTab === 'trending' ? loadingMore : holdingLoading}
      />
    </Tabs>
  );
}

// Export with WagmiReadyGuard wrapper
export function NFTTrendingTable(props: NFTTrendingTableProps) {
  return (
    <WagmiReadyGuard>
      <NFTTrendingTableInner {...props} />
    </WagmiReadyGuard>
  );
}