/**
 * Contract Service Usage Examples
 *
 * This file demonstrates how to use the ContractService to interact with
 * the LaunchpadFactory and NFTCollection contracts.
 */

import { ContractService } from '@/lib/contract-service';

// Initialize the contract service
const contractService = new ContractService();

/**
 * FACTORY CONTRACT EXAMPLES
 */

// Example 1: Get Factory Information
export async function getFactoryInformation() {
  try {
    const chainId = 6343; // MegaETH testnet

    // Get factory info from API/database
    const factoryInfo = await contractService.getFactoryInfo(chainId);
    console.log('Factory Info:', factoryInfo);

    // Factory info includes version, chainId, totalCollections, creationFee, treasury
    console.log({
      version: factoryInfo.version,
      chainId: factoryInfo.chainId,
      totalCollections: factoryInfo.totalCollections,
      creationFee: `${factoryInfo.creationFeeAmount} ETH`,
      treasury: factoryInfo.treasury
    });

  } catch (error) {
    console.error('Error getting factory information:', error);
  }
}

// Example 2: Get Platform Fee Information
export async function getPlatformFeeInformation() {
  try {
    const chainId = 6343;

    // Get factory info which includes platform fee details
    const factoryInfo = await contractService.getFactoryInfo(chainId);
    console.log('Factory Info:', factoryInfo);
    
    // Note: Platform fee details are stored in the database
    // You can access them through the admin API or database queries

  } catch (error) {
    console.error('Error getting platform fee information:', error);
  }
}

// Example 3: Create a New Launchpad
export async function createLaunchpadExample() {
  try {
    const chainId = 6343;

    const launchpadRequest = {
      name: "Example NFT Collection",
      symbol: "ENC",
      description: "An example NFT collection created through the launchpad",
      baseURI: "https://api.example.com/metadata/",
      unrevealedURI: "https://api.example.com/unrevealed.json",
      contractURI: "https://api.example.com/contract-metadata.json",
      externalLink: "https://example.com",
      totalMaxSupply: 10000,
      treasury: "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", // Your treasury address
      royaltyRecipient: "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", // Royalty recipient
      royaltyPercentage: 750 // 7.5% in basis points
    };

    console.log('Creating launchpad with request:', launchpadRequest);

    const txHash = await contractService.createLaunchpad(chainId, launchpadRequest);
    console.log('Launchpad creation transaction hash:', txHash);

    // Wait for confirmation and get the launchpad address
    // Note: In a real application, you would wait for transaction confirmation
    // and then query the transaction receipt to get the deployed contract address

  } catch (error) {
    console.error('Error creating launchpad:', error);
  }
}

// Example 4: Get All Launchpads
export async function getAllLaunchpadsExample() {
  try {
    const chainId = 6343;

    // Get from API (includes metadata)
    const launchpads = await contractService.getAllLaunchpads(chainId);
    console.log('All Launchpads (API):', launchpads);

    // Get directly from blockchain (addresses only)
    const addresses = await contractService.getAllLaunchpadsFromBlockchain(chainId);
    console.log('Launchpad Addresses (Blockchain):', addresses);

    // Get launchpad by index
    if (addresses.length > 0) {
      const firstLaunchpad = await contractService.getLaunchpadByIndex(chainId, 0);
      console.log('First Launchpad Address:', firstLaunchpad);
    }

  } catch (error) {
    console.error('Error getting launchpads:', error);
  }
}

// Example 5: Get Specific Launchpad Information
export async function getLaunchpadInformationExample() {
  try {
    const chainId = 6343;
    const launchpadAddress = "0x1234567890123456789012345678901234567890"; // Replace with actual address

    // Get launchpad info
    const launchpadInfo = await contractService.getLaunchpadInfo(chainId, launchpadAddress);
    console.log('Launchpad Info:', launchpadInfo);

  } catch (error) {
    console.error('Error getting launchpad information:', error);
  }
}

/**
 * ADMIN OPERATIONS EXAMPLES (Require Owner Permissions)
 */

