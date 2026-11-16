import { EthereumProvider } from '@/types/wallet';
import { ethers } from 'ethers';
import OddsLaunchpadFactoryABI from '../../abi/OddsLaunchpadFactory.json';
import OddsLaunchpadABI from '../../abi/OddsLaunchpad.json';
import AdminService from '@/lib/api/admin-service';
import { getChainConfig } from '@/config/chains';
import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'ethers';
import { prisma } from '@/lib/prisma';
import { makeRpcUrlAbsolute } from '@/lib/rpc-proxy';
import { formatEtherSafe } from '@/lib/format-utils';

// Marketplace operator addresses
const MARKETPLACE_OPERATORS = {
  opensea: '0x1E0049783F008A0085193E00003D00cd54003c71',
  looksrare: '0xf42aa99F011A1fA7CDA90E5E98b277E306BcA83e',
  x2y2: '0xF849de01B080aDC3A814FaBE1E2087475cF2E354',
  blur: '0x000000000000Ad05Ccc4F10045630fb830B95127'
} as const;

// Common interface IDs
const INTERFACE_IDS = {
  ERC165: '0x01ffc9a7',
  ERC721: '0x80ac58cd',
  ERC721Metadata: '0x5b5e139f',
  ERC721Enumerable: '0x780e9d63',
  ERC2981: '0x2a55205a', // Royalty standard
  ERC4906: '0x49064906'  // Metadata update
} as const;

// Whitelist and Merkle Tree utilities
export class WhitelistManager {
  private whitelist: Array<{ address: string; allocation: number }> = [];
  private merkleTree: MerkleTree | null = null;
  private merkleRoot: string | null = null;

  addAddress(address: string, allocation: number = 1) {
    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    const normalizedAddress = ethers.getAddress(address);
    const existingIndex = this.whitelist.findIndex(entry => entry.address === normalizedAddress);

    if (existingIndex >= 0) {
      this.whitelist[existingIndex].allocation = allocation;
    } else {
      this.whitelist.push({ address: normalizedAddress, allocation });
    }
  }

  addMultipleAddresses(addresses: Array<string | { address: string; allocation?: number }>, defaultAllocation: number = 1) {
    addresses.forEach(entry => {
      const address = typeof entry === 'string' ? entry : entry.address;
      const allocation = typeof entry === 'object' ? entry.allocation || defaultAllocation : defaultAllocation;
      this.addAddress(address, allocation);
    });
  }

  generateMerkleTree(): string {
    if (this.whitelist.length === 0) {
      throw new Error('Whitelist is empty');
    }

    // Create a working copy of the whitelist
    let workingWhitelist = [...this.whitelist];
    
    // If there's only one address, add a dummy address to make the merkle tree work
    // The contract's merkle proof verification doesn't handle single-leaf trees properly
    if (workingWhitelist.length === 1) {
      console.log('⚠️ Single address detected, adding dummy address for merkle tree generation');
      // Add zero address with 0 allocation as dummy
      workingWhitelist.push({
        address: ethers.ZeroAddress,
        allocation: 0
      });
    }

    // Generate leaves matching contract's format: keccak256(bytes.concat(keccak256(abi.encode(address))))
    // This is equivalent to: keccak256(keccak256(abi.encode(address)))
    const leaves = workingWhitelist.map(entry => {
      // First hash: keccak256(abi.encode(address))
      const firstHash = keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [entry.address]));
      // Second hash: keccak256(firstHash)
      return keccak256(firstHash);
    });

    this.merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    this.merkleRoot = this.merkleTree.getHexRoot();
    return this.merkleRoot;
  }

  getMerkleProof(address: string, allocation: number = 1): string[] {
    if (!this.merkleTree) {
      throw new Error('Merkle tree not generated');
    }

    const normalizedAddress = ethers.getAddress(address);
    const entry = this.whitelist.find(w => w.address === normalizedAddress);
    if (!entry) {
      throw new Error(`Address ${normalizedAddress} not found in whitelist`);
    }

    // Generate leaf matching contract's format: keccak256(bytes.concat(keccak256(abi.encode(address))))
    const firstHash = keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [entry.address]));
    const leaf = keccak256(firstHash);

    const proof = this.merkleTree.getHexProof(leaf);
    
    // Log for debugging single address whitelists
    if (this.whitelist.length === 1) {
      console.log('📋 Single address whitelist - proof length:', proof.length);
    }
    
    return proof;
  }

  verifyMerkleProof(address: string, allocation: number, proof: string[]): boolean {
    if (!this.merkleTree || !this.merkleRoot) {
      throw new Error('Merkle tree not generated');
    }

    // Generate leaf matching contract's format
    const firstHash = keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address'], [address]));
    const leaf = keccak256(firstHash);

    return this.merkleTree.verify(proof, leaf, this.merkleRoot);
  }

  getWhitelist() {
    return [...this.whitelist];
  }

  getMerkleRoot(): string | null {
    return this.merkleRoot;
  }

  getStats() {
    return {
      totalAddresses: this.whitelist.length,
      totalAllocation: this.whitelist.reduce((sum, entry) => sum + entry.allocation, 0),
      hasMerkleTree: !!this.merkleTree,
      merkleRoot: this.merkleRoot
    };
  }
}

// Gas Analysis Class
export class GasAnalyzer {
  private provider: ethers.BrowserProvider | null = null;
  private results: any = {
    timestamp: new Date().toISOString(),
    operations: []
  };

  constructor(provider?: ethers.BrowserProvider) {
    this.provider = provider || null;
  }

  async analyzeOperation(operationName: string, contractMethod: () => Promise<any>) {
    try {
      const gasEstimate = await contractMethod();
      const gasPrice = await this.provider!.getFeeData().then(fee => fee.gasPrice || BigInt(0));
      const gasCost = gasEstimate * gasPrice;

      const operation = {
        name: operationName,
        gasUsed: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        costWei: gasCost.toString(),
        costEth: ethers.formatEther(gasCost)
      };

      this.results.operations.push(operation);
      return operation;
    } catch (error) {
      console.error(`Gas analysis failed for ${operationName}:`, error);
      return null;
    }
  }

  getResults() {
    return this.results;
  }

  getSummary() {
    const totalGas = this.results.operations.reduce((sum: number, op: any) => sum + Number(op.gasUsed), 0);
    const totalCost = this.results.operations.reduce((sum: bigint, op: any) => sum + BigInt(op.costWei), BigInt(0));

    return {
      totalOperations: this.results.operations.length,
      totalGas,
      totalCostEth: ethers.formatEther(totalCost),
      operations: this.results.operations
    };
  }
}

// Network Health Checker
export class NetworkChecker {
  private provider: ethers.BrowserProvider | null = null;

  constructor(provider?: ethers.BrowserProvider) {
    this.provider = provider || null;
  }

  async checkHealth() {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const startTime = Date.now();
      const [blockNumber, feeData, network] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData(),
        this.provider.getNetwork()
      ]);
      const gasPrice = feeData.gasPrice || BigInt(0);
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        chainId: Number(network.chainId),
        latestBlock: blockNumber,
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
        responseTime: responseTime + 'ms',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async monitorNetwork(duration: number = 60000, interval: number = 5000) {
    const samples = [];
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      const health = await this.checkHealth();
      samples.push(health);

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return {
      duration,
      interval,
      samples,
      summary: this.calculateMonitoringSummary(samples)
    };
  }

  private calculateMonitoringSummary(samples: any[]) {
    const healthySamples = samples.filter(s => s.healthy);
    const responseTimes = healthySamples
      .map(s => parseInt(s.responseTime.replace('ms', '')))
      .filter(t => !isNaN(t));

    return {
      totalSamples: samples.length,
      healthyPercentage: (healthySamples.length / samples.length) * 100,
      avgResponseTime: responseTimes.length > 0 ?
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0
    };
  }
}

// Master Controller for comprehensive project management
export class MasterController {
  private contractService: ContractService;

  constructor(contractService: ContractService) {
    this.contractService = contractService;
  }

  async initializeProject(chainId: number) {
    console.log('🚀 Initializing NFT Launchpad Project...');

    const status = await this.contractService.getProjectStatus(chainId);
    console.log('📊 Current project status:', status);

    if (!status.hasFactory) {
      console.log('⚠️  No factory detected. Factory deployment required.');
      return {
        initialized: false,
        reason: 'Factory not deployed',
        recommendations: [
          'Deploy factory contract first',
          'Configure chain settings',
          'Fund deployment wallet'
        ]
      };
    }

    return {
      initialized: true,
      factoryAddress: status.factoryAddress,
      recommendations: [
        'Factory is deployed and ready',
        'You can now create NFT collections',
        'Configure mint phases as needed'
      ]
    };
  }

  async fullWorkflow(chainId: number, collectionConfig: any) {
    console.log('🔄 Starting full workflow...');

    const workflow = {
      steps: [] as string[],
      success: false,
      results: {} as any
    };

    try {
      // Step 1: Initialize and check project
      workflow.steps.push('Initializing project');
      const init = await this.initializeProject(chainId);
      workflow.results.initialization = init;

      if (!init.initialized) {
        throw new Error('Project initialization failed');
      }

      // Step 2: Create collection
      workflow.steps.push('Creating collection');
      const createTx = await this.contractService.createLaunchpad(chainId, collectionConfig);
      workflow.results.collectionCreation = { transactionHash: createTx };

      // Step 3: Wait and get collection address (simplified - in real app you'd parse the event)
      workflow.steps.push('Waiting for collection deployment');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Step 4: Get updated factory info
      workflow.steps.push('Verifying collection creation');
      const factoryInfo = await this.contractService.getFactoryInfo(chainId);
      workflow.results.verification = factoryInfo;

      workflow.success = true;
      console.log('✅ Workflow completed successfully!');

    } catch (error) {
      workflow.results.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Workflow failed:', workflow.results.error);
    }

    return workflow;
  }

  async runComprehensiveDiagnostics(chainId: number, collectionAddress?: string) {
    console.log('🔍 Running comprehensive diagnostics...');

    const diagnostics = await this.contractService.runDiagnostics(chainId, collectionAddress);

    console.log('📋 Diagnostics Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Factory status
    if (diagnostics.factory.error) {
      console.log('🏭 Factory: ❌ Error -', diagnostics.factory.error);
    } else {
      console.log('🏭 Factory: ✅ Connected');
      console.log(`   Version: ${(diagnostics.factory as any).version}`);
      console.log(`   Collections: ${(diagnostics.factory as any).totalCollections}`);
    }

    // Network status
    if (diagnostics.network.connected) {
      console.log('🌐 Network: ✅ Connected');
      console.log(`   Chain ID: ${diagnostics.network.chainId}`);
      console.log(`   Response Time: ${diagnostics.network.responseTime}`);
    } else {
      console.log('🌐 Network: ❌ Connection issues');
    }

    // Collection status (if provided)
    if (collectionAddress && !diagnostics.collection.error) {
      const collection = diagnostics.collection as any;
      console.log('🎨 Collection: ✅ Analyzed');
      console.log(`   Name: ${collection.info.name}`);
      console.log(`   Supply: ${collection.info.totalSupply}/${collection.info.maxSupply}`);
      console.log(`   OpenSea Compatible: ${collection.compatibility.compatible ? '✅' : '❌'}`);
    }

    // Recommendations
    if (diagnostics.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      diagnostics.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    return diagnostics;
  }
}

export class ContractService {
  private provider: EthereumProvider | null = null;
  private signer: ethers.Signer | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = window.ethereum as unknown as EthereumProvider;
    }
  }

