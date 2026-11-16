import { blockchainConfig, getChainConfigByChainId } from '@/config/blockchain';

export interface Network {
  chainId: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  blockExplorer: string;
  icon: string;
}

// Build supported networks from blockchain config
export const SUPPORTED_NETWORKS: Record<number, Network> = {};

// Populate from blockchain config
Object.entries(blockchainConfig).forEach(([chain, config]) => {
  // Mainnet
  if (config.mainnet.chainId) {
    SUPPORTED_NETWORKS[config.mainnet.chainId] = {
      chainId: config.mainnet.chainId,
      name: config.mainnet.name,
      symbol: getSymbolForChain(chain),
      rpcUrl: config.mainnet.rpcUrl,
      blockExplorer: getExplorerForChain(chain, 'mainnet'),
      icon: getIconForChain(chain),
    };
  }
  
  // Testnet
  if (config.testnet.chainId) {
    SUPPORTED_NETWORKS[config.testnet.chainId] = {
      chainId: config.testnet.chainId,
      name: config.testnet.name,
      symbol: getSymbolForChain(chain),
      rpcUrl: config.testnet.rpcUrl,
      blockExplorer: getExplorerForChain(chain, 'testnet'),
      icon: getIconForChain(chain),
    };
  }
});

// Helper functions
function getSymbolForChain(chain: string): string {
  const symbols: Record<string, string> = {
    ethereum: 'ETH',
    base: 'ETH',
    polygon: 'MATIC',
    arbitrum: 'ETH',
    megaeth: 'ETH',
    monad: 'MONAD',
    abstract: 'ETH',
    hyperliquid: 'HYPE',
    injective: 'INJ',
  };
  return symbols[chain] || 'ETH';
}

function getIconForChain(chain: string): string {
  const icons: Record<string, string> = {
    ethereum: '⟠',
    base: '🔵',
    polygon: '🟣',
    arbitrum: '🔷',
    megaeth: '⚡',
    monad: '🟢',
    abstract: '🎨',
    hyperliquid: '💧',
    injective: '🔺',
  };
  return icons[chain] || '❓';
}

function getExplorerForChain(chain: string, network: 'mainnet' | 'testnet'): string {
  const explorers: Record<string, { mainnet: string; testnet: string }> = {
    ethereum: {
      mainnet: 'https://etherscan.io',
      testnet: 'https://sepolia.etherscan.io',
    },
    base: {
      mainnet: 'https://basescan.org',
      testnet: 'https://sepolia.basescan.org',
    },
    polygon: {
      mainnet: 'https://polygonscan.com',
      testnet: 'https://amoy.polygonscan.com',
    },
    arbitrum: {
      mainnet: 'https://arbiscan.io',
      testnet: 'https://sepolia.arbiscan.io',
    },
    megaeth: {
      mainnet: 'https://explorer.megaeth.com',
      testnet: 'https://explorer.testnet.megaeth.com',
    },
    monad: {
      mainnet: 'https://explorer.monad.xyz',
      testnet: 'https://explorer.testnet.monad.xyz',
    },
    abstract: {
      mainnet: 'https://explorer.abs.xyz',
      testnet: 'https://explorer.testnet.abs.xyz',
    },
    hyperliquid: {
      mainnet: 'https://explorer.hyperliquid.xyz',
      testnet: 'https://explorer.hyperliquid-testnet.xyz',
    },
    injective: {
      mainnet: 'https://explorer.injective.network',
      testnet: 'https://testnet.explorer.injective.network',
    },
  };
  return explorers[chain]?.[network] || 'https://etherscan.io';
}

export const DEFAULT_NETWORK = SUPPORTED_NETWORKS[8453]; // Base Mainnet

export function getNetworkInfo(chainId: number): Network {
  return SUPPORTED_NETWORKS[chainId] || {
    chainId,
    name: 'Unknown Network',
    symbol: 'ETH',
    rpcUrl: '',
    blockExplorer: '',
    icon: '❓'
  };
}

export function isNetworkSupported(chainId: number): boolean {
  return chainId in SUPPORTED_NETWORKS;
}