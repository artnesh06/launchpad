/**
 * useListenerWebSocket Hook
 * 
 * WebSocket hook for admin panel to connect to the nft-listener-service
 * Provides real-time health status updates, sync progress tracking, and chain status monitoring
 * 
 * Requirements: 3.1, 3.3, 3.4, 2.5, 3.5, 3.2, 3.6
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { HealthStatus, ChainStatus, SyncResult } from '@/lib/listener-api-client';

// ============ Types ============

export type ListenerConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Sync progress data emitted by the listener service
 */
export interface SyncProgress {
  operationId: string;
  operationType: 'sync_nfts' | 'sync_metadata' | 'sync_minted_count' | 'rescan' | 'restart' | 'register' | 'remove';
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  progress: number; // 0-100
  total: number;
  processed: number;
  failed: number;
  currentItem?: string;
  message?: string;
  chainId?: number;
  contractAddress?: string;
  startedAt: string;
  estimatedCompletion?: string;
  error?: string;
}

/**
 * Rescan progress data
 */
export interface RescanProgress {
  chainId: number;
  contractAddress: string;
  progress: number;
  currentBlock: number;
  fromBlock: number;
  toBlock: number;
  eventsFound: number;
  status: 'in_progress' | 'completed' | 'failed';
  error?: string;
  timestamp: string;
}

/**
 * Health update event data
 */
export interface HealthUpdateEvent {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  chains: {
    active: number;
    total: number;
  };
  launchpads: number;
  memory?: {
    heapUsedMB: number;
    heapTotalMB: number;
  };
  uptime?: number;
}

/**
 * Chain status update event
 */
export interface ChainStatusUpdateEvent {
  chainId: number;
  chainName: string;
  isRunning: boolean;
  launchpadCount: number;
  error?: string;
}

/**
 * Reconnection configuration
 */
interface ReconnectionConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const defaultReconnectionConfig: ReconnectionConfig = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Hook return type
 */
export interface UseListenerWebSocketReturn {
  // Connection state
  isConnected: boolean;
  connectionStatus: ListenerConnectionStatus;
  
  // Health status
  healthStatus: HealthStatus | null;
  
  // Sync progress tracking
  syncProgress: Map<string, SyncProgress>;
  rescanProgress: Map<string, RescanProgress>;
  
  // Chain statuses
  chainStatuses: ChainStatus[];
  
  // Actions
  subscribeToSyncProgress: (operationId: string) => void;
  unsubscribeFromSyncProgress: (operationId: string) => void;
  subscribeToHealthUpdates: () => void;
  unsubscribeFromHealthUpdates: () => void;
  
  // Manual control
  connect: () => void;
  disconnect: () => void;
  
  // Error state
  error: Error | null;
  lastError: string | null;
  reconnectAttempts: number;
}

// ============ Singleton Management ============

// Singleton socket instance for listener service
let listenerSocketInstance: Socket | null = null;
let isListenerSocketInitialized = false;

// Subscriber management
type HealthSubscriber = (health: HealthStatus) => void;
type SyncProgressSubscriber = (progress: SyncProgress) => void;
type RescanProgressSubscriber = (progress: RescanProgress) => void;
type ChainStatusSubscriber = (statuses: ChainStatus[]) => void;
type ConnectionSubscriber = (connected: boolean, status: ListenerConnectionStatus) => void;
type ErrorSubscriber = (error: Error | null) => void;

const healthSubscribers = new Set<HealthSubscriber>();
const syncProgressSubscribers = new Set<SyncProgressSubscriber>();
const rescanProgressSubscribers = new Set<RescanProgressSubscriber>();
const chainStatusSubscribers = new Set<ChainStatusSubscriber>();
const connectionSubscribers = new Set<ConnectionSubscriber>();
const errorSubscribers = new Set<ErrorSubscriber>();

// Track subscribed operation IDs
const subscribedOperations = new Set<string>();

// Current chain statuses cache
let cachedChainStatuses: ChainStatus[] = [];

/**
 * Broadcast health update to all subscribers
 */
function broadcastHealthUpdate(health: HealthStatus): void {
  healthSubscribers.forEach(subscriber => {
    try {
      subscriber(health);
    } catch (err) {
      console.error('[ListenerWebSocket] Error in health subscriber:', err);
    }
  });
}

