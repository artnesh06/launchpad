import axios from 'axios';

const api = axios.create({
  baseURL: '/api/admin',
  timeout: 30000,
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    throw error.response?.data || error;
  }
);

export interface FactoryInfo {
  version: string;
  chainId: number;
  deployedChainId: number;
  totalCollections: number;
  creationFeeAmount: string;
  treasury: string;
  owner: string;
  platformFeeInfo: {
    percentage: number;
    freeMintFee: string;
    treasury: string;
  };
  databaseStats: {
    totalLaunchpads: number;
    lastUpdated: string;
  };
}

export interface LaunchpadInfo {
  id: string;
  contractAddress: string;
  creator: string;
  name: string;
  symbol: string;
  description?: string;
  totalMaxSupply: number;
  mintedCount: number;
  volume: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  mintPercentage: number;
  isComplete: boolean;
  daysSinceCreated: number;
  metadata?: {
    website?: string;
    twitter?: string;
    discord?: string;
    featured: boolean;
    verified: boolean;
  };
}

export interface AnalyticsData {
  overview: {
    totalLaunchpads: number;
    totalCreators: number;
    totalVolume: string;
    totalFees: string;
    recentActivity: number;
    networkHealth: 'good' | 'warning' | 'critical';
    growthRate: number;
  };
  metrics: {
    mintGrowth: number;
    launchpadGrowth: number;
    avgGasPrice: string;
    successRate: number;
    avgDeployTime: number;
    activeUsers: number;
  };
  charts: {
    volumeOverTime: any[];
    topPerformers: {
      name: string;
      symbol: string;
      volume: string;
      mints: number;
    }[];
  };
  recentActivities: {
    id: string;
    type: string;
    description: string;
    actor: string;
    txHash?: string;
    createdAt: string;
  }[];
}

export interface BulkOperation {
  id: string;
  name: string;
  type: 'CREATE_LAUNCHPADS' | 'UPDATE_FEES' | 'UPDATE_TREASURIES' | 'EXPORT_DATA';
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  total: number;
  processed: number;
  errors: string[];
  data: any;
  result?: any;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
}

export class AdminService {
  // Factory Info
  static async getFactoryInfo(chainId: number): Promise<FactoryInfo> {
    const response = await api.get(`/factory-info?chainId=${chainId}`);
    return response.data;
  }

  static async syncFactoryInfo(chainId: number): Promise<FactoryInfo> {
    const response = await api.post('/factory-info', {
      action: 'sync',
      chainId
    });
    return response.data;
  }

  // Individual Factory Details
  static async getFactoryDetails(chainId: number): Promise<{
    deployedChainId: number;
    factoryVersion: string;
    owner: string;
    platformFeePercentage: number;
    platformTreasury: string;
    freeMintPlatformFee: string;
    totalLaunchpads: number;
    creationFee: string;
  }> {
    const response = await api.get(`/factory-details?chainId=${chainId}`);
    return response.data;
  }

  static async getLaunchpadByIndex(chainId: number, index: number): Promise<string> {
    const response = await api.post('/factory-details', {
      action: 'get_launchpad_by_index',
      chainId,
      index
    });
    return response.data;
  }

  static async getLaunchpadMapping(chainId: number, launchpadAddress: string): Promise<{
    launchpadAddress: string;
    creator: string;
    name: string;
    symbol: string;
    createdAt: number;
    totalSupply: number;
  }> {
    const response = await api.post('/factory-details', {
      action: 'get_launchpad_mapping',
      chainId,
      launchpadAddress
    });
    return response.data;
  }

  // Launchpads
  static async getLaunchpads(params: {
    chainId: number;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    launchpads: LaunchpadInfo[];
    pagination: {
      current: number;
      total: number;
      count: number;
      limit: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/launchpads?${queryParams}`);
    return response.data;
  }

  static async syncLaunchpads(chainId: number): Promise<{ syncedCount: number }> {
    const response = await api.post('/launchpads', {
      action: 'sync',
      chainId
    });
    return response.data;
  }

  static async updateLaunchpadStatus(launchpadId: string, status: string): Promise<LaunchpadInfo> {
    const response = await api.post('/launchpads', {
      action: 'update_status',
      launchpadId,
      status
    });
    return response.data;
  }

  // Analytics
  static async getAnalytics(chainId: number, period: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<AnalyticsData> {
    const response = await api.get(`/analytics?chainId=${chainId}&period=${period}`);
    return response.data;
  }

  // Bulk Operations
  static async getBulkOperations(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{
    operations: BulkOperation[];
    pagination: {
      current: number;
      total: number;
      count: number;
      limit: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await api.get(`/bulk-operations?${queryParams}`);
    return response.data;
  }

  static async createBulkOperation(
    type: BulkOperation['type'],
    data: any,
    createdBy: string
  ): Promise<BulkOperation> {
    const response = await api.post('/bulk-operations', {
      action: 'create',
      type,
      data,
      createdBy
    });
    return response.data;
  }

  static async updateBulkOperationStatus(
    operationId: string,
    status: BulkOperation['status']
  ): Promise<BulkOperation> {
    const response = await api.post('/bulk-operations', {
      action: 'update',
      operationId,
      status
    });
    return response.data;
  }

  // Export functions
  static async exportLaunchpads(chainId: number, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await axios.get(`/api/admin/export/launchpads?chainId=${chainId}&format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  static async exportAnalytics(chainId: number, period: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await axios.get(`/api/admin/export/analytics?chainId=${chainId}&period=${period}&format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Utility functions
  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static parseBulkCreateCSV(csvContent: string): any[] {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const item: any = {};
      
      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });
      
      // Convert numeric fields
      if (item.totalSupply) item.totalSupply = parseInt(item.totalSupply);
      if (item.royaltyPercentage) item.royaltyPercentage = parseInt(item.royaltyPercentage);
      
      data.push(item);
    }

    return data;
  }

  static generateBulkCreateTemplate(userAddress?: string): string {
    const defaultAddress = userAddress || 'YOUR_WALLET_ADDRESS';
    return `name,symbol,description,baseURI,totalSupply,treasury,royaltyRecipient,royaltyPercentage
Example NFT Collection,EXAMPLE,Description of your NFT collection,https://your-api.com/metadata/,10000,${defaultAddress},${defaultAddress},500
My Art Collection,MYART,Digital art collection,https://your-api.com/metadata2/,5000,${defaultAddress},${defaultAddress},250`;
  }

  static formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  static formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  static formatEther(wei: string | number): string {
    // Simple ETH formatting - in production you'd use ethers.formatEther
    const eth = typeof wei === 'string' ? parseFloat(wei) : wei;
    return (eth / 1e18).toFixed(4);
  }

  static calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  static getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status.toLowerCase()) {
      case 'active':
      case 'running':
      case 'completed':
        return 'default';
      case 'paused':
      case 'pending':
        return 'secondary';
      case 'cancelled':
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  }
}

export default AdminService;