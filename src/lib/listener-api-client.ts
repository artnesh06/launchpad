/**
 * Listener API Client
 * Client for communicating with the nft-listener-service backend
 * Deployed at https://dev.backend.oddslaunchpad.com
 */

// ============ Types ============

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  chains: {
    active: number;
    total: number;
  };
  launchpads: number;
  database: {
    activeConnections: number;
    maxConnections: number;
    waiting: number;
  };
  websocket: {
    configured: boolean;
    port?: number;
    maxConnections?: number;
    activeConnections?: number;
  };
  queue?: {
    initialized: boolean;
    workerActive: boolean;
  };
  memory?: {
    heapUsedMB: number;
    heapTotalMB: number;
  };
  uptime?: number;
}

export interface WebSocketHealth {
  status: 'healthy' | 'unhealthy' | 'unavailable';
  timestamp: string;
  connections: {
    active: number;
    max: number;
    accepted: number;
    rejected: number;
    perRoom: Record<string, number>;
  };
  rooms: {
    count: number;
    details: Array<{
      name: string;
      clients: number;
      messages: number;
      lastActivity: string;
    }>;
  };
  messages: {
    totalDelivered: number;
    successRate: number;
    averageRecipients: number;
    recentDeliveries: Array<{
      timestamp: string;
      event: string;
      room: string;
      recipients: number;
      success: boolean;
    }>;
  };
  performance: {
    averageLatencyMs: number;
    messagesPerSecond: number;
    peakConnectionCount: number;
    peakMessageRate: number;
  };
  uptime: {
    milliseconds: number;
    seconds: number;
    minutes: number;
  };
  memory: {
    heapUsed: number;
    heapUsedMB: number;
    heapTotal: number;
    heapTotalMB: number;
  };
}

export interface ChainStatus {
  chainId: number;
  chainName: string;
  isRunning: boolean;
  launchpadCount: number;
  error?: string;
}

export interface SystemStats {
  totalLaunchpads: number;
  totalNFTs: number;
  totalMints: number;
  activeChains: number;
  lastSyncTime: string;
  uptime: number;
}

export interface SyncResult {
  success: boolean;
  chainId?: number;
  launchpadAddress?: string;
  synced?: number;
  total?: number;
  errors?: number;
  activityId?: string;
}

export interface MintedCountSyncResult {
  success: boolean;
  total: number;
  fixed: number;
  alreadyCorrect: number;
  details: Array<{
    contractAddress: string;
    name: string;
    oldValue: number;
    newValue: number;
    status: string;
  }>;
  activityId?: string;
}

export interface RefreshResult {
  success: boolean;
  message: string;
  activityId?: string;
}

export interface RestartResult {
  success: boolean;
  message: string;
  results?: Array<{
    chainId: number;
    success: boolean;
    message: string;
  }>;
  activityId?: string;
}

export interface RegisterResult {
  success: boolean;
  message: string;
  launchpad?: {
    id: string;
    chainId: number;
    contractAddress: string;
    name: string;
    status: string;
  };
  activityId?: string;
}

export interface RemoveResult {
  success: boolean;
  message: string;
  activityId?: string;
}

export interface Launchpad {
  contractAddress: string;
  name: string;
  status: string;
  totalSupply: number;
  maxSupply: number;
  createdAt: string;
  isMonitored?: boolean;
}