/**
 * Broadcast sync progress to all subscribers
 */
function broadcastSyncProgress(progress: SyncProgress): void {
  syncProgressSubscribers.forEach(subscriber => {
    try {
      subscriber(progress);
    } catch (err) {
      console.error('[ListenerWebSocket] Error in sync progress subscriber:', err);
    }
  });
}

/**
 * Broadcast rescan progress to all subscribers
 */
function broadcastRescanProgress(progress: RescanProgress): void {
  rescanProgressSubscribers.forEach(subscriber => {
    try {
      subscriber(progress);
    } catch (err) {
      console.error('[ListenerWebSocket] Error in rescan progress subscriber:', err);
    }
  });
}

/**
 * Broadcast chain status update to all subscribers
 */
function broadcastChainStatusUpdate(statuses: ChainStatus[]): void {
  cachedChainStatuses = statuses;
  chainStatusSubscribers.forEach(subscriber => {
    try {
      subscriber(statuses);
    } catch (err) {
      console.error('[ListenerWebSocket] Error in chain status subscriber:', err);
    }
  });
}

/**
 * Broadcast connection state to all subscribers
 */
function broadcastConnectionState(connected: boolean, status: ListenerConnectionStatus): void {
  connectionSubscribers.forEach(subscriber => {
    try {
      subscriber(connected, status);
    } catch (err) {
      console.error('[ListenerWebSocket] Error in connection subscriber:', err);
    }
  });
}

/**
 * Broadcast error to all subscribers
 */
function broadcastError(error: Error | null): void {
  errorSubscribers.forEach(subscriber => {
    try {
      subscriber(error);
    } catch (err) {
      console.error('[ListenerWebSocket] Error in error subscriber:', err);
    }
  });
}

/**
 * Get the WebSocket URL for the listener service
 */
function getListenerWebSocketUrl(): string {
  // Use the backend URL for WebSocket connection
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://dev.backend.oddslaunchpad.com';
  
  // Convert HTTP URL to WebSocket URL if needed
  // The listener service uses the same port for HTTP and WebSocket
  return backendUrl;
}

/**
 * Initialize the listener WebSocket connection
 */
function initializeListenerSocket(config: ReconnectionConfig = defaultReconnectionConfig): Socket {
  if (listenerSocketInstance && isListenerSocketInitialized) {
    return listenerSocketInstance;
  }

  const wsUrl = getListenerWebSocketUrl();
  console.log('[ListenerWebSocket] Creating new Socket.IO connection to:', wsUrl);
  
  listenerSocketInstance = io(wsUrl, {
    reconnection: true,
    reconnectionAttempts: config.maxAttempts,
    reconnectionDelay: config.initialDelayMs,
    reconnectionDelayMax: config.maxDelayMs,
    timeout: 10000,
    transports: ['polling', 'websocket'],
    upgrade: true,
    path: '/socket.io/',
    forceNew: false,
    autoConnect: true,
  });

  let reconnectAttempts = 0;

  // Connection handlers
  listenerSocketInstance.on('connect', () => {
    console.log('[ListenerWebSocket] Connected:', listenerSocketInstance?.id);
    reconnectAttempts = 0;
    broadcastConnectionState(true, 'connected');
    broadcastError(null);
    
    // Re-subscribe to health updates on reconnect
    if (healthSubscribers.size > 0) {
      listenerSocketInstance?.emit('subscribe:health');
    }
  });

  listenerSocketInstance.on('disconnect', (reason: string) => {
    console.log('[ListenerWebSocket] Disconnected:', reason);
    broadcastConnectionState(false, 'disconnected');
  });

  listenerSocketInstance.on('connect_error', (error: Error) => {
    console.error('[ListenerWebSocket] Connection error:', error.message);
    reconnectAttempts++;
    broadcastConnectionState(false, 'error');
    broadcastError(error);
  });

  listenerSocketInstance.io.on('reconnect_attempt', (attempt: number) => {
    console.log('[ListenerWebSocket] Reconnection attempt:', attempt);
    reconnectAttempts = attempt;
    broadcastConnectionState(false, 'reconnecting');
  });

  listenerSocketInstance.io.on('reconnect', () => {
    console.log('[ListenerWebSocket] Reconnected');
    reconnectAttempts = 0;
    broadcastConnectionState(true, 'connected');
    broadcastError(null);
    
    // Re-subscribe to health updates on reconnect
    if (healthSubscribers.size > 0) {
      listenerSocketInstance?.emit('subscribe:health');
    }
  });

  listenerSocketInstance.io.on('reconnect_failed', () => {
    console.error('[ListenerWebSocket] Reconnection failed after max attempts');
    broadcastConnectionState(false, 'error');
    broadcastError(new Error('Failed to reconnect after maximum attempts'));
  });

  // Health status events
  listenerSocketInstance.on('health:update', (data: HealthUpdateEvent) => {
    const healthStatus: HealthStatus = {
      status: data.status,
      timestamp: data.timestamp,
      chains: data.chains,
      launchpads: data.launchpads,
      database: {
        activeConnections: 0,
        maxConnections: 0,
        waiting: 0,
      },
      websocket: {
        configured: true,
      },
      memory: data.memory,
      uptime: data.uptime,
    };
    broadcastHealthUpdate(healthStatus);
  });

  // Chain status events
  listenerSocketInstance.on('chain:status', (data: ChainStatusUpdateEvent) => {
    // Update the cached chain statuses
    const existingIndex = cachedChainStatuses.findIndex(c => c.chainId === data.chainId);
    if (existingIndex >= 0) {
      cachedChainStatuses[existingIndex] = data;
    } else {
      cachedChainStatuses.push(data);
    }
    broadcastChainStatusUpdate([...cachedChainStatuses]);
  });

  listenerSocketInstance.on('chains:status', (data: ChainStatus[]) => {
    broadcastChainStatusUpdate(data);
  });

  // Sync progress events
  listenerSocketInstance.on('sync:progress', (data: SyncProgress) => {
    broadcastSyncProgress(data);
  });

  // Rescan progress events
  listenerSocketInstance.on('rescan:progress', (data: RescanProgress) => {
    broadcastRescanProgress(data);
  });

  isListenerSocketInitialized = true;
  return listenerSocketInstance;
}

