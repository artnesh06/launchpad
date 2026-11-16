'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { IpfsImage } from '@/components/ui/ipfs-image';
import { MarketplaceDrawer } from '@/components/marketplace-drawer';
import { NFTDetailModal } from '@/components/nft-detail-modal';
import { resolveImagePath } from '@/lib/ipfs-utils';

interface NFTHoldingCardProps {
  contractAddress: string;
  tokenId: string;
  name: string;
  image?: string;
  tokenUri?: string;
  floorPrice: number;
  collection: {
    name?: string;
    symbol?: string;
  };
  rarity?: number | string;
  chainId?: number;
  onList?: () => void;
  onSend?: () => void;
  onSendSuccess?: (tokenId: string) => void;
  onBurnSuccess?: (tokenId: string) => void;
}

export function NFTHoldingCard({
  contractAddress,
  tokenId,
  name,
  image,
  tokenUri,
  floorPrice,
  collection,
  rarity,
  chainId = 1,
  onList,
  onSend,
  onSendSuccess,
  onBurnSuccess,
}: NFTHoldingCardProps) {
  const [marketplaceDrawerOpen, setMarketplaceDrawerOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Resolve image path - handle relative paths like "./0.png"
  const resolvedImage = useMemo(() => {
    return resolveImagePath(image, tokenUri);
  }, [image, tokenUri]);

  // Use name from NFT metadata first, then collection name
  const displayName = name || collection?.name || 'Unknown';
  const displaySymbol = collection?.symbol;

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

  // Handle card click to open modal
  const handleCardClick = () => {
    console.log('Opening modal');
    setDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log('Closing modal, current state:', detailModalOpen);
    setDetailModalOpen(false);
    console.log('Modal closed, new state should be false');
  };

  // Handle list button click
  const handleListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMarketplaceDrawerOpen(true);
    onList?.();
  };

  return (
    <Card 
      className="w-full bg-[#0D0E11] border border-[#2F3336] rounded-[8px] p-0 overflow-hidden flex flex-col gap-2 cursor-pointer hover:border-[#B392F0] transition-colors"
      onClick={handleCardClick}
    >
      {/* NFT Image */}
      <div className="w-full aspect-square bg-[#2D253E] rounded-t-[8px] overflow-hidden relative">
        <IpfsImage
          src={resolvedImage}
          alt={displayName}
          className="w-full h-full object-cover"
          showLoader={true}
          fallback={
            <div className="w-full h-full flex items-center justify-center text-white text-4xl font-mono">
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          }
        />
      </div>

      {/* NFT Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div className='px-2'>
          {/* Token ID and Rarity Badge */}
          <div className="flex items-center justify-between">
            <div className="text-white text-sm font-medium font-mono leading-[14px] truncate" title={`#${tokenId}`}>
              {displayName}
            </div>
            <div className="flex items-center gap-1 bg-[#1E192B] rounded-[5px] px-2 py-0.5 h-[19px]">
              <svg width="6" height="7" viewBox="0 0 6 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="6" y1="0" x2="6" y2="7" stroke="#05DF72" strokeWidth="2" />
                <line x1="3" y1="1.56" x2="3" y2="7" stroke="#05DF72" strokeWidth="1" />
                <line x1="0" y1="3.89" x2="0" y2="7" stroke="#05DF72" strokeWidth="2" />
              </svg>
              <span className="text-[#05DF72] text-xs font-normal font-mono leading-none">
                #{formatTokenId(tokenId)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-0 mt-2">
          <button
            onClick={handleListClick}
            className="flex-1 border-t border-r border-[#2F3336] rounded-bl-[10px] text-white text-sm font-medium font-mono leading-[13px] py-[13px] hover:bg-[#2D253E] transition-colors"
          >
            List
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSend?.();
            }}
            className="flex-1 border-t border-[#2F3336] rounded-br-[10px] text-white text-sm font-medium font-mono leading-[13px] py-[13px] hover:bg-[#2D253E] transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Marketplace Drawer */}
      {marketplaceDrawerOpen && (
        <MarketplaceDrawer
          open={marketplaceDrawerOpen}
          onClose={() => setMarketplaceDrawerOpen(false)}
          contractAddress={contractAddress}
          tokenId={tokenId}
          chainId={chainId}
          nftName={displayName}
        />
      )}

      {/* NFT Detail Modal */}
      {detailModalOpen && (
        <NFTDetailModal
          open={detailModalOpen}
          onClose={handleCloseModal}
          contractAddress={contractAddress}
          tokenId={tokenId}
          name={displayName}
          image={resolvedImage}
          collection={collection}
          chainId={chainId}
          onSendSuccess={onSendSuccess}
          onBurnSuccess={onBurnSuccess}
        />
      )}
    </Card>
  );
}
