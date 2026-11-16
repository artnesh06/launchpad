'use client';

import { useState, useEffect, useCallback } from 'react';
import { getNetworkInfo, isNetworkSupported, DEFAULT_NETWORK } from '@/utils/networks';
import { WalletProvider, EthereumProvider } from '@/types/wallet';
import { getInstalledWallets } from '@/utils/wallet-providers';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string | null;
  chainId: number | null;
  networkInfo: ReturnType<typeof getNetworkInfo> | null;
  isNetworkSupported: boolean;
  selectedProvider: WalletProvider | null;
}


export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    balance: null,
    chainId: null,
    networkInfo: null,
    isNetworkSupported: false,
    selectedProvider: null
  });

  // Format address for display (0x1234...abcd)
  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // Format balance for display
  const formatBalance = useCallback((balance: string) => {
    const balanceInEth = parseFloat(balance) / Math.pow(10, 18);
    const { formatPrice } = require('@/lib/format-utils');
    return formatPrice(balanceInEth);
  }, []);

  // Check if wallet is already connected
  const checkConnection = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const ethereum = window.ethereum as unknown as EthereumProvider;
      try {
        const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
        if (accounts.length > 0) {
          const chainId = await ethereum.request({ method: 'eth_chainId' }) as string;
          const balance = await ethereum.request({ 
            method: 'eth_getBalance', 
            params: [accounts[0], 'latest'] 
          }) as string;
          
          const chainIdNumber = parseInt(chainId, 16);
          const networkInfo = getNetworkInfo(chainIdNumber);
          
          // Try to detect which provider was used
          const installedWallets = getInstalledWallets();
          const detectedProvider = installedWallets.find(w => w.isInstalled()) || null;

          setWalletState({
            address: accounts[0],
            isConnected: true,
            isConnecting: false,
            balance: formatBalance(parseInt(balance, 16).toString()),
            chainId: chainIdNumber,
            networkInfo,
            isNetworkSupported: isNetworkSupported(chainIdNumber),
            selectedProvider: detectedProvider
          });
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  }, [formatBalance]);

  // Connect wallet with specific provider
  const connectWallet = useCallback(async (provider: WalletProvider) => {
    setWalletState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await provider.connect();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Use the global ethereum object for additional requests
      if (!window.ethereum) {
        throw new Error('Ethereum provider not found');
      }

      const ethereum = window.ethereum as unknown as EthereumProvider;
      const chainId = await ethereum.request({ method: 'eth_chainId' }) as string;
      const balance = await ethereum.request({ 
        method: 'eth_getBalance', 
        params: [accounts[0], 'latest'] 
      }) as string;

      const chainIdNumber = parseInt(chainId, 16);
      const networkInfo = getNetworkInfo(chainIdNumber);

      setWalletState({
        address: accounts[0],
        isConnected: true,
        isConnecting: false,
        balance: formatBalance(parseInt(balance, 16).toString()),
        chainId: chainIdNumber,
        networkInfo,
        isNetworkSupported: isNetworkSupported(chainIdNumber),
        selectedProvider: provider
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
      throw error; // Re-throw so modal can handle it
    }
  }, [formatBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      address: null,
      isConnected: false,
      isConnecting: false,
      balance: null,
      chainId: null,
      networkInfo: null,
      isNetworkSupported: false,
      selectedProvider: null
    });
  }, []);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      checkConnection();
    }
  }, [checkConnection, disconnectWallet]);

  // Setup event listeners
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const ethereum = window.ethereum as unknown as EthereumProvider;
      checkConnection();
      ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum) {
          const ethereum = window.ethereum as unknown as EthereumProvider;
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [checkConnection, handleAccountsChanged]);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    formatAddress,
    formatBalance
  };
}