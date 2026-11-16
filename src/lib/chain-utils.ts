import { SUPPORTED_CHAINS, ChainConfig } from '@/config/chains';

export interface ChainOption {
  name: string;
  icon: string;
  chainId: number;
}

export interface ChainSelectOption {
  value: string;
  label: string;
  icon: string;
}

/**
 * Get all supported chains as options for ChainSelection component
 */
export function getChainOptions(): ChainOption[] {
  return Object.values(SUPPORTED_CHAINS).map((chain) => ({
    name: chain.name,
    icon: chain.icon,
    chainId: chain.id,
  }));
}

/**
 * Get all supported chains as options for Select component (CustomSelect)
 */
export function getChainSelectOptions(): ChainSelectOption[] {
  return Object.values(SUPPORTED_CHAINS).map((chain) => ({
    value: String(chain.id),
    label: chain.name,
    icon: chain.icon,
  }));
}

/**
 * Get chain config by ID
 */
export function getChainById(chainId: number): ChainConfig | null {
  return SUPPORTED_CHAINS[chainId] || null;
}

/**
 * Get chain name by ID
 */
export function getChainNameById(chainId: number): string {
  const chain = SUPPORTED_CHAINS[chainId];
  return chain ? chain.name : `Unknown Chain (${chainId})`;
}

/**
 * Get chain icon by ID
 */
export function getChainIconById(chainId: number): string {
  const chain = SUPPORTED_CHAINS[chainId];
  return chain ? chain.icon : '/images/Chain/Unknown.png';
}

/**
 * Check if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in SUPPORTED_CHAINS;
}

/**
 * Get default chain (MegaETH)
 */
export function getDefaultChain(): ChainConfig {
  return SUPPORTED_CHAINS[4326];
}
