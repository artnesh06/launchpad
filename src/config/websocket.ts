/**
 * WebSocket Configuration
 * 
 * Configuration for WebSocket client connection to nft-listener-service
 * 
 * IMPORTANT: If WebSocket connection fails, the app will automatically
 * fall back to polling mode for real-time updates.
 */

export const websocketConfig = {
  // WebSocket server URL
  // For Vercel: Connect directly to external WebSocket server (Railway, etc.)
  // Proxy (/api/ws) not recommended due to Vercel serverless limits
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3002',
  
  // Connection options
  options: {
    // Automatically reconnect on disconnect
    reconnection: true,
    
    // Number of reconnection attempts before giving up
    reconnectionAttempts: 3, // Reduced from 5 to fail faster
    
    // Delay between reconnection attempts (ms)
    reconnectionDelay: 1000,
    
    // Maximum delay between reconnection attempts (ms)
    reconnectionDelayMax: 3000, // Reduced from 5000
    
    // Timeout before a connection attempt is considered failed (ms)
    timeout: 10000, // Reduced from 20000 to fail faster
    
    // Try polling first, then upgrade to WebSocket
    // This is more compatible with various server configurations
    transports: ['polling', 'websocket'],
    
    // Allow upgrade from polling to WebSocket
    upgrade: true,
    
    // Add path if server uses custom path
    path: '/socket.io/',
    
    // Force new connection (don't reuse existing)
    forceNew: false,
    
    // Reconnect if connection is lost
    autoConnect: true,
  },
  
  // Room naming conventions
  rooms: {
    homepage: (chainId?: number) => 
      chainId ? `homepage:chain:${chainId}` : 'homepage:all',
    launchpad: (contractAddress: string) => 
      `launchpad:${contractAddress.toLowerCase()}`,
    wallet: (address: string) => 
      `wallet:${address.toLowerCase()}`,
  },
  
  // Event names
  events: {
    // Server to client events
    mint: 'mint',
    batchMint: 'batch-mint',
    collectionUpdate: 'collection:update',
    collectionNew: 'collection:new',
    phaseUpdate: 'phase:update',
    burn: 'burn',
    airdrop: 'airdrop',
    reveal: 'reveal',
    
    // Client to server events
    join: 'join',
    leave: 'leave',
    ping: 'ping',
    
    // Connection events
    connect: 'connect',
    disconnect: 'disconnect',
    connectError: 'connect_error',
    reconnect: 'reconnect',
    reconnectAttempt: 'reconnect_attempt',
    reconnectError: 'reconnect_error',
    reconnectFailed: 'reconnect_failed',
  },
} as const;

export type WebSocketConfig = typeof websocketConfig;
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';
