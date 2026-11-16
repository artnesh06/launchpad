export type NetworkType = 'mainnet' | 'testnet';

export interface ChainConfig {
  rpcUrl: string;
  factoryAddress: string;
  chainId?: number;
  name: string;
}

export interface BlockchainConfig {
  mainnet: ChainConfig;
  testnet: ChainConfig;
}

// RPC URLs that need provider API keys are resolved from server-side env vars
// (never hardcode keys here). Non-NEXT_PUBLIC vars are undefined in the browser,
// so the client falls back to public endpoints / the /api/rpc proxy.
function sepoliaRpcUrl(): string {
  if (process.env.SEPOLIA_RPC_URL) return process.env.SEPOLIA_RPC_URL;
  if (process.env.INFURA_API_KEY) {
    return `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`;
  }
  if (process.env.ALCHEMY_API_KEY) {
    return `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  }
  return 'https://ethereum-sepolia-rpc.publicnode.com';
}

// MegaETH mainnet: a private/VIP RPC URL (contains an access token) must come from env.
function megaethMainnetRpcUrl(): string {
  return process.env.MEGAETH_MAINNET_RPC_URL || 'https://mainnet.megaeth.com/rpc';
}

function monadTestnetRpcUrl(): string {
  if (process.env.MONAD_TESTNET_RPC_URL) return process.env.MONAD_TESTNET_RPC_URL;
  if (process.env.ALCHEMY_API_KEY) {
    return `https://monad-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  }
  return 'https://testnet-rpc.monad.xyz';
}

// Konfigurasi untuk semua blockchain
export const blockchainConfig: Record<string, BlockchainConfig> = {
  ethereum: {
    mainnet: {
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/demo',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 1,
    },
    testnet: {
      name: 'Sepolia Testnet',
      rpcUrl: sepoliaRpcUrl(),
      factoryAddress: '0xd13EE800CDcedeA4F9c08eBA5E52876a6C1E3909',
      chainId: 11155111,
    },
  },
  base: {
    mainnet: {
      name: 'Base Mainnet',
      rpcUrl: 'https://mainnet.base.org',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 8453,
    },
    testnet: {
      name: 'Base Sepolia',
      rpcUrl: 'https://sepolia.base.org',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 84532,
    },
  },
  abstract: {
    mainnet: {
      name: 'Abstract Mainnet',
      rpcUrl: 'https://api.abs.xyz',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    },
    testnet: {
      name: 'Abstract Testnet',
      rpcUrl: 'https://api.testnet.abs.xyz',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    },
  },
  megaeth: {
    mainnet: {
      name: 'MegaETH',
      rpcUrl: megaethMainnetRpcUrl(),
      factoryAddress: '0x779e3426ccf433746c686caff67e33b92a9b8b2c',
      chainId: 4326,
    },
    testnet: {
      name: 'MegaETH Testnet V2',
      rpcUrl: 'https://timothy.megaeth.com/rpc',
      factoryAddress: '0xC4488DB515E6FBAbB5de3a593FF65075afD17b53',
      chainId: 6343,
    },
  },
  hyperliquid: {
    mainnet: {
      name: 'Hyperliquid Mainnet',
      rpcUrl: 'https://api.hyperliquid.xyz/evm',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    },
    testnet: {
      name: 'Hyperliquid Testnet',
      rpcUrl: 'https://api.hyperliquid-testnet.xyz/evm',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    },
  },
  injective: {
    mainnet: {
      name: 'Injective Mainnet',
      rpcUrl: 'https://sentry.exchange.grpc-web.injective.network',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    },
    testnet: {
      name: 'Injective Testnet',
      rpcUrl: 'https://testnet.sentry.exchange.grpc-web.injective.network',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
    },
  },
  monad: {
    mainnet: {
      name: 'Monad Mainnet',
      rpcUrl: 'https://monad.g.alchemy.com/v2/demo',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 10143,
    },
    testnet: {
      name: 'Monad Testnet',
      rpcUrl: monadTestnetRpcUrl(),
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 10143,
    },
  },
  polygon: {
    mainnet: {
      name: 'Polygon Mainnet',
      rpcUrl: 'https://polygon-rpc.com',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 137,
    },
    testnet: {
      name: 'Polygon Amoy',
      rpcUrl: 'https://rpc-amoy.polygon.technology',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 80002,
    },
  },
  arbitrum: {
    mainnet: {
      name: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 42161,
    },
    testnet: {
      name: 'Arbitrum Sepolia',
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      factoryAddress: '0x292d4516a315B3DD53537F1532EAAaA26194aBA6',
      chainId: 421614,
    },
  },
};

// Helper function untuk mendapatkan config berdasarkan chain dan network
export function getChainConfig(
  chain: string,
  network: NetworkType = 'testnet'
): ChainConfig {
  const config = blockchainConfig[chain.toLowerCase()];
  
  if (!config) {
    throw new Error(`Chain "${chain}" tidak ditemukan dalam konfigurasi`);
  }
  
  return config[network];
}

// Helper function untuk mendapatkan semua chain yang tersedia
export function getAvailableChains(): string[] {
  return Object.keys(blockchainConfig);
}

// Helper function untuk mendapatkan RPC URL
export function getRpcUrl(chain: string, network: NetworkType = 'testnet'): string {
  return getChainConfig(chain, network).rpcUrl;
}

// Helper function untuk mendapatkan factory address
export function getFactoryAddress(chain: string, network: NetworkType = 'testnet'): string {
  return getChainConfig(chain, network).factoryAddress;
}

// Default network (bisa diubah via environment variable)
export const DEFAULT_NETWORK: NetworkType = 
  (process.env.NEXT_PUBLIC_DEFAULT_NETWORK as NetworkType) || 'testnet';

// Check if testnet mode is enabled
export const USE_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';

// Helper function untuk mendapatkan config berdasarkan chainId
export function getChainConfigByChainId(chainId: number): {
  chain: string;
  network: NetworkType;
  config: ChainConfig;
} | null {
  // Jika USE_TESTNET aktif, prioritaskan testnet
  if (USE_TESTNET) {
    for (const [chain, configs] of Object.entries(blockchainConfig)) {
      if (configs.testnet.chainId === chainId) {
        return { chain, network: 'testnet', config: configs.testnet };
      }
    }
    // Fallback ke mainnet jika tidak ada testnet dengan chainId ini
    for (const [chain, configs] of Object.entries(blockchainConfig)) {
      if (configs.mainnet.chainId === chainId) {
        return { chain, network: 'mainnet', config: configs.mainnet };
      }
    }
  } else {
    // Mode normal: cek mainnet dulu, lalu testnet
    for (const [chain, configs] of Object.entries(blockchainConfig)) {
      if (configs.mainnet.chainId === chainId) {
        return { chain, network: 'mainnet', config: configs.mainnet };
      }
      if (configs.testnet.chainId === chainId) {
        return { chain, network: 'testnet', config: configs.testnet };
      }
    }
  }
  return null;
}

// Helper function untuk mendapatkan RPC URL berdasarkan chainId
export function getRpcUrlByChainId(chainId: number): string | null {
  const result = getChainConfigByChainId(chainId);
  return result ? result.config.rpcUrl : null;
}
