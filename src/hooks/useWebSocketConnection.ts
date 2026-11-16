/**
 * useWebSocketConnection Hook
 * 
 * Socket.IO client hook for real-time WebSocket connections
 * Provides automatic reconnection, room management, and event handling
 * 
 * Uses singleton pattern with subscriber callbacks to prevent duplicate event handling
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { websocketConfig } from '@/config/websocket';

export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface WebSocketMessage {
  event: string;
  data: any;
}

interface UseWebSocketConnectionReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: ConnectionStatus;
  useFallbackPolling: boolean;
  socket: Socket | null;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  emit: (event: string, data: any) => void;
  lastMessage: WebSocketMessage | null;
}

// Singleton socket instance
let socketInstance: Socket | null = null;
let isSocketInitialized = false;

// Track joined rooms with reference count to prevent duplicate joins
const joinedRooms = new Map<string, number>();

// Subscriber management for message broadcasting
type MessageSubscriber = (message: WebSocketMessage) => void;
const messageSubscribers = new Set<MessageSubscriber>();

// Connection state subscribers
type ConnectionSubscriber = (connected: boolean, status: ConnectionStatus) => void;
const connectionSubscribers = new Set<ConnectionSubscriber>();

// Fallback state subscribers
type FallbackSubscriber = (useFallback: boolean) => void;
const fallbackSubscribers = new Set<FallbackSubscriber>();

/**
 * Broadcast message to all subscribers
 */
function broadcastMessage(message: WebSocketMessage): void {
  messageSubscribers.forEach(subscriber => {
    try {
      subscriber(message);
    } catch (err) {
      console.error('[WebSocket] Error in message subscriber:', err);
    }
  });
}

/**
 * Broadcast connection state to all subscribers
 */
function broadcastConnectionState(connected: boolean, status: ConnectionStatus): void {
  connectionSubscribers.forEach(subscriber => {
    try {
      subscriber(connected, status);
    } catch (err) {
      console.error('[WebSocket] Error in connection subscriber:', err);
    }
  });
}

/**
 * Broadcast fallback state to all subscribers
 */
function broadcastFallbackState(useFallback: boolean): void {
  fallbackSubscribers.forEach(subscriber => {
    try {
      subscriber(useFallback);
    } catch (err) {
      console.error('[WebSocket] Error in fallback subscriber:', err);
    }
  });
}

/**
 * Initialize socket with event handlers (only once)
 */
function initializeSocket(): Socket {
  if (socketInstance && isSocketInitialized) {
    return socketInstance;
  }

  console.log('[WebSocket] Creating new Socket.IO connection to:', websocketConfig.url);
  socketInstance = io(websocketConfig.url, websocketConfig.options);
  
  let reconnectAttempts = 0;

  // Connection handlers
  socketInstance.on('connect', () => {
    console.log('[WebSocket] Connected:', socketInstance?.id);
    reconnectAttempts = 0;
    broadcastConnectionState(true, 'connected');
    broadcastFallbackState(false);
  });

  socketInstance.on('disconnect', (reason: string) => {
    console.log('[WebSocket] Disconnected:', reason);
    broadcastConnectionState(false, 'disconnected');
  });

  socketInstance.on('connect_error', (error: Error) => {
    console.error('[WebSocket] Connection error:', error.message);
    reconnectAttempts++;
    broadcastConnectionState(false, 'error');
    
    if (reconnectAttempts >= 3) {
      console.warn('[WebSocket] Switching to fallback polling mode');
      broadcastFallbackState(true);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('websocket:fallback', {
          detail: { attempts: reconnectAttempts, message: 'Connection failed after multiple attempts' }
        }));
      }
    }
  });

  socketInstance.io.on('reconnect_attempt', (attempt: number) => {
    console.log('[WebSocket] Reconnection attempt:', attempt);
    broadcastConnectionState(false, 'reconnecting');
  });

  socketInstance.io.on('reconnect', () => {
    console.log('[WebSocket] Reconnected');
    reconnectAttempts = 0;
    broadcastConnectionState(true, 'connected');
    
    // Rejoin all rooms after reconnection
    if (joinedRooms.size > 0 && socketInstance) {
      console.log('[WebSocket] Rejoining rooms after reconnect:', Array.from(joinedRooms.keys()));
      joinedRooms.forEach((_, room) => {
        socketInstance?.emit('join', { room });
      });
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('websocket:restored', {
        detail: { message: 'Connection restored' }
      }));
    }
  });

  // Data event handlers - broadcast to all subscribers
  socketInstance.on(websocketConfig.events.mint, (data: any) => {
    broadcastMessage({ event: 'mint', data });
  });

  socketInstance.on(websocketConfig.events.batchMint, (data: any) => {
    broadcastMessage({ event: 'batch-mint', data });
  });

  socketInstance.on(websocketConfig.events.collectionUpdate, (data: any) => {
    broadcastMessage({ event: 'collection:update', data });
  });

  socketInstance.on(websocketConfig.events.collectionNew, (data: any) => {
    broadcastMessage({ event: 'collection:new', data });
  });

  socketInstance.on(websocketConfig.events.phaseUpdate, (data: any) => {
    broadcastMessage({ event: 'phase:update', data });
  });

  socketInstance.on(websocketConfig.events.burn, (data: any) => {
    broadcastMessage({ event: 'burn', data });
  });

  socketInstance.on(websocketConfig.events.airdrop, (data: any) => {
    broadcastMessage({ event: 'airdrop', data });
  });

  socketInstance.on(websocketConfig.events.reveal, (data: any) => {
    broadcastMessage({ event: 'reveal', data });
  });

  isSocketInitialized = true;
  return socketInstance;
}

