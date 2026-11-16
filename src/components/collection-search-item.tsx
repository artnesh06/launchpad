'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useIpfsToHttp } from '@/hooks/useIpfsToHttp';
import { getChainName } from '@/config/chains';

interface CollectionSearchItemProps {
  collection: {
    id: string;
    contractAddress: string;
    name: string;
    chainId: number;
    metadata?: {
      image?: string;
      coverImage?: string;
    };
  };
  onClick: () => void;
  isLastItem?: boolean;
  lastItemRef?: (node: HTMLDivElement) => void;
}

export function CollectionSearchItem({ 
  collection, 
  onClick, 
  isLastItem, 
  lastItemRef 
}: CollectionSearchItemProps) {
  const chainName = getChainName(collection.chainId);
  const avatar = collection.name?.charAt(0)?.toUpperCase() || '?';
  const coverImageRaw = collection.metadata?.image || collection.metadata?.coverImage;
  
  // Convert IPFS to HTTP via API
  const { httpUrl: coverImage } = useIpfsToHttp(coverImageRaw);

  return (
    <div
      ref={isLastItem ? lastItemRef : null}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-[5px] hover:bg-[#1E192B] cursor-pointer transition-all duration-200 group"
    >
      <Avatar className="w-14 h-14 bg-[#2D253E] rounded-[5px] flex-shrink-0">
        {coverImage ? (
          <AvatarImage
            src={coverImage}
            alt={collection.name}
            className="object-cover rounded-[5px]"
          />
        ) : null}
        <AvatarFallback className="bg-[#2D253E] text-xl rounded-[5px]">
          {avatar}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium font-mono truncate">
          {collection.name}
        </div>
        <div className="text-[#8B949E] text-xs font-mono mt-1">
          {chainName}
        </div>
      </div>

      <div className="text-[#8B949E] group-hover:text-white transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
