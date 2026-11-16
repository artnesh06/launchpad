"use client";

import { NFTTrendingTable } from '@/components/nft-trending-table';
import ChainSelection from '@/components/chain-selection';
import { Input } from '@/components/ui/input';
import Banner from '@/components/banner';
import { FeaturesSection } from '@/components/features-section';
import { MarketActivitySection } from '@/components/market-activity-section';
import { JoinCommunitySection } from '@/components/join-community-section';
import { SearchModal, useSearchModal } from '@/components/search-modal';
import { useChainSelection } from '@/hooks/useChainSelection';
import { useState, useEffect } from 'react';
import { BannerWithLaunchpad } from '@/types/launchpad';
import { BannerSkeleton } from '@/components/skeletons/banner-skeleton';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WalletConnectionHeader } from '@/components/wallet-connection-header';

function NFTLaunchpadContent() {
  const { selectedChain, selectedChainId, handleChainChange } = useChainSelection();
  const searchModal = useSearchModal();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [banners, setBanners] = useState<BannerWithLaunchpad[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);

  // Handle OAuth callback
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const session = searchParams.get('session');

    if (error) {
      // Show error toast
      toast.error(errorDescription || 'Discord login failed');
      
      // Clean up URL
      router.replace('/');
    } else if (session) {
      // Show success toast
      toast.success('Successfully connected to Discord! Click your wallet to see the connection.');
      
      // Set flag to auto-open wallet dropdown
      localStorage.setItem('discord-oauth-success', 'true');
      
      // Clean up URL
      router.replace('/');
    }
  }, [searchParams, router]);

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoadingBanners(true);
        const response = await fetch('/api/banners?status=ACTIVE');
        const result = await response.json();
        
        if (result.success && result.data) {
          setBanners(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      } finally {
        setLoadingBanners(false);
      }
    };

    fetchBanners();
  }, []);

  return (
    <>
      <div className="bg-[#0D0E11] text-white">
        <main className="max-w-[1000px] mx-auto">
          <div className='w-full flex items-center justify-between border-x border-[#2F3336]'>
            <ChainSelection value={selectedChain} onChange={handleChainChange} />
            <div className="h-[52px] flex items-center px-6">
              <div className="relative flex items-center gap-2">
                <Input
                  placeholder="Search..."
                  onClick={() => searchModal.toggle()}
                  readOnly
                  className="w-64 text-end !bg-transparent border-none rounded-none text-white placeholder:text-[#99A1AF] placeholder:text-end focus:border-none focus-visible:ring-0 focus-visible:ring-offset-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          {/* Banner with skeleton loading */}
          {loadingBanners ? (
            <BannerSkeleton />
          ) : banners.length > 0 ? (
            <Banner items={banners} />
          ) : null}
          {/* Trending Collections Table - has its own internal loading state */}
          <NFTTrendingTable chainFilter={selectedChainId} />
          {/* Market Activity Section */}
          <MarketActivitySection chainFilter={selectedChainId} />
          {/* Features Section */}
          <FeaturesSection />
          {/* Statistics Section */}
          {/* <StatisticsSection /> */}
          {/* Join the Community Section */}
          <div className='border-x border-[#2F3336]'>
            <JoinCommunitySection />
          </div>
        </main>
      </div>
    </>
  );
}

export default function NFTLaunchpad() {
  return (
    <SearchModal>
      <NFTLaunchpadContent />
    </SearchModal>
  );
}
