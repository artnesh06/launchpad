/**
 * Application Constants
 * Centralized constants untuk menghindari hardcoded values
 */

// Default Chain IDs
export const DEFAULT_CHAIN_ID = 11155111; // Sepolia Testnet
export const DEFAULT_MAINNET_CHAIN_ID = 8453; // Base Mainnet

// Supported Chain IDs
export const CHAIN_IDS = {
  // Mainnet
  ETHEREUM_MAINNET: 1,
  BASE_MAINNET: 8453,
  POLYGON_MAINNET: 137,
  ARBITRUM_MAINNET: 42161,
  
  // Testnet
  SEPOLIA: 11155111,
  BASE_SEPOLIA: 84532,
  POLYGON_AMOY: 80002,
  ARBITRUM_SEPOLIA: 421614,
  MEGAETH_TESTNET: 6343,
  MONAD_TESTNET: 10143,
  ABSTRACT_TESTNET: 42170,
  HYPERLIQUID_TESTNET: 7171,
  INJECTIVE_TESTNET: 888,
} as const;

// Type for chain IDs
export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];

// Helper to check if chainId is valid
export function isValidChainId(chainId: number): chainId is ChainId {
  return Object.values(CHAIN_IDS).includes(chainId as ChainId);
}

// Get chain name by ID
export function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    [CHAIN_IDS.ETHEREUM_MAINNET]: 'Ethereum Mainnet',
    [CHAIN_IDS.BASE_MAINNET]: 'Base Mainnet',
    [CHAIN_IDS.POLYGON_MAINNET]: 'Polygon Mainnet',
    [CHAIN_IDS.ARBITRUM_MAINNET]: 'Arbitrum One',
    [CHAIN_IDS.SEPOLIA]: 'Sepolia Testnet',
    [CHAIN_IDS.BASE_SEPOLIA]: 'Base Sepolia',
    [CHAIN_IDS.POLYGON_AMOY]: 'Polygon Amoy',
    [CHAIN_IDS.ARBITRUM_SEPOLIA]: 'Arbitrum Sepolia',
    [CHAIN_IDS.MEGAETH_TESTNET]: 'MegaETH Testnet',
    [CHAIN_IDS.MONAD_TESTNET]: 'Monad Testnet',
    [CHAIN_IDS.ABSTRACT_TESTNET]: 'Abstract Testnet',
    [CHAIN_IDS.HYPERLIQUID_TESTNET]: 'Hyperliquid Testnet',
    [CHAIN_IDS.INJECTIVE_TESTNET]: 'Injective Testnet',
  };
  return names[chainId] || `Chain ${chainId}`;
}
