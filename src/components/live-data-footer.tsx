'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface LiveDataFooterProps {
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function LiveDataFooter({ onLoadMore, hasMore = true, loading = false }: LiveDataFooterProps) {
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('/api/crypto-price?symbol=ETH&currency=USD');
        const data = await response.json();
        if (data.success && data.data?.price) {
          setEthPrice(data.data.price);
        }
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    };

    fetchEthPrice();
    
    // Update price every 60 seconds
    const interval = setInterval(fetchEthPrice, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="w-full flex items-center justify-between px-5 py-2 relative">
      {/* Left Side - Live Data with Indicator */}
      <div className="flex items-center gap-2">
        <div className="relative w-[14px] h-[14px]">
          {/* Outer circle */}
          <div className="absolute inset-0 rounded-full bg-[#395947]" />
          {/* Inner glowing circle */}
          <div className="absolute inset-[2px] rounded-full bg-[#0BFF75]" />
        </div>
        <span className="text-white font-mono text-sm font-normal">
          Live Data
        </span>
      </div>

      {/* Center - Pagination Arrow (Load More Button) */}
      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Load more"
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <Image
              src="/images/icons/pagination-arrow-down.svg"
              alt=""
              width={20}
              height={9}
              className="object-contain"
            />
          )}
        </button>
      )}

      {/* Right Side - ETH Price */}
      <span className="text-[#F87683] font-mono text-sm font-normal">
        {ethPrice ? `1 ETH = ${formatPrice(ethPrice)}` : '0'}
      </span>
    </div>
  );
}