// Example 6: Update Factory Settings (Owner Only)
export async function updateFactorySettingsExample() {
  try {
    const chainId = 6343;

    // Update creation fee (Owner only)
    const newCreationFee = "0.002"; // 0.002 ETH
    const creationFeeTx = await contractService.setCreationFee(chainId, newCreationFee);
    console.log('Creation fee update transaction:', creationFeeTx);

    // Update platform fee (Owner only)
    const newPercentage = 300; // 3% in basis points
    const newFreeMintFee = "0.001"; // 0.001 ETH
    const platformFeeTx = await contractService.setPlatformFee(chainId, newPercentage, newFreeMintFee);
    console.log('Platform fee update transaction:', platformFeeTx);

    // Update platform treasury (Owner only)
    const newTreasury = "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";
    const treasuryTx = await contractService.setPlatformTreasury(chainId, newTreasury);
    console.log('Treasury update transaction:', treasuryTx);

  } catch (error) {
    console.error('Error updating factory settings:', error);
  }
}

// Example 7: Ownership Operations (Owner Only)
export async function ownershipOperationsExample() {
  try {
    const chainId = 6343;

    // Note: Owner information is stored in the database
    // You can get it through the admin API
    console.log('Note: Owner operations require admin access');

    // Transfer ownership (Current Owner only)
    const newOwner = "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";
    const transferTx = await contractService.transferOwnership(chainId, newOwner);
    console.log('Ownership transfer transaction:', transferTx);

    // Emergency withdraw (Owner only)
    const withdrawTx = await contractService.emergencyWithdraw(chainId);
    console.log('Emergency withdraw transaction:', withdrawTx);

    // Renounce ownership (Owner only) - USE WITH CAUTION!
    // const renounceTx = await contractService.renounceOwnership(chainId);
    // console.log('Ownership renounce transaction:', renounceTx);

  } catch (error) {
    console.error('Error with ownership operations:', error);
  }
}

/**
 * NFT COLLECTION CONTRACT EXAMPLES
 */

// Example 8: NFT Collection Operations
export async function nftCollectionOperationsExample() {
  try {
    const chainId = 6343;
    const collectionAddress = "0x1234567890123456789012345678901234567890"; // Replace with actual collection address

    // Get collection information
    const collectionInfo = await contractService.getCollectionInfo(chainId, collectionAddress);
    console.log('Collection Info:', collectionInfo);

    // Get mint phases
    const phaseCount = await contractService.getMintPhaseCount(chainId, collectionAddress);
    console.log('Total mint phases:', phaseCount);

    // Get active mint phases
    const activePhases = await contractService.getActiveMintPhases(chainId, collectionAddress);
    console.log('Active phases:', activePhases);

    // Get specific phase details
    if (phaseCount > 0) {
      const phase0 = await contractService.getMintPhase(chainId, collectionAddress, 0);
      console.log('Phase 0 details:', phase0);
    }

    // Mint NFTs through a phase
    const phaseId = 0;
    const quantity = 2;
    const merkleProof: string[] = []; // Add actual proof if whitelist required
    const mintTx = await contractService.mintNFT(chainId, collectionAddress, phaseId, quantity, merkleProof);
    console.log('Mint transaction:', mintTx);

    // Calculate mint cost
    const mintCost = await contractService.calculateMintCost(chainId, collectionAddress, phaseId, quantity);
    console.log('Mint cost calculation:', mintCost);

    // Batch airdrop (admin only)
    const recipients = ["0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2"];
    const quantities = [1, 2];
    const batchAirdropTx = await contractService.batchAirdrop(chainId, collectionAddress, recipients, quantities);
    console.log('Batch airdrop transaction:', batchAirdropTx);

    // Update base URI
    const newBaseURI = "https://api.newexample.com/metadata/";
    const baseURITx = await contractService.setBaseURI(chainId, collectionAddress, newBaseURI);
    console.log('Base URI update transaction:', baseURITx);

    // Update contract URI
    const newContractURI = "https://api.newexample.com/contract.json";
    const contractURITx = await contractService.setContractURI(chainId, collectionAddress, newContractURI);
    console.log('Contract URI update transaction:', contractURITx);

    // Reveal collection
    const revealTx = await contractService.reveal(chainId, collectionAddress, newBaseURI);
    console.log('Reveal transaction:', revealTx);

    // Update royalty info
    const royaltyRecipient = "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";
    const royaltyPercentage = 750; // 7.5%
    const royaltyTx = await contractService.setRoyaltyInfo(chainId, collectionAddress, royaltyRecipient, royaltyPercentage);
    console.log('Royalty update transaction:', royaltyTx);

    // Pause collection
    const pauseTx = await contractService.pauseCollection(chainId, collectionAddress);
    console.log('Pause transaction:', pauseTx);

    // Unpause collection
    const unpauseTx = await contractService.unpauseCollection(chainId, collectionAddress);
    console.log('Unpause transaction:', unpauseTx);

    // Withdraw funds
    const balance = await contractService.getCollectionBalance(chainId, collectionAddress);
    console.log('Collection balance:', `${balance} ETH`);

    if (parseFloat(balance) > 0) {
      const withdrawTx = await contractService.withdrawCollectionFunds(chainId, collectionAddress);
      console.log('Withdraw transaction:', withdrawTx);
    }

  } catch (error) {
    console.error('Error with NFT collection operations:', error);
  }
}