export interface ActivityLog {
  id: string;
  operationType: 'sync_nfts' | 'sync_metadata' | 'sync_minted_count' | 'rescan' | 'restart' | 'register' | 'remove';
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  chainId?: number;
  contractAddress?: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  itemsProcessed?: number;
  itemsFailed?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogFilters {
  page?: number;
  limit?: number;
  contractAddress?: string;
  operationType?: ActivityLog['operationType'];
  status?: ActivityLog['status'];
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedActivityLogs {
  items: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RescanResult {
  success: boolean;
  message: string;
  eventsFound?: number;
  blocksScanned?: number;
  activityId?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json';
}

// ============ Error Handling ============

export interface ListenerApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

export class ListenerApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ListenerApiClientError';
  }
}

const errorCodes: Record<string, { message: string; retryable: boolean }> = {
  NETWORK_ERROR: { message: 'Network connection failed', retryable: true },
  TIMEOUT: { message: 'Request timed out', retryable: true },
  UNAUTHORIZED: { message: 'Authentication required', retryable: false },
  NOT_FOUND: { message: 'Resource not found', retryable: false },
  RATE_LIMITED: { message: 'Too many requests', retryable: true },
  SERVER_ERROR: { message: 'Server error', retryable: true },
  INVALID_CONTRACT: { message: 'Invalid contract address', retryable: false },
  CHAIN_NOT_SUPPORTED: { message: 'Chain not supported', retryable: false },
};

// ============ Retry Configuration ============

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};


// ============ Utility Functions ============

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry with exponential backoff
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Handle API errors and convert to ListenerApiClientError
 */
function handleApiError(error: unknown): ListenerApiClientError {
  if (error instanceof ListenerApiClientError) {
    return error;
  }

  if (error instanceof Error) {
    // Network error
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      return new ListenerApiClientError(
        errorCodes.NETWORK_ERROR.message,
        'NETWORK_ERROR',
        errorCodes.NETWORK_ERROR.retryable
      );
    }

    // Timeout error
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
      return new ListenerApiClientError(
        errorCodes.TIMEOUT.message,
        'TIMEOUT',
        errorCodes.TIMEOUT.retryable
      );
    }

    // Generic error
    return new ListenerApiClientError(
      error.message,
      'UNKNOWN_ERROR',
      false
    );
  }

  return new ListenerApiClientError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    false
  );
}

// ============ Listener API Client Class ============

/**
 * Client for communicating with the nft-listener-service backend
 */
export class ListenerApiClient {
  private baseUrl: string;
  private retryConfig: RetryConfig;
  private adminApiKey?: string;

  constructor(options?: {
    baseUrl?: string;
    retryConfig?: Partial<RetryConfig>;
    adminApiKey?: string;
  }) {
    // Use NEXT_PUBLIC_BACKEND_URL environment variable or fallback
    this.baseUrl = options?.baseUrl || 
      (typeof window !== 'undefined' 
        ? process.env.NEXT_PUBLIC_BACKEND_URL || 'https://dev.backend.oddslaunchpad.com'
        : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://dev.backend.oddslaunchpad.com');
    
    this.retryConfig = { ...defaultRetryConfig, ...options?.retryConfig };
    this.adminApiKey = options?.adminApiKey || process.env.ADMIN_API_KEY;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Get default headers for requests
   */
  private getHeaders(isAdmin: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (isAdmin && this.adminApiKey) {
      headers['X-Admin-Api-Key'] = this.adminApiKey;
    }

    return headers;
  }

  /**
   * Parse API response and handle errors
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    // Handle non-JSON responses (like file downloads)
    if (contentType && !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ListenerApiClientError(
          `Request failed with status ${response.status}`,
          'API_ERROR',
          response.status >= 500
        );
      }
      return response as unknown as T;
    }

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch {
      throw new ListenerApiClientError(
        'Invalid response format from server',
        'INVALID_RESPONSE',
        false
      );
    }

    if (!response.ok) {
      const errorMessage = (data.error as string) || (data.message as string) || response.statusText;
      
      // Handle specific HTTP status codes
      switch (response.status) {
        case 401:
          throw new ListenerApiClientError(
            errorCodes.UNAUTHORIZED.message,
            'UNAUTHORIZED',
            errorCodes.UNAUTHORIZED.retryable
          );
        case 403:
          throw new ListenerApiClientError(
            'Forbidden. You do not have permission to perform this action.',
            'FORBIDDEN',
            false
          );
        case 404:
          throw new ListenerApiClientError(
            errorCodes.NOT_FOUND.message,
            'NOT_FOUND',
            errorCodes.NOT_FOUND.retryable
          );
        case 429:
          throw new ListenerApiClientError(
            errorCodes.RATE_LIMITED.message,
            'RATE_LIMITED',
            errorCodes.RATE_LIMITED.retryable
          );
        case 500:
        case 502:
        case 503:
        case 504:
          throw new ListenerApiClientError(
            errorCodes.SERVER_ERROR.message,
            'SERVER_ERROR',
            errorCodes.SERVER_ERROR.retryable
          );
        default:
          throw new ListenerApiClientError(
            errorMessage,
            'API_ERROR',
            response.status >= 500
          );
      }
    }

    return data as T;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    retryConfig: RetryConfig = this.retryConfig
  ): Promise<T> {
    let lastError: ListenerApiClientError | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = handleApiError(error);

        // Don't retry if error is not retryable
        if (!lastError.retryable) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          throw lastError;
        }

        // Wait before retrying
        const delay = calculateRetryDelay(attempt, retryConfig);
        console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
        await sleep(delay);
      }
    }

    throw lastError || new ListenerApiClientError('Request failed after retries', 'RETRY_EXHAUSTED', false);
  }

  /**
   * GET request
   */
  private async get<T>(endpoint: string, params?: Record<string, unknown>, isAdmin: boolean = false): Promise<T> {
    return this.executeWithRetry(async () => {
      const url = this.buildUrl(endpoint, params);
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(isAdmin),
      });
      return this.parseResponse<T>(response);
    });
  }

