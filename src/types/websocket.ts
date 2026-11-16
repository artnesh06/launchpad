/**
 * WebSocket Event Types
 * 
 * Type definitions for WebSocket events exchanged between
 * nft-listener-service and frontend clients
 */

import { ConnectionStatus } from '@/config/websocket';

// ============================================================================
// Server to Client Events
// ============================================================================

/**
 * Mint Event - Emitted when an NFT is minted
 */
export interface MintEventData {
  contractAddress: string;
  chainId: number;
  minter: string;
  tokenId: string;
  quantity: number;
  timestamp: string;
  transactionHash: string;
  phaseId?: string;
  imageUrl?: string;
}

export interface MintEvent {
  type: 'mint';
  data: MintEventData;
}

/**
 * Batch Mint Event - Emitted when multiple NFTs are minted in one transaction
 */
export interface BatchMintEventData {
  contractAddress: string;
  chainId: number;
  minter: string;
  tokenIds: string[]; // Array of token IDs
  totalQuantity: number;
  timestamp: string;
  transactionHash: string;
  phaseId?: string;
  imageUrl?: string;
}

export interface BatchMintEvent {
  type: 'batch-mint';
  data: BatchMintEventData;
}

/**
 * Collection Update Event - Emitted when collection stats change
 */
export interface CollectionUpdateEventData {
  contractAddress: string;
  chainId: number;
  totalMinted: number;
  mintedPercent: number;
  volume: number;
  holders: number;
  timestamp: string;
}

export interface CollectionUpdateEvent {
  type: 'collection:update';
  data: CollectionUpdateEventData;
}

/**
 * New Collection Event - Emitted when a new collection is deployed
 */
export interface NewCollectionEventData {
  contractAddress: string;
  chainId: number;
  name: string;
  creator: string;
  totalSupply: number;
  imageUrl?: string;
  timestamp: string;
}

export interface NewCollectionEvent {
  type: 'collection:new';
  data: NewCollectionEventData;
}

/**
 * Phase Update Event - Emitted when a phase status changes
 */
export interface PhaseUpdateEventData {
  contractAddress: string;
  phaseId: string;
  minted: number;
  isActive: boolean;
  timestamp: string;
}

export interface PhaseUpdateEvent {
  type: 'phase:update';
  data: PhaseUpdateEventData;
}

/**
 * Burn Event - Emitted when an NFT is burned
 */
export interface BurnEventData {
  contractAddress: string;
  chainId: number;
  owner: string;
  tokenId: string;
  timestamp: string;
  transactionHash: string;
}

export interface BurnEvent {
  type: 'burn';
  data: BurnEventData;
}

/**
 * Airdrop Event - Emitted when NFTs are airdropped
 */
export interface AirdropEventData {
  contractAddress: string;
  chainId: number;
  operator: string;
  recipients: string[];
  totalQuantity: number;
  timestamp: string;
  transactionHash: string;
}

export interface AirdropEvent {
  type: 'airdrop';
  data: AirdropEventData;
}

/**
 * Reveal Event - Emitted when a collection is revealed
 */
export interface RevealEventData {
  contractAddress: string;
  chainId: number;
  revealed: boolean;
  timestamp: string;
  transactionHash: string;
}

export interface RevealEvent {
  type: 'reveal';
  data: RevealEventData;
}

/**
 * Union type of all server events
 */
export type ServerEvent = 
  | MintEvent
  | BatchMintEvent
  | CollectionUpdateEvent
  | NewCollectionEvent
  | PhaseUpdateEvent
  | BurnEvent
  | AirdropEvent
  | RevealEvent;

// ============================================================================
// Client to Server Events
// ============================================================================

/**
 * Join Room Event - Client requests to join a room
 */
export interface JoinRoomEvent {
  type: 'join';
  room: string;
  auth?: {
    walletAddress?: string;
  };
}

/**
 * Leave Room Event - Client requests to leave a room
 */
export interface LeaveRoomEvent {
  type: 'leave';
  room: string;
}

/**
 * Ping Event - Client sends ping to check connection health
 */
export interface PingEvent {
  type: 'ping';
  timestamp: string;
}

/**
 * Union type of all client events
 */
export type ClientEvent = 
  | JoinRoomEvent
  | LeaveRoomEvent
  | PingEvent;

// ============================================================================
// WebSocket Context Types
// ============================================================================

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * WebSocket Context Value
 */
export interface WebSocketContextValue {
  // Socket instance
  socket: any | null; // Socket.IO client instance
  
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  useFallbackPolling: boolean;
  
  // Room management
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  
  // Event subscription
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
  
  // Manual control
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Trending Update - For homepage trending table
 */
export interface TrendingUpdate {
  contractAddress: string;
  mintedCount: number;
  volume: number;
  holders: number;
  timestamp: Date;
}

/**
 * Recent Mint - For launchpad detail page
 */
export interface RecentMint {
  tokenId: string;
  minter: string;
  timestamp: Date;
  imageUrl?: string;
}

/**
 * Phase Progress - For launchpad phase tracking
 */
export interface PhaseProgress {
  phaseId: string;
  minted: number;
  limit: number;
  percentage: number;
}

/**
 * User Mint - For wallet mint tracking with animation
 */
export interface UserMint {
  tokenId: string;
  contractAddress: string;
  imageUrl: string;
  timestamp: Date;
  animationState: 'entering' | 'visible' | 'exiting';
}

/**
 * Homepage Socket Hook Options
 */
export interface UseHomepageSocketOptions {
  chainFilter?: number | 'all';
  enabled?: boolean;
}

/**
 * Homepage Socket Hook Return
 */
export interface UseHomepageSocketReturn {
  // Real-time data
  latestMint: MintEventData | null;
  latestCollection: NewCollectionEventData | null;
  trendingUpdates: TrendingUpdate[];
  
  // Status
  isConnected: boolean;
  useFallbackPolling?: boolean;
  error: Error | null;
  
  // Manual refresh
  refresh: () => void;
}

/**
 * Launchpad Socket Hook Options
 */
export interface UseLaunchpadSocketOptions {
  contractAddress: string;
  enabled?: boolean;
}

/**
 * Launchpad Socket Hook Return
 */
export interface UseLaunchpadSocketReturn {
  // Real-time progress
  totalMinted: number;
  mintedPercent: number;
  recentMints: RecentMint[];
  
  // Phase updates
  activePhase: string | null;
  phaseProgress: PhaseProgress | null;
  
  // Status
  isConnected: boolean;
  error: Error | null;
}

/**
 * Wallet Mint Hook Options
 */
export interface UseWalletMintOptions {
  walletAddress?: string;
  contractAddress?: string;
  enabled?: boolean;
}

/**
 * Wallet Mint Hook Return
 */
export interface UseWalletMintReturn {
  // User's mints
  userMints: UserMint[];
  mintCount: number;
  
  // Animation state
  showAnimation: boolean;
  animatingMints: UserMint[];
  
  // Status
  isConnected: boolean;
  error: Error | null;
}