/**
 * ANALYTICS AND EXPORT EXAMPLES
 */

// Example 9: Analytics and Data Export
export async function analyticsAndExportExample() {
  try {
    const chainId = 6343;

    // Get analytics data
    const analytics = await contractService.getAnalytics(chainId, '7d');
    console.log('Analytics (7 days):', analytics);

    // Export launchpads data
    await contractService.exportData(chainId, 'launchpads', 'csv');
    console.log('Launchpads CSV exported');

    // Export analytics data
    await contractService.exportData(chainId, 'analytics', 'json');
    console.log('Analytics JSON exported');

  } catch (error) {
    console.error('Error with analytics and export:', error);
  }
}

// Example 10: Bulk Operations
export async function bulkOperationsExample() {
  try {
    // Create bulk operation
    const bulkData = [
      {
        name: "Collection 1",
        symbol: "COL1",
        totalSupply: 1000
      },
      {
        name: "Collection 2",
        symbol: "COL2",
        totalSupply: 2000
      }
    ];

    const bulkOp = await contractService.createBulkOperation(
      'CREATE_LAUNCHPADS',
      bulkData,
      'user@example.com'
    );
    console.log('Bulk operation created:', bulkOp);

    // Get bulk operations
    const operations = await contractService.getBulkOperations({
      page: 1,
      limit: 10,
      status: 'pending'
    });
    console.log('Bulk operations:', operations);

  } catch (error) {
    console.error('Error with bulk operations:', error);
  }
}

/**
 * UTILITY FUNCTIONS EXAMPLES
 */

// Example 11: Utility Functions
export function utilityFunctionsExample() {
  // Format address
  const longAddress = "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";
  const shortAddress = contractService.formatAddress(longAddress);
  console.log('Formatted address:', shortAddress); // "0x742d...5A8a2"

  // Format number
  const largeNumber = 1234567;
  const formattedNumber = contractService.formatNumber(largeNumber);
  console.log('Formatted number:', formattedNumber); // "1,234,567"

  // Get status color
  const statusColor = contractService.getStatusColor('active');
  console.log('Status color:', statusColor);
}

/**
 * NEW EXAMPLES FOR ADVANCED FEATURES
 */

