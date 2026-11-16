'use client';

import { ContractService } from '@/lib/contract-service';
import { ethers } from 'ethers';

export class EnhancedCollectionService extends ContractService {

  // Enhanced create launchpad with better error handling and validation
  async createCollectionWithValidation(
    chainId: number,
    request: {
      name: string;
      symbol: string;
      description: string;
      baseURI: string;
      unrevealedURI: string;
      contractURI: string;
      externalLink: string;
      totalMaxSupply: number;
      treasury: string;
      royaltyRecipient: string;
      royaltyPercentage: number;
    }
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    contractAddress?: string;
  }> {
    try {
      // Validate inputs
      if (!request.name || !request.symbol) {
        throw new Error('Name and symbol are required');
      }

      if (request.totalMaxSupply <= 0 || request.totalMaxSupply > 1000000) {
        throw new Error('Total supply must be between 1 and 1,000,000');
      }

      if (request.royaltyPercentage < 0 || request.royaltyPercentage > 1000) {
        throw new Error('Royalty percentage must be between 0 and 10%');
      }

      if (!ethers.isAddress(request.treasury)) {
        throw new Error('Invalid treasury address');
      }

      if (!ethers.isAddress(request.royaltyRecipient)) {
        throw new Error('Invalid royalty recipient address');
      }

      // Get contract instance
      const contract = await this.getContract(chainId);

      // Get creation fee
      let creationFee;
      try {
        creationFee = await contract.creationFee();
      } catch (error) {
        console.warn('Could not get creation fee from contract, using default');
        creationFee = ethers.parseEther('0.001');
      }

      console.log('Creating collection with validated data:', request);
      console.log('Creation fee:', ethers.formatEther(creationFee), 'ETH');

      // Check wallet balance
      const signer = await this.getSigner();
      const signerAddress = await signer.getAddress();
      const balance = await signer.provider!.getBalance(signerAddress);

      if (balance < creationFee) {
        throw new Error('Insufficient balance to cover creation fee');
      }

      // Estimate gas
      let gasEstimate;
      try {
        gasEstimate = await contract.createLaunchpad.estimateGas(request, {
          value: creationFee
        });
      } catch (error) {
        console.warn('Gas estimation failed:', error);
        gasEstimate = BigInt(500000); // Default gas limit
      }

      // Execute transaction
      const tx = await contract.createLaunchpad(request, {
        value: creationFee,
        gasLimit: gasEstimate + BigInt(50000) // Add buffer
      });

      console.log('Transaction submitted:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Parse logs to get the contract address
      let contractAddress;
      try {
        const launchpadCreatedEvent = receipt.logs.find((log: any) => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed?.name === 'LaunchpadCreated';
          } catch {
            return false;
          }
        });

        if (launchpadCreatedEvent) {
          const parsed = contract.interface.parseLog(launchpadCreatedEvent);
          contractAddress = parsed?.args?.launchpadAddress;
        }
      } catch (error) {
        console.warn('Could not parse contract address from logs:', error);
      }

      return {
        success: true,
        txHash: tx.hash,
        contractAddress
      };

    } catch (error) {
      console.error('Error creating collection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get comprehensive collection info
  async getCollectionDetails(chainId: number, contractAddress: string) {
    try {
      const contract = await this.getContract(chainId);

      // Get basic info
      const basicInfo = await contract.getLaunchpadInfo(contractAddress);

      // Get additional contract details if the launchpad contract is deployed
      let additionalInfo = {};
      try {
        const provider = await this.getSigner().then(s => s.provider!);
        const launchpadContract = new ethers.Contract(contractAddress, [
          "function name() view returns (string)",
          "function symbol() view returns (string)",
          "function totalSupply() view returns (uint256)",
          "function maxSupply() view returns (uint256)",
          "function owner() view returns (address)",
          "function royaltyInfo(uint256,uint256) view returns (address,uint256)"
        ], provider);

        const [name, symbol, totalSupply, maxSupply, owner] = await Promise.all([
          launchpadContract.name().catch(() => ''),
          launchpadContract.symbol().catch(() => ''),
          launchpadContract.totalSupply().catch(() => BigInt(0)),
          launchpadContract.maxSupply().catch(() => BigInt(0)),
          launchpadContract.owner().catch(() => ''),
        ]);

        additionalInfo = {
          name,
          symbol,
          totalSupply: totalSupply.toString(),
          maxSupply: maxSupply.toString(),
          owner,
          contractAddress
        };
      } catch (error) {
        console.warn('Could not get additional contract info:', error);
      }

      return {
        ...basicInfo,
        ...additionalInfo,
        success: true
      };
    } catch (error) {
      console.error('Error getting collection details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get collection details'
      };
    }
  }

  // Batch operations for multiple collections
  async batchGetCollections(chainId: number, addresses: string[]) {
    const results = await Promise.allSettled(
      addresses.map(address => this.getCollectionDetails(chainId, address))
    );

    return results.map((result, index) => ({
      address: addresses[index],
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  // Factory management functions with better error handling
  async updateCreationFeeWithValidation(chainId: number, newFeeEth: string) {
    try {
      if (parseFloat(newFeeEth) < 0) {
        throw new Error('Fee cannot be negative');
      }

      const contract = await this.getContract(chainId);
      const owner = await contract.owner();
      const signer = await this.getSigner();

      const signerAddress = await signer.getAddress();
      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error('Only contract owner can update creation fee');
      }

      const weiAmount = ethers.parseEther(newFeeEth);
      const tx = await contract.setCreationFee(weiAmount);

      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update creation fee'
      };
    }
  }

  async updatePlatformFeeWithValidation(
    chainId: number,
    percentage: number,
    freeMintFeeEth: string
  ) {
    try {
      if (percentage < 0 || percentage > 1000) {
        throw new Error('Platform fee must be between 0 and 10%');
      }

      if (parseFloat(freeMintFeeEth) < 0) {
        throw new Error('Free mint fee cannot be negative');
      }

      const contract = await this.getContract(chainId);
      const owner = await contract.owner();
      const signer = await this.getSigner();

      const signerAddress = await signer.getAddress();
      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error('Only contract owner can update platform fee');
      }

      const weiAmount = ethers.parseEther(freeMintFeeEth);
      const tx = await contract.setPlatformFee(percentage, weiAmount);

      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update platform fee'
      };
    }
  }

  // Analytics and reporting
  async getFactoryAnalytics(chainId: number) {
    try {
      const factoryInfo = await this.getFactoryInfo(chainId);
      const allLaunchpads = await this.getAllLaunchpads(chainId);

      const analytics = {
        totalCollections: factoryInfo.totalCollections || 0,
        totalVolume: '0', // Would need to calculate from transaction history
        averageRoyalty: 0,
        topCreators: [] as string[],
        recentActivity: [] as any[]
      };

      // Calculate analytics from launchpads data if available
      if (allLaunchpads.length > 0) {
        // Calculate average royalty (if available in data)
        // Extract top creators
        const creatorCounts: Record<string, number> = {};
        allLaunchpads.forEach((lp: any) => {
          if (lp.creator) {
            creatorCounts[lp.creator] = (creatorCounts[lp.creator] || 0) + 1;
          }
        });

        analytics.topCreators = Object.entries(creatorCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([creator]) => creator);
      }

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics'
      };
    }
  }
}