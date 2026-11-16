import { WalletProvider, WalletProviderType, EthereumProvider } from '@/types/wallet';

export const WALLET_PROVIDERS: Record<WalletProviderType, WalletProvider> = {
  [WalletProviderType.METAMASK]: {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: 'Connect to your MetaMask Wallet',
    downloadUrl: 'https://metamask.io/download/',
    isInstalled: () => {
      return typeof window !== 'undefined' && 
             window.ethereum?.isMetaMask === true;
    },
    connect: async () => {
      if (!window.ethereum?.isMetaMask) {
        throw new Error('MetaMask not installed');
      }
      const ethereum = window.ethereum as unknown as EthereumProvider;
      return await ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
    }
  },

  [WalletProviderType.COINBASE]: {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🔵',
    description: 'Connect to your Coinbase Wallet',
    downloadUrl: 'https://www.coinbase.com/wallet/downloads',
    isInstalled: () => {
      return typeof window !== 'undefined' && 
             window.ethereum?.isCoinbaseWallet === true;
    },
    connect: async () => {
      if (!window.ethereum?.isCoinbaseWallet) {
        throw new Error('Coinbase Wallet not installed');
      }
      const ethereum = window.ethereum as unknown as EthereumProvider;
      return await ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
    }
  },

  [WalletProviderType.TRUST_WALLET]: {
    id: 'trustwallet',
    name: 'Trust Wallet',
    icon: '🛡️',
    description: 'Connect to your Trust Wallet',
    downloadUrl: 'https://trustwallet.com/download',
    isInstalled: () => {
      return typeof window !== 'undefined' && 
             ((window as any).trustwallet !== undefined || window.ethereum?.isTrust === true);
    },
    connect: async () => {
      const provider = (window as any).trustwallet || window.ethereum;
      if (!provider || !window.ethereum?.isTrust) {
        throw new Error('Trust Wallet not installed');
      }
      const ethereumProvider = provider as unknown as EthereumProvider;
      return await ethereumProvider.request({ 
        method: 'eth_requestAccounts' 
      });
    }
  },

  [WalletProviderType.RAINBOW]: {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '🌈',
    description: 'Connect to your Rainbow Wallet',
    downloadUrl: 'https://rainbow.me/download',
    isInstalled: () => {
      return typeof window !== 'undefined' && 
             ((window as any).rainbow !== undefined || window.ethereum?.isRainbow === true);
    },
    connect: async () => {
      const provider = (window as any).rainbow || window.ethereum;
      if (!provider || !window.ethereum?.isRainbow) {
        throw new Error('Rainbow Wallet not installed');
      }
      const ethereumProvider = provider as unknown as EthereumProvider;
      return await ethereumProvider.request({ 
        method: 'eth_requestAccounts' 
      });
    }
  },

  [WalletProviderType.WALLET_CONNECT]: {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '📱',
    description: 'Scan with WalletConnect to connect',
    downloadUrl: 'https://walletconnect.com/',
    isInstalled: () => {
      // WalletConnect is always available
      return true;
    },
    connect: async () => {
      // This would need WalletConnect SDK implementation
      // For now, we'll show as coming soon
      throw new Error('WalletConnect integration coming soon');
    }
  }
};

export function getInstalledWallets(): WalletProvider[] {
  return Object.values(WALLET_PROVIDERS).filter(provider => provider.isInstalled());
}

export function getAllWallets(): WalletProvider[] {
  return Object.values(WALLET_PROVIDERS);
}

export function getWalletProvider(id: string): WalletProvider | null {
  return Object.values(WALLET_PROVIDERS).find(provider => provider.id === id) || null;
}