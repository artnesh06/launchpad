import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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

export function usePromoRequests() {
  const [promoRequests, setPromoRequests] = useState<PromoRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
      setError(err as Error);
      console.error('Failed to fetch promo requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoRequests();
  }, []);

  const createPromoRequest = async (data: Partial<PromoRequest>) => {
    try {
      const response = await fetch('/api/promo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchPromoRequests();
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create promo request');
      throw err;
    }
  };

  return {
    promoRequests,
    isLoading,
    error,
    createPromoRequest
  };
}
