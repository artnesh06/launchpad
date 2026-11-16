'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { SentIcon, ShoppingBasket01Icon, FireIcon, StarIcon } from '@hugeicons/core-free-icons';
import { IpfsImage } from '@/components/ui/ipfs-image';
import { SendNftModal } from './send-nft-modal';
import { BurnNftModal } from './burn-nft-modal';
import { MarketplaceDrawer } from './marketplace-drawer';

interface NFTDetailModalProps {
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  tokenId: string;
  name: string;
  image?: string;
  collection: {
    name?: string;
    symbol?: string;
  };
  chainId?: number;
  onSendSuccess?: (tokenId: string) => void;
  onBurnSuccess?: (tokenId: string) => void;
}

export function NFTDetailModal({
  open,
  onClose,
  contractAddress,
  tokenId,
  name,
  image,
  collection,
  chainId = 11155111,
  onSendSuccess,
  onBurnSuccess,
}: NFTDetailModalProps) {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [burnModalOpen, setBurnModalOpen] = useState(false);
  const [marketplaceDrawerOpen, setMarketplaceDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount state for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset sendModalOpen when nft-detail-modal opens
  useEffect(() => {
    if (open) {
      setSendModalOpen(false);
      setBurnModalOpen(false);
      setMarketplaceDrawerOpen(false);
    }
  }, [open]);

  // Close SendNftModal when nft-detail-modal closes
  useEffect(() => {
    if (!open && sendModalOpen) {
      setSendModalOpen(false);
    }
  }, [open, sendModalOpen]);

  // Close BurnNftModal when nft-detail-modal closes
  useEffect(() => {
    if (!open && burnModalOpen) {
      setBurnModalOpen(false);
    }
  }, [open, burnModalOpen]);

  // Close MarketplaceDrawer when nft-detail-modal closes
  useEffect(() => {
    if (!open && marketplaceDrawerOpen) {
      setMarketplaceDrawerOpen(false);
    }
  }, [open, marketplaceDrawerOpen]);

  if (!open || !mounted) return null;

  const displayName = name || collection?.name || 'Unknown';

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onClose();
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-[8px] z-[100] cursor-default flex items-center justify-center"
          onClick={handleOverlayClick}
        >
          {/* Modal Container */}
          <div 
            className="relative aspect-square h-[90dvh] max-h-[90vh]"
            onClick={handleContentClick}
          >
            {/* NFT Image Container */}
            <div 
              className="w-full h-full border border-[#1E1F22] rounded-[10px] overflow-hidden"
            >
              <IpfsImage
                src={image}
                alt={displayName}
                className="w-full h-full object-cover"
                showLoader={true}
                fallback={
                  <div className="w-full h-full bg-[#2D253E] flex items-center justify-center text-white text-6xl font-mono">
                    {displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                }
              />
            </div>

            {/* Action Icons - Right Side */}
            {/* <div 
              className="absolute -right-[50px] top-1/2 -translate-y-1/2 flex flex-col gap-[12px]"
            >
              <button
                className="w-[30px] h-[30px] opacity-50 hover:opacity-100 transition-opacity"
                title="Send"
                onClick={() => setSendModalOpen(true)}
              >
                <HugeiconsIcon icon={SentIcon} className="w-full h-full text-white" />
              </button>
              <button
                className="w-[26px] h-[26px] opacity-50 hover:opacity-100 transition-opacity"
                title="List for Sale"
                onClick={() => setMarketplaceDrawerOpen(true)}
              >
                <HugeiconsIcon icon={ShoppingBasket01Icon} className="w-full h-full text-white" />
              </button>
              <button
                className="w-[24px] h-[24px] opacity-50 hover:opacity-100 transition-opacity"
                title="Burn"
                onClick={() => setBurnModalOpen(true)}
              >
                <HugeiconsIcon icon={FireIcon} className="w-full h-full text-white" />
              </button>
              <button
                className="w-[26px] h-[26px] hover:opacity-80 transition-opacity"
                title="Favorite"
              >
                <HugeiconsIcon icon={StarIcon} className="w-full h-full text-white fill-white" />
              </button>
            </div> */}
          </div>
        </div>,
        document.body
      )}

      {/* Child modals - rendered outside portal so they appear above */}
      {sendModalOpen && (
        <SendNftModal
          open={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          contractAddress={contractAddress}
          prefilledTokenId={tokenId}
          onSendSuccess={(tid) => {
            onSendSuccess?.(tid);
            onClose();
          }}
        />
      )}

      {burnModalOpen && (
        <BurnNftModal
          open={burnModalOpen}
          onClose={() => setBurnModalOpen(false)}
          contractAddress={contractAddress}
          prefilledTokenId={tokenId}
          onBurnSuccess={(tid) => {
            onBurnSuccess?.(tid);
            onClose();
          }}
        />
      )}

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
    </>
  );
}
