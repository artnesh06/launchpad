import { getProxiedRpcUrl } from '@/lib/rpc-proxy';

export interface ChainConfig {
  id: number;
  name: string;
  network: string;
  rpcUrl: string; // For client-side (proxy) or server-side HTTP operations
  rpcUrls?: string[]; // Fallback RPC URLs
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  launchpadFactoryAddress?: string;
  oddsTemplateAddress?: string; // OddsLaunchpad template address for MasterContractFactory
  isTestnet: boolean;
  icon: string;
  blockTime?: number; // Average block time in seconds
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  6343: {
    id: 6343,
    name: "MegaETH",
    network: "megaeth-testnet-v2",
    rpcUrl: getProxiedRpcUrl(6343), // Secure proxy for client-side
    rpcUrls: [
      getProxiedRpcUrl(6343), // Secure proxy
    ],
    blockExplorer: "https://megaeth-testnet-v2.blockscout.com",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    launchpadFactoryAddress: "0xC4488DB515E6FBAbB5de3a593FF65075afD17b53", // ✅ CORRECT FACTORY
    oddsTemplateAddress: "0xCC99E1Fda81a63CED1A8cEB7A579825eDF0F750b", // OddsLaunchpad Template
    isTestnet: true,
    icon: "/images/Chain/MegaETH.webp",
    blockTime: 1 // MegaETH has very fast blocks (~1 second)
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    network: "sepolia",
    rpcUrl: getProxiedRpcUrl(11155111), // Secure proxy for client-side
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    launchpadFactoryAddress: "0xB759B92CB8493342ABD53103E2Db5cd20E549975", // MasterContractFactory - Nov 18, 2025
    oddsTemplateAddress: "0x8214c3755126f11Ad093BD491C3d3974A7244415", // OddsLaunchpad Template - Nov 18, 2025
    isTestnet: true,
    icon: "/images/Chain/Sepolia.webp",
    blockTime: 12 // Ethereum Sepolia ~12 seconds per block
  },
  10143: {
    id: 10143,
    name: "Monad Testnet",
    network: "monad-testnet",
    rpcUrl: getProxiedRpcUrl(10143), // Secure proxy for client-side
    blockExplorer: "https://explorer.testnet.monad.xyz",
    nativeCurrency: {
      name: "Monad",
      symbol: "MON",
      decimals: 18,
    },
    launchpadFactoryAddress: "0x292d4516a315B3DD53537F1532EAAaA26194aBA6", // MasterContractFactory - Nov 19, 2025
    oddsTemplateAddress: "0x8214c3755126f11Ad093BD491C3d3974A7244415", // OddsLaunchpad Template (same as Sepolia)
    isTestnet: true,
    icon: "/images/Chain/Monad.png",
    blockTime: 1 // Monad has very fast blocks (~1 second)
  },
};

export const getChainConfig = (chainId: number): ChainConfig | null => {
  return SUPPORTED_CHAINS[chainId] || null;
};

export const getSupportedChainIds = (): number[] => {
  return Object.keys(SUPPORTED_CHAINS).map(Number);
};

export const isChainSupported = (chainId: number): boolean => {
  return chainId in SUPPORTED_CHAINS;
};

export const getDefaultChain = (): ChainConfig => {
  return SUPPORTED_CHAINS[4326]; // MegaETH as default
};

export const getChainName = (chainId: number): string => {
  const chain = SUPPORTED_CHAINS[chainId];
  if (chain) {
    return chain.name;
  }
  console.warn(`Unknown chainId: ${chainId}. Using fallback.`);
  return `Unknown Chain (${chainId})`;
};
