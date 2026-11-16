/**
 * RPC Proxy Helper
 * 
 * This module provides helper functions to get RPC URLs that route through
 * our secure backend proxy instead of exposing API keys in the frontend.
 */

import { getRpcUrlByChainId } from '@/config/blockchain';

// Get the base URL for API calls
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URL
    return '';
  }
  // Server-side: use full URL
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
};

/**
 * Get proxied RPC URL for a specific chain
 * This URL routes through our backend to keep API keys secure
 */
export function getProxiedRpcUrl(chainId: number): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/rpc?chainId=${chainId}`;
}

/**
 * Get direct RPC URL (server-side only)
 * Only use this in server-side code where environment variables are secure
 * Now uses centralized blockchain config
 */
export function getDirectRpcUrl(chainId: number): string | null {
  return getRpcUrlByChainId(chainId);
}

/**
 * Check if we're running on the server
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Get RPC URL - automatically uses proxy on client, direct on server
 */
export function getRpcUrl(chainId: number): string {
  if (isServer()) {
    // Server-side: use direct URL if available
    const directUrl = getDirectRpcUrl(chainId);
    if (directUrl) return directUrl;
  }
  
  // Client-side or fallback: use proxy
  return getProxiedRpcUrl(chainId);
}

/**
 * Make RPC URL absolute for ethers.js
 * Converts relative URLs like "/api/rpc?chainId=123" to absolute URLs
 * This is needed because ethers.js requires full URLs with protocol
 */
export function makeRpcUrlAbsolute(rpcUrl: string): string {
  // If already absolute (has protocol), return as-is
  if (rpcUrl.startsWith('http://') || rpcUrl.startsWith('https://')) {
    return rpcUrl;
  }
  
  // If relative and in browser, make it absolute
  if (typeof window !== 'undefined' && rpcUrl.startsWith('/')) {
    return `${window.location.origin}${rpcUrl}`;
  }
  
  // Otherwise return as-is (shouldn't happen in normal usage)
  return rpcUrl;
}
