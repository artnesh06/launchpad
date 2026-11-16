/**
 * NFT Holder Verification System Types
 * 
 * This file contains TypeScript types and interfaces for the NFT holder verification system.
 * These types correspond to the database models defined in the Prisma schema.
 */

// ============================================================================
// User and Wallet Types
// ============================================================================

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export interface VerificationUser {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDiscriminator: string;
  discordAvatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationWallet {
  id: string;
  userId: string;
  address: string;
  signature: string;
  verifiedAt: Date;
  createdAt: Date;
}

export interface WalletWithUser extends VerificationWallet {
  user: VerificationUser;
}

// ============================================================================
// Chain and Collection Types
// ============================================================================

export interface VerificationChain {
  id: string;
  name: string;
  networkId: string;
  rpcEndpoint: string;
  explorerUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationNFTCollection {
  id: string;
  name: string;
  contractAddress: string;
  chainId: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NFTCollectionWithChain extends VerificationNFTCollection {
  chain: VerificationChain;
}

// ============================================================================
// Role Rule Types
// ============================================================================

export enum VerificationRuleType {
  INDIVIDUAL_CONTRACT = 'INDIVIDUAL_CONTRACT',
  MULTI_CONTRACT = 'MULTI_CONTRACT',
  NFT_THRESHOLD = 'NFT_THRESHOLD',
}

export enum VerificationRequirementType {
  ANY = 'ANY',
  ALL = 'ALL',
}

export interface VerificationRoleRule {
  id: string;
  name: string;
  discordRoleId: string;
  ruleType: VerificationRuleType;
  threshold: number | null;
  requirementType: VerificationRequirementType | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationRoleRuleCollection {
  roleRuleId: string;
  collectionId: string;
}

export interface RoleRuleWithCollections extends VerificationRoleRule {
  collections: Array<{
    collection: NFTCollectionWithChain;
  }>;
}

// ============================================================================
// Managed Role Types
// ============================================================================

export interface VerificationManagedRole {
  discordRoleId: string;
  roleName: string;
  createdAt: Date;
}

// ============================================================================
// Verification Nonce Types
// ============================================================================

export interface VerificationNonce {
  nonce: string;
  walletAddress: string;
  message: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface VerificationMessage {
  message: string;
  nonce: string;
  expiresAt: Date;
}

// ============================================================================
// Verification Log Types
// ============================================================================

export interface VerificationLog {
  id: string;
  cycleStart: Date;
  cycleEnd: Date;
  usersProcessed: number;
  rolesAssigned: number;
  rolesRemoved: number;
  errors: string | null;
  createdAt: Date;
}

export interface VerificationResult {
  usersProcessed: number;
  rolesAssigned: number;
  rolesRemoved: number;
  errors: Error[];
  duration: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ChainConfig {
  name: string;
  networkId: string;
  rpcEndpoint: string;
  explorerUrl?: string;
}

export interface CollectionConfig {
  name: string;
  contractAddress: string;
  chainId: string;
  description?: string;
}

export interface RoleRuleConfig {
  name: string;
  discordRoleId: string;
  ruleType: VerificationRuleType;
  contracts: string[]; // Collection IDs
  threshold?: number;
  requirementType?: VerificationRequirementType;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DependencyCheck {
  hasDependencies: boolean;
  dependencies: Array<{
    type: string;
    id: string;
    name: string;
  }>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Authentication
export interface DiscordOAuthInitiateResponse {
  authUrl: string;
  state: string;
}

export interface DiscordOAuthCallbackRequest {
  code: string;
  state: string;
}

export interface DiscordOAuthCallbackResponse {
  discordUser: DiscordUser;
  sessionToken: string;
}

// Wallet Linking
export interface WalletVerificationMessageRequest {
  walletAddress: string;
}

export interface WalletVerificationMessageResponse {
  message: string;
  nonce: string;
  expiresAt: string;
}

export interface WalletLinkRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface WalletLinkResponse {
  success: boolean;
  walletId: string;
}

export interface WalletAuthRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface WalletAuthResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
}

export interface LinkedWalletsResponse {
  wallets: Array<{
    id: string;
    address: string;
    linkedAt: string;
  }>;
}

// Admin Configuration
export interface ChainListResponse {
  chains: VerificationChain[];
}

export interface CollectionListResponse {
  collections: NFTCollectionWithChain[];
}

export interface RoleRuleListResponse {
  roleRules: RoleRuleWithCollections[];
}

// ============================================================================
// Service Types
// ============================================================================

// NFT Balance Checker
export interface NFTBalance {
  contractAddress: string;
  chainId: string;
  balance: number;
}

export interface NFTBalanceMap {
  [key: string]: number; // key format: "chainId:contractAddress"
}

// Role Rule Engine
export interface RoleEvaluationResult {
  roleId: string;
  shouldAssign: boolean;
}

// Discord Bot
export interface RoleSyncResult {
  added: string[];
  removed: string[];
  errors: Error[];
}

// ============================================================================
// Error Types
// ============================================================================

export class VerificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

export class SignatureVerificationError extends VerificationError {
  constructor(message: string, details?: any) {
    super(message, 'SIGNATURE_VERIFICATION_FAILED', details);
    this.name = 'SignatureVerificationError';
  }
}

export class ConfigurationError extends VerificationError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

export class ChainAPIError extends VerificationError {
  constructor(message: string, public chainId: string, details?: any) {
    super(message, 'CHAIN_API_ERROR', details);
    this.name = 'ChainAPIError';
  }
}

export class DiscordAPIError extends VerificationError {
  constructor(message: string, details?: any) {
    super(message, 'DISCORD_API_ERROR', details);
    this.name = 'DiscordAPIError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
