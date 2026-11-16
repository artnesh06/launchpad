'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import type { ActivityType, ActivityItem } from '@/types/activity';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { MintsOverTimeChart } from '@/components/mints-over-time-chart';
import { useHomepageSocket } from '@/hooks/useHomepageSocket';
import { AnimatedList } from '@/components/ui/animated-list';

interface ActivityColumnProps {
  title: string;
  description: string;
  type: ActivityType;
  chainFilter?: number | 'all';
}

function ActivityColumn({ title, description, type, chainFilter = 'all' }: ActivityColumnProps) {
  const router = useRouter();
  const { activities: initialActivities, loading } = useActivityFeed({
    type,
    chainId: chainFilter,
    limit: 10, // Changed from 3 to 10
  });

  // WebSocket hook for real-time updates
  const { latestMint, latestCollection } = useHomepageSocket({
    chainFilter: chainFilter,
    enabled: true,
  });

  // Local state to manage activities with real-time updates
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);

  // Track processed events to prevent duplicates from WebSocket
  // Using Set to track multiple recent events
  const processedMintsRef = useRef<Set<string>>(new Set());
  const processedCollectionsRef = useRef<Set<string>>(new Set());
  
  // Track previous chain filter to detect changes
  const prevChainFilterRef = useRef(chainFilter);

  // Update activities when initial data changes or chain filter changes
  useEffect(() => {
    // If chain filter changed, reset to initial data
    if (prevChainFilterRef.current !== chainFilter) {
      prevChainFilterRef.current = chainFilter;
      setActivities(initialActivities);
      // Clear processed refs when chain changes
      processedMintsRef.current.clear();
      processedCollectionsRef.current.clear();
      return;
    }
    
    // Only set initial data if activities is empty (first load)
    if (activities.length === 0 && initialActivities.length > 0) {
      setActivities(initialActivities);
    }
  }, [initialActivities, chainFilter, activities.length]);

  // Handle real-time mint updates
  useEffect(() => {
    if (type === 'mint' && latestMint) {
      // Filter by chain if chainFilter is not 'all'
      if (chainFilter !== 'all' && latestMint.chainId !== chainFilter) {
        return; // Skip this mint if it's not from the selected chain
      }

      // Create unique key for this mint event
      const mintKey = `${latestMint.transactionHash}-${latestMint.tokenId}`;
      
      // Skip if we already processed this exact event
      if (processedMintsRef.current.has(mintKey)) {
        return;
      }
      processedMintsRef.current.add(mintKey);
      
      // Limit Set size to prevent memory leak
      if (processedMintsRef.current.size > 100) {
        const firstKey = processedMintsRef.current.values().next().value;
        if (firstKey) processedMintsRef.current.delete(firstKey);
      }

      setActivities(prev => {
        // Check if this mint already exists (prevent duplicates)
        const exists = prev.some(a => 
          a.contractAddress?.toLowerCase() === latestMint.contractAddress.toLowerCase() &&
          a.tokenId === latestMint.tokenId?.toString()
        );
        
        if (exists) return prev;
        
        // Create new activity from mint event
        const newActivity: ActivityItem = {
          id: `${latestMint.transactionHash}-${latestMint.tokenId}-${Date.now()}`,
          type: 'mint',
          name: latestMint.contractAddress.slice(0, 6) + '...' + latestMint.contractAddress.slice(-4),
          action: `minted ${latestMint.quantity} NFT${latestMint.quantity > 1 ? 's' : ''}`,
          time: 'just now',
          avatar: latestMint.imageUrl || '', // Use image from mint event
          chainId: latestMint.chainId || 0,
          chainName: '', // Will be populated from chainId
          chainIcon: '', // Will be populated from chainId
          isFirst: true,
          contractAddress: latestMint.contractAddress,
          tokenId: latestMint.tokenId?.toString() || '1',
        };

        // Add new activity to the top and limit to 10
        const updated = [newActivity, ...prev.map(a => ({ ...a, isFirst: false }))].slice(0, 10);
        return updated;
      });
    }
  }, [latestMint, type, chainFilter]);

  // Handle real-time collection updates
  useEffect(() => {
    if (type === 'collection' && latestCollection) {
      // Filter by chain if chainFilter is not 'all'
      if (chainFilter !== 'all' && latestCollection.chainId !== chainFilter) {
        return; // Skip this collection if it's not from the selected chain
      }

      // Create unique key for this collection event using contractAddress and timestamp
      const collectionKey = `${latestCollection.contractAddress}-${latestCollection.timestamp}`;
      
      // Skip if we already processed this exact event
      if (processedCollectionsRef.current.has(collectionKey)) {
        return;
      }
      processedCollectionsRef.current.add(collectionKey);
      
      // Limit Set size to prevent memory leak
      if (processedCollectionsRef.current.size > 100) {
        const firstKey = processedCollectionsRef.current.values().next().value;
        if (firstKey) processedCollectionsRef.current.delete(firstKey);
      }

      setActivities(prev => {
        // Check if this collection already exists (prevent duplicates)
        const exists = prev.some(a => 
          a.contractAddress?.toLowerCase() === latestCollection.contractAddress.toLowerCase()
        );
        
        if (exists) return prev;
        
        // Create new activity from collection event
        const newActivity: ActivityItem = {
          id: `${latestCollection.contractAddress}-${Date.now()}`,
          type: 'collection',
          name: latestCollection.name || 'New Collection',
          action: 'was deployed',
          time: 'just now',
          avatar: latestCollection.imageUrl || '',
          chainId: latestCollection.chainId || 0,
          chainName: '', // Will be populated from chainId
          chainIcon: '', // Will be populated from chainId
          isFirst: true,
          contractAddress: latestCollection.contractAddress,
        };

        // Add new activity to the top and limit to 10
        const updated = [newActivity, ...prev.map(a => ({ ...a, isFirst: false }))].slice(0, 10);
        return updated;
      });
    }
  }, [latestCollection, type, chainFilter]);

  const handleActivityClick = (activity: ActivityItem) => {
    console.log("click ", type, activity);
    if (type === 'collection' && activity.contractAddress) {
      router.push(`/l/${activity.contractAddress}`);
    } else if (type === 'mint' && activity.contractAddress) {
      const tokenId = activity.tokenId || '1'; // Use tokenId if available, fallback to '1'
      // router.push(`/collection/${activity.contractAddress}/${tokenId}`);
      router.push(`/l/${activity.contractAddress}`);
    }
  };

  const renderActivityItem = (activity: ActivityItem, index: number) => (
    <div
      key={activity.id}
      onClick={() => handleActivityClick(activity)}
      className={`flex items-center h-[75px] p-4 rounded-md border border-[#2F3336] backdrop-blur-[12px] relative transition-all duration-300 cursor-pointer hover:h-[82px] hover:scale-105 z-10 ${
        activity.isFirst ? 'animate-slideInFromTop' : ''
      }`}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0)',
        boxShadow: '0px 0px 40px -25px rgba(0, 0, 0, 0.25)',
        pointerEvents: 'auto',
        animationDelay: `${index * 50}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#1E192B';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0)';
      }}
    >
      {activity.avatar && (
        <div className="flex-shrink-0 mr-[12px] relative w-8 h-8 pointer-events-none">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1E1F22]">
            <img
              src={ipfsToHttp(activity.avatar) || activity.avatar}
              alt={activity.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
          {/* Chain badge overlay */}
          {activity.chainIcon && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0D0E12] border border-[#2F3336] flex items-center justify-center">
              <img
                src={activity.chainIcon || activity.chainIcon}
                alt={activity.chainName}
                className="w-3 h-3 object-contain"
              />
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="text-[#F7F8FB] font-medium text-xs leading-4 font-sans">
          {activity.name}
          <br />
          <span className="text-[#6A7282]">{activity.action} {activity.time}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[380px]">
      {/* Activities Container with ScrollArea */}
      <div className="h-[285px] border-b border-[#2F3336]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#A9ABAF] font-mono text-sm">Loading...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#A9ABAF] font-mono text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="h-full overflow-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <AnimatedList className="space-y-[8px]">
              {[...activities].reverse().map((activity, index) => (
                <React.Fragment key={activity.id}>
                  {renderActivityItem(activity, index)}
                </React.Fragment>
              ))}
            </AnimatedList>
          </div>
        )}
      </div>

      {/* Title and Description */}
      <div className="px-5 pt-[22px] pb-0 flex-1">
        <h3 className="text-[#F7F8FB] font-mono text-lg font-semibold leading-7 tracking-[-0.025em] mb-0">
          {title}
        </h3>
        <p className="text-[#6A7282] font-mono text-sm font-normal leading-5 mt-0">
          {description}
        </p>
      </div>
    </div>
  );
}

function MintsChartColumn({ chainFilter = 'all' }: { chainFilter?: number | 'all' }) {
  return (
    <div className="flex flex-col h-[380px]">
      {/* Chart Container */}
      <div className="h-[285px] border-b border-[#2F3336] py-3 pl-0 pr-2 pb-3">
        <MintsOverTimeChart chainFilter={chainFilter} />
      </div>

      {/* Title and Description */}
      <div className="px-5 pt-[22px] pb-0 flex-1">
        <h3 className="text-[#F7F8FB] font-mono text-lg font-semibold leading-7 tracking-[-0.025em] mb-0">
          Mints Over Time
        </h3>
        <p className="text-[#6A7282] font-mono text-sm font-normal leading-5 mt-0">
          Track activity across the chain.
        </p>
      </div>
    </div>
  );
}

interface MarketActivitySectionProps {
  chainFilter?: number | 'all';
}

export function MarketActivitySection({ chainFilter = 'all' }: MarketActivitySectionProps) {
  return (
    <div className="w-full border border-[#2F3336] border-t-0 border-b-0">
      {/* Header with Background Image */}
      <div className="relative h-[117px] border-b border-[#2F3336]">
        <div className="absolute inset-0">
          <Image
            src="/images/information-bg-56586a.png"
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E11] via-[#0D0E11]/50 to-transparent" />
        </div>
        <div className="relative h-full flex items-center justify-center">
          <h2 className="text-[#B392F0] font-mono text-sm font-semibold uppercase tracking-wider">
            GLOBAL ACTIVITY
          </h2>
        </div>
      </div>

      {/* Activity Columns Grid */}
      <div className="grid grid-cols-3 border-b border-[#2F3336]">
        <div className="border-r border-[#2F3336]">
          <ActivityColumn
            title="Latest Mint"
            description="Track minted NFT in real time."
            type="mint"
            chainFilter={chainFilter}
          />
        </div>
        <div className="border-r border-[#2F3336]">
          <ActivityColumn
            title="Latest Collection"
            description="Track new drop hitting the chain."
            type="collection"
            chainFilter={chainFilter}
          />
        </div>
        <div>
          <MintsChartColumn chainFilter={chainFilter} />
        </div>
      </div>
    </div>
  );
}