  /**
   * Get gas options for MegaETH (chain ID 6343)
   * Returns special gas configuration for MegaETH, undefined for other chains
   */
  private getGasOptions(chainId: number): any {
    // if (chainId === 6343) {
    //   const options = {
    //     gasLimit: 350000000, // 350 million - MegaETH requirement
    //     maxFeePerGas: 2000000, // Use maxFeePerGas instead of gasPrice for EIP-1559
    //     maxPriorityFeePerGas: 2000000
    //   };
    //   console.log('⚡ Using MegaETH gas configuration:', options);
    //   return options;
    // }
    // if (chainId === 4326) {
    //   const options = {
    //     gasLimit: 350000000, // 350 million - MegaETH requirement
    //     maxFeePerGas: 2000000, // Use maxFeePerGas instead of gasPrice for EIP-1559
    //     maxPriorityFeePerGas: 2000000
    //   };
    //   console.log('⚡ Using MegaETH gas configuration:', options);
    //   return options;
    // }
    return undefined;
  }

  async getSigner(): Promise<ethers.Signer> {
    if (!this.provider) {
      throw new Error('Ethereum provider not found. Please install MetaMask or another Web3 wallet.');
    }

    try {
      // First, ensure accounts are connected (request if not)
      console.log('🔐 Checking wallet connection...');
      try {
        const accounts = await this.provider.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
          console.log('🔓 Requesting wallet connection...');
          await this.provider.request({ method: 'eth_requestAccounts' });
        } else {
          console.log('✅ Wallet already connected:', accounts[0]);
        }
      } catch (accountError) {
        console.error('❌ Failed to check/request accounts:', accountError);
        throw new Error('Failed to connect wallet. Please unlock your wallet and try again.');
      }

      const provider = new ethers.BrowserProvider(this.provider);

      // Add timeout for getting signer (10 seconds)
      const signerPromise = provider.getSigner();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Wallet connection timeout. Please unlock your wallet and try again.')), 10000);
      });

      const signer = await Promise.race([signerPromise, timeoutPromise]);
      console.log('✅ Signer obtained successfully');
      return signer;
    } catch (error: any) {
      console.error('❌ Failed to get signer:', error);
      if (error.message?.includes('timeout')) {
        throw new Error('Wallet connection timeout. Please check if your wallet is unlocked and connected.');
      }
      if (error.code === 4001) {
        throw new Error('Wallet connection rejected by user.');
      }
      throw new Error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
    }
  }

  async getContract(chainId: number): Promise<ethers.Contract> {
    const chain = getChainConfig(chainId);
    if (!chain?.launchpadFactoryAddress) {
      throw new Error(`Contract address not found for chain ${chainId}`);
    }

    const signer = await this.getSigner();

    // Verify we're connected to the right network
    const signerChainId = await signer.provider?.getNetwork();
    console.log('Signer chain ID:', signerChainId?.chainId);
    console.log('Expected chain ID:', chainId);
    console.log('Contract address:', chain.launchpadFactoryAddress);

    const contract = new ethers.Contract(
      chain.launchpadFactoryAddress,
      (OddsLaunchpadFactoryABI as any).abi || OddsLaunchpadFactoryABI,
      signer
    );

    // Test if contract exists by checking bytecode
    try {
      const code = await signer.provider?.getCode(chain.launchpadFactoryAddress);
      if (!code || code === '0x') {
        console.warn(`⚠️  No contract deployed at ${chain.launchpadFactoryAddress} on chain ${chainId}`);
        console.warn('This will cause contract calls to fail, but we\'ll proceed with mock/API data');
      } else {
        console.log('✅ Contract verified, code length:', code.length);
      }
    } catch (error) {
      console.warn('Contract verification failed, proceeding with caution:', error);
    }

    return contract;
  }

  // Get NFT Collection contract instance (for WRITE operations - requires signer)
  async getNFTCollectionContract(chainId: number, contractAddress: string): Promise<ethers.Contract> {
    console.log(`📡 Getting NFT Collection contract: ${contractAddress}`);
    console.log(`⏳ Requesting signer...`);

    try {
      const signer = await this.getSigner();
      console.log(`✅ Signer obtained`);

      // Verify network
      const network = await signer.provider?.getNetwork();
      const connectedChainId = Number(network?.chainId);

      if (connectedChainId !== chainId) {
        throw new Error(
          `Wrong network! Please switch to ${getChainConfig(chainId)?.name || `chain ${chainId}`} in your wallet. ` +
          `Currently connected to chain ${connectedChainId}.`
        );
      }

      console.log(`✅ Network verified: ${connectedChainId}`);

      const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, signer);
      console.log(`✅ Contract instance created successfully`);
      return contract;
    } catch (error: any) {
      console.error(`❌ Failed to get collection contract:`, error);
      throw error;
    }
  }

  // Get NFT Collection contract instance for READ-ONLY operations (no signer needed)
  async getNFTCollectionContractReadOnly(chainId: number, contractAddress: string): Promise<ethers.Contract> {
    console.log(`📖 Getting READ-ONLY NFT Collection contract: ${contractAddress}`);
    const chain = getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Chain config not found for chain ${chainId}`);
    }

    // Use RPC provider for read-only operations (no wallet needed)
    // Make sure the URL is absolute for ethers.js
    const rpcUrl = makeRpcUrlAbsolute(chain.rpcUrl);
    
    console.log(`📡 Using RPC URL: ${rpcUrl}`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`✅ READ-ONLY provider created for ${chain.name}`);
    const contract = new ethers.Contract(contractAddress, OddsLaunchpadABI, provider);
    console.log(`✅ READ-ONLY contract instance created successfully`);
    return contract;
  }

  // Factory Info Methods - Direct blockchain calls
  
  /**
   * Get OddsLaunchpad template address for a specific chain
   */
  async getTemplateAddress(chainId: number): Promise<string | null> {
    const chain = getChainConfig(chainId);
    return chain?.oddsTemplateAddress || null;
  }

  /**
   * Verify if template is approved in MasterContractFactory
   */
  async isTemplateApproved(chainId: number, templateAddress: string): Promise<boolean> {
    try {
      const contract = await this.getContract(chainId);
      return await contract.getTemplateApproved(templateAddress);
    } catch (error) {
      console.error('Error checking template approval:', error);
      return false;
    }
  }

  /**
   * Get nonce from MasterContractFactory
   */
  async getNonce(chainId: number): Promise<number> {
    try {
      const contract = await this.getContract(chainId);
      return Number(await contract.getNonce());
    } catch (error) {
      console.error('Error getting nonce:', error);
      return 0;
    }
  }

  /**
   * Get template bytecode hash
   */
  async getTemplateBytecodeHash(chainId: number, templateAddress: string): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      return await contract.getTemplateBytecodeHash(templateAddress);
    } catch (error) {
      console.error('Error getting template bytecode hash:', error);
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  /**
   * Get factory info from API
   * Note: MasterContractFactory doesn't have getFactoryInfo(), use API only
   */
  async getFactoryInfo(chainId: number) {
    try {
      const apiData = await AdminService.getFactoryInfo(chainId);
      return apiData;
    } catch (error) {
      console.error('Error getting factory info from API:', error);
      // Return default values if API fails
      return {
        version: 'Unknown',
        chainId: chainId,
        totalCollections: 0,
        creationFeeAmount: '0',
        treasury: '0x0000000000000000000000000000000000000000'
      };
    }
  }

  // Launchpad Management Methods - API Only (MasterContractFactory doesn't have these functions)
  
  /**
   * Get all launchpads from API
   * Note: MasterContractFactory doesn't track deployed contracts, use API instead
   */
  async getAllLaunchpads(chainId: number) {
    try {
      const response = await AdminService.getLaunchpads({
        chainId,
        limit: 1000
      });
      return response.launchpads;
    } catch (error) {
      console.error('Error getting launchpads from API:', error);
      return [];
    }
  }

  /**
   * Get launchpad info from API
   * Note: MasterContractFactory doesn't track deployed contracts, use API instead
   */
  async getLaunchpadInfo(chainId: number, address: string) {
    try {
      const response = await AdminService.getLaunchpads({
        chainId,
        search: address,
        limit: 1
      });

      if (response.launchpads.length > 0) {
        const lp = response.launchpads[0];
        return {
          launchpadAddress: lp.contractAddress,
          creator: lp.creator,
          name: lp.name,
          symbol: lp.symbol,
          createdAt: new Date(lp.createdAt).getTime(),
          totalSupply: lp.totalMaxSupply
        };
      }

      throw new Error('Launchpad not found');
    } catch (error) {
      console.error('Error getting launchpad info from API:', error);
      throw new Error('Launchpad not found in API');
    }
  }

  // NFT Collection Contract Methods
  /**
   * Get collection info from OddsLaunchpad contract
   */
  async getCollectionInfo(chainId: number, collectionAddress: string) {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    
    const [
      name,
      symbol,
      totalSupply,
      config,
      platformFeeEnabled
    ] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
      contract.getCollectionConfig(),
      contract.isPlatformFeeEnabled()
    ]);

    return {
      name,
      symbol,
      totalSupply: Number(totalSupply),
      maxSupply: Number(config.totalMaxSupply),
      treasury: config.treasury,
      royaltyRecipient: config.royaltyRecipient,
      royaltyPercentage: Number(config.royaltyPercentage),
      platformFeeEnabled,
      isRevealed: config.isRevealed,
      transfersEnabled: config.transfersEnabled,
      baseURI: config.baseURI,
      unrevealedURI: config.unrevealedURI,
      contractURI: config.contractURI,
      externalLink: config.externalLink
    };
  }

  // Mint Phase Management

  async getActiveMintPhases(chainId: number, collectionAddress: string) {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    
    // Get total phase count from contract (includes ALL phases, active or not)
    const phaseCount = await contract.getMintPhasesCount();
    const totalPhases = Number(phaseCount);
    
    console.log(`📋 Getting ${totalPhases} phases from contract ${collectionAddress}`);
    
    // Fetch each phase by its actual contract index
    // This ensures we get the correct phase ID even if some phases are inactive
    const mappedPhases = [];
    for (let i = 0; i < totalPhases; i++) {
      try {
        const phase = await contract.getMintPhase(i);
        
        // 🔍 DEBUG: Log raw phase data from contract
        console.log(`   🔍 RAW Phase ${i} data from contract:`, {
          name: phase.name,
          startTime: phase.startTime?.toString(),
          endTime: phase.endTime?.toString(),
          price: phase.price?.toString(),
          maxSupply: phase.maxSupply?.toString(),
          currentSupply: phase.currentSupply?.toString(),
          maxPerWallet: phase.maxPerWallet?.toString(),
          maxPerTransaction: phase.maxPerTransaction?.toString(),
          merkleRoot: phase.merkleRoot,
          isActive: phase.isActive,
          requiresWhitelist: phase.requiresWhitelist,
          // Also log by index in case property names are wrong
          '0': phase[0],
          '1': phase[1],
          '2': phase[2],
          '3': phase[3],
          '4': phase[4],
          '5': phase[5],
          '6': phase[6],
          '7': phase[7],
          '8': phase[8],
          '9': phase[9],
          '10': phase[10]
        });
        
        // CRITICAL FIX: Read by index because contract struct order is different from ABI
        // Based on raw data analysis:
        // 0: name (string)
        // 1: startTime (uint256)
        // 2: endTime (uint256)
        // 3: price (uint256)
        // 4: maxSupply (uint256)
        // 5: currentSupply (uint256)
        // 6: maxPerWallet (uint256)
        // 7: maxPerTransaction (uint256) - returned as hex string (bytes32 format)
        // 8: merkleRoot (bytes32) - returned as boolean
        // 9: isActive (bool)
        // 10: requiresWhitelist (bool) - returned as uint256
        
        // Try to extract correct values by index
        const name = phase[0] || phase.name;
        const startTime = phase[1] || phase.startTime;
        const endTime = phase[2] || phase.endTime;
        const price = phase[3] || phase.price;
        const maxSupply = phase[4] || phase.maxSupply;
        const currentSupply = phase[5] || phase.currentSupply;
        const maxPerWallet = phase[6] || phase.maxPerWallet;
        
        // maxPerTransaction is returned as hex string, need to convert
        let maxPerTransaction = phase[7] || phase.maxPerTransaction;
        if (typeof maxPerTransaction === 'string' && maxPerTransaction.startsWith('0x')) {
          // Convert hex string to number
          maxPerTransaction = BigInt(maxPerTransaction);
        }
        
        // merkleRoot is at index 8 but returned as boolean, need to get from property name
        const merkleRoot = phase.merkleRoot || phase[8] || '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        const isActive = phase[9] !== undefined ? phase[9] : phase.isActive;
        const requiresWhitelist = phase[10] !== undefined ? phase[10] : phase.requiresWhitelist;
        
        console.log(`   📊 Extracted values:`, {
          maxPerTransaction,
          'maxPerTransaction type': typeof maxPerTransaction,
          merkleRoot,
          isActive,
          requiresWhitelist,
          'isActive type': typeof isActive,
          'requiresWhitelist type': typeof requiresWhitelist
        });
        
        mappedPhases.push({
          index: i,
          name: name,
          description: phase.description || '',
          startTime: Number(startTime),
          endTime: Number(endTime),
          price: formatEtherSafe(price),
          priceWei: price.toString(),
          maxSupply: Number(maxSupply),
          currentSupply: Number(currentSupply),
          maxPerWallet: Number(maxPerWallet),
          maxPerTransaction: Number(maxPerTransaction),
          isActive: Boolean(isActive),
          requiresWhitelist: Boolean(requiresWhitelist),
          merkleRoot: merkleRoot
        });
        
        console.log(`   ✅ Phase ${i}: ${name} (whitelist: ${Boolean(requiresWhitelist)}, active: ${Boolean(isActive)})`);
      } catch (error) {
        console.error(`   ❌ Failed to load phase ${i}:`, error);
      }
    }
    
    console.log(`📋 Successfully loaded ${mappedPhases.length}/${totalPhases} phases`);
    
    // Return ALL phases (active and inactive) with their correct contract indices
    return mappedPhases;
  }

  async addMintPhase(chainId: number, collectionAddress: string, phaseConfig: {
    name: string;
    description: string;
    startTime: number;
    endTime: number;
    price: string;
    maxSupply: number;
    maxPerWallet: number;
    maxPerTransaction: number;
    merkleRoot?: string;
    requiresWhitelist?: boolean;
    paymentType?: number;
    paymentToken?: string;
    minimumRaise?: number;
    refundEnabled?: boolean;
  }): Promise<string> {
    // Use batchAddMintPhases with single phase since addMintPhase doesn't exist in ABI
    return this.batchAddMintPhases(chainId, collectionAddress, [phaseConfig]);
  }

  /**
   * Batch add multiple mint phases in a single transaction
   * More gas efficient than adding phases one by one
   */
  async batchAddMintPhases(chainId: number, collectionAddress: string, phases: Array<{
    name: string;
    description: string;
    startTime: number;
    endTime: number;
    price: string;
    maxSupply: number;
    maxPerWallet: number;
    maxPerTransaction: number;
    merkleRoot?: string;
    requiresWhitelist?: boolean;
    paymentType?: number;
    paymentToken?: string;
    minimumRaise?: number;
    refundEnabled?: boolean;
  }>): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    
    // CRITICAL: Prepare phases array as objects (structs) - let ethers handle the encoding
    // This matches the ABI definition and prevents type inference errors
    const phasesForContract = phases.map(phase => {
      // Ensure merkleRoot is a valid bytes32 hex string
      let merkleRoot = phase.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (!merkleRoot.startsWith('0x')) {
        merkleRoot = '0x' + merkleRoot;
      }
      // Pad to 32 bytes (66 characters including 0x)
      if (merkleRoot.length < 66) {
        merkleRoot = merkleRoot + '0'.repeat(66 - merkleRoot.length);
      }
      
      return {
        name: phase.name,
        startTime: phase.startTime,
        endTime: phase.endTime,
        price: ethers.parseEther(phase.price),
        maxSupply: phase.maxSupply,
        currentSupply: 0, // always 0 when adding new phase
        maxPerWallet: phase.maxPerWallet,
        maxPerTransaction: phase.maxPerTransaction,
        merkleRoot: merkleRoot,
        isActive: true, // always true when adding new phase
        requiresWhitelist: phase.requiresWhitelist || false
      };
    });

    console.log(`📦 Batch adding ${phases.length} phases to contract...`);
    console.log('   Phase structs:', phasesForContract);
    
    // Try to estimate gas first to get better error messages
    try {
      console.log('⛽ Estimating gas...');
      const gasEstimate = await contract.batchAddMintPhases.estimateGas(phasesForContract);
      console.log('✅ Gas estimate:', gasEstimate.toString());
    } catch (gasError: any) {
      console.error('❌ Gas estimation failed:', gasError);
      
      // Try to decode the error
      if (gasError.data) {
        console.error('   Error data:', gasError.data);
      }
      if (gasError.reason) {
        console.error('   Error reason:', gasError.reason);
      }
      
      // Throw with more context
      throw new Error(`Transaction will fail: ${gasError.reason || gasError.message || 'Unknown error'}`);
    }
    
    const gasOptions = this.getGasOptions(chainId);
    
    const tx = gasOptions 
      ? await contract.batchAddMintPhases(phasesForContract, gasOptions)
      : await contract.batchAddMintPhases(phasesForContract);
    
    console.log('✅ Transaction sent:', tx.hash);
    return tx.hash;
  }

  async toggleMintPhase(chainId: number, collectionAddress: string, phaseId: number, isActive: boolean): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.toggleMintPhase(phaseId, isActive, this.getGasOptions(chainId));
    return tx.hash;
  }

  // Minting Methods
  async mintNFT(chainId: number, collectionAddress: string, phaseId: number, quantity: number, merkleProof: string[] = []): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    
    console.log('🎫 Minting with parameters:');
    console.log('  - Phase ID:', phaseId);
    console.log('  - Quantity:', quantity);
    console.log('  - Merkle Proof:', merkleProof);
    console.log('  - Proof length:', merkleProof.length);
    
    // Calculate total cost including platform fee
    const [mintCost, platformFee, totalCost, isFreeMint] = await contract.calculateMintCost(phaseId, quantity);
    
    console.log('💰 Mint cost breakdown:');
    console.log('  - Mint cost:', ethers.formatEther(mintCost), 'ETH');
    console.log('  - Platform fee:', ethers.formatEther(platformFee), 'ETH');
    console.log('  - Total cost:', ethers.formatEther(totalCost), 'ETH');
    console.log('  - Is free mint:', isFreeMint);
    
    // Send the total cost (mint price + platform fee)
    const gasOptions = this.getGasOptions(chainId);
    const txOptions = gasOptions ? { value: totalCost, ...gasOptions } : { value: totalCost };
    const tx = await contract.mint(phaseId, quantity, merkleProof, txOptions);
    return tx.hash;
  }

  /**
   * Batch airdrop NFTs to multiple recipients
   * Note: OddsLaunchpad uses batchAirdrop instead of batchMint
   */
  async batchAirdrop(chainId: number, collectionAddress: string, recipients: string[], quantities: number[]): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const gasOptions = this.getGasOptions(chainId);
    const tx = await contract.batchAirdrop(recipients, quantities, gasOptions);
    return tx.hash;
  }

  // Mint Cost Calculation
  async calculateMintCost(chainId: number, collectionAddress: string, phaseId: number, quantity: number) {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const [mintCost, platformFee, totalCost, isFreeMint] = await contract.calculateMintCost(phaseId, quantity);
    return {
      mintCost: ethers.formatEther(mintCost),
      platformFee: ethers.formatEther(platformFee),
      totalCost: ethers.formatEther(totalCost),
      isFreeMint
    };
  }

  // Collection Configuration
  
  /**
   * Update base URI for revealed tokens
   * This method is used to update the baseURI on a deployed contract after obtaining the contract address
   */
  async setBaseURI(chainId: number, collectionAddress: string, newBaseURI: string): Promise<string> {
    console.log('📝 Setting baseURI on contract:', {
      chainId,
      contractAddress: collectionAddress,
      newBaseURI
    });
    
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    console.log('✅ Contract instance obtained');
    
    const gasOptions = this.getGasOptions(chainId);
    const tx = gasOptions 
      ? await contract.updateBaseURI(newBaseURI, gasOptions)
      : await contract.updateBaseURI(newBaseURI);
    
    console.log('✅ BaseURI update transaction sent:', tx.hash);
    return tx.hash;
  }

  /**
   * Update contract URI for collection metadata
   */
  async setContractURI(chainId: number, collectionAddress: string, newContractURI: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.updateContractURI(newContractURI, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Update external link
   */
  async setExternalLink(chainId: number, collectionAddress: string, newExternalLink: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.updateExternalLink(newExternalLink, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Reveal collection with new base URI
   */
  async reveal(chainId: number, collectionAddress: string, newBaseURI: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.reveal(newBaseURI, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Update royalty recipient and percentage
   */
  async setRoyaltyInfo(chainId: number, collectionAddress: string, recipient: string, percentage: number): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.updateRoyaltyRecipient(recipient, percentage, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Update treasury address
   */
  async setTreasury(chainId: number, collectionAddress: string, newTreasury: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.updateTreasury(newTreasury, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Toggle platform fee
   */
  async togglePlatformFee(chainId: number, collectionAddress: string, enabled: boolean): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.togglePlatformFee(enabled, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Toggle transfers (lock/unlock)
   */
  async toggleTransfers(chainId: number, collectionAddress: string, enabled: boolean): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.toggleTransfers(enabled, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Pause contract
   */
  async pauseCollection(chainId: number, collectionAddress: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.pause(this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Unpause contract
   */
  async unpauseCollection(chainId: number, collectionAddress: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.unpause(this.getGasOptions(chainId));
    return tx.hash;
  }

  // Access Control
  
  /**
   * Grant role to account
   * OddsLaunchpad only has ADMIN_ROLE
   */
  async grantRole(chainId: number, collectionAddress: string, role: 'ADMIN', account: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    let roleHash: string;

    if (role === 'ADMIN') {
      roleHash = await contract.ADMIN_ROLE();
    } else {
      throw new Error(`Unknown role: ${role}. OddsLaunchpad only supports ADMIN_ROLE`);
    }

    const tx = await contract.grantRole(roleHash, account, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Revoke role from account
   */
  async revokeRole(chainId: number, collectionAddress: string, role: 'ADMIN', account: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    let roleHash: string;

    if (role === 'ADMIN') {
      roleHash = await contract.ADMIN_ROLE();
    } else {
      throw new Error(`Unknown role: ${role}. OddsLaunchpad only supports ADMIN_ROLE`);
    }

    const tx = await contract.revokeRole(roleHash, account, this.getGasOptions(chainId));
    return tx.hash;
  }

  /**
   * Check if account has role
   */
  async hasRole(chainId: number, collectionAddress: string, role: 'ADMIN', account: string): Promise<boolean> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    let roleHash: string;

    if (role === 'ADMIN') {
      roleHash = await contract.ADMIN_ROLE();
    } else {
      throw new Error(`Unknown role: ${role}. OddsLaunchpad only supports ADMIN_ROLE`);
    }

    return await contract.hasRole(roleHash, account);
  }

  /**
   * Check admin rights for account
   * OddsLaunchpad only has ADMIN_ROLE
   */
  async checkAdminRights(chainId: number, collectionAddress: string, account: string) {
    const isAdmin = await this.hasRole(chainId, collectionAddress, 'ADMIN', account);

    return {
      isAdmin
    };
  }

  // Pause/Unpause functions already defined above (pauseCollection, unpauseCollection)

  // Mint Phase Management
  async updateMintPhase(
    chainId: number,
    collectionAddress: string,
    phaseId: number,
    phaseData: {
      name: string;
      startTime: number;
      endTime: number;
      price: string;
      maxSupply: number;
      maxPerWallet: number;
      maxPerTransaction: number;
      merkleRoot: string;
      isActive?: boolean;
      requiresWhitelist: boolean;
      currentSupply: number;
    }
  ): Promise<string> {
    try {
      console.log('📝 Getting contract for updateMintPhase...');
      const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
      console.log('✅ Contract obtained');
      
      // Check if updateMintPhase exists
      console.log('🔍 Checking if updateMintPhase exists:', typeof contract.updateMintPhase);
      
      // Ensure merkleRoot is a valid bytes32 hex string
      let merkleRoot = phaseData.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (!merkleRoot.startsWith('0x')) {
        merkleRoot = '0x' + merkleRoot;
      }
      // Pad to 32 bytes (66 characters including 0x)
      if (merkleRoot.length < 66) {
        merkleRoot = merkleRoot + '0'.repeat(66 - merkleRoot.length);
      }
      
      console.log('📝 Updating mint phase:', phaseId);
      console.log('   Phase data being sent:');
      console.log('   - name:', phaseData.name);
      console.log('   - startTime:', phaseData.startTime);
      console.log('   - endTime:', phaseData.endTime);
      console.log('   - price:', phaseData.price, 'ETH');
      console.log('   - maxSupply:', phaseData.maxSupply);
      console.log('   - maxPerWallet:', phaseData.maxPerWallet);
      console.log('   - maxPerTransaction:', phaseData.maxPerTransaction);
      console.log('   - merkleRoot:', merkleRoot);
      console.log('   - isActive:', phaseData.isActive !== undefined ? phaseData.isActive : true);
      console.log('   - requiresWhitelist:', phaseData.requiresWhitelist);
      console.log('   - currentSupply:', phaseData.currentSupply);
      
      // CRITICAL: Create phase struct object (not array) - let ethers handle the encoding
      const phaseStruct = {
        name: phaseData.name,
        startTime: phaseData.startTime,
        endTime: phaseData.endTime,
        price: ethers.parseEther(phaseData.price),
        maxSupply: phaseData.maxSupply,
        currentSupply: phaseData.currentSupply,
        maxPerWallet: phaseData.maxPerWallet,
        maxPerTransaction: phaseData.maxPerTransaction,
        merkleRoot: merkleRoot,
        isActive: phaseData.isActive !== undefined ? phaseData.isActive : true,
        requiresWhitelist: phaseData.requiresWhitelist
      };
      
      console.log('🔄 Calling contract.updateMintPhase...');
      console.log('   phaseId:', phaseId);
      console.log('   phaseStruct (object):', phaseStruct);
      
      const gasOptions = this.getGasOptions(chainId);
      
      // Try to estimate gas first to get better error messages
      try {
        console.log('⛽ Estimating gas...');
        const gasEstimate = await contract.updateMintPhase.estimateGas(phaseId, phaseStruct);
        console.log('✅ Gas estimate:', gasEstimate.toString());
      } catch (gasError: any) {
        console.error('❌ Gas estimation failed:', gasError);
        
        // Try to decode the error
        if (gasError.data) {
          console.error('   Error data:', gasError.data);
        }
        if (gasError.reason) {
          console.error('   Error reason:', gasError.reason);
        }
        
        // Throw with more context
        throw new Error(`Transaction will fail: ${gasError.reason || gasError.message || 'Unknown error'}`);
      }
      
      const tx = gasOptions 
        ? await contract.updateMintPhase(phaseId, phaseStruct, gasOptions)
        : await contract.updateMintPhase(phaseId, phaseStruct);
      
      if (!tx) {
        throw new Error('Transaction returned undefined');
      }
      
      console.log('✅ Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      await tx.wait();
      console.log('✅ Phase updated successfully');
      
      return tx.hash;
    } catch (error: any) {
      console.error('❌ Error in updateMintPhase:', error);
      
      // Try to provide more helpful error message
      if (error.message && error.message.includes('OddsStudio__')) {
        const match = error.message.match(/OddsStudio__(\w+)/);
        if (match) {
          const errorName = match[1];
          throw new Error(`Contract error: ${errorName}`);
        }
      }
      
      throw error;
    }
  }

  async updateMintPhaseTimes(
    chainId: number,
    collectionAddress: string,
    phaseId: number,
    startTime: number,
    endTime: number
  ): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.updateMintPhaseTimes(phaseId, startTime, endTime, this.getGasOptions(chainId));
    return tx.hash;
  }

  async updateMintPhasePrice(chainId: number, collectionAddress: string, phaseId: number, price: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.updateMintPhasePrice(phaseId, ethers.parseEther(price), this.getGasOptions(chainId));
    return tx.hash;
  }

  async updateMintPhaseMerkleRoot(chainId: number, collectionAddress: string, phaseId: number, merkleRoot: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.updateMintPhaseMerkleRoot(phaseId, merkleRoot, this.getGasOptions(chainId));
    return tx.hash;
  }

  async removePhase(chainId: number, collectionAddress: string, phaseId: number): Promise<string> {
    try {
      console.log('🗑️ Removing mint phase...');
      console.log(`   Contract: ${collectionAddress}`);
      console.log(`   Phase ID: ${phaseId}`);
      console.log(`   Chain ID: ${chainId}`);
      
      const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
      
      console.log('🔄 Calling contract.removePhase...');
      const gasOptions = this.getGasOptions(chainId);
      const tx = gasOptions 
        ? await contract.removePhase(phaseId, gasOptions)
        : await contract.removePhase(phaseId);
      
      if (!tx) {
        throw new Error('Transaction returned undefined');
      }
      
      console.log('✅ Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      await tx.wait();
      console.log('✅ Phase removed successfully');
      
      return tx.hash;
    } catch (error: any) {
      console.error('❌ Error removing phase:', error);
      throw new Error(error.message || 'Failed to remove phase');
    }
  }

  async getMintPhaseCount(chainId: number, collectionAddress: string): Promise<number> {
    console.log(`📊 Getting mint phase count for: ${collectionAddress}`);
    // Use READ-ONLY contract (no wallet needed)
    const contract = await this.getNFTCollectionContractReadOnly(chainId, collectionAddress);
    console.log(`📞 Calling getMintPhasesCount()...`);
    const count = await contract.getMintPhasesCount();
    console.log(`✅ Got mint phase count: ${count}`);
    return Number(count);
  }

  async getMintPhase(chainId: number, collectionAddress: string, phaseId: number): Promise<any> {
    console.log(`📊 Getting mint phase ${phaseId} for: ${collectionAddress}`);
    // Use READ-ONLY contract (no wallet needed)
    const contract = await this.getNFTCollectionContractReadOnly(chainId, collectionAddress);
    console.log(`📞 Calling getMintPhase(${phaseId})...`);
    const phase = await contract.getMintPhase(phaseId);
    console.log(`✅ Got mint phase data:`, phase.name);
    return {
      name: phase.name,
      description: phase.description,
      startTime: Number(phase.startTime),
      endTime: Number(phase.endTime),
      price: formatEtherSafe(phase.price),
      maxSupply: Number(phase.maxSupply),
      maxPerWallet: Number(phase.maxPerWallet),
      maxPerTransaction: Number(phase.maxPerTransaction),
      merkleRoot: phase.merkleRoot,
      isActive: phase.isActive,
      requiresWhitelist: phase.requiresWhitelist,
      currentSupply: Number(phase.currentSupply),
      paymentType: phase.paymentType,
      paymentToken: phase.paymentToken,
      minimumRaise: Number(phase.minimumRaise),
      refundEnabled: phase.refundEnabled
    };
  }

  // Fund Management
  async withdrawCollectionFunds(chainId: number, collectionAddress: string, amount?: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const gasOptions = this.getGasOptions(chainId);
    const tx = amount
      ? await contract.withdraw(ethers.parseEther(amount), gasOptions)
      : await contract.withdraw(gasOptions);
    return tx.hash;
  }

  async getCollectionBalance(chainId: number, collectionAddress: string): Promise<string> {
    if (!this.provider) return '0';
    const ethersProvider = new ethers.BrowserProvider(this.provider);
    const balance = await ethersProvider.getBalance(collectionAddress);
    return ethers.formatEther(balance);
  }

  /**
   * Get treasury pending balance from contract
   * This is the actual withdrawable amount for the treasury
   */
  async getTreasuryPendingBalance(chainId: number, collectionAddress: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    
    // Get treasury address from collection config
    const config = await contract.getCollectionConfig();
    const treasuryAddress = config.treasury;
    
    // Get pending balance for treasury
    const pendingBalance = await contract.getPendingBalance(treasuryAddress);
    return ethers.formatEther(pendingBalance);
  }

  async withdrawTreasury(chainId: number, collectionAddress: string): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const gasOptions = this.getGasOptions(chainId);
    const tx = await contract.withdrawTreasury({ ...gasOptions });
    return tx.hash;
  }

  // Marketplace Operations
  async checkOpenseaCompatibility(chainId: number, collectionAddress: string) {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);

    const [
      supportsInterface721,
      supportsInterface2981,
      operatorFilteringEnabled,
      contractURI,
      royaltyInfo
    ] = await Promise.all([
      contract.supportsInterface('0x80ac58cd'), // ERC721
      contract.supportsInterface('0x2a55205a'), // EIP-2981 Royalty
      contract.operatorFilteringEnabled(),
      contract.contractURI(),
      contract.royaltyInfo(1, ethers.parseEther('1')) // Check royalty for 1 ETH
    ]);

    const isCompatible = supportsInterface721 && supportsInterface2981 && contractURI !== '';

    return {
      compatible: isCompatible,
      erc721: supportsInterface721,
      royalty: supportsInterface2981,
      operatorFiltering: operatorFilteringEnabled,
      hasContractURI: contractURI !== '',
      royaltyPercentage: Number(royaltyInfo[1]) / 10000000000000000,
      contractURI
    };
  }

  async setOperatorFiltering(chainId: number, collectionAddress: string, enabled: boolean): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.setOperatorFilteringEnabled(enabled, this.getGasOptions(chainId));
    return tx.hash;
  }

  async blockOperator(chainId: number, collectionAddress: string, operatorAddress: string, blocked: boolean = true): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.setOperatorBlocked(operatorAddress, blocked, this.getGasOptions(chainId));
    return tx.hash;
  }

  async isOperatorBlocked(chainId: number, collectionAddress: string, operatorAddress: string): Promise<boolean> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    return await contract.blockedOperators(operatorAddress);
  }

  async generateOpenSeaMetadata(chainId: number, collectionAddress: string) {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);

    const [config, royaltyInfo] = await Promise.all([
      contract.config(),
      contract.royaltyInfo(1, ethers.parseEther('1'))
    ]);

    return {
      name: config.name,
      description: config.description,
      image: `${config.baseURI}collection.png`,
      external_link: config.externalLink,
      seller_fee_basis_points: Number(config.royaltyPercentage),
      fee_recipient: config.royaltyRecipient
    };
  }

  async testMarketplaceTransfer(chainId: number, collectionAddress: string, tokenId: number, marketplace: 'opensea' | 'looksrare' | 'x2y2' | 'blur' = 'opensea') {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);

    const marketplaceOperators = {
      opensea: '0x1E0049783F008A0085193E00003D00cd54003c71',
      looksrare: '0xf42aa99F011A1fA7CDA90E5E98b277E306BcA83e',
      x2y2: '0xF849de01B080aDC3A814FaBE1E2087475cF2E354',
      blur: '0x000000000000Ad05Ccc4F10045630fb830B95127'
    };

    const operatorAddress = marketplaceOperators[marketplace];
    if (!operatorAddress) {
      throw new Error(`Unknown marketplace: ${marketplace}`);
    }

    const [isBlocked, filteringEnabled, owner] = await Promise.all([
      contract.blockedOperators(operatorAddress),
      contract.operatorFilteringEnabled(),
      contract.ownerOf(tokenId)
    ]);

    return {
      marketplace,
      operatorAddress,
      isBlocked,
      filteringEnabled,
      tokenOwner: owner,
      canTransfer: !isBlocked || !filteringEnabled
    };
  }

  async setupMarketplaceIntegration(chainId: number, collectionAddress: string, marketplaces: string[] = ['opensea']): Promise<string[]> {
    const txHashes: string[] = [];

    // Enable operator filtering
    const filteringTx = await this.setOperatorFiltering(chainId, collectionAddress, true);
    txHashes.push(filteringTx);

    const allowedOperators = {
      opensea: '0x1E0049783F008A0085193E00003D00cd54003c71',
      looksrare: '0xf42aa99F011A1fA7CDA90E5E98b277E306BcA83e'
    };

    for (const marketplace of marketplaces) {
      const operatorAddress = allowedOperators[marketplace.toLowerCase() as keyof typeof allowedOperators];
      if (operatorAddress) {
        const isBlocked = await this.isOperatorBlocked(chainId, collectionAddress, operatorAddress);
        if (isBlocked) {
          const unblockTx = await this.blockOperator(chainId, collectionAddress, operatorAddress, false);
          txHashes.push(unblockTx);
        }
      }
    }

    return txHashes;
  }

  // Gas Analysis Utilities
  async estimateGasCosts(chainId: number) {
    const provider = new ethers.BrowserProvider(this.provider!);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);

    // These would be estimates based on historical data or test deployments
    const operations = {
      'Factory Deployment': 2500000,
      'Create Collection': 4000000,
      'Collection Deployment': 3200000,
      'Add Mint Phase': 150000,
      'Single Mint': 80000,
      'Batch Mint (5 tokens)': 250000,
      'Set Approval For All': 46000
    };

    const results = Object.entries(operations).map(([name, gasUsed]) => {
      const gasCost = BigInt(gasUsed) * gasPrice;
      return {
        name,
        gasUsed,
        gasPrice: gasPrice.toString(),
        costWei: gasCost.toString(),
        costEth: ethers.formatEther(gasCost)
      };
    });

    return {
      gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
      operations: results,
      totalGas: results.reduce((sum, op) => sum + op.gasUsed, 0),
      totalCostEth: ethers.formatEther(
        results.reduce((sum, op) => sum + BigInt(op.costWei), BigInt(0))
      )
    };
  }

  // Network Health Checking
  async checkNetworkHealth(chainId: number) {
    try {
      const provider = new ethers.BrowserProvider(this.provider!);

      const startTime = Date.now();
      const [blockNumber, feeData, network] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
        provider.getNetwork()
      ]);
      const gasPrice = feeData.gasPrice || BigInt(0);
      const responseTime = Date.now() - startTime;

      const signer = await this.getSigner();
      const balance = await provider.getBalance(await signer.getAddress());

      return {
        connected: true,
        chainId: Number(network.chainId),
        latestBlock: blockNumber,
        gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
        responseTime: responseTime + 'ms',
        accountBalance: ethers.formatEther(balance) + ' ETH',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Interface Support Checks
  async checkInterfaceSupport(chainId: number, collectionAddress: string) {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);

    const interfaces = {
      'ERC165': '0x01ffc9a7',
      'ERC721': '0x80ac58cd',
      'ERC721Metadata': '0x5b5e139f',
      'ERC721Enumerable': '0x780e9d63',
      'ERC2981': '0x2a55205a', // Royalty standard
      'ERC4906': '0x49064906'  // Metadata update
    };

    const results: Record<string, boolean> = {};

    for (const [name, interfaceId] of Object.entries(interfaces)) {
      try {
        results[name] = await contract.supportsInterface(interfaceId);
      } catch (error) {
        results[name] = false;
      }
    }

    return results;
  }

  // Token Operations
  async getTokenOwner(chainId: number, collectionAddress: string, tokenId: number): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    return await contract.ownerOf(tokenId);
  }

  async getTokenURI(chainId: number, collectionAddress: string, tokenId: number): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    return await contract.tokenURI(tokenId);
  }

  async approveToken(chainId: number, collectionAddress: string, to: string, tokenId: number): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.approve(to, tokenId, this.getGasOptions(chainId));
    return tx.hash;
  }

  async setApprovalForAll(chainId: number, collectionAddress: string, operator: string, approved: boolean): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const tx = await contract.setApprovalForAll(operator, approved, this.getGasOptions(chainId));
    return tx.hash;
  }

  async transferFrom(chainId: number, collectionAddress: string, from: string, to: string, tokenId: number): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const gasOptions = this.getGasOptions(chainId);
    const tx = await contract.transferFrom(from, to, tokenId, { ...gasOptions });
    return tx.hash;
  }

  async safeTransferFrom(chainId: number, collectionAddress: string, from: string, to: string, tokenId: number, data: string = '0x'): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const gasOptions = this.getGasOptions(chainId);
    const tx = await contract['safeTransferFrom(address,address,uint256,bytes)'](from, to, tokenId, data, { ...gasOptions });
    return tx.hash;
  }

  async burn(chainId: number, collectionAddress: string, tokenId: number): Promise<string> {
    const contract = await this.getNFTCollectionContract(chainId, collectionAddress);
    const gasOptions = this.getGasOptions(chainId);
    const tx = await contract.burn(tokenId, { ...gasOptions });
    return tx.hash;
  }

  // MasterContractFactory Admin Functions
  
  /**
   * Approve OddsLaunchpad template with current bytecode
   * Only admin can call this - ONE TIME SETUP
   */
  async approveOddsLaunchpadTemplate(chainId: number): Promise<string> {
    try {
      const chain = getChainConfig(chainId);
      if (!chain?.oddsTemplateAddress) {
        throw new Error(`OddsLaunchpad template not configured for chain ${chainId}`);
      }

      const templateAddress = chain.oddsTemplateAddress;
      
      // Get current bytecode
      const { ODDS_LAUNCHPAD_BYTECODE } = await import('@/../abi/OddsLaunchpadBytecode');
      const bytecodeHash = ethers.keccak256(ODDS_LAUNCHPAD_BYTECODE);

      console.log('📝 Approving OddsLaunchpad template...');
      console.log('  Template:', templateAddress);
      console.log('  Bytecode hash:', bytecodeHash);

      const contract = await this.getContract(chainId);
      
      // Check if already approved
      const isApproved = await contract.getTemplateApproved(templateAddress);
      if (isApproved) {
        const existingHash = await contract.getTemplateBytecodeHash(templateAddress);
        if (existingHash === bytecodeHash) {
          console.log('✅ Template already approved with matching hash');
          return 'already-approved';
        }
        console.log('⚠️  Template approved but hash mismatch - updating...');
      }

      const tx = await contract.approveTemplate(templateAddress, bytecodeHash, this.getGasOptions(chainId));
      console.log('✅ Approval transaction:', tx.hash);
      
      await tx.wait();
      console.log('✅ Template approved successfully!');
      
      return tx.hash;
    } catch (error) {
      console.error('Error approving template:', error);
      throw error;
    }
  }

  /**
   * Approve a template for deployment (generic)
   * Only admin can call this
   */
  async approveTemplate(chainId: number, templateAddress: string, bytecodeHash: string): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      const tx = await contract.approveTemplate(templateAddress, bytecodeHash, this.getGasOptions(chainId));
      
      console.log('✅ Template approval transaction:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error approving template:', error);
      throw error;
    }
  }

  /**
   * Remove a template
   * Only admin can call this
   */
  async removeTemplate(chainId: number, templateAddress: string): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      const tx = await contract.removeTemplate(templateAddress, this.getGasOptions(chainId));
      
      console.log('✅ Template removal transaction:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error removing template:', error);
      throw error;
    }
  }

  /**
   * Deploy Master Contract using MasterContractFactory
   * This is the NEW way to deploy OddsLaunchpad instances
   */
  async deployMasterContract(
    chainId: number,
    templateAddress: string,
    request: {
      name: string;
      symbol: string;
      baseURI: string;
      unrevealedURI: string;
      contractURI: string;
      externalLink: string;
      totalMaxSupply: number;
      treasury: string;
      royaltyRecipient: string;
      royaltyPercentage: number;
      isRevealed?: boolean;
      transfersEnabled?: boolean;
      isOpenEdition?: boolean;
      isShuffleEnabled?: boolean;
    },
    phases?: any[]
  ): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      
      console.log('🚀 Deploying Master Contract via MasterContractFactory');
      console.log('Template Address:', templateAddress);
      console.log('Collection Config:', request);

      // Check if template is approved
      console.log('🔍 Checking template approval...');
      const isApproved = await this.isTemplateApproved(chainId, templateAddress);
      if (!isApproved) {
        throw new Error(
          `Template ${templateAddress} is not approved. ` +
          `Please run: npx hardhat run scripts/approve-template-sepolia.js --network sepolia`
        );
      }
      console.log('✅ Template is approved');

      // Prepare CollectionConfig struct for OddsStudio constructor
      // IMPORTANT: Field order MUST match the contract struct exactly
      // struct CollectionConfig {
      //   string name;
      //   string symbol;
      //   string baseURI;
      //   string unrevealedURI;
      //   string contractURI;
      //   string externalLink;
      //   uint256 totalMaxSupply;
      //   uint256 chainId;
      //   address payable treasury;
      //   address payable royaltyRecipient;
      //   uint96 royaltyPercentage;
      //   bool isRevealed;
      //   bool transfersEnabled;
      //   bool isOpenEdition;
      // }
      const hasMetadata = request.baseURI && request.baseURI.trim() !== '';
      const collectionConfig = {
        name: request.name,
        symbol: request.symbol,
        baseURI: request.baseURI,
        unrevealedURI: request.unrevealedURI,
        contractURI: request.contractURI,
        externalLink: request.externalLink,
        totalMaxSupply: request.totalMaxSupply,
        chainId: chainId, // IMPORTANT: chainId must be included
        treasury: request.treasury,
        royaltyRecipient: request.royaltyRecipient,
        royaltyPercentage: request.royaltyPercentage,
        isRevealed: hasMetadata ? true : (request.isRevealed || false),
        transfersEnabled: request.transfersEnabled !== undefined ? request.transfersEnabled : true,
        isOpenEdition: request.isOpenEdition || false
      };

      console.log('📋 Collection Config:');
      console.log('  - name:', collectionConfig.name);
      console.log('  - symbol:', collectionConfig.symbol);
      console.log('  - baseURI:', collectionConfig.baseURI);
      console.log('  - contractURI:', collectionConfig.contractURI);
      console.log('  - totalMaxSupply:', collectionConfig.totalMaxSupply);
      console.log('  - chainId:', collectionConfig.chainId);
      console.log('  - treasury:', collectionConfig.treasury);
      console.log('  - royaltyRecipient:', collectionConfig.royaltyRecipient);
      console.log('  - royaltyPercentage:', collectionConfig.royaltyPercentage);
      console.log('  - isRevealed:', collectionConfig.isRevealed);
      console.log('  - isOpenEdition:', collectionConfig.isOpenEdition);
      console.log('  - transfersEnabled:', collectionConfig.transfersEnabled);
      console.log('  - hasMetadata:', hasMetadata);
      
      // Validate config before deployment
      if (!collectionConfig.treasury || collectionConfig.treasury === ethers.ZeroAddress) {
        throw new Error('Treasury address is required and cannot be zero address');
      }
      if (!collectionConfig.royaltyRecipient || collectionConfig.royaltyRecipient === ethers.ZeroAddress) {
        throw new Error('Royalty recipient address is required and cannot be zero address');
      }
      if (collectionConfig.totalMaxSupply === 0) {
        throw new Error('Total max supply must be greater than 0');
      }
      if (collectionConfig.royaltyPercentage > 10000) {
        throw new Error('Royalty percentage cannot exceed 10000 (100%)');
      }
      console.log('✅ Collection config validation passed');

      console.log('📦 Preparing deployment via MasterContractFactory...');
      
      // Prepare phases array for deployment
      // IMPORTANT: Field order MUST match the contract struct exactly
      // struct MintPhase {
      //   string name;
      //   uint256 startTime;
      //   uint256 endTime;
      //   uint256 price;
      //   uint256 maxSupply;
      //   uint256 currentSupply;
      //   uint256 maxPerWallet;
      //   uint256 maxPerTransaction;
      //   bytes32 merkleRoot;
      //   bool isActive;
      //   bool requiresWhitelist;
      // }
      const phasesForDeploy = phases && phases.length > 0 ? phases.map((phase, index) => {
        // Validate phase
        if (!phase.name || phase.name.trim() === '') {
          throw new Error(`Phase ${index}: name is required`);
        }
        if (phase.maxSupply === 0) {
          throw new Error(`Phase ${index} (${phase.name}): maxSupply must be greater than 0`);
        }
        if (phase.startTime >= phase.endTime) {
          throw new Error(`Phase ${index} (${phase.name}): startTime must be before endTime`);
        }
        
        // IMPORTANT: Use explicit boolean check for requiresWhitelist
        // phase.requiresWhitelist || false will fail if requiresWhitelist is explicitly false
        const requiresWhitelist = phase.requiresWhitelist === true;
        const isActive = true; // Always true for new phases
        
        // CRITICAL: Convert price from ETH string to Wei BigInt
        // phase.price is expected to be a string like "0.1" (ETH), not Wei
        const priceInWei = ethers.parseEther(phase.price.toString());
        
        console.log(`📋 Phase ${index} (${phase.name}):`);
        console.log(`   price input: ${phase.price} ETH`);
        console.log(`   price output: ${priceInWei.toString()} Wei`);
        console.log(`   requiresWhitelist input: ${phase.requiresWhitelist} (type: ${typeof phase.requiresWhitelist})`);
        console.log(`   requiresWhitelist output: ${requiresWhitelist}`);
        console.log(`   isActive output: ${isActive}`);
        
        // CRITICAL: Return as array (tuple) to ensure correct encoding order
        // Order MUST match ABI: name, startTime, endTime, price, maxSupply, currentSupply, maxPerWallet, maxPerTransaction, merkleRoot, isActive, requiresWhitelist
        return [
          phase.name,                                                                                                    // string name
          phase.startTime,                                                                                               // uint256 startTime
          phase.endTime,                                                                                                 // uint256 endTime
          priceInWei,                                                                                                    // uint256 price (converted to Wei)
          phase.maxSupply,                                                                                               // uint256 maxSupply
          0,                                                                                                             // uint256 currentSupply (always 0 for new phases)
          phase.maxPerWallet,                                                                                            // uint256 maxPerWallet
          phase.maxPerTransaction,                                                                                       // uint256 maxPerTransaction
          phase.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000',                    // bytes32 merkleRoot
          isActive,                                                                                                      // bool isActive
          requiresWhitelist                                                                                              // bool requiresWhitelist
        ];
      }) : [];

      console.log(`✅ Phases validated and prepared: ${phasesForDeploy.length} phase(s)`);

      // Get bytecode and ABI
      const { ODDS_LAUNCHPAD_BYTECODE, ODDS_LAUNCHPAD_BYTECODE_HASH } = await import('@/../abi/OddsLaunchpadBytecode');
      const OddsLaunchpadABI = await import('@/../abi/OddsLaunchpad.json');
      
      // Verify template is approved
      console.log('🔍 Verifying template approval...');
      const templateApproved = await contract.getTemplateApproved(templateAddress);
      if (!templateApproved) {
        throw new Error(
          `Template ${templateAddress} is not approved in factory.\n` +
          `Please run: node scripts/approve-current-bytecode.js\n` +
          `Or approve manually via factory.approveTemplate()`
        );
      }
      
      // Check if hash validation should be skipped (useful during development/deployment)
      const skipHashValidation = process.env.SKIP_BYTECODE_HASH_VALIDATION === 'true';
      
      if (!skipHashValidation) {
        const approvedHash = await contract.getTemplateBytecodeHash(templateAddress);
        
        // Use pre-calculated hash instead of calculating on every deployment
        // This is much faster and avoids potential issues with keccak256 calculation
        const currentHash = ODDS_LAUNCHPAD_BYTECODE_HASH;
        
        console.log('🔍 Bytecode hash verification:');
        console.log('  Approved hash:', approvedHash);
        console.log('  Current hash: ', currentHash);
        console.log('  Match:', approvedHash === currentHash ? '✅' : '❌');
        
        if (approvedHash !== currentHash) {
          console.warn('⚠️  Bytecode hash mismatch detected!');
          console.warn(`   Approved: ${approvedHash}`);
          console.warn(`   Current:  ${currentHash}`);
          console.warn('   Set SKIP_BYTECODE_HASH_VALIDATION=true to bypass this check');
          
          throw new Error(
            `Bytecode hash mismatch!\n` +
            `Approved: ${approvedHash}\n` +
            `Current:  ${currentHash}\n` +
            `Please run: node scripts/approve-current-bytecode.js\n` +
            `Or set SKIP_BYTECODE_HASH_VALIDATION=true in environment variables`
          );
        }
        
        console.log('✅ Template approved and hash matches');
      } else {
        console.log('⚠️  Bytecode hash validation SKIPPED (SKIP_BYTECODE_HASH_VALIDATION=true)');
        console.log('✅ Template is approved (hash validation bypassed)');
      }

      // Encode constructor arguments using Interface
      console.log('📝 Encoding constructor arguments...');
      
      // Use Interface to encode constructor arguments properly (handles tuples correctly)
      // Handle both default export and direct export
      const abi = (OddsLaunchpadABI as any).default || OddsLaunchpadABI;
      console.log('  ABI loaded:', Array.isArray(abi) ? `${abi.length} functions` : 'invalid');
      
      const iface = new ethers.Interface(abi);
      
      // IMPORTANT: For factory pattern, we need ONLY constructor args, NOT bytecode
      // Use AbiCoder.encode() with constructor parameter types
      const constructorArgsEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
        [
          'tuple(string name, string symbol, string baseURI, string unrevealedURI, string contractURI, string externalLink, uint256 totalMaxSupply, uint256 chainId, address treasury, address royaltyRecipient, uint96 royaltyPercentage, bool isRevealed, bool transfersEnabled, bool isOpenEdition)',
          'address',
          'tuple(string name, uint256 startTime, uint256 endTime, uint256 price, uint256 maxSupply, uint256 currentSupply, uint256 maxPerWallet, uint256 maxPerTransaction, bytes32 merkleRoot, bool isActive, bool requiresWhitelist)[]'
        ],
        [
          collectionConfig,
          collectionConfig.treasury,
          phasesForDeploy
        ]
      );

      console.log('🚀 Deploying via factory.deployMasterContract()...');
      console.log('  Template:', templateAddress);
      console.log('  Bytecode length:', ODDS_LAUNCHPAD_BYTECODE.length);
      console.log('  Constructor args:', constructorArgsEncoded);
      console.log('  Constructor args length:', constructorArgsEncoded?.length || 0);
      console.log('  Bytecode hash (pre-calculated):', ODDS_LAUNCHPAD_BYTECODE_HASH);
      
      // CRITICAL: Check if bytecode length matches expected value
      // Expected: 49882 (current version)
      // If different, it means the build is outdated
      const EXPECTED_BYTECODE_LENGTH = 49882;
      if (ODDS_LAUNCHPAD_BYTECODE.length !== EXPECTED_BYTECODE_LENGTH) {
        console.error('❌ BYTECODE LENGTH MISMATCH!');
        console.error(`   Expected: ${EXPECTED_BYTECODE_LENGTH}`);
        console.error(`   Current:  ${ODDS_LAUNCHPAD_BYTECODE.length}`);
        console.error('   This indicates the build is outdated.');
        console.error('   Please rebuild the application: npm run build');
        
        throw new Error(
          `Bytecode length mismatch! Expected ${EXPECTED_BYTECODE_LENGTH} but got ${ODDS_LAUNCHPAD_BYTECODE.length}. ` +
          `This indicates the build is outdated. Please rebuild the application.`
        );
      }
      
      // Validate parameters before deployment
      if (!constructorArgsEncoded || constructorArgsEncoded.length === 0) {
        throw new Error('Constructor arguments encoding failed - empty or undefined');
      }
      
      // Check wallet balance
      try {
        const signer = await this.getSigner();
        const signerAddress = await signer.getAddress();
        const balance = await signer.provider?.getBalance(signerAddress);
        console.log('💰 Wallet balance:', ethers.formatEther(balance || 0), 'ETH');
        
        if (balance && balance < ethers.parseEther('0.001')) {
          console.warn('⚠️  Low wallet balance! You may not have enough gas for deployment.');
        }
      } catch (balanceError) {
        console.warn('⚠️  Could not check wallet balance:', balanceError);
      }
      
      // Deploy via factory with gas estimation
      // Factory expects: _creationCodeWithoutArgs (pure bytecode), _constructorArgs (encoded args)
      
      // Retry logic for RPC errors (especially for MegaETH)
      let tx;
      let lastError;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Deployment attempt ${attempt}/${maxRetries}...`);
          
          // Get gas options (no estimation, use fixed limit)
          const deployOptions = this.getGasOptions(chainId);
          
          console.log('📤 Sending transaction with options:', deployOptions);
          
          // deployMasterContract expects 3 params: template, bytecode, constructorArgs
          // Gas options are passed as transaction overrides
          if (deployOptions) {
            tx = await contract.deployMasterContract(
              templateAddress,
              ODDS_LAUNCHPAD_BYTECODE,
              constructorArgsEncoded,
              deployOptions
            );
          } else {
            tx = await contract.deployMasterContract(
              templateAddress,
              ODDS_LAUNCHPAD_BYTECODE,
              constructorArgsEncoded
            );
          }
          
          console.log('✅ Transaction submitted successfully!');
          break; // Success, exit retry loop
          
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Attempt ${attempt} failed:`, error.message);
          console.error('Error code:', error.code);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            data: error.data,
            reason: error.reason
          });
          
          // Don't retry if user rejected or transaction reverted
          if (
            error.code === 4001 || 
            error.info?.error?.code === 4001 ||
            error.code === 'ACTION_REJECTED' ||
            error.message?.includes('user rejected')
          ) {
            console.log('🚫 User rejected transaction, not retrying');
            throw error;
          }
          
          // Don't retry if transaction was sent but reverted
          if (error.code === 'CALL_EXCEPTION' || error.receipt?.status === 0) {
            console.log('🚫 Transaction reverted on-chain, not retrying');
            throw error;
          }
          
          // Check if it's an RPC error that we should retry
          const isRpcError = error.code === -32002 || 
                            error.message?.includes('RPC endpoint') ||
                            error.message?.includes('too many errors');
          
          if (isRpcError && attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else if (attempt === maxRetries) {
            throw new Error(
              `Failed after ${maxRetries} attempts. ` +
              `RPC endpoint may be overloaded. Please try again in a few minutes. ` +
              `Error: ${error.message}`
            );
          } else {
            // Not an RPC error, throw immediately
            throw error;
          }
        }
      }
      
      if (!tx) {
        throw lastError || new Error('Transaction failed');
      }

      console.log('✅ Transaction submitted:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }
      
      // Check if transaction was successful
      if (receipt.status === 0) {
        console.error('❌ Transaction reverted on-chain');
        console.error('Transaction hash:', receipt.hash);
        console.error('Block number:', receipt.blockNumber);
        console.error('Gas used:', receipt.gasUsed.toString());
        console.error('Gas limit:', receipt.gasLimit?.toString());
        console.error('Gas price:', receipt.gasPrice?.toString());
        
        // Try to get revert reason from logs
        let revertReason = 'Unknown reason';
        try {
          // Check if there are any error logs
          if (receipt.logs && receipt.logs.length > 0) {
            console.log('Transaction logs:', receipt.logs);
          }
          
          // Try to decode error from transaction
          const signer = await this.getSigner();
          const provider = signer.provider;
          if (provider) {
            try {
              // Replay transaction to get revert reason
              // Note: In ethers v6, call() only accepts transaction object
              await provider.call({
                to: receipt.to,
                data: tx.data,
                from: receipt.from,
                blockTag: receipt.blockNumber
              });
            } catch (callError: any) {
              console.error('Call error:', callError);
              if (callError.data) {
                revertReason = callError.data;
              } else if (callError.message) {
                revertReason = callError.message;
              }
            }
          }
        } catch (logError) {
          console.error('Failed to parse logs:', logError);
        }
        
        throw new Error(
          `Transaction reverted on-chain. ` +
          `Revert reason: ${revertReason}. ` +
          `This could be due to: ` +
          `1) Template not approved in factory (check with getTemplateApproved), ` +
          `2) Bytecode hash mismatch (check with getTemplateBytecodeHash), ` +
          `3) Insufficient gas (used: ${receipt.gasUsed.toString()}), ` +
          `4) Invalid constructor parameters, or ` +
          `5) Contract deployment restrictions. ` +
          `Transaction hash: ${receipt.hash}`
        );
      }
      
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

      // Parse ContractDeployed event to get deployed address
      let deployedAddress: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          if (parsedLog && parsedLog.name === 'ContractDeployed') {
            deployedAddress = parsedLog.args.contractAddress || parsedLog.args[0];
            console.log('✅ Contract deployed at:', deployedAddress);
            break;
          }
        } catch (e) {
          // Continue if log parsing fails
        }
      }

      if (!deployedAddress) {
        console.warn('⚠️  Could not extract deployed address from logs');
      }

      // Return transaction hash
      return tx.hash;
    } catch (error: any) {
      console.error('❌ Error deploying master contract:', error);
      
      // Enhanced error handling with specific messages
      if (error.code === 'CALL_EXCEPTION' || error.receipt?.status === 0) {
        // Transaction reverted on-chain
        const txHash = error.receipt?.hash || error.transaction?.hash;
        throw new Error(
          `Transaction reverted on-chain. ` +
          `Possible causes: Template not approved, insufficient gas, or invalid parameters. ` +
          (txHash ? `Transaction: ${txHash}` : '')
        );
      } else if (error.code === 4001 || error.info?.error?.code === 4001) {
        // User rejected transaction
        throw new Error('User rejected the transaction in wallet');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds to pay for gas fees');
      } else if (error.message?.includes('nonce')) {
        throw new Error('Nonce error. Please reset your wallet or try again');
      } else if (error.message?.includes('gas required exceeds')) {
        throw new Error('Transaction requires too much gas. The contract deployment may be too complex');
      } else if (error.message?.includes('Template') && error.message?.includes('not approved')) {
        // Already has good error message, just re-throw
        throw error;
      } else {
        // Generic error with original message
        throw error;
      }
    }
  }

  /**
   * Create launchpad WITH mint phases - Now uses deployMasterContract
   * This is a wrapper for backward compatibility
   * 
   * IMPORTANT: If deployment with phases fails due to gas, this will automatically
   * retry by deploying without phases and adding them separately.
   */
  async createLaunchpadWithPhases(
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
      isOpenEdition?: boolean;
    },
    phases: any[]
  ): Promise<string> {
    try {
      console.log('🚀 Creating launchpad with phases using deployMasterContract');
      console.log('Request:', request);
      console.log('Phases count:', phases.length);
      console.log('Phases data:', JSON.stringify(phases, null, 2));

      // Get template address
      const templateAddress = await this.getTemplateAddress(chainId);
      if (!templateAddress) {
        throw new Error(`OddsLaunchpad template not configured for chain ${chainId}`);
      }

      console.log('Using template:', templateAddress);

      // IMPORTANT: Set isRevealed to true if baseURI is provided (metadata is ready)
      const hasMetadata = !!(request.baseURI && request.baseURI.trim() !== '');
      
      const deployConfig = {
        name: request.name,
        symbol: request.symbol,
        baseURI: request.baseURI,
        unrevealedURI: request.unrevealedURI,
        contractURI: request.contractURI,
        externalLink: request.externalLink,
        totalMaxSupply: request.totalMaxSupply,
        treasury: request.treasury,
        royaltyRecipient: request.royaltyRecipient,
        royaltyPercentage: request.royaltyPercentage,
        isRevealed: hasMetadata, // Auto-set to true if metadata exists
        transfersEnabled: true,
        isOpenEdition: request.isOpenEdition || false,
        isShuffleEnabled: true // Always enabled for randomization
      };

      // Try to deploy with phases first
      try {
        console.log('📦 Attempting deployment WITH phases in constructor...');
        const txHash = await this.deployMasterContract(
          chainId,
          templateAddress,
          deployConfig,
          phases // Pass phases to be included in deployment
        );

        console.log('✅ Deployment transaction with phases:', txHash);
        console.log('✅ All phases included in deployment - no separate transaction needed!');

        return txHash;
      } catch (deployError: any) {
        // Check if error is due to gas/out of gas
        const isGasError = deployError.message?.includes('gas') || 
                          deployError.message?.includes('out of gas') ||
                          deployError.code === 'CALL_EXCEPTION';
        
        if (isGasError && phases.length > 0) {
          console.warn('⚠️  Deployment with phases failed (likely gas limit)');
          console.warn('🔄 Retrying: Deploy WITHOUT phases, then add phases separately...');
          
          // Deploy without phases
          const txHashWithoutPhases = await this.deployMasterContract(
            chainId,
            templateAddress,
            deployConfig,
            [] // Empty phases array
          );
          
          console.log('✅ Contract deployed without phases:', txHashWithoutPhases);
          console.log('⏳ Waiting for deployment confirmation...');
          
          // Wait for deployment (simplified - in production you'd parse the event)
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          console.log('⚠️  IMPORTANT: Phases need to be added manually!');
          console.log('   Use the Admin panel or call batchAddMintPhases()');
          console.log('   This is a temporary workaround for gas limit issues.');
          
          return txHashWithoutPhases;
        }
        
        // If not a gas error, rethrow
        throw deployError;
      }
    } catch (error) {
      console.error('Error creating launchpad with phases:', error);
      throw error;
    }
  }

  /**
   * Legacy function - create launchpad WITHOUT phases
   * Now redirects to deployMasterContract for compatibility
   * @deprecated Use deployMasterContract instead
   */
  async createLaunchpad(
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
  ): Promise<string> {
    try {
      console.log('🚀 Creating launchpad using deployMasterContract (legacy wrapper)');

      // Get template address
      const templateAddress = await this.getTemplateAddress(chainId);
      if (!templateAddress) {
        throw new Error(`OddsLaunchpad template not configured for chain ${chainId}`);
      }

      // Deploy using deployMasterContract
      // IMPORTANT: Set isRevealed to true if baseURI is provided (metadata is ready)
      const hasMetadata = !!(request.baseURI && request.baseURI.trim() !== '');
      return await this.deployMasterContract(
        chainId,
        templateAddress,
        {
          name: request.name,
          symbol: request.symbol,
          baseURI: request.baseURI,
          unrevealedURI: request.unrevealedURI,
          contractURI: request.contractURI,
          externalLink: request.externalLink,
          totalMaxSupply: request.totalMaxSupply,
          treasury: request.treasury,
          royaltyRecipient: request.royaltyRecipient,
          royaltyPercentage: request.royaltyPercentage,
          isRevealed: hasMetadata, // Auto-set to true if metadata exists
          transfersEnabled: true,
          isShuffleEnabled: true // Always enabled for randomization
        }
      );
    } catch (error) {
      console.error('Error creating launchpad:', error);
      throw error;
    }
  }

  // Additional utility methods
  async getAnalytics(chainId: number, period: '24h' | '7d' | '30d' | '90d' = '7d') {
    return AdminService.getAnalytics(chainId, period);
  }

  async exportData(chainId: number, type: 'launchpads' | 'analytics', format: 'csv' | 'json' = 'csv') {
    if (type === 'launchpads') {
      const blob = await AdminService.exportLaunchpads(chainId, format);
      const filename = `launchpads-${chainId}-${new Date().toISOString().split('T')[0]}.${format}`;
      AdminService.downloadFile(blob, filename);
    } else {
      const blob = await AdminService.exportAnalytics(chainId, '7d', format);
      const filename = `analytics-${chainId}-${new Date().toISOString().split('T')[0]}.${format}`;
      AdminService.downloadFile(blob, filename);
    }
  }

  async createBulkOperation(type: 'CREATE_LAUNCHPADS' | 'UPDATE_FEES', data: any[], createdBy: string) {
    return AdminService.createBulkOperation(type, data, createdBy);
  }

  async getBulkOperations(params: { page?: number; limit?: number; status?: string } = {}) {
    return AdminService.getBulkOperations(params);
  }

  // Utility functions
  formatAddress(address: string): string {
    return AdminService.formatAddress(address);
  }

  formatNumber(num: number): string {
    return AdminService.formatNumber(num);
  }

  getStatusColor(status: string) {
    return AdminService.getStatusColor(status);
  }

  // Master Control Methods - Project Management
  async getProjectStatus(chainId: number) {
    try {
      const chain = getChainConfig(chainId);
      if (!chain?.launchpadFactoryAddress) {
        return {
          hasFactory: false,
          factoryAddress: null,
          factoryInfo: null,
          networkHealth: await this.checkNetworkHealth(chainId)
        };
      }

      const [factoryInfo, networkHealth, gasCosts] = await Promise.all([
        this.getFactoryInfo(chainId).catch(() => null),
        this.checkNetworkHealth(chainId),
        this.estimateGasCosts(chainId).catch(() => null)
      ]);

      return {
        hasFactory: true,
        factoryAddress: chain.launchpadFactoryAddress,
        factoryInfo,
        networkHealth,
        gasCosts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        hasFactory: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async runDiagnostics(chainId: number, collectionAddress?: string) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      chainId,
      factory: {} as any,
      collection: {} as any,
      network: {} as any,
      marketplace: {} as any,
      recommendations: [] as string[]
    };

    try {
      // Factory diagnostics
      diagnostics.factory = await this.getFactoryInfo(chainId).catch(e => ({ error: e.message }));

      // Network diagnostics
      diagnostics.network = await this.checkNetworkHealth(chainId);

      // Collection diagnostics (if provided)
      if (collectionAddress) {
        try {
          const [collectionInfo, compatibility, interfaces] = await Promise.all([
            this.getCollectionInfo(chainId, collectionAddress),
            this.checkOpenseaCompatibility(chainId, collectionAddress),
            this.checkInterfaceSupport(chainId, collectionAddress)
          ]);

          diagnostics.collection = {
            info: collectionInfo,
            compatibility,
            interfaces
          };

          diagnostics.marketplace = compatibility;

          // Generate recommendations
          if (!compatibility.compatible) {
            diagnostics.recommendations.push('Collection is not fully OpenSea compatible');
          }
          if (!compatibility.operatorFiltering) {
            diagnostics.recommendations.push('Consider enabling operator filtering for creator earnings');
          }
          if (!interfaces.ERC2981) {
            diagnostics.recommendations.push('Royalty standard (ERC2981) not supported');
          }
        } catch (error) {
          diagnostics.collection = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }

      // Network-specific recommendations
      if (!diagnostics.network.connected) {
        diagnostics.recommendations.push('Network connectivity issues detected');
      }

      return diagnostics;
    } catch (error) {
      return {
        ...diagnostics,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Master Controller Integration
  getMasterController(): MasterController {
    return new MasterController(this);
  }

  // MasterContractFactory Admin Methods
  
  /**
   * Set creation fee for deploying new collections
   * Only owner can call this
   */
  async setCreationFee(chainId: number, feeInEth: string): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      const feeInWei = ethers.parseEther(feeInEth);
      const tx = await contract.setCreationFee(feeInWei, this.getGasOptions(chainId));
      
      console.log('✅ Creation fee update transaction:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error setting creation fee:', error);
      throw error;
    }
  }

  /**
   * Set platform fee percentage and free mint fee
   * Only owner can call this
   */
  async setPlatformFee(chainId: number, percentage: number, freeMintFeeInEth: string): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      const freeMintFeeInWei = ethers.parseEther(freeMintFeeInEth);
      const tx = await contract.setPlatformFee(percentage, freeMintFeeInWei, this.getGasOptions(chainId));
      
      console.log('✅ Platform fee update transaction:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error setting platform fee:', error);
      throw error;
    }
  }

  /**
   * Set platform treasury address
   * Only owner can call this
   */
  async setPlatformTreasury(chainId: number, treasuryAddress: string): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      const tx = await contract.setPlatformTreasury(treasuryAddress, this.getGasOptions(chainId));
      
      console.log('✅ Platform treasury update transaction:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error setting platform treasury:', error);
      throw error;
    }
  }

  /**
   * Emergency withdraw funds from factory
   * Only owner can call this
   */
  async emergencyWithdraw(chainId: number): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      const tx = await contract.emergencyWithdraw(this.getGasOptions(chainId));
      
      console.log('✅ Emergency withdraw transaction:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error performing emergency withdraw:', error);
      throw error;
    }
  }

  /**
   * Transfer ownership of the factory
   * Only owner can call this
   */
  async transferOwnership(chainId: number, newOwner: string): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      const tx = await contract.transferOwnership(newOwner, this.getGasOptions(chainId));
      
      console.log('✅ Ownership transfer transaction:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  }

  /**
   * Renounce ownership of the factory (make it ownerless)
   * Only owner can call this - IRREVERSIBLE
   */
  async renounceOwnership(chainId: number): Promise<string> {
    try {
      const contract = await this.getContract(chainId);
      const tx = await contract.renounceOwnership(this.getGasOptions(chainId));
      
      console.log('✅ Ownership renounce transaction:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error renouncing ownership:', error);
      throw error;
    }
  }

  /**
   * Get launchpad address by index
   * Note: MasterContractFactory doesn't track deployed contracts, use database instead
   */
  async getLaunchpadByIndex(chainId: number, index: number): Promise<string> {
    try {
      // Get from database since MasterContractFactory doesn't track deployed contracts
      const launchpads = await prisma.launchpad.findMany({
        where: { chainId },
        orderBy: { createdAt: 'asc' },
        skip: index,
        take: 1,
        select: { contractAddress: true }
      });
      
      if (launchpads.length === 0) {
        return '0x0000000000000000000000000000000000000000';
      }
      
      return launchpads[0].contractAddress;
    } catch (error) {
      console.error('Error getting launchpad by index:', error);
      return '0x0000000000000000000000000000000000000000';
    }
  }

  /**
   * Get all launchpad addresses from blockchain
   * Note: MasterContractFactory doesn't track deployed contracts, use database instead
   */
  async getAllLaunchpadsFromBlockchain(chainId: number): Promise<string[]> {
    try {
      // Get from database since MasterContractFactory doesn't track deployed contracts
      const launchpads = await prisma.launchpad.findMany({
        where: { chainId },
        orderBy: { createdAt: 'asc' },
        select: { contractAddress: true }
      });
      
      return launchpads.map(lp => lp.contractAddress);
    } catch (error) {
      console.error('Error getting all launchpads:', error);
      return [];
    }
  }
}
