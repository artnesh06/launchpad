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

export interface TopCollection {
  id: string;
  name: string;
  contractAddress: string;
  volume: string;
  mints: number;
  chainId: number;
}

export interface TopCreator {
  address: string;
  totalVolume: string;
  totalCollections: number;
  totalMints: number;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

export interface AnalyticsData {
  volumeOverTime: TimeSeriesData[];
  mintsOverTime: TimeSeriesData[];
  topCollections: TopCollection[];
  topCreators: TopCreator[];
}

// Launchpad types
export interface AdminLaunchpad {
  id: string;
  chainId: number;
  name: string;
  symbol: string;
  contractAddress: string;
  creator: string;
  status: string;
  mintedCount: number;
  totalMaxSupply: number;
  volume: number;
  mintPrice: number;
  mintPercentage: number;
  isComplete: boolean;
  daysSinceCreated: number;
  isShuffleEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date | string | null;
  metadata?: any;
  analytics?: any;
  phases?: any[];
  chartData24h?: any[];
  volumeChange24h?: number;
}

export interface LaunchpadFilters {
  page?: number;
  limit?: number;
  chainId?: number;
  status?: string;
  search?: string;
  creatorAddress?: string;
}

export interface PaginationInfo {
  current: number;
  total: number;
  count: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AdminStats {
  totalCollections: number;
  totalMints: number;
  totalVolume: string;
  activeLaunchpads: number;
  completedLaunchpads: number;
  volumeChange?: number;
  mintsChange?: number;
}
