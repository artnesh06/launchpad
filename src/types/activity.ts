// Activity feed types for real-time market activity display

export type ActivityType = 
  | 'mint' 
  | 'collection' 
  | 'burn' 
  | 'airdrop' 
  | 'phase' 
  | 'reveal' 
  | 'admin' 
  | 'metadata' 
  | 'security';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  name: string;
  action: string;
  time: string;
  avatar: string;
  chainId: number;
  chainName: string;
  chainIcon?: string;
  txHash?: string;
  isFirst?: boolean;
  contractAddress?: string;
  tokenId?: string;
}

export interface ActivityFeedResponse {
  success: boolean;
  data: {
    activities: ActivityItem[];
  };
  error?: string;
}
