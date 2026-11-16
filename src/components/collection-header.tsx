'use client';

import React, { useState } from 'react';
import { IpfsImage } from '@/components/ui/ipfs-image';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { ContractMetadata } from '@/types/alchemy';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatAddress } from '@/lib/utils';
import InfoModal from '@/components/modal/info-modal';
import { CollectionData } from '@/types/collection';
import { getChainName } from '@/config/chains';
import { useIpfsToHttp } from '@/hooks/useIpfsToHttp';

interface MintPhase {
  id?: number | string;
  phaseIndex?: number;
  name: string;
  phaseType?: string;
  startTime: Date;
  endTime: Date | null;
  price: string;
  isActive: boolean;
  maxPerWallet?: number;
  totalLimit?: number;
  mintedCount?: number;
  merkleRoot?: string;
  requiresWhitelist?: boolean;
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

interface CollectionStats {
  totalSupply: number;
  mintedCount: number;
  mintPercentage: number;
}

interface CollectionHeaderProps {
  collection: ContractMetadata;
  launchpadData?: LaunchpadData | null;
  stats: CollectionStats;
}

export function CollectionHeader({
  collection,
  launchpadData,
  stats,
}: CollectionHeaderProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // Get banner image - prioritize launchpad metadata, then OpenSea
  const bannerImageUrl = launchpadData?.metadata?.bannerImage
    || collection.openSeaMetadata?.bannerImageUrl
    || null;

  // Get thumbnail/avatar image - prioritize launchpad metadata, then OpenSea
  const thumbnailUrl = launchpadData?.metadata?.image
    || collection.openSeaMetadata?.imageUrl
    || null;

  // Convert IPFS URL to HTTP for Avatar component
  const { httpUrl: thumbnailHttpUrl } = useIpfsToHttp(thumbnailUrl);

  // Get collection name
  const collectionName =
    launchpadData?.name ||
    collection.openSeaMetadata?.collectionName ||
    collection.name ||
    'Unnamed Collection';

  // Get description
  const description =
    launchpadData?.description ||
    collection.openSeaMetadata?.description ||
    '';

  // Get creator address
  const creatorAddress =
    launchpadData?.creator || collection.contractDeployer || '';

  // Get social links
  const twitterUsername = collection.openSeaMetadata?.twitterUsername;
  const discordUrl = collection.openSeaMetadata?.discordUrl;
  const externalUrl =
    collection.openSeaMetadata?.externalUrl || launchpadData?.metadata?.image;

  // Copy address to clipboard
  const copyToClipboard = async (address: string, type: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(type);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Generate fallback text for avatar
  const getFallbackText = (): string => {
    return collectionName.slice(0, 2).toUpperCase();
  };

  // Convert to CollectionData format for InfoModal
  const collectionDataForModal: CollectionData = {
    id: launchpadData?.id || collection.address,
    name: collectionName,
    creator: creatorAddress,
    chain: getChainName(launchpadData?.chainId || 6343),
    description: description,
    image: thumbnailUrl || null,
    contractAddress: collection.address,
    website: externalUrl || '#',
    sellPrice: '0 ETH',
    walletLimit: `${stats.mintedCount}/${stats.totalSupply}`,
    eligible: true,
    totalSupply: stats.totalSupply,
    totalMinted: stats.mintedCount,
    airdropPercent: 0,
    mintedPercent: stats.mintPercentage,
    createdAt: launchpadData?.createdAt ? new Date(launchpadData.createdAt) : undefined,
    royalties: launchpadData?.royaltyPercentage
      ? (() => {
        const value = launchpadData.royaltyPercentage > 100
          ? launchpadData.royaltyPercentage / 100
          : launchpadData.royaltyPercentage;
        return value % 1 === 0 ? value.toString() : value.toFixed(1);
      })()
      : '0',
    phases: launchpadData?.phases || []
  };

  return (
    <div className="w-full">
      {/* Info Modal */}
      <InfoModal
        collection={collectionDataForModal}
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />
      {/* Banner Image Section with Overlay Content */}
      <div className="relative">
        {/* Banner or placeholder */}
        <div className="relative h-[280px] w-full overflow-hidden border-b border-[#2F3336] bg-[#0D0E11]">
          {bannerImageUrl ? (
            <>
              <IpfsImage
                src={bannerImageUrl}
                alt={`${collectionName} banner`}
                className="absolute inset-0 w-full h-full object-cover"
                showLoader={true}
              />
              {/* Dark overlay for better text readability */}
              <div className="absolute h-full inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/90" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#1E1F22] to-[#0D0E11]" />
          )}

          {/* Content Overlay on Banner */}
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-[1000px] px-4 pb-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
                {/* Avatar/Thumbnail */}
                <Avatar className="h-24 w-24 flex-shrink-0 rounded-lg shadow-2xl border-2 border-white/10 md:h-28 md:w-28">
                  {thumbnailHttpUrl ? (
                    <AvatarImage src={thumbnailHttpUrl} alt={collectionName} className="rounded-lg" />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#2D253E] to-[#1E192B] text-3xl font-bold font-mono text-white/80 md:text-4xl">
                    {getFallbackText()}
                  </AvatarFallback>
                </Avatar>

                {/* Collection Info */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h1 className="font-mono text-2xl md:text-3xl font-bold leading-tight text-white mb-2">
                    {collectionName}
                  </h1>

                  {/* Contract Address */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm font-medium text-[#B392F0]">
                      Contract: {formatAddress(collection.address)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(collection.address, 'contract')}
                      className="text-[#B392F0] hover:text-[#C5A3FF] transition-colors"
                      aria-label="Copy contract address"
                    >
                      {copiedAddress === 'contract' ? (
                        <HugeiconsIcon icon={Tick01Icon} size={14} />
                      ) : (
                        <HugeiconsIcon icon={Copy01Icon} size={14} />
                      )}
                    </button>
                  </div>

                  {/* Description */}
                  {description && (
                    <div className="max-w-3xl">
                      <p className="font-mono text-sm leading-relaxed text-white/90 line-clamp-2">
                        {description.length > 120 ? (
                          <>
                            {description.slice(0, 120)}...{' '}
                            <button
                              onClick={() => setInfoModalOpen(true)}
                              className="font-semibold text-[#B392F0] hover:text-[#C5A3FF] transition-colors"
                            >
                              more
                            </button>
                          </>
                        ) : (
                          description
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {(twitterUsername || discordUrl || externalUrl) && (
                  <div className="flex items-center gap-2 md:flex-col md:items-end">
                    {externalUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-10 w-10 text-white backdrop-blur-sm hover:bg-white/10 border border-white/10"
                      >
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Visit website"
                        >
                          <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} />
                        </a>
                      </Button>
                    )}
                    {twitterUsername && (
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="h-10 w-10 border-white/20 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                      >
                        <a
                          href={`https://twitter.com/${twitterUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Visit Twitter"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </a>
                      </Button>
                    )}
                    {discordUrl && (
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="h-10 w-10 border-white/20 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                      >
                        <a
                          href={discordUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Join Discord"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                          </svg>
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