  /**
   * POST request
   */
  private async post<T>(endpoint: string, data?: unknown, isAdmin: boolean = false): Promise<T> {
    return this.executeWithRetry(async () => {
      const url = this.buildUrl(endpoint);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(isAdmin),
        body: data ? JSON.stringify(data) : undefined,
      });
      return this.parseResponse<T>(response);
    });
  }

  /**
   * DELETE request
   */
  private async delete<T>(endpoint: string, isAdmin: boolean = false): Promise<T> {
    return this.executeWithRetry(async () => {
      const url = this.buildUrl(endpoint);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(isAdmin),
      });
      return this.parseResponse<T>(response);
    });
  }


  // ============ Health & Status Methods (Task 4.2) ============

  /**
   * Get overall health status of the listener service
   * Requirements: 2.1, 5.1-5.4
   */
  async getHealth(): Promise<HealthStatus> {
    return this.get<HealthStatus>('/health');
  }

  /**
   * Get WebSocket server health status
   * Requirements: 5.1
   */
  async getWebSocketHealth(): Promise<WebSocketHealth> {
    return this.get<WebSocketHealth>('/health/websocket');
  }

  /**
   * Get status of all chain listeners
   * Requirements: 2.2
   */
  async getChainStatuses(): Promise<ChainStatus[]> {
    const response = await this.get<{ chains: ChainStatus[] }>('/api/chains');
    return response.chains;
  }

  /**
   * Get overall system statistics
   * Requirements: 5.1-5.4
   */
  async getSystemStats(): Promise<SystemStats> {
    return this.get<SystemStats>('/api/admin/stats', undefined, true);
  }

  // ============ Sync Operation Methods (Task 4.3) ============

  /**
   * Sync missing NFTs for a specific chain or launchpad
   * Requirements: 1.2
   */
  async syncNFTs(chainId: number, contractAddress?: string): Promise<SyncResult> {
    if (contractAddress) {
      return this.post<SyncResult>(`/api/indexer/sync/${chainId}/${contractAddress}`);
    }
    return this.post<SyncResult>(`/api/indexer/sync/${chainId}`);
  }

  /**
   * Sync all missing NFTs across all chains
   * Requirements: 1.7
   */
  async syncAllNFTs(): Promise<SyncResult[]> {
    const response = await this.post<{ success: boolean; results: SyncResult[] }>('/api/indexer/sync-all');
    return response.results;
  }

  /**
   * Sync minted count for all launchpads
   * Requirements: 1.4
   */
  async syncMintedCount(): Promise<MintedCountSyncResult> {
    return this.post<MintedCountSyncResult>('/api/indexer/sync-minted-count');
  }

  /**
   * Refresh metadata for a collection or specific NFT
   * Requirements: 1.3
   */
  async refreshMetadata(chainId: number, contractAddress: string, tokenId?: string): Promise<RefreshResult> {
    if (tokenId) {
      return this.post<RefreshResult>(`/api/metadata/refresh/${chainId}/${contractAddress}/${tokenId}`);
    }
    return this.post<RefreshResult>(`/api/metadata/refresh/${chainId}/${contractAddress}`);
  }

  // ============ Chain Management Methods (Task 4.4) ============

  /**
   * Restart a specific chain listener
   * Requirements: 2.3
   */
  async restartChainListener(chainId: number): Promise<RestartResult> {
    return this.post<RestartResult>(`/api/chains/${chainId}/restart`);
  }

  /**
   * Restart all chain listeners
   * Requirements: 2.4
   */
  async restartAllListeners(): Promise<RestartResult> {
    return this.post<RestartResult>('/api/admin/restart-all', undefined, true);
  }

  // ============ Launchpad Management Methods (Task 4.5) ============

  /**
   * Register a new launchpad for monitoring
   * Requirements: 9.1-9.5
   */
  async registerLaunchpad(chainId: number, contractAddress: string): Promise<RegisterResult> {
    return this.post<RegisterResult>('/api/admin/launchpads/register', {
      chainId,
      contractAddress,
    }, true);
  }

  /**
   * Remove a launchpad from monitoring (soft delete)
   * Requirements: 10.1-10.5
   */
  async removeLaunchpad(chainId: number, contractAddress: string): Promise<RemoveResult> {
    return this.delete<RemoveResult>(`/api/admin/launchpads/${chainId}/${contractAddress}`, true);
  }

  /**
   * Get all launchpads for a specific chain
   * Requirements: 9.1
   */
  async getLaunchpads(chainId: number): Promise<Launchpad[]> {
    const response = await this.get<{ launchpads: Launchpad[] }>(`/api/launchpads/${chainId}`);
    return response.launchpads;
  }

  /**
   * Get all launchpads for a chain with admin details
   * Requirements: 9.1
   */
  async getAdminLaunchpads(chainId: number): Promise<Launchpad[]> {
    const response = await this.get<{ launchpads: Launchpad[] }>(`/api/admin/launchpads/${chainId}`, undefined, true);
    return response.launchpads;
  }

  // ============ Activity & Export Methods (Task 4.6) ============

  /**
   * Get activity logs with filtering and pagination
   * Requirements: 11.1-11.6
   */
  async getActivityLogs(filters: ActivityLogFilters = {}): Promise<PaginatedActivityLogs> {
    return this.get<PaginatedActivityLogs>('/api/admin/activity-logs', filters as Record<string, unknown>, true);
  }

  /**
   * Export collection data in specified format
   * Requirements: 12.1-12.5
   */
  async exportData(chainId: number, contractAddress: string, options: ExportOptions = { format: 'json' }): Promise<Blob> {
    const url = this.buildUrl(`/api/admin/export/${chainId}/${contractAddress}`, { format: options.format });
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ListenerApiClientError(
        (errorData as Record<string, string>).error || 'Export failed',
        'EXPORT_ERROR',
        false
      );
    }

    return response.blob();
  }

  /**
   * Rescan historical blockchain events for a launchpad
   * Requirements: 13.1-13.5
   */
  async rescanHistory(
    chainId: number,
    contractAddress: string,
    fromBlock: number,
    toBlock?: number
  ): Promise<RescanResult> {
    return this.post<RescanResult>(
      `/api/admin/rescan/${chainId}/${contractAddress}`,
      { fromBlock, toBlock },
      true
    );
  }
}

// ============ Singleton Instance ============

/**
 * Default singleton instance of the Listener API Client
 */
export const listenerApiClient = new ListenerApiClient();

/**
 * Create a new instance with custom configuration
 */
export function createListenerApiClient(options?: {
  baseUrl?: string;
  retryConfig?: Partial<RetryConfig>;
  adminApiKey?: string;
}): ListenerApiClient {
  return new ListenerApiClient(options);
}
