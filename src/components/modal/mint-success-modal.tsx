'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { triggerConfetti } from '@/lib/confetti';

interface MintSuccessModalProps {
  open: boolean;
  onClose: () => void;
  mintData: {
    tokenIds: string[];
    quantity: number;
    txHash: string;
    chainId: number;
    contractAddress: string;
    collectionName: string;
    collectionImage?: string;
    nftImages?: { tokenId: string; imageUrl: string }[];
  };
}

interface NFTImageData {
  tokenId: string;
  imageUrl: string;
  loading: boolean;
}

export function MintSuccessModal({ open, onClose, mintData }: MintSuccessModalProps) {
  const [nftImages, setNftImages] = useState<NFTImageData[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      // Don't reset nftImages here - let the fetch effect handle it
    } else {
      // Reset all state when modal closes
      setNftImages([]);
      setLoadingImages(true);
      setCurrentIndex(0);
    }
  }, [open]);

  // Trigger confetti when modal opens
  useEffect(() => {
    if (!open) return;
    triggerConfetti({ duration: 1000 });
  }, [open]);

  // Fetch NFT images from metadata
  useEffect(() => {
    if (!open || mintData.tokenIds.length === 0) return;

    const fetchNFTImages = async () => {
      // If nftImages are already provided in mintData, use them directly
      if (mintData.nftImages && mintData.nftImages.length > 0) {
        console.log('[Modal Image Debug] Using provided nftImages from mintData:', mintData.nftImages);
        const images: NFTImageData[] = mintData.nftImages.map(img => ({
          tokenId: img.tokenId,
          imageUrl: img.imageUrl,
          loading: false,
        }));
        setNftImages(images);
        setLoadingImages(false);
        return;
      }

      // Only show loading on initial fetch (when nftImages is empty)
      if (nftImages.length === 0) {
        setLoadingImages(true);
      }

      // Get existing token IDs to avoid re-fetching
      const existingTokenIds = new Set(nftImages.map(img => img.tokenId));
      const newTokenIds = mintData.tokenIds.filter(id => !existingTokenIds.has(id));

      console.log('[Modal Image Debug] Existing tokens:', Array.from(existingTokenIds));
      console.log('[Modal Image Debug] New tokens to fetch:', newTokenIds);

      // If no new tokens, just update the list order to match mintData
      if (newTokenIds.length === 0) {
        // Reorder existing images to match mintData.tokenIds order
        const reordered = mintData.tokenIds
          .map(tokenId => nftImages.find(img => img.tokenId === tokenId))
          .filter((img): img is NFTImageData => img !== undefined);
        
        if (reordered.length !== nftImages.length) {
          setNftImages(reordered);
        }
        return;
      }

      // Add placeholder images for new tokens immediately
      const placeholderImages: NFTImageData[] = newTokenIds.map(tokenId => ({
        tokenId,
        imageUrl: mintData.collectionImage || '',
        loading: true,
      }));

      // Update state with placeholders first for instant feedback
      setNftImages(prev => {
        // Combine existing images with new placeholders, maintaining order from mintData
        const combined = [...prev, ...placeholderImages];
        return mintData.tokenIds
          .map(tokenId => combined.find(img => img.tokenId === tokenId))
          .filter((img): img is NFTImageData => img !== undefined);
      });

      // Fetch actual images for new tokens
      const fetchPromises = newTokenIds.map(async (tokenId) => {
        try {
          const response = await fetch(
            `/api/nft/${mintData.contractAddress}/${tokenId}`
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.nft) {
              const nft = result.data.nft;
              if (nft.image?.cachedUrl || nft.image?.originalUrl) {
                // Import resolveImagePath dynamically
                const { resolveImagePath, ipfsToHttp } = await import('@/lib/ipfs-utils');
                
                // Get raw image URL
                const rawImageUrl = nft.image.cachedUrl || nft.image.originalUrl;
                
                // Resolve relative paths using tokenUri
                const resolvedImageUrl = resolveImagePath(rawImageUrl, nft.tokenUri);
                
                // Convert to HTTP URL
                const imageUrl = ipfsToHttp(resolvedImageUrl);
                
                return { tokenId, imageUrl, loading: false };
              }
            }
          }
          return { tokenId, imageUrl: mintData.collectionImage || '', loading: false };
        } catch (error) {
          console.error(`Failed to fetch NFT #${tokenId}:`, error);
          return { tokenId, imageUrl: mintData.collectionImage || '', loading: false };
        }
      });

      try {
        const results = await Promise.all(fetchPromises);
        
        // Update images with fetched data
        setNftImages(prev => {
          const updated = prev.map(img => {
            const fetched = results.find(r => r.tokenId === img.tokenId);
            return fetched || img;
          });
          
          // Maintain order from mintData.tokenIds
          return mintData.tokenIds
            .map(tokenId => updated.find(img => img.tokenId === tokenId))
            .filter((img): img is NFTImageData => img !== undefined);
        });
        
        console.log('[Modal Image Debug] Fetched images for new tokens:', results.map(r => r.tokenId));
      } catch (error) {
        console.error('Failed to fetch NFT images:', error);
      } finally {
        if (nftImages.length === 0) {
          setLoadingImages(false);
        }
      }
    };

    fetchNFTImages();
  }, [open, mintData.tokenIds.length, mintData.contractAddress, mintData.collectionImage, mintData.nftImages]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    setDirection(-1);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : mintData.tokenIds.length - 1));
  }, [mintData.tokenIds.length]);

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex(prev => (prev < mintData.tokenIds.length - 1 ? prev + 1 : 0));
  }, [mintData.tokenIds.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePrevious, handleNext, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const currentNFT = nftImages[currentIndex];
  const showNavigation = mintData.quantity > 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* 
              Container dengan height constraint.
              Width akan menyesuaikan berdasarkan content height.
              Menggunakan aspect ratio untuk menjaga proporsi.
              Mobile: full width dengan padding, Desktop: fixed aspect ratio
            */}
            <div
              className="relative w-full max-w-[457px] h-[90dvh] max-h-[650px] bg-[#0D0E10] border border-[#2F3336] rounded-[19px] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* NFT Image Section */}
              <div className="relative flex-1 min-h-0 p-4 sm:p-6">
                <div className="relative w-full h-full overflow-hidden rounded-xl">
                  {loadingImages || currentNFT?.loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-[#1E192B]">
                      <div className="w-12 h-12 border-4 border-[#B392F0] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                      <motion.img
                        key={currentIndex}
                        src={ipfsToHttp(currentNFT?.imageUrl || mintData.collectionImage || '') || ''}
                        alt={`NFT #${currentNFT?.tokenId || mintData.tokenIds[currentIndex]}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        custom={direction}
                        initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0 }}
                        transition={{ 
                          x: { type: 'spring', stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 }
                        }}
                      />
                    </AnimatePresence>
                  )}

                  {/* Navigation Arrows */}
                  {showNavigation && !loadingImages && (
                    <>
                      <button
                        onClick={handlePrevious}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-[#303030]/80 hover:bg-[#404040] flex items-center justify-center transition-colors z-10"
                        aria-label="Previous NFT"
                      >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} className="text-white sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-[#303030]/80 hover:bg-[#404040] flex items-center justify-center transition-colors z-10"
                        aria-label="Next NFT"
                      >
                        <HugeiconsIcon icon={ArrowRight01Icon} size={20} className="text-white sm:w-4 sm:h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Pagination Indicator - Below image */}
              {showNavigation && (
                <div className="flex-shrink-0 flex items-center justify-center pb-3 sm:pb-2">
                  <div className="flex items-center gap-1.5 rounded-full">
                    {mintData.tokenIds.length <= 5 ? (
                      mintData.tokenIds.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentIndex(index)}
                          className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full transition-all ${index === currentIndex ? 'bg-[#B392F0] w-5 sm:w-4' : 'bg-white/30'}`}
                        />
                      ))
                    ) : (
                      <span className="text-white text-sm sm:text-xs font-mono">
                        {currentIndex + 1} / {mintData.quantity}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Content Section */}
              <div className="flex-shrink-0 px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 pt-2 flex flex-col items-center">
                {/* Congrats with emojis */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl sm:text-xl md:text-2xl">🎉</span>
                  <h2
                    className="text-[#0FFF75] text-2xl sm:text-xl md:text-2xl font-semibold tracking-tight"
                    style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                  >
                    Congrats!
                  </h2>
                  <span className="text-2xl sm:text-xl md:text-2xl">🎉</span>
                </div>

                {/* Subtitle */}
                <p
                  className="text-[#9AA1AF] text-base sm:text-sm md:text-base text-center tracking-tight mb-4 sm:mb-6"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  {mintData.quantity > 1
                    ? `Your ${mintData.quantity} NFTs have been minted`
                    : 'Your NFT has been minted'
                  }
                </p>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="w-full max-w-[333px] h-12 sm:h-10 bg-[#B392F0] hover:bg-[#A080E0] text-black font-bold text-base rounded-[11px] transition-colors"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
