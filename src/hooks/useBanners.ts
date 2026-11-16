import { useState, useEffect } from 'react';

export interface BannerData {
  id: string;
  title: string;
  creator: string;
  network: string;
  image: string;
  thumbnail: string | null;
  type: 'IMAGE' | 'VIDEO';
  twitter: string | null;
  discord: string | null;
  telegram: string | null;
  collectionAddress: string | null;
  launchpadId: string | null;
  mintedDate: string | null;
  mintedLink: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';
  sequence: number;
  launchpad?: any;
}

export function useBanners() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBanners() {
      try {
        setLoading(true);
        const response = await fetch('/api/banners');
        
        if (!response.ok) {
          throw new Error('Failed to fetch banners');
        }

        const data = await response.json();
        setBanners(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchBanners();
  }, []);

  return { banners, loading, error };
}