/**
 * Join a room with reference counting
 * Only emits join event if this is the first subscriber
 */
function joinRoomWithRefCount(socket: Socket, room: string): void {
  const currentCount = joinedRooms.get(room) || 0;
  joinedRooms.set(room, currentCount + 1);
  
  // Only actually join if this is the first subscriber
  if (currentCount === 0) {
    console.log('[WebSocket] Joining room:', room);
    socket.emit('join', { room });
  } else {
    console.log(`[WebSocket] Room ${room} already joined (${currentCount + 1} subscribers)`);
  }
}

/**
 * Leave a room with reference counting
 * Only emits leave event if this is the last subscriber
 */
function leaveRoomWithRefCount(socket: Socket, room: string): void {
  const currentCount = joinedRooms.get(room) || 0;
  
  if (currentCount <= 1) {
    joinedRooms.delete(room);
    console.log('[WebSocket] Leaving room:', room);
    socket.emit('leave', { room });
  } else {
    joinedRooms.set(room, currentCount - 1);
    console.log(`[WebSocket] Room ${room} still has ${currentCount - 1} subscribers`);
  }
}

/**
 * Cleanup socket when no more subscribers
 */
function cleanupSocketIfNeeded(): void {
  if (messageSubscribers.size === 0 && socketInstance) {
    console.log('[WebSocket] Closing connection (no more subscribers)');
    socketInstance.disconnect();
    socketInstance = null;
    isSocketInitialized = false;
    joinedRooms.clear();
  }
}

export function useWebSocketConnection(): UseWebSocketConnectionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [useFallbackPolling, setUseFallbackPolling] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = initializeSocket();
    socketRef.current = socket;

    // Subscribe to messages
    const messageHandler: MessageSubscriber = (message) => {
      setLastMessage(message);
    };
    messageSubscribers.add(messageHandler);

    // Subscribe to connection state
    const connectionHandler: ConnectionSubscriber = (connected, status) => {
      setIsConnected(connected);
      setConnectionStatus(status);
    };
    connectionSubscribers.add(connectionHandler);

    // Subscribe to fallback state
    const fallbackHandler: FallbackSubscriber = (useFallback) => {
      setUseFallbackPolling(useFallback);
    };
    fallbackSubscribers.add(fallbackHandler);

    // Set initial state
    if (socket.connected) {
      setIsConnected(true);
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('connecting');
    }

    // Cleanup
    return () => {
      messageSubscribers.delete(messageHandler);
      connectionSubscribers.delete(connectionHandler);
      fallbackSubscribers.delete(fallbackHandler);
      cleanupSocketIfNeeded();
    };
  }, []);

  const joinRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      joinRoomWithRefCount(socketRef.current, room);
    } else {
      console.warn('[WebSocket] Cannot join room - not connected');
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      leaveRoomWithRefCount(socketRef.current, room);
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[WebSocket] Cannot emit - not connected');
    }
  }, []);

  return {
    isConnected,
    isConnecting: connectionStatus === 'connecting' || connectionStatus === 'reconnecting',
    connectionStatus,
    useFallbackPolling,
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    emit,
    lastMessage,
  };
}
