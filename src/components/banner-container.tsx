'use client';

import { useBanners } from '@/hooks/useBanners';
import Banner from './banner';
import { BannerWithLaunchpad } from '@/types/launchpad';

// Fungsi untuk mengkonversi data dari database ke format BannerWithLaunchpad
function convertToBannerWithLaunchpad(dbBanner: any): BannerWithLaunchpad {
  return {
    id: dbBanner.id,
    banner_id: dbBanner.sequence,
    banner_title: dbBanner.title,
    banner_creator: dbBanner.creator,
    banner_network: dbBanner.network as 'stargaze' | 'intergaze',
    banner_image: dbBanner.image,
    banner_thumbnail: dbBanner.thumbnail,
    banner_type: dbBanner.type === 'VIDEO' ? 'V' : 'I',
    banner_twiter: dbBanner.twitter,
    banner_discord: dbBanner.discord,
    banner_telegram: dbBanner.telegram,
    banner_collection_address: dbBanner.collectionAddress,
    banner_minted_date: dbBanner.mintedDate,
    banner_minted_link: dbBanner.mintedLink,
    banner_status: dbBanner.status,
    banner_seqn: dbBanner.sequence,
    launchpad: dbBanner.launchpad
  };
}

export default function BannerContainer() {
  const { banners, loading, error } = useBanners();

  if (loading) {
    return (
      <div className="border border-[#2F3336]">
        <div className="relative h-[300px] flex items-center justify-center bg-black/50">
          <div className="text-white">Loading banners...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-[#2F3336]">
        <div className="relative h-[300px] flex items-center justify-center bg-black/50">
          <div className="text-red-500">Error loading banners: {error}</div>
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className="border border-[#2F3336]">
        <div className="relative h-[300px] flex items-center justify-center bg-black/50">
          <div className="text-white">No banners available</div>
        </div>
      </div>
    );
  }

  const convertedBanners = banners.map(convertToBannerWithLaunchpad);

  return <Banner items={convertedBanners} />;
}
