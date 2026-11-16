'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { ContractService } from '@/lib/contract-service';
import type { CollectionData } from '@/components/admin/simple-collection-creator';

interface UseNFTCollectionReturn {
  // State
  isCreating: boolean;
  isConnected: boolean;
  account: string | null;
  chainId: number | null;

  // Actions
  connectWallet: () => Promise<void>;
  createCollection: (data: CollectionData) => Promise<string | null>;
  addMintPhases: (collectionAddress: string, phases: CollectionData['mintPhases']) => Promise<void>;
  mintFromPhase: (
    collectionAddress: string,
    phaseId: number,
    quantity: number,
    merkleProof?: string[]
  ) => Promise<void>;

  // Utils
  calculateMintCost: (
    collectionAddress: string,
    phaseId: number,
    quantity: number
  ) => Promise<{
    mintCost: string;
    platformFee: string;
    totalCost: string;
    isFreeMint: boolean;
  } | null>;

  getActiveMintPhases: (collectionAddress: string) => Promise<any[]>;
}

export function useNFTCollection(): UseNFTCollectionReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Connect to wallet
  const connectWallet = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum as any);
      await provider.send('eth_requestAccounts', []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setAccount(address);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      // Listen for account changes
      (window.ethereum as any).on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          setAccount(null);
        } else {
          setAccount(accounts[0]);
        }
      });

      // Listen for chain changes
      (window.ethereum as any).on('chainChanged', (chainId: string) => {
        setChainId(parseInt(chainId, 16));
      });

    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }, []);

  // Create new NFT collection using MasterContractFactory
  const createCollection = useCallback(async (data: CollectionData): Promise<string | null> => {
    setIsCreating(true);

    try {
      const service = new ContractService();

      // Get template address from chain config
      const templateAddress = await service.getTemplateAddress(data.chainId);
      if (!templateAddress) {
        throw new Error(`OddsLaunchpad template not configured for chain ${data.chainId}`);
      }

      console.log('Using OddsLaunchpad template:', templateAddress);

      // Deploy collection via MasterContractFactory using deployMasterContract
      const createTx = await service.deployMasterContract(
        data.chainId,
        templateAddress,
        {
          name: data.name,
          symbol: data.symbol,
          baseURI: data.baseURI,
          unrevealedURI: data.unrevealedURI,
          contractURI: data.contractURI,
          externalLink: data.externalLink,
          totalMaxSupply: data.totalMaxSupply,
          treasury: data.treasury,
          royaltyRecipient: data.royaltyRecipient,
          royaltyPercentage: data.royaltyPercentage,
          isRevealed: false,
          transfersEnabled: true
        }
      );

      console.log('Collection deployment transaction:', createTx);

      // Note: The deployMasterContract function now:
      // 1. Waits for the transaction to be mined
      // 2. Parses the ContractDeployed event to get the deployed collection address
      // 3. You can then add mint phases to the deployed collection

      // Return the transaction hash
      return createTx;

    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Add mint phases to existing collection
  const addMintPhases = useCallback(async (
    collectionAddress: string,
    phases: CollectionData['mintPhases']
  ) => {
    try {
      const service = new ContractService();

      for (const phase of phases) {
        await service.addMintPhase(chainId || 6343, collectionAddress, {
          name: phase.name,
          description: phase.description,
          startTime: Math.floor(new Date(phase.startTime).getTime() / 1000),
          endTime: Math.floor(new Date(phase.endTime).getTime() / 1000),
          price: phase.price,
          maxSupply: phase.maxSupply,
          maxPerWallet: phase.maxPerWallet,
          maxPerTransaction: phase.maxPerTransaction,
          merkleRoot: phase.merkleRoot,
          requiresWhitelist: phase.requiresWhitelist,
          paymentType: phase.paymentType === 'ETH' ? 0 : 1,
          paymentToken: phase.paymentToken,
          minimumRaise: parseInt(phase.minimumRaise) || 0,
          refundEnabled: phase.refundEnabled
        });
      }
    } catch (error) {
      console.error('Error adding mint phases:', error);
      throw error;
    }
  }, [chainId]);

  // Mint from a specific phase
  const mintFromPhase = useCallback(async (
    collectionAddress: string,
    phaseId: number,
    quantity: number,
    merkleProof: string[] = []
  ) => {
    try {
      const service = new ContractService();

      await service.mintNFT(chainId || 6343, collectionAddress, phaseId, quantity, merkleProof);
    } catch (error) {
      console.error('Error minting:', error);
      throw error;
    }
  }, [chainId]);

  // Calculate mint cost
  const calculateMintCost = useCallback(async (
    collectionAddress: string,
    phaseId: number,
    quantity: number
  ) => {
    try {
      const service = new ContractService();

      return await service.calculateMintCost(chainId || 6343, collectionAddress, phaseId, quantity);
    } catch (error) {
      console.error('Error calculating mint cost:', error);
      return null;
    }
  }, [chainId]);

  // Get active mint phases
  const getActiveMintPhases = useCallback(async (collectionAddress: string) => {
    try {
      const service = new ContractService();

      return await service.getActiveMintPhases(chainId || 6343, collectionAddress);
    } catch (error) {
      console.error('Error getting active mint phases:', error);
      return [];
    }
  }, [chainId]);

  return {
    // State
    isCreating,
    isConnected,
    account,
    chainId,

    // Actions
    connectWallet,
    createCollection,
    addMintPhases,
    mintFromPhase,

    // Utils
    calculateMintCost,
    getActiveMintPhases
  };
}

// Higher-order component for wallet connection requirement
export function withWalletConnection<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WalletConnectedComponent(props: P) {
    const { isConnected, connectWallet } = useNFTCollection();

    if (!isConnected) {
      return (
        <div className="max-w-md mx-auto p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">
            You need to connect your wallet to interact with NFT collections.
          </p>
          <button
            onClick={connectWallet}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Connect Wallet
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };
}