import { ethers, Contract } from 'ethers';
import { SUPPORTED_CHAINS, getChainConfig } from '@/config/chains';
import MasterContractFactoryABI from '../../../abi/OddsLaunchpadFactory.json';
import OddsLaunchpadABI from '../../../abi/OddsLaunchpad.json';
import { prisma } from '@/lib/prisma';
import { createProvider } from '@/lib/provider-helper';

export class BlockchainService {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private contracts: Map<number, Contract> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    Object.values(SUPPORTED_CHAINS).forEach(chain => {
      try {
        const provider = createProvider(chain.id);
        this.providers.set(chain.id, provider);

        if (chain.launchpadFactoryAddress) {
          const contract = new Contract(
            chain.launchpadFactoryAddress,
            MasterContractFactoryABI,
            provider
          );
          this.contracts.set(chain.id, contract);
        }
      } catch (error) {
        console.error(`Failed to initialize provider for chain ${chain.name}:`, error);
      }
    });
  }

  private getProvider(chainId: number): ethers.JsonRpcProvider {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`Provider not found for chain ID: ${chainId}`);
    }
    return provider;
  }

  private getContract(chainId: number): Contract {
    const contract = this.contracts.get(chainId);
    if (!contract) {
      throw new Error(`Contract not found for chain ID: ${chainId}`);
    }
    return contract;
  }

  // Factory Information - Get from database (MasterContractFactory doesn't have getFactoryInfo)
  async getFactoryInfo(chainId: number) {
    try {
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });

      if (!factory) {
        return {
          version: 'Unknown',
          chainId,
          deployedChainId: chainId,
          totalCollections: 0,
          creationFeeAmount: '0',
          treasury: '0x0000000000000000000000000000000000000000',
          owner: '0x0000000000000000000000000000000000000000'
        };
      }

      return {
        version: factory.version || 'Unknown',
        chainId,
        deployedChainId: chainId,
        totalCollections: await prisma.launchpad.count({ where: { chainId } }),
        creationFeeAmount: factory.creationFee || '0',
        treasury: factory.treasury || '0x0000000000000000000000000000000000000000',
        owner: factory.owner || '0x0000000000000000000000000000000000000000'
      };
    } catch (error) {
      console.error('Error getting factory info:', error);
      throw error;
    }
  }

  // MasterContractFactory Functions
  async getNonce(chainId: number): Promise<number> {
    try {
      const contract = this.getContract(chainId);
      const nonce = await contract.getNonce();
      return Number(nonce);
    } catch (error) {
      console.error('Error getting nonce:', error);
      throw error;
    }
  }

  async getTemplateApproved(chainId: number, templateAddress: string): Promise<boolean> {
    try {
      const contract = this.getContract(chainId);
      return await contract.getTemplateApproved(templateAddress);
    } catch (error) {
      console.error('Error checking template approval:', error);
      throw error;
    }
  }

  async getTemplateBytecodeHash(chainId: number, templateAddress: string): Promise<string> {
    try {
      const contract = this.getContract(chainId);
      return await contract.getTemplateBytecodeHash(templateAddress);
    } catch (error) {
      console.error('Error getting template bytecode hash:', error);
      throw error;
    }
  }

  // Factory Details Methods (from database since contract doesn't expose these)
  async getDeployedChainId(chainId: number): Promise<number> {
    return chainId; // The deployed chain ID is the same as the chain ID we're querying
  }

  async getFactoryVersion(chainId: number): Promise<string> {
    try {
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });
      return factory?.version || 'Unknown';
    } catch (error) {
      console.error('Error getting factory version:', error);
      return 'Unknown';
    }
  }

  async getOwner(chainId: number): Promise<string> {
    try {
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });
      return factory?.owner || '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.error('Error getting owner:', error);
      return '0x0000000000000000000000000000000000000000';
    }
  }

  async getPlatformFeePercentage(chainId: number): Promise<number> {
    try {
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });
      return factory?.platformFeePercentage || 0;
    } catch (error) {
      console.error('Error getting platform fee percentage:', error);
      return 0;
    }
  }

  async getPlatformTreasury(chainId: number): Promise<string> {
    try {
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });
      return factory?.treasury || '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.error('Error getting platform treasury:', error);
      return '0x0000000000000000000000000000000000000000';
    }
  }

  async getFreeMintPlatformFee(chainId: number): Promise<string> {
    try {
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });
      return factory?.freeMintFee || '0';
    } catch (error) {
      console.error('Error getting free mint platform fee:', error);
      return '0';
    }
  }

  async getPlatformFeeInfo(chainId: number) {
    try {
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });

      return {
        percentage: factory?.platformFeePercentage || 0,
        freeMintFee: factory?.freeMintFee || '0',
        treasury: factory?.treasury || '0x0000000000000000000000000000000000000000'
      };
    } catch (error) {
      console.error('Error getting platform fee info:', error);
      return {
        percentage: 0,
        freeMintFee: '0',
        treasury: '0x0000000000000000000000000000000000000000'
      };
    }
  }

  async getTotalLaunchpads(chainId: number): Promise<number> {
    try {
      return await prisma.launchpad.count({ where: { chainId } });
    } catch (error) {
      console.error('Error getting total launchpads:', error);
      return 0;
    }
  }

  async getCreationFee(chainId: number): Promise<string> {
    try {
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });
      return factory?.creationFee || '0';
    } catch (error) {
      console.error('Error getting creation fee:', error);
      return '0';
    }
  }

  async getLaunchpadByIndex(chainId: number, index: number): Promise<string> {
    try {
      const launchpads = await prisma.launchpad.findMany({
        where: { chainId },
        orderBy: { createdAt: 'asc' },
        skip: index,
        take: 1,
        select: { contractAddress: true }
      });
      return launchpads[0]?.contractAddress || '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.error('Error getting launchpad by index:', error);
      return '0x0000000000000000000000000000000000000000';
    }
  }

  async getLaunchpadMapping(chainId: number, launchpadAddress: string): Promise<boolean> {
    try {
      const launchpad = await prisma.launchpad.findFirst({
        where: { 
          chainId,
          contractAddress: launchpadAddress
        }
      });
      return !!launchpad;
    } catch (error) {
      console.error('Error getting launchpad mapping:', error);
      return false;
    }
  }

  // Launchpad Management - Get from database (MasterContractFactory doesn't track deployed contracts)
  async getAllLaunchpads(chainId: number): Promise<string[]> {
    try {
      const launchpads = await prisma.launchpad.findMany({
        where: { chainId },
        select: { contractAddress: true }
      });

      return launchpads.map(lp => lp.contractAddress);
    } catch (error) {
      console.error('Error getting all launchpads:', error);
      throw error;
    }
  }

  async getLaunchpadInfo(chainId: number, address: string) {
    try {
      // Get from OddsLaunchpad contract directly
      const provider = this.getProvider(chainId);
      const nftContract = new Contract(
        address,
        OddsLaunchpadABI,
        provider
      );

      // Get collection config
      const config = await nftContract.getCollectionConfig();
      const totalSupply = await nftContract.totalSupply();
      const name = await nftContract.name();
      const symbol = await nftContract.symbol();

      const launchpadData = {
        launchpadAddress: address,
        creator: config.treasury,
        name: config.name || name,
        symbol: config.symbol || symbol,
        createdAt: Date.now(),
        totalSupply: Number(totalSupply),
        royaltyRecipient: config.royaltyRecipient,
        royaltyPercentage: Number(config.royaltyPercentage)
      };

      // Update database
      await this.syncLaunchpadToDatabase(chainId, address, launchpadData);

      return launchpadData;
    } catch (error) {
      console.error('Error getting launchpad info:', error);
      throw error;
    }
  }

  // Database Sync Methods
  private async syncLaunchpadToDatabase(chainId: number, address: string, data?: any) {
    try {
      if (!data) {
        data = await this.getLaunchpadInfo(chainId, address);
      }

      const chain = getChainConfig(chainId);
      if (!chain) {
        throw new Error(`Chain config not found for chain ID: ${chainId}`);
      }

      // Get or create factory
      const factory = await prisma.launchpadFactory.findFirst({
        where: { chainId }
      });

      if (!factory) {
        console.warn(`Factory not found for chain ${chainId}, skipping sync`);
        return;
      }

      // Upsert launchpad
      await prisma.launchpad.upsert({
        where: { contractAddress: address },
        update: {
          name: data.name,
          symbol: data.symbol,
          mintedCount: data.totalSupply,
          royaltyRecipient: data.royaltyRecipient,
          royaltyPercentage: data.royaltyPercentage
        },
        create: {
          chainId,
          factoryId: factory.id,
          contractAddress: address,
          creator: data.creator,
          name: data.name,
          symbol: data.symbol,
          totalMaxSupply: data.totalSupply,
          mintedCount: data.totalSupply,
          treasury: data.creator, // Use creator as treasury fallback
          royaltyRecipient: data.royaltyRecipient,
          royaltyPercentage: data.royaltyPercentage
        }
      });

      console.log(`✅ Synced launchpad ${address} to database`);
    } catch (error) {
      console.error('Error syncing launchpad to database:', error);
    }
  }

  // Event Listening
  async startEventListening(chainId: number) {
    try {
      const contract = this.getContract(chainId);

      // Listen for ContractDeployed events
      contract.on('ContractDeployed', async (contractAddress, template, deployer, nonce) => {
        console.log(`🎉 New contract deployed: ${contractAddress}`);
        await this.syncLaunchpadToDatabase(chainId, contractAddress);
      });

      console.log(`✅ Started event listening for chain ${chainId}`);
    } catch (error) {
      console.error('Error starting event listening:', error);
      throw error;
    }
  }

  async stopEventListening(chainId: number) {
    try {
      const contract = this.getContract(chainId);
      contract.removeAllListeners();
      console.log(`✅ Stopped event listening for chain ${chainId}`);
    } catch (error) {
      console.error('Error stopping event listening:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
