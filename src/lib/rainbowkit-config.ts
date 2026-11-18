import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, arbitrum, polygon, base, sepolia } from 'wagmi/chains';
import { Chain } from 'wagmi/chains';
import type { Config } from 'wagmi';
import { getProxiedRpcUrl } from '@/lib/rpc-proxy';
import { VISIBLE_CHAIN_IDS } from '@/config/chains';

// Get project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

// Define custom networks for chains not included in wagmi/chains
const megaETH: Chain = {
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [getProxiedRpcUrl(4326)] },
    public: { http: [getProxiedRpcUrl(4326)] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://megaeth-testnet-v2.blockscout.com' },
  },
  testnet: true,
};

const megaETHV2: Chain = {
  id: 6343,
  name: 'MegaETH Testnet V2',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [getProxiedRpcUrl(6343)] },
    public: { http: [getProxiedRpcUrl(6343)] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://explorer.megaeth.com' },
  },
  testnet: false,
};

const abstractTestnet: Chain = {
  id: 42170,
  name: 'Abstract Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [getProxiedRpcUrl(42170)] },
    public: { http: [getProxiedRpcUrl(42170)] },
  },
  blockExplorers: {
    default: { name: 'Abstract Explorer', url: 'https://explorer.testnet.abs.xyz' },
  },
  testnet: true,
};

const hyperliquidTestnet: Chain = {
  id: 7171,
  name: 'Hyperliquid Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [getProxiedRpcUrl(7171)] },
    public: { http: [getProxiedRpcUrl(7171)] },
  },
  blockExplorers: {
    default: { name: 'Hyperliquid Explorer', url: 'https://explorer.hyperliquid-testnet.xyz' },
  },
  testnet: true,
};

const injectiveTestnet: Chain = {
  id: 888,
  name: 'Injective Testnet',
  nativeCurrency: {
    name: 'Injective',
    symbol: 'INJ',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [getProxiedRpcUrl(888)] },
    public: { http: [getProxiedRpcUrl(888)] },
  },
  blockExplorers: {
    default: { name: 'Injective Explorer', url: 'https://testnet.explorer.injective.network' },
  },
  testnet: true,
};

const monadTestnet: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [getProxiedRpcUrl(10143)] },
    public: { http: [getProxiedRpcUrl(10143)] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.testnet.monad.xyz' },
  },
  testnet: true,
};

// Configure the chains (MegaETH first = default network). Only the chains in
// NEXT_PUBLIC_VISIBLE_CHAIN_IDS are offered to wallets.
const ALL_CHAINS: Chain[] = [
  megaETH,
  mainnet,
  base,
  arbitrum,
  polygon,
  sepolia,
  megaETHV2,
  abstractTestnet,
  hyperliquidTestnet,
  injectiveTestnet,
  monadTestnet,
];
const visibleWalletChains = ALL_CHAINS.filter((chain) => VISIBLE_CHAIN_IDS.includes(chain.id));
const chains: readonly [Chain, ...Chain[]] = (
  visibleWalletChains.length > 0 ? visibleWalletChains : [megaETH]
) as [Chain, ...Chain[]];

// Initialize config lazily to avoid server-side execution
let _config: Config | undefined;

// Polling interval in milliseconds (default wagmi is 4000ms which causes too many requests)
// Set to 60 seconds to reduce RPC load and prevent infinite loops
const POLLING_INTERVAL = 60_000;

export const getConfig = (): Config => {
  if (typeof window === 'undefined') {
    // Return a minimal config for SSR that won't try to access browser APIs
    throw new Error('Config should not be accessed on the server');
  }
  
  if (!_config) {
    try {
      _config = getDefaultConfig({
        appName: 'NFT Launchpad',
        projectId,
        chains,
        ssr: true, // Keep ssr true for proper hydration
        // Reduce polling frequency to prevent infinite loop / excessive RPC calls
        pollingInterval: POLLING_INTERVAL,
        // Disable batch calls to prevent multiple simultaneous requests
        batch: {
          multicall: false,
        },
        // Only sync connected chain to prevent unnecessary RPC calls
        syncConnectedChain: true,
      });
    } catch (error) {
      console.error('Failed to create wagmi config:', error);
      throw error;
    }
  }
  
  return _config;
};

// For backward compatibility, export config but initialize it lazily
export const config = new Proxy({} as Config, {
  get(target, prop) {
    return getConfig()[prop as keyof Config];
  }
});

export { projectId, chains, megaETH, megaETHV2, abstractTestnet, hyperliquidTestnet, injectiveTestnet, monadTestnet };
