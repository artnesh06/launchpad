'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import Image from 'next/image';
import { Breadcrumb } from '@/components/breadcrumb';
import { NFTAttributes } from '@/components/nft-attributes';
import { RarityDisplay } from '@/components/rarity-display';
import { Button } from '@/components/ui/button';
import { NFTMetadata, ContractMetadata, NFTRarity } from '@/types/alchemy';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading01Icon, Copy01Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/error-boundary';
import { generateNFTStructuredData } from '@/lib/seo-utils';
import { SendNftModal } from '@/components/send-nft-modal';
import { useAccount } from 'wagmi';

interface NFTDetailAPIResponse {
  success: boolean;
  data?: {
    nft: NFTMetadata;
    collection: ContractMetadata;
    owners: string[];
    rarity?: NFTRarity | null;
    launchpad?: {
      chainId: number;
      name: string;
      symbol: string;
    } | null;
    chainId?: number;
  };
  error?: string;
  message?: string;
}

interface NFTDetailPageProps {
  params: Promise<{
    address: string;
    tokenid: string;
  }>;
}

// Fetch NFT detail data from API
async function fetchNFTDetail(
  address: string,
  tokenid: string
): Promise<NFTDetailAPIResponse> {
  const response = await fetch(`/api/nft/${address}/${tokenid}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch NFT details');
  }

  return response.json();
}

// Copy text to clipboard
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

// Format address for display
function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Get blockchain name from chainId
function getBlockchainName(chainId?: number): string {
  if (!chainId) return 'Ethereum';

  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    11155111: 'Sepolia',
    8453: 'Base',
    84532: 'Base Sepolia',
    6343: 'MegaETH Testnet V2',
    999999999: 'Abstract',
    137: 'Polygon',
    80002: 'Polygon Amoy',
    42161: 'Arbitrum',
    421614: 'Arbitrum Sepolia',
    10: 'Optimism',
    11155420: 'Optimism Sepolia',
    998: 'Hyperliquid Testnet',
  };

  return chainNames[chainId] || `Chain ${chainId}`;
}

// Fetch collection NFTs for adjacent navigation
async function fetchCollectionNFTs(address: string): Promise<NFTMetadata[]> {
  const response = await fetch(`/api/nft/collection/${address}?pageSize=1000&withMetadata=false`);

  if (!response.ok) {
    throw new Error('Failed to fetch collection NFTs');
  }

  const data = await response.json();
  return data.data?.nfts || [];
}

function NFTDetailPageContent({ address, tokenid }: { address: string; tokenid: string }) {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useAccount();
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  // Validate address format
  useEffect(() => {
    if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      // Invalid address format - trigger not found
      notFound();
    }
  }, [address]);

  // Fetch NFT detail data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['nft-detail', address, tokenid],
    queryFn: () => fetchNFTDetail(address, tokenid),
    enabled: !!address && !!tokenid,
  });

  // Fetch collection NFTs for adjacent navigation
  const { data: collectionNFTs } = useQuery({
    queryKey: ['collection-nfts', address],
    queryFn: () => fetchCollectionNFTs(address),
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const nft = data?.data?.nft;
  const collection = data?.data?.collection;
  const owners = data?.data?.owners || [];
  const rarity = data?.data?.rarity;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Memoize owners array to prevent infinite loop
  const memoizedOwners = React.useMemo(() => owners, [JSON.stringify(owners)]);

  // Check if connected wallet is the owner
  const isOwner = React.useMemo(() => {
    if (!isConnected || !connectedAddress || memoizedOwners.length === 0) return false;
    return memoizedOwners.some(owner => owner.toLowerCase() === connectedAddress.toLowerCase());
  }, [isConnected, connectedAddress, memoizedOwners]);

  // Extract attributes from metadata
  const attributes = React.useMemo(() => {
    if (!nft?.raw?.metadata?.attributes) return [];

    return nft.raw.metadata.attributes.map((attr: any) => ({
      trait_type: attr.trait_type || 'Unknown',
      value: attr.value,
      prevalence: attr.prevalence,
    }));
  }, [nft]);

  // Find adjacent NFTs for navigation
  const { previousNFT, nextNFT } = React.useMemo(() => {
    if (!collectionNFTs || collectionNFTs.length === 0) {
      return { previousNFT: null, nextNFT: null };
    }

    const currentIndex = collectionNFTs.findIndex(
      (nftItem) => nftItem.tokenId === tokenid
    );

    if (currentIndex === -1) {
      return { previousNFT: null, nextNFT: null };
    }

    return {
      previousNFT: currentIndex > 0 ? collectionNFTs[currentIndex - 1] : null,
      nextNFT: currentIndex < collectionNFTs.length - 1 ? collectionNFTs[currentIndex + 1] : null,
    };
  }, [collectionNFTs, tokenid]);

  // Generate metadata
  const nftMetadata = React.useMemo(() => {
    if (!nft || !collection) return null;

    const nftName = nft.name || `#${nft.tokenId}`;
    const collectionName = collection.name || 'NFT Collection';
    const description = nft.description ||
      `${nftName} from ${collectionName} collection`;

    const rawImageUrl = nft.image?.cachedUrl ||
      nft.image?.thumbnailUrl ||
      nft.image?.pngUrl ||
      nft.image?.originalUrl ||
      nft.raw?.metadata?.image;
    
    // Resolve relative paths using tokenUri
    const { resolveImagePath } = require('@/lib/ipfs-utils');
    const resolvedImageUrl = resolveImagePath(rawImageUrl, nft.tokenUri);
    const processedImageUrl = resolvedImageUrl ? ipfsToHttp(resolvedImageUrl) : null;

    const title = `${nftName} | ${collectionName}`;
    const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://odds.wtf'}/nft/${nft.contract.address}/${nft.tokenId}`;

    return {
      title,
      description,
      imageUrl: processedImageUrl,
      url,
    };
  }, [nft, collection]);

  const structuredData = React.useMemo(() => {
    if (!nft || !collection) return null;
    return generateNFTStructuredData(nft, collection, memoizedOwners);
  }, [nft, collection, memoizedOwners]);

  // Handle copy to clipboard with feedback
  const handleCopy = (text: string, label: string) => {
    copyToClipboard(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Get image URL with IPFS conversion
  const getImageUrl = (): string | null => {
    if (!data?.data?.nft || imageError) return null;

    const nft = data.data.nft;
    const rawImageUrl =
      nft.image?.cachedUrl ||
      nft.image?.thumbnailUrl ||
      nft.image?.pngUrl ||
      nft.image?.originalUrl ||
      nft.raw?.metadata?.image;

    // Resolve relative paths using tokenUri
    const { resolveImagePath } = require('@/lib/ipfs-utils');
    const resolvedImageUrl = resolveImagePath(rawImageUrl, nft.tokenUri);
    
    return ipfsToHttp(resolvedImageUrl);
  };

  const imageUrl = getImageUrl();

  // Handle navigation to adjacent NFT
  const handleNavigateToNFT = (nftTokenId: string) => {
    router.push(`/nft/${address}/${nftTokenId}`);
  };

  // Generate fallback text
  const getFallbackText = (): string => {
    if (nft?.name) {
      return nft.name.slice(0, 2).toUpperCase();
    }
    return `#${tokenid.slice(0, 4)}`;
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Collections', href: '/' },
    {
      label: collection?.name || formatAddress(address),
      href: `/collection/${address}`
    },
    { label: nft?.name || `#${tokenid}` },
  ];

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
      <div className="min-h-screen bg-[#0D0E11] px-4 py-8">
        <div className="mx-auto max-w-[1000px]">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <h2 className="mb-4 font-mono text-2xl font-bold text-white">
                Failed to Load NFT
              </h2>
              <p className="mb-6 font-mono text-sm text-[#99A1AF]">
                {errorMessage}
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.back()} variant="outline" className="border-[#2F3336] bg-[#0D0E11] text-white hover:bg-[#1E1F22]">
                  Go Back
                </Button>
                <Button onClick={() => refetch()} variant="default" className="bg-[#B392F0] text-black hover:bg-white">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0E11] px-4 py-8">
        <div className="mx-auto max-w-[1000px]">
          <div className="flex min-h-[60vh] items-center justify-center">
            <HugeiconsIcon icon={Loading01Icon} size={32} className="animate-spin text-[#B392F0]" />
          </div>
        </div>
      </div>
    );
  }

  if (!nft || !collection) {
    return null;
  }

  const displayName = nft.name || `#${tokenid}`;
  const totalSupply = parseInt(collection.totalSupply || '0');

  return (
    <div className="bg-[#0D0E11]">
      {/* SEO Meta Tags */}
      {nftMetadata && (
        <Head>
          <title>{nftMetadata.title}</title>
          <meta name="description" content={nftMetadata.description} />

          {/* Open Graph */}
          <meta property="og:title" content={nftMetadata.title} />
          <meta property="og:description" content={nftMetadata.description} />
          <meta property="og:url" content={nftMetadata.url} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="ODDS NFT Launchpad" />
          {nftMetadata.imageUrl && (
            <>
              <meta property="og:image" content={nftMetadata.imageUrl} />
              <meta property="og:image:width" content="1200" />
              <meta property="og:image:height" content="1200" />
              <meta property="og:image:alt" content={displayName} />
            </>
          )}

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={nftMetadata.title} />
          <meta name="twitter:description" content={nftMetadata.description} />
          {nftMetadata.imageUrl && (
            <meta name="twitter:image" content={nftMetadata.imageUrl} />
          )}
          {collection.openSeaMetadata?.twitterUsername && (
            <meta name="twitter:creator" content={`@${collection.openSeaMetadata.twitterUsername}`} />
          )}

          {/* Canonical URL */}
          <link rel="canonical" href={nftMetadata.url} />
        </Head>
      )}

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <div className="mx-auto max-w-[1000px] border-x border-[#2F3336]">
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2">
          {/* Left Column - Image */}
          <div className="relative bg-[#0D0E11] flex flex-col p-8">
            {/* Image Container */}
            <div className="relative w-full aspect-square mb-6">
              {imageUrl && !imageError ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={displayName}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className={cn(
                      'object-contain rounded-lg',
                      isImageLoading && 'blur-sm'
                    )}
                    onLoad={() => setIsImageLoading(false)}
                    onError={() => {
                      setImageError(true);
                      setIsImageLoading(false);
                    }}
                    priority
                  />
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1E1F22] rounded-lg">
                      <HugeiconsIcon icon={Loading01Icon} size={32} className="animate-spin text-[#B392F0]" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#1E1F22] rounded-lg">
                  <span className="text-6xl font-bold font-mono text-[#99A1AF]">
                    {getFallbackText()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="bg-[#0D0E11] p-8 space-y-4 border-l border-[#2F3336]">
            {/* Navigation Arrows */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <button
                onClick={() => previousNFT && handleNavigateToNFT(previousNFT.tokenId)}
                disabled={!previousNFT}
                className="text-[#6A7282] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous NFT"
              >
                <span className="font-mono text-3xl font-extralight">&lt;</span>
              </button>

              <button
                onClick={() => nextNFT && handleNavigateToNFT(nextNFT.tokenId)}
                disabled={!nextNFT}
                className="text-[#6A7282] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-2"
                aria-label="Next NFT"
              >
                <span className="font-mono text-3xl font-extralight">&gt;</span>
              </button>
            </div>

            {/* Title and Total Supply Badge */}
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-mono text-4xl font-bold text-white">
                  {displayName}
                </h1>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1E192B]">
                  <svg width="10" height="12" viewBox="0 0 6 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="6" y1="0" x2="6" y2="7" stroke="#05DF72" strokeWidth="2" />
                    <line x1="3" y1="1.56" x2="3" y2="7" stroke="#05DF72" strokeWidth="1" />
                    <line x1="0" y1="3.89" x2="0" y2="7" stroke="#05DF72" strokeWidth="2" />
                  </svg>
                  <span className="font-mono text-lg text-[#05DF72]">{totalSupply}</span>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="space-y-3">
              {/* Collection */}
              <p className="font-mono text-base text-[#B392F0]">
                <span className="text-[#B392F0]">Collection: </span>
                <button
                  onClick={() => router.push(`/collection/${address}`)}
                  className="hover:underline"
                >
                  {collection.name || 'Unknown Collection'}
                </button>
              </p>

              {/* Description */}
              {nft.description && (
                <p className="font-mono text-base text-[#B392F0]">
                  <span className="text-[#B392F0]">Description: </span>
                  {nft.description}
                </p>
              )}

              {/* Owner */}
              <p className="font-mono text-base text-[#B392F0]">
                <span className="text-[#B392F0]">Owner: </span>
                {memoizedOwners.length > 0 ? (
                  <span className="inline-flex items-center gap-2">
                    {formatAddress(memoizedOwners[0])}
                    <button
                      onClick={() => handleCopy(memoizedOwners[0], 'owner')}
                      className="text-[#B392F0] hover:text-white transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress === 'owner' ? '✓' : <HugeiconsIcon icon={Copy01Icon} size={12} className="inline" />}
                    </button>
                  </span>
                ) : (
                  'Unknown'
                )}
              </p>

              {/* Contract */}
              <p className="font-mono text-base text-[#B392F0]">
                <span className="text-[#B392F0]">Contract: </span>
                <span className="inline-flex items-center gap-2">
                  {formatAddress(address)}
                  <button
                    onClick={() => handleCopy(address, 'contract')}
                    className="text-[#B392F0] hover:text-white transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress === 'contract' ? '✓' : <HugeiconsIcon icon={Copy01Icon} size={12} className="inline" />}
                  </button>
                </span>
              </p>

              {/* Chain */}
              <p className="font-mono text-base text-[#B392F0]">
                <span className="text-[#B392F0]">Chain: </span>
                {getBlockchainName(data?.data?.chainId)}: 0%
              </p>

              {/* Royalty */}
              <p className="font-mono text-base text-[#B392F0]">
                <span className="text-[#B392F0]">Royalty: </span>0%
              </p>
            </div>

            {/* Action Buttons - Only show for owners */}
            {isOwner && (
              <div className="space-y-3 pt-6">
                <button
                  onClick={() => {
                    // TODO: Implement list functionality
                    console.log('List NFT:', { address, tokenid });
                    alert('List functionality coming soon!');
                  }}
                  className="w-[194px] h-[42px] bg-[#B392F0] hover:bg-[#9B7FD8] text-black font-mono font-semibold text-[15px] rounded-lg border border-[#2F3336] transition-colors"
                >
                  List
                </button>

                <button
                  onClick={() => setSendModalOpen(true)}
                  className="w-[194px] h-[42px] bg-[#B392F0] hover:bg-[#9B7FD8] text-black font-mono font-semibold text-[15px] rounded-lg border border-[#2F3336] transition-colors"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Data Footer */}
        <div className="border-t border-[#2F3336] bg-[#0D0E11] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-3.5 h-3.5 bg-[#395947] rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0BFF75] rounded-full"></div>
            </div>
            <span className="font-mono text-sm text-white">Live Data</span>
          </div>
          <span className="font-mono text-sm text-[#F87683]">1 ETH = $3631,32</span>
        </div>

        {/* Attributes Section */}
        {attributes.length > 0 && (
          <div className="border-t border-[#2F3336] p-8">
            <NFTAttributes attributes={attributes} />
          </div>
        )}

        {/* Rarity Section */}
        {rarity && (
          <div className="border-t border-[#2F3336] p-8">
            <RarityDisplay rarity={rarity} totalSupply={totalSupply} />
          </div>
        )}
      </div>

      {/* Send NFT Modal */}
      <SendNftModal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        contractAddress={address}
        prefilledTokenId={tokenid}
        chainId={data?.data?.chainId}
      />
    </div>
  );
}

export default function NFTDetailPage({ params }: NFTDetailPageProps) {
  const [address, setAddress] = useState<string>('');
  const [tokenid, setTokenid] = useState<string>('');

  useEffect(() => {
    params.then((resolvedParams) => {
      setAddress(resolvedParams.address);
      setTokenid(resolvedParams.tokenid);
    });
  }, [params]);

  if (!address || !tokenid) {
    return (
      <div className="h-full items-center justify-center bg-[#0D0E11]">
        <HugeiconsIcon icon={Loading01Icon} size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <NFTDetailPageContent address={address} tokenid={tokenid} />
    </ErrorBoundary>
  );
}
