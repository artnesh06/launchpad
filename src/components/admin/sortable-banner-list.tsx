'use client';

import { useState } from 'react';
import { AdminBanner } from '@/hooks/useAdminBanners';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit01Icon, Delete02Icon, DragDropVerticalIcon, Calendar01Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { ipfsToHttp } from '@/lib/ipfs-utils';

interface ImageWithLoadingProps {
  src: string;
  alt: string;
  className?: string;
}

function ImageWithLoading({ src, alt, className }: ImageWithLoadingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-600">
        No Image
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1E1F22]">
          <img 
            src="/images/Loading.png" 
            alt="Loading..." 
            className="w-8 h-8 object-contain animate-pulse"
          />
        </div>
      )}
      <img 
        src={src} 
        alt={alt} 
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </>
  );
}

interface SortableBannerListProps {
  banners: AdminBanner[];
  onEdit: (banner: AdminBanner) => void;
  onDelete: (banner: AdminBanner) => void;
  onReorder: (banners: AdminBanner[]) => void;
}

export function SortableBannerList({ banners, onEdit, onDelete, onReorder }: SortableBannerListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBanners = [...banners];
    const draggedBanner = newBanners[draggedIndex];
    newBanners.splice(draggedIndex, 1);
    newBanners.splice(index, 0, draggedBanner);

    setDraggedIndex(index);
    onReorder(newBanners);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (banner: AdminBanner) => {
    const now = new Date();
    const startDate = banner.startDate ? new Date(banner.startDate) : null;
    const endDate = banner.endDate ? new Date(banner.endDate) : null;

    if (banner.status === 'INACTIVE') {
      return <Badge variant="outline" className="bg-gray-600 text-white font-mono">Inactive</Badge>;
    }

    if (startDate && startDate > now) {
      return <Badge variant="outline" className="bg-yellow-600 text-white font-mono">Scheduled</Badge>;
    }

    if (endDate && endDate < now) {
      return <Badge variant="outline" className="bg-red-600 text-white font-mono">Expired</Badge>;
    }

    return <Badge variant="outline" className="bg-green-600 text-white font-mono">Active</Badge>;
  };

  if (banners.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400 font-mono">No banners found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-4 p-4 border border-[#2F3336] rounded-lg transition-all ${
            draggedIndex === index ? 'opacity-50' : 'hover:border-[#B392F0]'
          }`}
        >
          <div className="cursor-grab active:cursor-grabbing">
            <HugeiconsIcon icon={DragDropVerticalIcon} size={20} className="text-gray-500" />
          </div>

          <div className="h-16 w-24 rounded bg-[#1E1F22] overflow-hidden flex-shrink-0 relative">
            {banner.thumbnail || banner.image ? (
              <ImageWithLoading
                src={ipfsToHttp(banner.thumbnail) || ipfsToHttp(banner.image) || ''} 
                alt={banner.title} 
                className="h-full w-full object-cover" 
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-600">
                No Image
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-white font-mono truncate">{banner.title}</h3>
              {getStatusBadge(banner)}
              {banner.promoCode && (
                <Badge variant="outline" className="font-mono text-xs">
                  Promo: {banner.promoCode}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-400 font-mono">
              By {banner.creator} • {banner.network}
            </p>
            {(banner.startDate || banner.endDate) && (
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-mono">
                {banner.startDate && (
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={Calendar01Icon} size={12} />
                    Start: {formatDate(banner.startDate)}
                  </span>
                )}
                {banner.endDate && (
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={Clock01Icon} size={12} />
                    End: {formatDate(banner.endDate)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(banner)}
              className="font-mono"
            >
              <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(banner)}
              className="font-mono"
            >
              <HugeiconsIcon icon={Delete02Icon} size={16} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
