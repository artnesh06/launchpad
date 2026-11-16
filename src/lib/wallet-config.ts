import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet, arbitrum, polygon, base, sepolia } from '@reown/appkit/networks';
import { SUPPORTED_CHAINS } from '@/config/chains';
import { getProxiedRpcUrl } from '@/lib/rpc-proxy';

// Get project ID from environment variables
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Define custom networks for chains not included in @reown/appkit/networks
const megaETH = {
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

const megaETHV2 = {
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

const abstractTestnet = {
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

const hyperliquidTestnet = {
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

const injectiveTestnet = {
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

// Configure the networks - include all chains from chains.ts
const networks = [
  mainnet,      // Ethereum Mainnet (1)
  base,         // Base (8453)
  arbitrum,     // Arbitrum
  polygon,      // Polygon
  sepolia,      // Sepolia Testnet
  megaETH,      // MegaETH (4326) - Custom
  megaETHV2,    // MegaETH V2 (6343) - Custom
  abstractTestnet, // Abstract Testnet (42170) - Custom
  hyperliquidTestnet, // Hyperliquid Testnet (7171) - Custom
  injectiveTestnet, // Injective Testnet (888) - Custom
] as any;

// App metadata
const metadata = {
  name: 'NFT Launchpad',
  description: 'NFT Launchpad for EVM networks',
  url: 'https://your-domain.com',
  icons: ['https://your-domain.com/icon.png']
};

// Initialize the AppKit
const modal = createAppKit({
  adapters: [new EthersAdapter()],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true,
    email: false,
    socials: []
  },
  allowUnsupportedChain: true, // Allow connecting to unsupported chains
});

export { projectId, networks, metadata, modal, megaETH, megaETHV2, abstractTestnet, hyperliquidTestnet, injectiveTestnet };