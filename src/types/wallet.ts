export interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  downloadUrl?: string;
  isInstalled: () => boolean;
  connect: () => Promise<string[]>;
}

export interface WalletConnection {
  provider: WalletProvider;
  address: string;
  chainId: number;
}

export enum WalletProviderType {
  METAMASK = 'metamask',
  WALLET_CONNECT = 'walletconnect',
  COINBASE = 'coinbase',
  TRUST_WALLET = 'trustwallet',
  RAINBOW = 'rainbow'
}

export interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRainbow?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (accounts: string[]) => void) => void;
  removeListener: (event: string, callback: (accounts: string[]) => void) => void;
  selectedAddress?: string;
  chainId?: string;
}

