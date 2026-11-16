'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Breadcrumb } from '@/components/breadcrumb';
import { CollectionHeader } from '@/components/collection-header';
import { NFTGrid } from '@/components/nft-grid';
import { VirtualizedNFTGrid } from '@/components/virtualized-nft-grid';
import { AttributeFilters } from '@/components/attribute-filters';
import { Button } from '@/components/ui/button';
import { NFTMetadata, ContractMetadata, NFTAttributeSummary } from '@/types/alchemy';
import { Loading01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { generateCollectionStructuredData } from '@/lib/seo-utils';
import { ipfsToHttp } from '@/lib/ipfs-utils';

interface MintPhase {
  id: number | string;
  name: string;
  phaseType: string;
  startTime: string;
  endTime: string | null;
  price: string;
  maxMintPerWallet: number;
  totalLimit: number;
  mintedCount: number;
  isActive: boolean;
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
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  chainId: number;
  treasury?: string;
  royaltyRecipient?: string;
  royaltyPercentage?: number;
  metadata?: {
    image?: string;
    bannerImage?: string;
  };
  phases?: MintPhase[];
}

interface CollectionAPIResponse {
  success: boolean;
  data?: {
    nfts: NFTMetadata[];
    pageKey?: string;
    collection: ContractMetadata;
    launchpadData?: LaunchpadData | null;
  };
  error?: string;
  message?: string;
}

interface AttributeFiltersType {
  [traitType: string]: string[];
}

interface AttributesAPIResponse {
  success: boolean;
  data?: NFTAttributeSummary;
  error?: string;
}

interface CollectionPageProps {
  params: Promise<{
    address: string;
  }>;
}

// Fetch collection data from API
async function fetchCollectionData(
  address: string,
  page: number = 1
): Promise<CollectionAPIResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: '100',
  });

  const response = await fetch(`/api/nft/collection/${address}?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch collection data');
  }

  return response.json();
}

// Fetch collection attributes from API
async function fetchCollectionAttributes(
  address: string
): Promise<AttributesAPIResponse> {
  const response = await fetch(`/api/nft/collection/${address}/attributes`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch collection attributes');
  }

  return response.json();
}

function CollectionPageContent({ address }: { address: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address: userAddress } = useAccount();
  const [allNFTs, setAllNFTs] = useState<NFTMetadata[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<AttributeFiltersType>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'compact-grid' | 'table' | 'compact-table'>('grid');

  // Validate address format
  useEffect(() => {
    if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      // Invalid address format - trigger not found
      notFound();
    }
  }, [address]);

  // Fetch initial collection data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['collection', address, currentPage],
    queryFn: () => fetchCollectionData(address, currentPage),
    enabled: !!address,
  });

  // Fetch collection attributes for filtering
  const { data: attributesData } = useQuery({
    queryKey: ['collection-attributes', address],
    queryFn: () => fetchCollectionAttributes(address),
    enabled: !!address,
  });

  // Initialize filters and search from URL on mount
  useEffect(() => {
    const attributesParam = searchParams.get('attributes');
    const searchParam = searchParams.get('search');

    if (attributesParam) {
      try {
        const parsedFilters = JSON.parse(decodeURIComponent(attributesParam));
        setFilters(parsedFilters);
      } catch (e) {
        console.error('Failed to parse filters from URL:', e);
      }
    }

    if (searchParam) {
      setSearchQuery(decodeURIComponent(searchParam));
    }
  }, [searchParams]);

  // Update URL when filters or search change
  useEffect(() => {
    const params = new URLSearchParams();

    if (Object.keys(filters).length > 0) {
      params.set('attributes', encodeURIComponent(JSON.stringify(filters)));
    }

    if (searchQuery) {
      params.set('search', encodeURIComponent(searchQuery));
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }, [filters, searchQuery]);

  // Update NFTs when data changes
  useEffect(() => {
    if (data?.data?.nfts) {
      if (currentPage > 1) {
        // Append to existing NFTs for pagination
        setAllNFTs((prev) => [...prev, ...data.data!.nfts]);
      } else {
        // Replace NFTs for initial load
        setAllNFTs(data.data.nfts);
      }

      // Check if there are more pages
      setHasMore(!!data.data.pageKey);
    }
  }, [data, currentPage]);

  // Apply filters and search to NFTs
  const filteredNFTs = useMemo(() => {
    let filtered = allNFTs;

    // Note: Holding filter removed as NFTMetadata doesn't include ownership data
    // Would require separate API calls for each NFT which is inefficient

    // Apply attribute filters
    if (Object.keys(filters).length > 0) {
      filtered = filtered.filter((nft) => {
        const attributes = nft.raw?.metadata?.attributes;
        if (!attributes || !Array.isArray(attributes)) return false;

        // Check if NFT matches all selected filters
        return Object.entries(filters).every(([traitType, selectedValues]) => {
          if (selectedValues.length === 0) return true;

          // Find matching attribute in NFT
          const nftAttribute = attributes.find(
            (attr: any) => attr.trait_type === traitType
          );

          if (!nftAttribute) return false;

          // Check if NFT's attribute value is in selected values
          return selectedValues.includes(String(nftAttribute.value));
        });
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((nft) => {
        // Search by token ID
        if (nft.tokenId.toLowerCase().includes(query)) return true;

        // Search by name
        if (nft.name?.toLowerCase().includes(query)) return true;

        return false;
      });
    }

    return filtered;
  }, [allNFTs, filters, searchQuery]);

  // Handle filter change
  const handleFilterChange = (newFilters: AttributeFiltersType) => {
    setFilters(newFilters);
  };

  // Handle search change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handle NFT click - navigate to detail page with scroll position preservation
  const handleNFTClick = (nft: NFTMetadata) => {
    // Save current scroll position before navigation
    sessionStorage.setItem('collectionScrollPosition', window.scrollY.toString());
    router.push(`/nft/${nft.contract.address}/${nft.tokenId}`);
  };

  // Restore scroll position on mount (when returning from NFT detail page)
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('collectionScrollPosition');
    if (savedScrollPosition) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition, 10));
        // Clear the saved position after restoring
        sessionStorage.removeItem('collectionScrollPosition');
      }, 100);
    }
  }, []);

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Calculate collection stats - ALWAYS call hooks unconditionally
  const stats = useMemo(() => {
    if (!data?.data?.collection) {
      return {
        totalSupply: 0,
        mintedCount: 0,
        mintPercentage: 0,
      };
    }

    // Total Supply = max supply from database (if available), otherwise from blockchain
    // Minted Count = actual minted from blockchain (Alchemy totalSupply), or database count
    const totalSupply = data.data.launchpadData?.totalMaxSupply ||
      parseInt(data.data.collection.totalSupply || '0') ||
      0;
    const mintedCount = parseInt(data.data.collection.totalSupply || '0') ||
      data.data.launchpadData?.mintedCount ||
      allNFTs.length;
    const mintPercentage = totalSupply > 0 ? (mintedCount / totalSupply) * 100 : 0;

    return {
      totalSupply,
      mintedCount,
      mintPercentage,
    };
  }, [data, allNFTs.length]);

  // Transform launchpad phases to match CollectionHeader interface
  const transformedLaunchpadData = useMemo(() => {
    if (!data?.data?.launchpadData) return null;

    const launchpad = data.data.launchpadData;
    return {
      ...launchpad,
      phases: launchpad.phases?.map((phase: MintPhase) => ({
        id: phase.id,
        phaseIndex: typeof phase.id === 'number' ? phase.id : undefined,
        name: phase.name,
        phaseType: phase.phaseType,
        startTime: new Date(phase.startTime),
        endTime: phase.endTime ? new Date(phase.endTime) : null,
        price: phase.price,
        isActive: phase.isActive,
        maxPerWallet: phase.maxMintPerWallet,
        totalLimit: phase.totalLimit,
        mintedCount: phase.mintedCount,
      })),
    };
  }, [data?.data?.launchpadData]);

  // Format address for display
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Calculate mint status
  const mintStatus = useMemo(() => {
    if (!transformedLaunchpadData?.phases || transformedLaunchpadData.phases.length === 0) {
      return 'no-phase';
    }

    // Check if sold out
    if (stats.mintedCount >= stats.totalSupply && stats.totalSupply > 0) {
      return 'sold-out';
    }

    // Check active phases
    const activePhases = transformedLaunchpadData.phases.filter(p => p.isActive);
    if (activePhases.length === 0) {
      return 'no-active-phase';
    }

    // Check if all active phases have ended
    const now = new Date();
    const allPhasesEnded = activePhases.every(phase => {
      if (!phase.endTime) return false; // No end time = not ended
      const endTime = new Date(phase.endTime);
      const isFarFuture = endTime > new Date('2100-01-01');
      return !isFarFuture && endTime < now;
    });

    if (allPhasesEnded) {
      return 'ended';
    }

    return 'active';
  }, [transformedLaunchpadData, stats]);

  // Determine if mint button should be shown
  const showMintButton = mintStatus === 'active' || mintStatus === 'no-phase';

  // Breadcrumb items
  const breadcrumbItems = useMemo(() => {
    // Get collection name from multiple sources with priority
    const collectionName = 
      data?.data?.launchpadData?.name ||
      data?.data?.collection?.openSeaMetadata?.collectionName ||
      data?.data?.collection?.name ||
      'Unknown';
    
    return [
      { label: 'Collections', href: '/' },
      {
        label: collectionName,
      },
    ];
  }, [data?.data?.collection?.name, data?.data?.collection?.openSeaMetadata?.collectionName, data?.data?.launchpadData?.name]);

  // Generate metadata and structured data - MUST be before any conditional returns
  const collectionMetadata = useMemo(() => {
    if (!data?.data?.collection) return null;

    const collection = data.data.collection;
    const collectionName = collection.name || 'NFT Collection';
    const description = collection.openSeaMetadata?.description ||
      `Explore ${collectionName} - ${stats.mintedCount} of ${stats.totalSupply} NFTs minted (${stats.mintPercentage.toFixed(1)}%)`;

    const imageUrl = collection.openSeaMetadata?.bannerImageUrl ||
      collection.openSeaMetadata?.imageUrl;
    const processedImageUrl = imageUrl ? ipfsToHttp(imageUrl) : null;

    const title = `${collectionName} | NFT Collection`;
    const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://odds.wtf'}/collection/${collection.address}`;

    return {
      title,
      description,
      imageUrl: processedImageUrl,
      url,
    };
  }, [data?.data?.collection, stats]);

  const structuredData = useMemo(() => {
    if (!data?.data?.collection) return null;
    return generateCollectionStructuredData(data.data.collection, stats);
  }, [data?.data?.collection, stats]);

  // Error state
  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const isNotFound = errorMessage.toLowerCase().includes('not found') ||
      errorMessage.toLowerCase().includes('does not exist');

    // Trigger Next.js not-found page for 404 errors
    if (isNotFound) {
      notFound();
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 font-mono text-2xl font-bold text-white">
            Failed to load collection
          </h2>
          <p className="mb-6 font-mono text-sm text-[#99A1AF]">
            {errorMessage}
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-[#2F3336] bg-[#0D0E11] text-white hover:bg-[#1E1F22] min-h-[44px] min-w-[44px]"
            aria-label="Retry loading collection"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Loading state (initial load)
  if (isLoading && allNFTs.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="h-[200px] w-full animate-pulse bg-[#1E1F22] md:h-[300px]" />
          <div className="mx-auto max-w-[1000px] space-y-4 p-4">
            <div className="h-24 w-24 animate-pulse rounded-md bg-[#1E1F22]" />
            <div className="h-8 w-64 animate-pulse bg-[#1E1F22]" />
            <div className="h-20 w-full animate-pulse bg-[#1E1F22]" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="mx-auto max-w-[1000px] px-4">
          <NFTGrid nfts={[]} loading={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] bg-[#0D0E11] border-x border-[#2F3336]">
      {/* SEO Meta Tags */}
      {collectionMetadata && (
        <Head>
          <title>{collectionMetadata.title}</title>
          <meta name="description" content={collectionMetadata.description} />

          {/* Open Graph */}
          <meta property="og:title" content={collectionMetadata.title} />
          <meta property="og:description" content={collectionMetadata.description} />
          <meta property="og:url" content={collectionMetadata.url} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="ODDS NFT Launchpad" />
          {collectionMetadata.imageUrl && (
            <>
              <meta property="og:image" content={collectionMetadata.imageUrl} />
              <meta property="og:image:width" content="1200" />
              <meta property="og:image:height" content="630" />
              <meta property="og:image:alt" content={data?.data?.collection?.name || 'NFT Collection'} />
            </>
          )}

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={collectionMetadata.title} />
          <meta name="twitter:description" content={collectionMetadata.description} />
          {collectionMetadata.imageUrl && (
            <meta name="twitter:image" content={collectionMetadata.imageUrl} />
          )}
          {data?.data?.collection?.openSeaMetadata?.twitterUsername && (
            <meta name="twitter:creator" content={`@${data.data.collection.openSeaMetadata.twitterUsername}`} />
          )}

          {/* Canonical URL */}
          <link rel="canonical" href={collectionMetadata.url} />
        </Head>
      )}

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      {/* Collection Header */}
      {data?.data?.collection && (
        <CollectionHeader
          collection={data.data.collection}
          launchpadData={transformedLaunchpadData}
          stats={stats}
        />
      )}

      {/* Toolbar Section - Improved spacing and alignment */}
      <div className="border-y border-[#2F3336] bg-[#0D0E11]">
        <div className="mx-auto max-w-[1000px] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Breadcrumb items={breadcrumbItems} />
            </div>
            
            {/* Layout Toolbar and Mint Button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Layout Toolbar */}
              <div className="flex items-center">
                {/* Grid (4 column) */}
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-2 rounded transition-all ${
                    layoutMode === 'grid' 
                      ? 'bg-[#1E1F22]/50 text-white' 
                      : 'text-[#6A7282] hover:text-white hover:bg-[#1E1F22]/30'
                  }`}
                  title="Grid (4 columns)"
                  aria-label="Grid layout with 4 columns"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </button>

                {/* Compact Grid (6 column) */}
                <button
                  onClick={() => setLayoutMode('compact-grid')}
                  className={`p-2 rounded transition-all ${
                    layoutMode === 'compact-grid' 
                      ? 'bg-[#1E1F22]/50 text-white' 
                      : 'text-[#6A7282] hover:text-white hover:bg-[#1E1F22]/30'
                  }`}
                  title="Compact Grid (6 columns)"
                  aria-label="Compact grid layout with 6 columns"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="7" y="2" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="12" y="2" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="2" y="7" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="7" y="7" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="12" y="7" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="2" y="12" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="7" y="12" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="12" y="12" width="3.5" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </button>

                {/* Table */}
                <button
                  onClick={() => setLayoutMode('table')}
                  className={`p-2 rounded transition-all ${
                    layoutMode === 'table' 
                      ? 'bg-[#1E1F22]/50 text-white' 
                      : 'text-[#6A7282] hover:text-white hover:bg-[#1E1F22]/30'
                  }`}
                  title="Table View"
                  aria-label="Table layout"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="3" width="14" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="2" y="7" width="14" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="2" y="11" width="14" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </button>

                {/* Compact Table */}
                <button
                  onClick={() => setLayoutMode('compact-table')}
                  className={`p-2 rounded transition-all ${
                    layoutMode === 'compact-table' 
                      ? 'bg-[#1E1F22]/50 text-white' 
                      : 'text-[#6A7282] hover:text-white hover:bg-[#1E1F22]/30'
                  }`}
                  title="Compact Table View"
                  aria-label="Compact table layout"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="3" width="14" height="1.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="2" y="6.5" width="14" height="1.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="2" y="10" width="14" height="1.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <rect x="2" y="13.5" width="14" height="1.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </button>
              </div>

              {/* Mint Page Button */}
              {showMintButton && (
                <Link 
                  href={`/l/${address}`}
                  className="bg-white py-2 px-6 rounded-lg font-mono font-bold text-sm text-black hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Mint Page
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-[1000px] p-4 min-h-[60vh]">
        {/* Full width layout - attributes filter hidden */}
        <div>
          {/* Results count */}
          {(Object.keys(filters).length > 0 || searchQuery) && (
            <div className="mb-4">
              <p className="font-mono text-sm text-[#99A1AF]">
                Showing {filteredNFTs.length} of {allNFTs.length} NFTs
              </p>
            </div>
          )}

          {/* Use virtualized grid for large collections (>1000 NFTs) */}
          {filteredNFTs.length > 1000 ? (
            <VirtualizedNFTGrid
              nfts={filteredNFTs}
              loading={false}
              onNFTClick={handleNFTClick}
            />
          ) : (
            <NFTGrid
              nfts={filteredNFTs}
              loading={false}
              layoutMode={layoutMode}
            />
          )}

          {/* No results message */}
          {filteredNFTs.length === 0 && allNFTs.length > 0 && (
            <div className="mt-12 text-center">
              <p className="font-mono text-sm text-[#99A1AF]">
                No NFTs found
              </p>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && allNFTs.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleLoadMore}
                disabled={isLoading}
                variant="outline"
                size="lg"
                className="min-w-[200px] min-h-[44px]"
                aria-label={isLoading ? 'Loading more NFTs' : 'Load more NFTs'}
              >
                {isLoading ? (
                  <>
                    <HugeiconsIcon icon={Loading01Icon} size={16} aria-hidden="true" className="mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}

          {/* End of collection message */}
          {!hasMore && filteredNFTs.length > 0 && !isLoading && (currentPage > 1 || allNFTs.length >= 100) && (
            <div className="mt-8 mb-4 text-center">
              <p className="font-mono text-sm text-[#99A1AF]">
                You've reached the end of the collection
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CollectionPage({ params }: CollectionPageProps) {
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    params.then((resolvedParams) => {
      setAddress(resolvedParams.address);
    });
  }, [params]);

  if (!address) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <HugeiconsIcon icon={Loading01Icon} size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CollectionPageContent address={address} />
    </ErrorBoundary>
  );
}