// Example 12: Mint Phase Management
export async function mintPhaseManagementExample() {
  try {
    const chainId = 6343;
    const collectionAddress = "0x1234567890123456789012345678901234567890";

    console.log('=== Mint Phase Management ===');

    // Add a new mint phase
    const phaseConfig = {
      name: "Public Sale",
      description: "Public mint phase for everyone",
      startTime: Math.floor(Date.now() / 1000), // Now
      endTime: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
      price: "0.05", // 0.05 ETH
      maxSupply: 1000,
      maxPerWallet: 10,
      maxPerTransaction: 5,
      requiresWhitelist: false,
      paymentType: 0, // ETH
      refundEnabled: false
    };

    const addPhaseTx = await contractService.addMintPhase(chainId, collectionAddress, phaseConfig);
    console.log('Add phase transaction:', addPhaseTx);

    // Get all phases
    const phaseCount = await contractService.getMintPhaseCount(chainId, collectionAddress);
    console.log('Total phases:', phaseCount);

    // Toggle phase activation
    const toggleTx = await contractService.toggleMintPhase(chainId, collectionAddress, 0, false);
    console.log('Toggle phase transaction:', toggleTx);

  } catch (error) {
    console.error('Error with mint phase management:', error);
  }
}

// Example 13: Whitelist and Merkle Proof Management
export async function whitelistManagementExample() {
  try {
    console.log('=== Whitelist Management ===');

    // Import the WhitelistManager
    const { WhitelistManager } = await import('@/lib/contract-service');
    const whitelistManager = new WhitelistManager();

    // Add addresses to whitelist
    whitelistManager.addAddress("0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", 5); // 5 allocation
    whitelistManager.addAddress("0x123d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", 3); // 3 allocation
    whitelistManager.addAddress("0x456d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", 1); // 1 allocation

    // Add multiple addresses
    const addresses = [
      { address: "0x789d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", allocation: 2 },
      { address: "0xabcd35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", allocation: 4 }
    ];
    whitelistManager.addMultipleAddresses(addresses);

    // Generate Merkle tree
    const merkleRoot = whitelistManager.generateMerkleTree();
    console.log('Merkle root:', merkleRoot);

    // Get proof for an address
    const proof = whitelistManager.getMerkleProof("0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", 5);
    console.log('Merkle proof:', proof);

    // Verify proof
    const isValid = whitelistManager.verifyMerkleProof("0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2", 5, proof);
    console.log('Proof is valid:', isValid);

    // Get whitelist stats
    const stats = whitelistManager.getStats();
    console.log('Whitelist stats:', stats);

    // Now use the Merkle root when adding a whitelist phase
    const chainId = 6343;
    const collectionAddress = "0x1234567890123456789012345678901234567890";

    const whitelistPhaseConfig = {
      name: "Whitelist Sale",
      description: "Exclusive whitelist mint phase",
      startTime: Math.floor(Date.now() / 1000),
      endTime: Math.floor(Date.now() / 1000) + 86400 * 3, // 3 days
      price: "0.03", // 0.03 ETH
      maxSupply: 500,
      maxPerWallet: 5,
      maxPerTransaction: 5,
      merkleRoot: merkleRoot,
      requiresWhitelist: true
    };

    const addWhitelistPhaseTx = await contractService.addMintPhase(chainId, collectionAddress, whitelistPhaseConfig);
    console.log('Whitelist phase added:', addWhitelistPhaseTx);

    // Mint with proof
    const mintWithProofTx = await contractService.mintNFT(chainId, collectionAddress, 0, 2, proof);
    console.log('Mint with proof transaction:', mintWithProofTx);

  } catch (error) {
    console.error('Error with whitelist management:', error);
  }
}

// Example 14: Role-Based Access Control
export async function accessControlExample() {
  try {
    const chainId = 6343;
    const collectionAddress = "0x1234567890123456789012345678901234567890";
    const userAddress = "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";

    console.log('=== Access Control Management ===');

    // Check current roles
    const adminRights = await contractService.checkAdminRights(chainId, collectionAddress, userAddress);
    console.log('Admin rights:', adminRights);

    // Grant admin role (OddsLaunchpad only has ADMIN_ROLE)
    const grantAdminTx = await contractService.grantRole(chainId, collectionAddress, 'ADMIN', userAddress);
    console.log('Grant admin role transaction:', grantAdminTx);

    // Check if user has admin role
    const hasAdminRole = await contractService.hasRole(chainId, collectionAddress, 'ADMIN', userAddress);
    console.log('Has admin role:', hasAdminRole);

    // Revoke role (be careful!)
    // const revokeTx = await contractService.revokeRole(chainId, collectionAddress, 'ADMIN', userAddress);
    // console.log('Revoke admin role transaction:', revokeTx);

  } catch (error) {
    console.error('Error with access control:', error);
  }
}

