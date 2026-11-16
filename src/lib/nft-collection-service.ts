import { ethers, BrowserProvider, Contract, formatEther, parseEther, isAddress, ZeroAddress, ZeroHash } from 'ethers';
import type { CollectionData, MintPhase } from '@/components/admin/simple-collection-creator';
import MasterContractFactoryABI from '../../abi/OddsLaunchpadFactory.json';
import { getChainConfig, isChainSupported, SUPPORTED_CHAINS } from '@/config/chains';

// NFTCollection ABI (key functions for frontend integration)
const NFTCollectionABI = [
  // Constructor & Configuration
  {
    "inputs": [
      {
        "components": [
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "symbol", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "string", "name": "baseURI", "type": "string"},
          {"internalType": "string", "name": "unrevealedURI", "type": "string"},
          {"internalType": "string", "name": "contractURI", "type": "string"},
          {"internalType": "string", "name": "externalLink", "type": "string"},
          {"internalType": "uint256", "name": "totalMaxSupply", "type": "uint256"},
          {"internalType": "address payable", "name": "treasury", "type": "address"},
          {"internalType": "address payable", "name": "royaltyRecipient", "type": "address"},
          {"internalType": "uint96", "name": "royaltyPercentage", "type": "uint96"},
          {"internalType": "bool", "name": "isRevealed", "type": "bool"},
          {"internalType": "uint256", "name": "chainId", "type": "uint256"}
        ],
        "internalType": "struct NFTCollection.CollectionConfig",
        "name": "_config",
        "type": "tuple"
      },
      {"internalType": "address payable", "name": "_platformTreasury", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },

  // Mint Phase Management
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "uint256", "name": "_startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "_endTime", "type": "uint256"},
      {"internalType": "uint256", "name": "_price", "type": "uint256"},
      {"internalType": "uint256", "name": "_maxSupply", "type": "uint256"},
      {"internalType": "uint256", "name": "_maxPerWallet", "type": "uint256"},
      {"internalType": "uint256", "name": "_maxPerTransaction", "type": "uint256"},
      {"internalType": "bytes32", "name": "_merkleRoot", "type": "bytes32"},
      {"internalType": "bool", "name": "_requiresWhitelist", "type": "bool"},
      {"internalType": "enum NFTCollection.PaymentType", "name": "_paymentType", "type": "uint8"},
      {"internalType": "address", "name": "_paymentToken", "type": "address"}
    ],
    "name": "addMintPhase",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Minting
  {
    "inputs": [
      {"internalType": "uint256", "name": "phaseId", "type": "uint256"},
      {"internalType": "uint256", "name": "quantity", "type": "uint256"},
      {"internalType": "bytes32[]", "name": "merkleProof", "type": "bytes32[]"}
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },

  // View Functions
  {
    "inputs": [{"internalType": "uint256", "name": "phaseId", "type": "uint256"}],
    "name": "getMintPhase",
    "outputs": [
      {
        "components": [
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "uint256", "name": "startTime", "type": "uint256"},
          {"internalType": "uint256", "name": "endTime", "type": "uint256"},
          {"internalType": "uint256", "name": "price", "type": "uint256"},
          {"internalType": "uint256", "name": "maxSupply", "type": "uint256"},
          {"internalType": "uint256", "name": "maxPerWallet", "type": "uint256"},
          {"internalType": "uint256", "name": "maxPerTransaction", "type": "uint256"},
          {"internalType": "bytes32", "name": "merkleRoot", "type": "bytes32"},
          {"internalType": "bool", "name": "isActive", "type": "bool"},
          {"internalType": "bool", "name": "requiresWhitelist", "type": "bool"},
          {"internalType": "uint256", "name": "currentSupply", "type": "uint256"},
          {"internalType": "enum NFTCollection.PaymentType", "name": "paymentType", "type": "uint8"},
          {"internalType": "address", "name": "paymentToken", "type": "address"},
          {"internalType": "uint256", "name": "minimumRaise", "type": "uint256"},
          {"internalType": "bool", "name": "refundEnabled", "type": "bool"}
        ],
        "internalType": "struct NFTCollection.MintPhase",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "getActiveMintPhases",
    "outputs": [
      {
        "components": [
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "uint256", "name": "startTime", "type": "uint256"},
          {"internalType": "uint256", "name": "endTime", "type": "uint256"},
          {"internalType": "uint256", "name": "price", "type": "uint256"},
          {"internalType": "uint256", "name": "maxSupply", "type": "uint256"},
          {"internalType": "uint256", "name": "maxPerWallet", "type": "uint256"},
          {"internalType": "uint256", "name": "maxPerTransaction", "type": "uint256"},
          {"internalType": "bytes32", "name": "merkleRoot", "type": "bytes32"},
          {"internalType": "bool", "name": "isActive", "type": "bool"},
          {"internalType": "bool", "name": "requiresWhitelist", "type": "bool"},
          {"internalType": "uint256", "name": "currentSupply", "type": "uint256"},
          {"internalType": "enum NFTCollection.PaymentType", "name": "paymentType", "type": "uint8"},
          {"internalType": "address", "name": "paymentToken", "type": "address"},
          {"internalType": "uint256", "name": "minimumRaise", "type": "uint256"},
          {"internalType": "bool", "name": "refundEnabled", "type": "bool"}
        ],
        "internalType": "struct NFTCollection.MintPhase[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "uint256", "name": "phaseId", "type": "uint256"},
      {"internalType": "uint256", "name": "quantity", "type": "uint256"}
    ],
    "name": "calculateMintCost",
    "outputs": [
      {"internalType": "uint256", "name": "mintCost", "type": "uint256"},
      {"internalType": "uint256", "name": "platformFee", "type": "uint256"},
      {"internalType": "uint256", "name": "totalCost", "type": "uint256"},
      {"internalType": "bool", "name": "isFreeMint", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Admin Functions
  {
    "inputs": [
      {"internalType": "address", "name": "recipient", "type": "address"},
      {"internalType": "uint96", "name": "percentage", "type": "uint96"}
    ],
    "name": "setRoyaltyInfo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "string", "name": "_baseURI", "type": "string"},
      {"internalType": "string", "name": "_contractURI", "type": "string"},
      {"internalType": "string", "name": "_externalLink", "type": "string"},
      {"internalType": "bool", "name": "_isRevealed", "type": "bool"}
    ],
    "name": "updateCollectionConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [
      {"internalType": "address", "name": "operator", "type": "address"},
      {"internalType": "bool", "name": "blocked", "type": "bool"}
    ],
    "name": "setOperatorBlocked",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [{"internalType": "bool", "name": "enabled", "type": "bool"}],
    "name": "setOperatorFilteringEnabled",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Emergency Functions
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export class NFTCollectionService {
  private provider: BrowserProvider;
  private signer: ethers.Signer | null = null;

  constructor(provider: BrowserProvider) {
    this.provider = provider;
  }

  /**
   * Switch to the specified network
   */
  private async switchNetwork(chainId: number): Promise<void> {
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    try {
      // Request wallet to switch to the network
      const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> } }).ethereum;
      if (!ethereum) {
        throw new Error('No EIP-1193 provider found. Please install a wallet like MetaMask.');
      }
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add the network to MetaMask
          const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> } }).ethereum;
          if (!ethereum) {
            throw new Error('No EIP-1193 provider found. Please install a wallet like MetaMask.');
          }
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: chainConfig.name,
                nativeCurrency: chainConfig.nativeCurrency,
                rpcUrls: [chainConfig.rpcUrl],
                blockExplorerUrls: [chainConfig.blockExplorer],
              },
            ],
          });
        } catch (addError) {
          throw new Error(`Failed to add network ${chainConfig.name}: ${addError}`);
        }
      } else {
        throw new Error(`Failed to switch to network ${chainConfig.name}: ${switchError.message}`);
      }
    }

    // Wait a bit for the network switch to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reinitialize provider after network switch
    this.provider = new BrowserProvider(window.ethereum as any);
    this.signer = null; // Reset signer
  }

  private async getSigner(): Promise<ethers.Signer> {
    if (!this.signer) {
      this.signer = await this.provider.getSigner();
    }
    return this.signer;
  }

  /**
   * Deploy a new NFT Collection contract
   */
  async deployNFTCollection(
    collectionData: CollectionData,
    factoryAddress?: string,
    targetChainId: number = 6343 // Default to MegaETH
  ): Promise<{
    hash: string;
    collectionAddress?: string;
    receipt?: ethers.TransactionReceipt;
  }> {
    try {
      // Get current network
      let network = await this.provider.getNetwork();
      let chainId = Number(network.chainId);

      // Check if we need to switch networks
      if (chainId !== targetChainId) {
        const targetChainConfig = getChainConfig(targetChainId);
        console.log(`Current network: ${chainId}, switching to: ${targetChainId} (${targetChainConfig?.name})`);

        // Show user-friendly message about network switch
        if (typeof window !== 'undefined') {
          console.log(`🔄 Switching to ${targetChainConfig?.name} network for deployment...`);
        }

        await this.switchNetwork(targetChainId);

        // Get updated network info after switch
        network = await this.provider.getNetwork();
        chainId = Number(network.chainId);

        if (chainId !== targetChainId) {
          throw new Error(`Failed to switch to network ${targetChainId}. Current network: ${chainId}`);
        }

        console.log(`✅ Successfully switched to ${targetChainConfig?.name} (Chain ${chainId})`);
      }

      // Validate network is supported
      if (!isChainSupported(chainId)) {
        const supportedChainIds = Object.keys(SUPPORTED_CHAINS).join(', ');
        throw new Error(`Unsupported network. Supported networks: ${supportedChainIds}. Current chain ID: ${chainId}`);
      }

      // Get factory address for current network or use provided one
      const chainConfig = getChainConfig(chainId);
      const contractAddress = factoryAddress || chainConfig?.launchpadFactoryAddress;

      if (!contractAddress) {
        const supportedChainIds = Object.keys(SUPPORTED_CHAINS).join(', ');
        throw new Error(`No factory contract deployed on chain ${chainId}. Supported chains: ${supportedChainIds}`);
      }

      // Validate required parameters
      if (!collectionData.name || !collectionData.symbol) {
        throw new Error('Collection name and symbol are required');
      }

      // Get signer address to use as defaults
      const signerAddress = await (await this.getSigner()).getAddress();

      // Use signer address as default if treasury is not provided or invalid
      let treasury = collectionData.treasury;
      if (!treasury || !ethers.isAddress(treasury)) {
        console.log('⚠️ No valid treasury address provided, using signer address:', signerAddress);
        treasury = signerAddress;
      }

      // Use signer address as default if royalty recipient is not provided or invalid
      let royaltyRecipient = collectionData.royaltyRecipient;
      if (!royaltyRecipient || !ethers.isAddress(royaltyRecipient)) {
        console.log('⚠️ No valid royalty recipient provided, using signer address:', signerAddress);
        royaltyRecipient = signerAddress;
      }

      // Prepare deployment request
      const deploymentRequest = {
        name: collectionData.name,
        symbol: collectionData.symbol,
        description: collectionData.description || '',
        baseURI: collectionData.baseURI || '',
        unrevealedURI: collectionData.unrevealedURI || '',
        contractURI: collectionData.contractURI || '',
        externalLink: collectionData.externalLink || '',
        totalMaxSupply: collectionData.totalMaxSupply || 1000,
        treasury: treasury,
        royaltyRecipient: royaltyRecipient,
        royaltyPercentage: collectionData.royaltyPercentage || 250 // 2.5%
      };

      console.log('📋 Deployment request:', deploymentRequest);

      // Prepare phases for deployment (convert to contract format)
      const phasesForDeploy = collectionData.mintPhases && collectionData.mintPhases.length > 0
        ? collectionData.mintPhases
            .filter(phase => phase.isActive)
            .map(phase => {
              const startTime = Math.floor(new Date(phase.startTime).getTime() / 1000);
              const endTime = Math.floor(new Date(phase.endTime).getTime() / 1000);
              
              return {
                name: phase.name,
                description: phase.description || phase.name,
                startTime: startTime,
                endTime: endTime,
                price: parseEther(phase.price), // Convert to wei
                maxSupply: phase.maxSupply,
                maxPerWallet: phase.maxPerWallet,
                maxPerTransaction: phase.maxPerTransaction,
                merkleRoot: phase.merkleRoot || ZeroHash,
                isActive: true,
                requiresWhitelist: phase.requiresWhitelist || false,
                currentSupply: 0,
                paymentType: phase.paymentType === 'ETH' ? 0 : 1,
                paymentToken: phase.paymentToken || ZeroAddress,
                minimumRaise: phase.minimumRaise ? parseEther(phase.minimumRaise) : 0,
                refundEnabled: phase.refundEnabled || false
              };
            })
        : [];

      console.log(`📦 Deploying with ${phasesForDeploy.length} phases included in constructor`);

      // Use ContractService to deploy with phases
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();
      
      // Get template address from chain config
      const deployChainConfig = getChainConfig(chainId);
      const templateAddress = deployChainConfig?.oddsTemplateAddress;
      
      if (!templateAddress) {
        throw new Error(`OddsLaunchpad template not configured for chain ${chainId}`);
      }

      console.log('🚀 Deploying via ContractService.deployMasterContract...');
      
      // Deploy with phases included in constructor
      const txHash = await contractService.deployMasterContract(
        chainId,
        templateAddress,
        deploymentRequest,
        phasesForDeploy // Phases included in deployment!
      );

      console.log('✅ Deployment transaction:', txHash);
      
      // Wait for transaction and get receipt
      const signer = await this.getSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error('Provider not available');
      }
      
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      // Extract collection address from logs
      let collectionAddress: string | undefined;
      
      // Try to get contract address from receipt
      if (receipt.contractAddress) {
        collectionAddress = receipt.contractAddress;
        console.log('🎉 Collection deployed at:', collectionAddress);
      } else {
        // Parse logs to find ContractDeployed event
        const factory = new Contract(
          contractAddress,
          MasterContractFactoryABI,
          provider
        );
        
        for (const log of receipt.logs) {
          try {
            const parsedLog = factory.interface.parseLog({
              topics: [...log.topics],
              data: log.data
            });
            if (parsedLog && parsedLog.name === 'ContractDeployed') {
              collectionAddress = parsedLog.args.contractAddress || parsedLog.args[0];
              console.log('🎉 Collection deployed at:', collectionAddress);
              break;
            }
          } catch (e) {
            // Continue if log parsing fails
          }
        }
      }

      if (!collectionAddress) {
        console.warn('⚠️ Could not extract collection address from transaction logs');
      }

      console.log(`✅ Deployment complete! Phases were included in constructor.`);

      return {
        hash: txHash,
        collectionAddress,
        receipt
      };

    } catch (error: any) {
      console.error('Error deploying NFT Collection:', error);

      // Provide more specific error messages
      if (error.code === 'CALL_EXCEPTION') {
        if (error.receipt && error.receipt.status === 0) {
          throw new Error(`Transaction reverted. This could be due to: invalid parameters, insufficient funds, or contract requirements not met. Transaction hash: ${error.transaction?.hash}`);
        }
      }

      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds to pay for transaction and gas fees');
      }

      if (error.code === 'USER_REJECTED') {
        throw new Error('Transaction was rejected by user');
      }

      throw error;
    }
  }

  /**
   * Add mint phases to deployed collection (for collections deployed without phases)
   * Note: New deployments automatically include phases in constructor
   */
  async addMintPhasesToCollection(
    collectionAddress: string,
    mintPhases: MintPhase[]
  ): Promise<ethers.TransactionReceipt[]> {
    const signer = await this.getSigner();
    const collection = new Contract(
      collectionAddress,
      NFTCollectionABI,
      signer
    );

    const receipts: ethers.TransactionReceipt[] = [];

    for (const phase of mintPhases) {
      if (!phase.isActive) continue;

      try {
        const startTime = Math.floor(new Date(phase.startTime).getTime() / 1000);
        const endTime = Math.floor(new Date(phase.endTime).getTime() / 1000);
        const price = parseEther(phase.price);
        const merkleRoot = phase.merkleRoot || ZeroHash;
        const paymentType = phase.paymentType === 'ETH' ? 0 : 1;

        console.log(`  Adding phase: ${phase.name} (${formatEther(price)} ETH)`);
        
        const tx = await collection.addMintPhase(
          phase.name,
          phase.description,
          startTime,
          endTime,
          price,
          phase.maxSupply,
          phase.maxPerWallet,
          phase.maxPerTransaction,
          merkleRoot,
          phase.requiresWhitelist,
          paymentType,
          phase.paymentToken || ZeroAddress,
          phase.minimumRaise ? parseEther(phase.minimumRaise) : 0,
          phase.refundEnabled || false,
          {
            gasLimit: 500000
          }
        );
        
        console.log(`  ✅ Phase "${phase.name}" transaction sent: ${tx.hash}`);

        const receipt = await tx.wait();
        receipts.push(receipt);

      } catch (error) {
        console.error(`Error adding mint phase "${phase.name}":`, error);
        throw error;
      }
    }

    return receipts;
  }

  /**
   * Configure platform fees
   */
  async configurePlatformFees(
    collectionAddress: string,
    collectionData: CollectionData
  ): Promise<ethers.TransactionReceipt[]> {
    const signer = await this.getSigner();
    const collection = new Contract(
      collectionAddress,
      NFTCollectionABI,
      signer
    );

    const receipts: ethers.TransactionReceipt[] = [];

    // Set operator filtering
    if (collectionData.operatorFilteringEnabled !== undefined) {
      try {
        const tx = await collection.setOperatorFilteringEnabled(
          collectionData.operatorFilteringEnabled,
          { gasLimit: 200000 }
        );
        const receipt = await tx.wait();
        receipts.push(receipt);
      } catch (error) {
        console.error('Error setting operator filtering:', error);
      }
    }

    // Block operators
    for (const operator of collectionData.blockedOperators) {
      if (operator && isAddress(operator)) {
        try {
          const tx = await collection.setOperatorBlocked(operator, true, {
            gasLimit: 200000
          });
          const receipt = await tx.wait();
          receipts.push(receipt);
        } catch (error) {
          console.error(`Error blocking operator ${operator}:`, error);
        }
      }
    }

    return receipts;
  }

  /**
   * Mint NFTs from active phase
   */
  async mint(
    collectionAddress: string,
    phaseId: number,
    quantity: number,
    merkleProof: string[] = []
  ): Promise<ethers.TransactionReceipt> {
    const signer = await this.getSigner();
    const collection = new Contract(
      collectionAddress,
      NFTCollectionABI,
      signer
    );

    // Calculate mint cost
    const [mintCost, platformFee, totalCost] = await collection.calculateMintCost(
      phaseId,
      quantity
    );

    const tx = await collection.mint(phaseId, quantity, merkleProof, {
      value: totalCost,
      gasLimit: 300000
    });

    return await tx.wait();
  }

  /**
   * Get active mint phases
   */
  async getActiveMintPhases(collectionAddress: string): Promise<any[]> {
    const collection = new Contract(
      collectionAddress,
      NFTCollectionABI,
      this.provider
    );

    return await collection.getActivePhases();
  }

  /**
   * Calculate mint cost including platform fees
   */
  async calculateMintCost(
    collectionAddress: string,
    phaseId: number,
    quantity: number
  ): Promise<{
    mintCost: string;
    platformFee: string;
    totalCost: string;
    isFreeMint: boolean;
  }> {
    const collection = new Contract(
      collectionAddress,
      NFTCollectionABI,
      this.provider
    );

    const [mintCost, platformFee, totalCost, isFreeMint] = await collection.calculateMintCost(
      phaseId,
      quantity
    );

    return {
      mintCost: formatEther(mintCost),
      platformFee: formatEther(platformFee),
      totalCost: formatEther(totalCost),
      isFreeMint
    };
  }

  /**
   * Update collection metadata
   */
  async updateCollectionConfig(
    collectionAddress: string,
    baseURI: string,
    contractURI: string,
    externalLink: string,
    isRevealed: boolean
  ): Promise<ethers.TransactionReceipt> {
    const signer = await this.getSigner();
    const collection = new Contract(
      collectionAddress,
      NFTCollectionABI,
      signer
    );

    const tx = await collection.updateCollectionConfig(
      baseURI,
      contractURI,
      externalLink,
      isRevealed,
      { gasLimit: 200000 }
    );

    return await tx.wait();
  }

  /**
   * Emergency pause/unpause
   */
  async pauseCollection(
    collectionAddress: string,
    pause: boolean
  ): Promise<ethers.TransactionReceipt> {
    const signer = await this.getSigner();
    const collection = new Contract(
      collectionAddress,
      NFTCollectionABI,
      signer
    );

    const tx = pause
      ? await collection.pause({ gasLimit: 100000 })
      : await collection.unpause({ gasLimit: 100000 });

    return await tx.wait();
  }

  /**
   * Withdraw contract balance
   */
  async withdraw(collectionAddress: string): Promise<ethers.TransactionReceipt> {
    const signer = await this.getSigner();
    const collection = new Contract(
      collectionAddress,
      NFTCollectionABI,
      signer
    );

    const tx = await collection.withdraw({ gasLimit: 200000 });
    return await tx.wait();
  }
}

/**
 * Helper function to get NFTCollectionService instance
 */
export function getNFTCollectionService(): NFTCollectionService | null {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  const provider = new BrowserProvider(window.ethereum as any);
  return new NFTCollectionService(provider);
}