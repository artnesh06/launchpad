'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { NFTHoldingCard } from './nft-holding-card';
import { SendNftModal } from './send-nft-modal';
import { useAccount } from 'wagmi';

// Alchemy NFT Metadata interface
interface AlchemyNFT {
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType?: string;
  };
  tokenId: string;
  tokenType?: string;
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    contentType?: string;
    size?: number;
    originalUrl?: string;
  };
  raw?: {
    metadata?: any;
    tokenUri?: string;
  };
  tokenUri?: string;
  timeLastUpdated?: string;
  balance?: string;
}

interface NFTHoldingGridProps {
  walletAddress?: string;
  chainFilter?: number | 'all';
  onLoadMore?: (hasMore: boolean, loading: boolean) => void;
}

export interface NFTHoldingGridRef {
  loadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}

export const NFTHoldingGrid = forwardRef<NFTHoldingGridRef, NFTHoldingGridProps>(
  function NFTHoldingGrid({ walletAddress, chainFilter = 'all', onLoadMore }, ref) {
  const [mounted, setMounted] = useState(false);
  const { address: connectedAddress, chainId: walletChainId } = useAccount();
  const [nfts, setNfts] = useState<AlchemyNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageKey, setPageKey] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedNft, setSelectedNft] = useState<{ contractAddress: string; tokenId: string; chainId?: number } | null>(null);
  const [removingTokenIds, setRemovingTokenIds] = useState<Set<string>>(new Set());

  const address = walletAddress || connectedAddress;

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNFTs = async (loadMore = false) => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      if (!loadMore) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      // Calculate current page for pagination
      const currentPage = loadMore ? Math.floor(nfts.length / 20) + 1 : 1;

      // Build query params
      const params = new URLSearchParams({
        address,
        pageSize: '20',
        page: currentPage.toString(),
      });

      // Add chain filter (supports 'all' or specific chainId)
      if (chainFilter !== 'all') {
        params.append('chainId', chainFilter.toString());
      }

      // Fetch from database API
      const response = await fetch(`/api/nft/holdings?${params.toString()}`);
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to fetch NFTs');
      }

      const result = await response.json();

      if (result.success && result.data) {
        const ownedNfts = result.data.ownedNfts || [];
        
        if (loadMore) {
          setNfts(prev => [...prev, ...ownedNfts]);
        } else {
          setNfts(ownedNfts);
        }
        
        // Update pagination state
        setPageKey(result.data.hasMore ? 'next' : undefined);
        setHasMore(result.data.hasMore);
        setTotalCount(result.data.totalCount || ownedNfts.length);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Failed to fetch NFTs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNFTs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainFilter]);

  // Notify parent component about pagination state
  useEffect(() => {
    if (onLoadMore) {
      onLoadMore(hasMore, loadingMore);
    }
  }, [hasMore, loadingMore, onLoadMore]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    loadMore: () => fetchNFTs(true),
    hasMore,
    loading: loadingMore,
  }));

  const handleList = (nft: AlchemyNFT) => {
    console.log('List NFT:', nft);
    // TODO: Implement list functionality
  };

  const handleSend = (nft: AlchemyNFT) => {
    // Use chainFilter if it's a number, otherwise use wallet chainId
    const nftChainId = typeof chainFilter === 'number' ? chainFilter : walletChainId;
    
    setSelectedNft({
      contractAddress: nft.contract.address,
      tokenId: nft.tokenId,
      chainId: nftChainId,
    });
    setSendModalOpen(true);
  };

  const handleSendSuccess = (tokenId: string) => {
    // Add tokenId to removing set to trigger animation
    setRemovingTokenIds(prev => new Set(prev).add(tokenId));
    
    // After animation completes, remove from NFT list
    setTimeout(() => {
      setNfts(prev => prev.filter(nft => nft.tokenId !== tokenId));
      setRemovingTokenIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tokenId);
        return newSet;
      });
    }, 300); // Match animation duration
  };

  const handleBurnSuccess = (tokenId: string) => {
    // Add tokenId to removing set to trigger animation
    setRemovingTokenIds(prev => new Set(prev).add(tokenId));
    
    // After animation completes, remove from NFT list
    setTimeout(() => {
      setNfts(prev => prev.filter(nft => nft.tokenId !== tokenId));
      setRemovingTokenIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tokenId);
        return newSet;
      });
    }, 300); // Match animation duration
  };

  if (!address) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-[#99A1AF] text-base font-mono mb-2">
            Connect your wallet to view your NFTs
          </p>
        </div>
      </div>
    );
  }

  if (loading && nfts.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-[#99A1AF] text-base font-mono">
            Loading your NFTs...
          </p>
        </div>
      </div>
    );
  }

  // Don't render until mounted to avoid Wagmi provider errors
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-[#1E1F22] rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-[#EE6476] text-base font-mono mb-2">
            {error}
          </p>
          <button
            onClick={() => fetchNFTs()}
            className="text-[#B392F0] text-sm font-mono hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-[#99A1AF] text-base font-mono">
            No NFTs found in this wallet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* NFT Count */}
      {/* {nfts.length > 0 && (
        <div className="mb-4">
          <p className="text-[#99A1AF] text-sm font-mono">
            {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} found
          </p>
        </div>
      )} */}

      {/* NFT Grid - responsive grid with min 150px columns */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {nfts.map((nft) => {
          // Get image from various possible sources
          const imageUrl = nft.image?.cachedUrl || 
                          nft.image?.thumbnailUrl || 
                          nft.image?.pngUrl ||
                          nft.image?.originalUrl ||
                          nft.raw?.metadata?.image;
          
          // Get tokenUri from nft or raw metadata
          const tokenUri = nft.tokenUri || nft.raw?.tokenUri;
          
          // Get name from metadata or contract
          const nftName = nft.name || 
                         nft.raw?.metadata?.name || 
                         nft.contract.name || 
                         'Unknown';
          
          // Get rarity from attributes if available
          const rarityAttribute = nft.raw?.metadata?.attributes?.find(
            (attr: any) => attr.trait_type?.toLowerCase() === 'rarity' || attr.trait_type?.toLowerCase() === 'rank'
          );
          const rarity = rarityAttribute?.value;
          
          // Use chainFilter if it's a number, otherwise use wallet chainId
          const nftChainId = typeof chainFilter === 'number' ? chainFilter : walletChainId;
          
          // Check if this NFT is being removed
          const isRemoving = removingTokenIds.has(nft.tokenId);
          
          return (
            <div
              key={`${nft.contract.address}-${nft.tokenId}`}
              className={`transition-all duration-300 ease-out ${
                isRemoving 
                  ? 'opacity-0 scale-75 pointer-events-none' 
                  : 'opacity-100 scale-100'
              }`}
            >
              <NFTHoldingCard
                contractAddress={nft.contract.address}
                tokenId={nft.tokenId}
                name={nftName}
                image={imageUrl}
                tokenUri={tokenUri}
                floorPrice={0}
                collection={{
                  name: nft.contract.name,
                  symbol: nft.contract.symbol || nft.raw?.metadata?.symbol,
                }}
                rarity={rarity}
                chainId={nftChainId}
                onList={() => handleList(nft)}
                onSend={() => handleSend(nft)}
                onSendSuccess={handleSendSuccess}
                onBurnSuccess={handleBurnSuccess}
              />
            </div>
          );
        })}
      </div>

      {/* Send NFT Modal */}
      {selectedNft && (
        <SendNftModal
          open={sendModalOpen}
          onClose={() => {
            setSendModalOpen(false);
            setSelectedNft(null);
          }}
          contractAddress={selectedNft.contractAddress}
          prefilledTokenId={selectedNft.tokenId}
          chainId={selectedNft.chainId}
          onSendSuccess={handleSendSuccess}
        />
      )}
    </div>
  );
});

NFTHoldingGrid.displayName = 'NFTHoldingGrid';
