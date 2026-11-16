/**
 * WebSocket Optimization Configuration
 * 
 * Centralized configuration untuk tuning optimization parameters
 * Adjust values berdasarkan performance requirements dan user feedback
 */

export const optimizationConfig = {
  /**
   * Debouncing Configuration
   * Use case: Stats, aggregates, trending data
   */
  debounce: {
    // Trending updates di homepage
    trendingUpdates: 500, // ms - Update setelah 500ms tidak ada event baru
    
    // Stats counters
    statsCounters: 500, // ms
    
    // Search/filter inputs
    searchInput: 300, // ms - Lebih cepat untuk better UX
    
    // Wallet mint batch detection
    walletMintBatch: 300, // ms - Detect batch mints
    
    // General purpose
    default: 500, // ms
  },

  /**
   * Throttling Configuration
   * Use case: Live updates, progress bars, counters
   */
  throttle: {
    // Total minted counter di launchpad
    totalMinted: 1000, // ms - Update max 1x per second
    
    // Progress bars
    progressBar: 1000, // ms
    
    // Live counters
    liveCounter: 1000, // ms
    
    // Chart updates
    chartUpdate: 2000, // ms - Slower untuk reduce re-renders
    
    // General purpose
    default: 1000, // ms
  },

  /**
   * Batching Configuration
   * Use case: Charts, bulk operations, high-frequency events
   */
  batch: {
    // Mints chart data
    mintsChart: {
      maxBatchSize: 10, // Process setelah 10 events
      maxWaitTime: 2000, // Atau process setelah 2 detik
    },
    
    // Activity aggregation
    activityAggregation: {
      maxBatchSize: 20,
      maxWaitTime: 3000,
    },
    
    // Bulk operations
    bulkOperations: {
      maxBatchSize: 50,
      maxWaitTime: 5000,
    },
    
    // General purpose
    default: {
      maxBatchSize: 10,
      maxWaitTime: 2000,
    },
  },

  /**
   * Rate Limiting Configuration
   * Use case: Prevent excessive updates
   */
  rateLimit: {
    // High-frequency updates
    highFrequency: 5, // Max 5 updates per second
    
    // Medium-frequency updates
    mediumFrequency: 2, // Max 2 updates per second
    
    // Low-frequency updates
    lowFrequency: 1, // Max 1 update per second
    
    // General purpose
    default: 2, // Max 2 updates per second
  },

  /**
   * Performance Thresholds
   * Untuk adaptive optimization
   */
  thresholds: {
    // Event frequency thresholds
    highFrequency: 10, // events per second
    mediumFrequency: 5, // events per second
    lowFrequency: 1, // events per second
    
    // Re-render thresholds
    maxReRendersPerSecond: 10,
    
    // Memory thresholds
    maxQueueSize: 100, // Max items in queue
  },

  /**
   * Feature Flags
   * Enable/disable optimization features
   */
  features: {
    // Enable adaptive optimization (adjust based on frequency)
    adaptiveOptimization: false, // TODO: Implement
    
    // Enable performance monitoring
    performanceMonitoring: process.env.NODE_ENV === 'development',
    
    // Enable debug logging
    debugLogging: process.env.NODE_ENV === 'development',
    
    // Enable fallback to polling if WebSocket fails
    fallbackPolling: true,
  },

  /**
   * Development/Testing Overrides
   * Faster intervals untuk testing
   */
  development: {
    debounce: {
      default: 200, // Faster untuk testing
    },
    throttle: {
      default: 500, // Faster untuk testing
    },
    batch: {
      default: {
        maxBatchSize: 5,
        maxWaitTime: 1000,
      },
    },
  },
};

/**
 * Get configuration based on environment
 */
export function getOptimizationConfig() {
  if (process.env.NODE_ENV === 'development') {
    return {
      ...optimizationConfig,
      debounce: {
        ...optimizationConfig.debounce,
        ...optimizationConfig.development.debounce,
      },
      throttle: {
        ...optimizationConfig.throttle,
        ...optimizationConfig.development.throttle,
      },
      batch: {
        ...optimizationConfig.batch,
        ...optimizationConfig.development.batch,
      },
    };
  }
  
  return optimizationConfig;
}

/**
 * Helper functions untuk get specific configs
 */
export const getDebounceDelay = (key: keyof typeof optimizationConfig.debounce = 'default') => {
  const config = getOptimizationConfig();
  return config.debounce[key] || config.debounce.default;
};

export const getThrottleInterval = (key: keyof typeof optimizationConfig.throttle = 'default') => {
  const config = getOptimizationConfig();
  return config.throttle[key] || config.throttle.default;
};

export const getBatchConfig = (key: keyof typeof optimizationConfig.batch = 'default') => {
  const config = getOptimizationConfig();
  return config.batch[key] || config.batch.default;
};

/**
 * Performance monitoring helper
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, { count: number; lastReset: number }> = new Map();
  private readonly resetInterval = 1000; // Reset every second

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  track(key: string) {
    if (!optimizationConfig.features.performanceMonitoring) return;

    const now = Date.now();
    const metric = this.metrics.get(key);

    if (!metric || now - metric.lastReset > this.resetInterval) {
      this.metrics.set(key, { count: 1, lastReset: now });
    } else {
      metric.count++;
    }

    // Log if exceeds threshold
    const current = this.metrics.get(key);
    if (current && current.count > optimizationConfig.thresholds.maxReRendersPerSecond) {
      console.warn(
        `[Performance] ${key} exceeded threshold: ${current.count} updates/sec`
      );
    }
  }

  getMetrics(key: string) {
    return this.metrics.get(key);
  }

  reset(key?: string) {
    if (key) {
      this.metrics.delete(key);
    } else {
      this.metrics.clear();
    }
  }
}

/**
 * Debug logger
 */
export const debugLog = (context: string, message: string, data?: any) => {
  if (optimizationConfig.features.debugLogging) {
    console.log(`[${context}] ${message}`, data || '');
  }
};