/**
 * Cleanup socket when no more subscribers
 */
function cleanupListenerSocketIfNeeded(): void {
  const totalSubscribers = 
    healthSubscribers.size + 
    syncProgressSubscribers.size + 
    rescanProgressSubscribers.size +
    chainStatusSubscribers.size +
    connectionSubscribers.size;
    
  if (totalSubscribers === 0 && listenerSocketInstance) {
    console.log('[ListenerWebSocket] Closing connection (no more subscribers)');
    listenerSocketInstance.disconnect();
    listenerSocketInstance = null;
    isListenerSocketInitialized = false;
    cachedChainStatuses = [];
    subscribedOperations.clear();
  }
}

// ============ Hook Implementation ============

/**
 * Hook for connecting to the listener service WebSocket
 * Provides real-time health status, sync progress, and chain status updates
 * 
 * Requirements:
 * - 3.1: Establish WebSocket connection on page load
 * - 3.3: Display connected/disconnected indicator
 * - 3.4: Auto-reconnect on disconnect with exponential backoff
 * - 2.5: Real-time health status updates
 * - 3.5: Receive health status changes via WebSocket
 * - 3.2: Receive sync progress events
 * - 3.6: Display progress for multiple concurrent operations
 */
export function useListenerWebSocket(
  options?: {
    autoConnect?: boolean;
    reconnectionConfig?: Partial<ReconnectionConfig>;
  }
): UseListenerWebSocketReturn {
  const { autoConnect = true, reconnectionConfig } = options || {};
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ListenerConnectionStatus>('disconnected');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [syncProgress, setSyncProgress] = useState<Map<string, SyncProgress>>(new Map());
  const [rescanProgress, setRescanProgress] = useState<Map<string, RescanProgress>>(new Map());
  const [chainStatuses, setChainStatuses] = useState<ChainStatus[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const config = { ...defaultReconnectionConfig, ...reconnectionConfig };

  useEffect(() => {
    if (!autoConnect) return;

    const socket = initializeListenerSocket(config);
    socketRef.current = socket;

    // Subscribe to health updates
    const healthHandler: HealthSubscriber = (health) => {
      setHealthStatus(health);
    };
    healthSubscribers.add(healthHandler);

    // Subscribe to sync progress
    const syncProgressHandler: SyncProgressSubscriber = (progress) => {
      setSyncProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(progress.operationId, progress);
        
        // Clean up completed operations after a delay
        if (progress.status === 'success' || progress.status === 'failed') {
          setTimeout(() => {
            setSyncProgress(current => {
              const updated = new Map(current);
              updated.delete(progress.operationId);
              return updated;
            });
          }, 5000);
        }
        
        return newMap;
      });
    };
    syncProgressSubscribers.add(syncProgressHandler);

    // Subscribe to rescan progress
    const rescanProgressHandler: RescanProgressSubscriber = (progress) => {
      const key = `${progress.chainId}:${progress.contractAddress}`;
      setRescanProgress(prev => {
        const newMap = new Map(prev);
        newMap.set(key, progress);
        
        // Clean up completed rescans after a delay
        if (progress.status === 'completed' || progress.status === 'failed') {
          setTimeout(() => {
            setRescanProgress(current => {
              const updated = new Map(current);
              updated.delete(key);
              return updated;
            });
          }, 5000);
        }
        
        return newMap;
      });
    };
    rescanProgressSubscribers.add(rescanProgressHandler);

    // Subscribe to chain status updates
    const chainStatusHandler: ChainStatusSubscriber = (statuses) => {
      setChainStatuses(statuses);
    };
    chainStatusSubscribers.add(chainStatusHandler);

    // Subscribe to connection state
    const connectionHandler: ConnectionSubscriber = (connected, status) => {
      setIsConnected(connected);
      setConnectionStatus(status);
      
      if (status === 'reconnecting') {
        setReconnectAttempts(prev => prev + 1);
      } else if (status === 'connected') {
        setReconnectAttempts(0);
      }
    };
    connectionSubscribers.add(connectionHandler);

    // Subscribe to errors
    const errorHandler: ErrorSubscriber = (err) => {
      setError(err);
      if (err) {
        setLastError(err.message);
      }
    };
    errorSubscribers.add(errorHandler);

    // Set initial state
    if (socket.connected) {
      setIsConnected(true);
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('connecting');
    }

    // Cleanup
    return () => {
      healthSubscribers.delete(healthHandler);
      syncProgressSubscribers.delete(syncProgressHandler);
      rescanProgressSubscribers.delete(rescanProgressHandler);
      chainStatusSubscribers.delete(chainStatusHandler);
      connectionSubscribers.delete(connectionHandler);
      errorSubscribers.delete(errorHandler);
      cleanupListenerSocketIfNeeded();
    };
  }, [autoConnect]);

  // Subscribe to sync progress for a specific operation
  const subscribeToSyncProgress = useCallback((operationId: string) => {
    if (socketRef.current?.connected && !subscribedOperations.has(operationId)) {
      subscribedOperations.add(operationId);
      socketRef.current.emit('subscribe:sync', { operationId });
      console.log('[ListenerWebSocket] Subscribed to sync progress:', operationId);
    }
  }, []);

  // Unsubscribe from sync progress for a specific operation
  const unsubscribeFromSyncProgress = useCallback((operationId: string) => {
    if (socketRef.current?.connected && subscribedOperations.has(operationId)) {
      subscribedOperations.delete(operationId);
      socketRef.current.emit('unsubscribe:sync', { operationId });
      console.log('[ListenerWebSocket] Unsubscribed from sync progress:', operationId);
    }
  }, []);

  // Subscribe to health updates
  const subscribeToHealthUpdates = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:health');
      console.log('[ListenerWebSocket] Subscribed to health updates');
    }
  }, []);

  // Unsubscribe from health updates
  const unsubscribeFromHealthUpdates = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:health');
      console.log('[ListenerWebSocket] Unsubscribed from health updates');
    }
  }, []);

  // Manual connect
  const connect = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = initializeListenerSocket(config);
    } else if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, [config]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }
  }, []);

  return {
    isConnected,
    connectionStatus,
    healthStatus,
    syncProgress,
    rescanProgress,
    chainStatuses,
    subscribeToSyncProgress,
    unsubscribeFromSyncProgress,
    subscribeToHealthUpdates,
    unsubscribeFromHealthUpdates,
    connect,
    disconnect,
    error,
    lastError,
    reconnectAttempts,
  };
}

export default useListenerWebSocket;