// Example 15: Mint Cost Analysis and Strategy
export async function mintCostAnalysisExample() {
  try {
    const chainId = 6343;
    const collectionAddress = "0x1234567890123456789012345678901234567890";

    console.log('=== Mint Cost Analysis ===');

    // Get all active phases and analyze costs
    const activePhases = await contractService.getActiveMintPhases(chainId, collectionAddress);
    console.log('Active phases:', activePhases.length);

    for (let i = 0; i < activePhases.length; i++) {
      const phase = activePhases[i];
      console.log(`\nAnalyzing phase: ${phase.name}`);

      // Calculate costs for different quantities
      const quantities = [1, 5, 10];
      for (const qty of quantities) {
        try {
          const cost = await contractService.calculateMintCost(chainId, collectionAddress, i, qty);
          console.log(`  ${qty} NFTs: ${cost.totalCost} ETH (mint: ${cost.mintCost}, fee: ${cost.platformFee}, free: ${cost.isFreeMint})`);
        } catch (error) {
          console.log(`  ${qty} NFTs: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Find the most cost-effective phase
    if (activePhases.length > 0) {
      let bestPhase = activePhases[0];
      let bestCostPerNFT = parseFloat(bestPhase.price);

      for (const phase of activePhases) {
        const costPerNFT = parseFloat(phase.price);
        if (costPerNFT < bestCostPerNFT) {
          bestCostPerNFT = costPerNFT;
          bestPhase = phase;
        }
      }

      console.log(`\n🏆 Most cost-effective phase: ${bestPhase.name} at ${bestPhase.price} ETH per NFT`);
    }

  } catch (error) {
    console.error('Error with mint cost analysis:', error);
  }
}

/**
 * COMPLETE WORKFLOW EXAMPLE
 */

// Example 16: Complete Launchpad Creation and Management Workflow
export async function completeWorkflowExample() {
  try {
    const chainId = 6343;

    console.log('=== Complete Launchpad Workflow ===');

    // Step 1: Check factory information
    console.log('\n1. Checking factory information...');
    const factoryInfo = await contractService.getFactoryInfo(chainId);
    console.log('Factory Info:', factoryInfo);

    // Step 2: Get creation fee from factory info
    console.log('\n2. Getting creation fee...');
    const creationFee = factoryInfo.creationFeeAmount;
    console.log('Creation Fee:', `${creationFee} ETH`);

    // Step 3: Create launchpad
    console.log('\n3. Creating launchpad...');
    const launchpadRequest = {
      name: "Workflow Example Collection",
      symbol: "WEC",
      description: "A complete workflow example collection",
      baseURI: "https://api.workflow-example.com/metadata/",
      unrevealedURI: "https://api.workflow-example.com/unrevealed.json",
      contractURI: "https://api.workflow-example.com/contract.json",
      externalLink: "https://workflow-example.com",
      totalMaxSupply: 5000,
      treasury: "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2",
      royaltyRecipient: "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2",
      royaltyPercentage: 500 // 5%
    };

    const createTx = await contractService.createLaunchpad(chainId, launchpadRequest);
    console.log('Creation Transaction:', createTx);

    // Step 4: Wait and get updated launchpad count
    console.log('\n4. Checking updated launchpad count...');
    setTimeout(async () => {
      const updatedFactoryInfo = await contractService.getFactoryInfo(chainId);
      console.log('New Total Launchpads:', updatedFactoryInfo.totalCollections);

      // Step 5: Get all launchpads
      console.log('\n5. Getting all launchpads...');
      const allLaunchpads = await contractService.getAllLaunchpads(chainId);
      console.log('Total Launchpads Found:', allLaunchpads.length);
    }, 10000); // Wait 10 seconds for transaction confirmation

  } catch (error) {
    console.error('Error in complete workflow:', error);
  }
}

// Example 17: Marketplace Operations and OpenSea Compatibility
export async function marketplaceOperationsExample() {
  try {
    const chainId = 6343;
    const collectionAddress = "0x1234567890123456789012345678901234567890";

    console.log('=== Marketplace Operations ===');

    // Check OpenSea compatibility
    const compatibility = await contractService.checkOpenseaCompatibility(chainId, collectionAddress);
    console.log('OpenSea Compatibility:', compatibility);

    // Generate OpenSea metadata
    const metadata = await contractService.generateOpenSeaMetadata(chainId, collectionAddress);
    console.log('OpenSea Metadata:', metadata);

    // Check interface support
    const interfaces = await contractService.checkInterfaceSupport(chainId, collectionAddress);
    console.log('Supported Interfaces:', interfaces);

    // Test marketplace transfers
    const tokenId = 1;
    const marketplaces = ['opensea', 'looksrare', 'blur'] as const;

    for (const marketplace of marketplaces) {
      try {
        const transferTest = await contractService.testMarketplaceTransfer(chainId, collectionAddress, tokenId, marketplace);
        console.log(`${marketplace} transfer test:`, transferTest);
      } catch (error) {
        console.log(`${marketplace} test failed:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Setup marketplace integration
    const setupTxs = await contractService.setupMarketplaceIntegration(chainId, collectionAddress, ['opensea', 'looksrare']);
    console.log('Marketplace setup transactions:', setupTxs);

    // Manage operator filtering
    const enableFilteringTx = await contractService.setOperatorFiltering(chainId, collectionAddress, true);
    console.log('Enable operator filtering:', enableFilteringTx);

    // Block specific operator
    const maliciousOperator = "0x0000000000000000000000000000000000000000";
    const blockTx = await contractService.blockOperator(chainId, collectionAddress, maliciousOperator, true);
    console.log('Block operator transaction:', blockTx);

    // Check if operator is blocked
    const isBlocked = await contractService.isOperatorBlocked(chainId, collectionAddress, maliciousOperator);
    console.log('Operator is blocked:', isBlocked);

  } catch (error) {
    console.error('Error with marketplace operations:', error);
  }
}

// Example 18: Gas Analysis and Network Health
export async function gasAnalysisExample() {
  try {
    const chainId = 6343;

    console.log('=== Gas Analysis ===');

    // Estimate gas costs for common operations
    const gasCosts = await contractService.estimateGasCosts(chainId);
    console.log('Gas cost estimates:', gasCosts);

    // Check network health
    const networkHealth = await contractService.checkNetworkHealth(chainId);
    console.log('Network health:', networkHealth);

    // Create gas analyzer for detailed analysis
    const { GasAnalyzer } = await import('@/lib/contract-service');
    const gasAnalyzer = new GasAnalyzer();

    // Analyze specific operation (example)
    // const operation = await gasAnalyzer.analyzeOperation('Mint NFT', async () => {
    //   return await contractService.estimateGas(...);
    // });

    const summary = gasAnalyzer.getSummary();
    console.log('Gas analysis summary:', summary);

    // Network monitoring example
    const { NetworkChecker } = await import('@/lib/contract-service');
    const networkChecker = new NetworkChecker();

    const health = await networkChecker.checkHealth();
    console.log('Network health check:', health);

    // Monitor network for a short period
    // const monitoring = await networkChecker.monitorNetwork(30000, 5000); // 30 seconds, 5 second intervals
    // console.log('Network monitoring results:', monitoring);

  } catch (error) {
    console.error('Error with gas analysis:', error);
  }
}

// Example 19: Token Operations
export async function tokenOperationsExample() {
  try {
    const chainId = 6343;
    const collectionAddress = "0x1234567890123456789012345678901234567890";
    const tokenId = 1;
    const userAddress = "0x742d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";

    console.log('=== Token Operations ===');

    // Get token owner
    const owner = await contractService.getTokenOwner(chainId, collectionAddress, tokenId);
    console.log('Token owner:', owner);

    // Get token URI
    const tokenURI = await contractService.getTokenURI(chainId, collectionAddress, tokenId);
    console.log('Token URI:', tokenURI);

    // Approve token
    const spender = "0x123d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";
    const approveTx = await contractService.approveToken(chainId, collectionAddress, spender, tokenId);
    console.log('Approve transaction:', approveTx);

    // Set approval for all
    const operator = "0x456d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";
    const approveAllTx = await contractService.setApprovalForAll(chainId, collectionAddress, operator, true);
    console.log('Approve all transaction:', approveAllTx);

    // Transfer token
    const recipient = "0x789d35Cc6C4C6754F7Ae2F36c2D4b9B5F7e5A8a2";
    const transferTx = await contractService.transferFrom(chainId, collectionAddress, owner, recipient, tokenId);
    console.log('Transfer transaction:', transferTx);

    // Safe transfer with data
    const safeTransferTx = await contractService.safeTransferFrom(
      chainId,
      collectionAddress,
      owner,
      recipient,
      tokenId,
      '0x1234' // Optional data
    );
    console.log('Safe transfer transaction:', safeTransferTx);

  } catch (error) {
    console.error('Error with token operations:', error);
  }
}

// Export all examples
export const contractServiceExamples = {
  getFactoryInformation,
  getPlatformFeeInformation,
  createLaunchpadExample,
  getAllLaunchpadsExample,
  getLaunchpadInformationExample,
  updateFactorySettingsExample,
  ownershipOperationsExample,
  nftCollectionOperationsExample,
  analyticsAndExportExample,
  bulkOperationsExample,
  utilityFunctionsExample,
  mintPhaseManagementExample,
  whitelistManagementExample,
  accessControlExample,
  mintCostAnalysisExample,
  marketplaceOperationsExample,
  gasAnalysisExample,
  tokenOperationsExample,
  completeWorkflowExample
};

/**
 * USAGE IN REACT COMPONENTS
 */

/*
// Example React component usage:

import { useEffect, useState } from 'react';
import { ContractService } from '@/lib/contract-service';

export function LaunchpadDashboard() {
  const [factoryInfo, setFactoryInfo] = useState(null);
  const [launchpads, setLaunchpads] = useState([]);
  const [loading, setLoading] = useState(true);

  const contractService = new ContractService();
  const chainId = 6343;

  useEffect(() => {
    async function loadData() {
      try {
        // Load factory info and launchpads in parallel
        const [info, pads] = await Promise.all([
          contractService.getFactoryInfo(chainId),
          contractService.getAllLaunchpads(chainId)
        ]);

        setFactoryInfo(info);
        setLaunchpads(pads);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCreateLaunchpad = async (request) => {
    try {
      const txHash = await contractService.createLaunchpad(chainId, request);
      console.log('Created launchpad:', txHash);

      // Refresh launchpads after creation
      const updatedLaunchpads = await contractService.getAllLaunchpads(chainId);
      setLaunchpads(updatedLaunchpads);
    } catch (error) {
      console.error('Error creating launchpad:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Launchpad Dashboard</h1>

      <div>
        <h2>Factory Info</h2>
        <p>Version: {factoryInfo?.version}</p>
        <p>Total Collections: {factoryInfo?.totalCollections}</p>
        <p>Creation Fee: {factoryInfo?.creationFeeAmount} ETH</p>
      </div>

      <div>
        <h2>Launchpads ({launchpads.length})</h2>
        {launchpads.map((launchpad) => (
          <div key={launchpad.id}>
            <h3>{launchpad.name} ({launchpad.symbol})</h3>
            <p>Creator: {contractService.formatAddress(launchpad.creator)}</p>
            <p>Address: {contractService.formatAddress(launchpad.contractAddress)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
*/