/**
 * Provider Helper
 * 
 * Helper functions to create ethers providers with secure RPC proxy
 */

import { ethers } from 'ethers';
import { getChainConfig } from '@/config/chains';
import { getRpcUrl, getDirectRpcUrl, isServer } from '@/lib/rpc-proxy';
import { createCachedProvider } from '@/lib/cached-provider';

/**
 * Create an ethers provider for a specific chain
 * Automatically uses proxy on client-side and direct URL on server-side
 * Uses caching on client-side to reduce redundant requests
 * 
 * @param chainId - The chain ID to create provider for
 * @returns ethers.JsonRpcProvider instance
 */
export function createProvider(chainId: number): ethers.JsonRpcProvider {
  const rpcUrl = getRpcUrl(chainId);
  
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain ${chainId}`);
  }
  
  // Use cached provider on client-side to reduce redundant requests
  if (!isServer()) {
    return createCachedProvider(rpcUrl);
  }
  
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Create a provider using direct RPC URL (server-side only)
 * Use this when you need to bypass the proxy for server-side operations
 * 
 * @param chainId - The chain ID to create provider for
 * @returns ethers.JsonRpcProvider instance
 */
export function createDirectProvider(chainId: number): ethers.JsonRpcProvider {
  if (!isServer()) {
    console.warn('createDirectProvider should only be used on server-side. Use createProvider instead.');
  }
  
  const rpcUrl = getDirectRpcUrl(chainId);
  
  if (!rpcUrl) {
    throw new Error(`No direct RPC URL configured for chain ${chainId}`);
  }
  
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get provider from chain config
 * This is a convenience function that uses the chain config
 * Uses caching on client-side to reduce redundant requests
 * 
 * @param chainId - The chain ID
 * @returns ethers.JsonRpcProvider instance
 */
export function getProvider(chainId: number): ethers.JsonRpcProvider {
  const chain = getChainConfig(chainId);
  
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  
  // Use cached provider on client-side
  if (!isServer()) {
    return createCachedProvider(chain.rpcUrl);
  }
  
  // chain.rpcUrl already uses proxy from config
  return new ethers.JsonRpcProvider(chain.rpcUrl);
}

/**
 * Create a WebSocket provider (if available)
 * Falls back to HTTP provider if WebSocket is not available
 * 
 * @param chainId - The chain ID
 * @returns ethers provider instance
 */
export async function createWebSocketProvider(chainId: number): Promise<ethers.Provider> {
  const chain = getChainConfig(chainId);
  
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  
  // Try WebSocket first (if configured)
  const wsUrl = chain.rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  
  try {
    // Check if it's a WebSocket URL
    if (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')) {
      const wsProvider = new ethers.WebSocketProvider(wsUrl);
      await wsProvider.getNetwork(); // Test connection
      return wsProvider;
    }
  } catch (error) {
    console.warn(`WebSocket not available for chain ${chainId}, falling back to HTTP`);
  }
  
  // Fallback to HTTP provider
  return createProvider(chainId);
}

/**
 * Create a contract instance with provider
 * 
 * @param address - Contract address
 * @param abi - Contract ABI
 * @param chainId - Chain ID
 * @returns ethers.Contract instance
 */
export function createContract(
  address: string,
  abi: any,
  chainId: number
): ethers.Contract {
  const provider = createProvider(chainId);
  return new ethers.Contract(address, abi, provider);
}

/**
 * Batch create providers for multiple chains
 * Useful for multi-chain applications
 * 
 * @param chainIds - Array of chain IDs
 * @returns Map of chainId to provider
 */
export function createProviders(chainIds: number[]): Map<number, ethers.JsonRpcProvider> {
  const providers = new Map<number, ethers.JsonRpcProvider>();
  
  for (const chainId of chainIds) {
    try {
      providers.set(chainId, createProvider(chainId));
    } catch (error) {
      console.error(`Failed to create provider for chain ${chainId}:`, error);
    }
  }
  
  return providers;
}
