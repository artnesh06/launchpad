import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface AdminBanner {
  id: string;
  title: string;
  creator: string;
  network: string;
  image: string;
  thumbnail?: string;
  type: 'IMAGE' | 'VIDEO';
  twitter?: string;
  discord?: string;
  telegram?: string;
  collectionAddress?: string;
  launchpadId?: string;
  mintedDate?: string;
  mintedLink?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';
  sequence: number;
  startDate?: string;
  endDate?: string;
  promoCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromoRequest {
  id: string;
  promoCode: string;
  collectionName: string;
  collectionAddress?: string;
  creator: string;
  chainId: number;
  chainName: string;
  image?: string;
  thumbnail?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  bannerId?: string;
  createdAt: string;
  updatedAt: string;
}

export function useAdminBanners() {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [promoRequests, setPromoRequests] = useState<PromoRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/admin/banners');
      const data = await response.json();
      
      if (data.success) {
        setBanners(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to fetch banners');
    }
  };

  const fetchPromoRequests = async () => {
    try {
      const response = await fetch('/api/promo-requests');
      const data = await response.json();
      
      if (data.success) {
        setPromoRequests(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch promo requests:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchBanners(), fetchPromoRequests()]);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  const createBanner = async (data: Partial<AdminBanner>) => {
    try {
      const response = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Banner created successfully');
        await fetchBanners();
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Failed to create banner');
      throw err;
    }
  };

  const updateBanner = async (id: string, data: Partial<AdminBanner>) => {
    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Banner updated successfully');
        await fetchBanners();
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Failed to update banner');
      throw err;
    }
  };

  const deleteBanner = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Banner deleted successfully');
        await fetchBanners();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Failed to delete banner');
      throw err;
    }
  };

  const reorderBanners = async (reorderedBanners: AdminBanner[]) => {
    try {
      // Update sequence for each banner
      const updates = reorderedBanners.map((banner, index) =>
        fetch(`/api/admin/banners/${banner.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence: index })
        })
      );

      await Promise.all(updates);
      toast.success('Banner order updated');
      await fetchBanners();
    } catch (err) {
      toast.error('Failed to reorder banners');
      throw err;
    }
  };

  const approvePromo = async (promoId: string, data: { startDate?: string; endDate?: string; sequence?: number }) => {
    try {
      const response = await fetch(`/api/promo-requests/${promoId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Promo request approved and banner created');
        await Promise.all([fetchBanners(), fetchPromoRequests()]);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Failed to approve promo request');
      throw err;
    }
  };

  const rejectPromo = async (promoId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/promo-requests/${promoId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Promo request rejected');
        await fetchPromoRequests();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Failed to reject promo request');
      throw err;
    }
  };

  return {
    banners,
    promoRequests,
    isLoading,
    error,
    createBanner,
    updateBanner,
    deleteBanner,
    reorderBanners,
    approvePromo,
    rejectPromo
  };
}
