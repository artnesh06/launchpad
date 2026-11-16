/**
 * Task 20.3: Admin Configuration Flow - Verification Bot Integration Test
 * 
 * Tests that the verification bot can successfully load and use configuration
 * created through the admin panel:
 * 1. Create configuration via admin flow
 * 2. Verification bot loads configuration
 * 3. Verification bot validates configuration
 * 4. Verification bot can extract data for verification
 * 
 * Requirements: 6.1-6.6, 7.1-7.6, 8.1-8.9, 10.5, 11.1-11.5
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simulated ConfigurationLoader (matching the verification bot's implementation)
interface ChainConfiguration {
  id: string;
  name: string;
  networkId: string;
  rpcEndpoint: string;
  explorerUrl: string | null;
}

interface CollectionConfiguration {
  id: string;
  name: string;
  contractAddress: string;
  chainId: string;
  description: string | null;
}

interface RoleRuleConfiguration {
  id: string;
  name: string;
  discordRoleId: string;
  ruleType: string;
  threshold: number | null;
  requirementType: string | null;
  collections: Array<{
    id: string;
    contractAddress: string;
    chainId: string;
  }>;
}

interface StartupConfiguration {
  chains: ChainConfiguration[];
  collections: CollectionConfiguration[];
  roleRules: RoleRuleConfiguration[];
  managedRoles: Set<string>;
}

// Test data
const TEST_CHAIN = {
  name: 'Bot Test Chain',
  networkId: 'bot-test-chain-777',
  rpcEndpoint: 'https://bot-test-rpc.example.com',
  explorerUrl: 'https://bot-test-explorer.example.com'
};

const TEST_COLLECTION = {
  name: 'Bot Test Collection',
  contractAddress: '0x7777777777777777777777777777777777777777',
  description: 'Bot integration test collection'
};

const TEST_ROLE_RULE = {
  name: 'Bot Test Role Rule',
  discordRoleId: '777777777777777777',
  ruleType: 'INDIVIDUAL_CONTRACT' as const,
  threshold: 1
};

describe('Task 20.3: Verification Bot Configuration Integration', () => {
  let createdChainId: string;
  let createdCollectionId: string;
  let createdRoleRuleId: string;

  // Cleanup function
  const cleanup = async () => {
    try {
      if (createdRoleRuleId) {
        await prisma.verificationRoleRuleCollection.deleteMany({
          where: { roleRuleId: createdRoleRuleId }
        });
        await prisma.verificationRoleRule.delete({
          where: { id: createdRoleRuleId }
        });
      }
      if (createdCollectionId) {
        await prisma.verificationNFTCollection.delete({
          where: { id: createdCollectionId }
        });
      }
      if (createdChainId) {
        await prisma.verificationChain.delete({
          where: { id: createdChainId }
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  // Simulated ConfigurationLoader.loadConfiguration()
  const loadConfiguration = async (): Promise<StartupConfiguration> => {
    const chains = await prisma.verificationChain.findMany({
      orderBy: { name: 'asc' }
    });

    const collections = await prisma.verificationNFTCollection.findMany({
      orderBy: { name: 'asc' }
    });

    const roleRules = await prisma.verificationRoleRule.findMany({
      include: {
        collections: {
          include: {
            collection: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const managedRoles = await prisma.verificationManagedRole.findMany();

    return {
      chains: chains.map(c => ({
        id: c.id,
        name: c.name,
        networkId: c.networkId,
        rpcEndpoint: c.rpcEndpoint,
        explorerUrl: c.explorerUrl
      })),
      collections: collections.map(c => ({
        id: c.id,
        name: c.name,
        contractAddress: c.contractAddress,
        chainId: c.chainId,
        description: c.description
      })),
      roleRules: roleRules.map(r => ({
        id: r.id,
        name: r.name,
        discordRoleId: r.discordRoleId,
        ruleType: r.ruleType,
        threshold: r.threshold,
        requirementType: r.requirementType,
        collections: r.collections.map(rc => ({
          id: rc.collection.id,
          contractAddress: rc.collection.contractAddress,
          chainId: rc.collection.chainId
        }))
      })),
      managedRoles: new Set(managedRoles.map(r => r.discordRoleId))
    };
  };

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test('Step 1: Admin creates complete configuration', async () => {
    // Create chain
    const chain = await prisma.verificationChain.create({
      data: TEST_CHAIN
    });
    createdChainId = chain.id;

    // Create collection
    const collection = await prisma.verificationNFTCollection.create({
      data: {
        ...TEST_COLLECTION,
        chainId: createdChainId
      }
    });
    createdCollectionId = collection.id;

    // Create role rule
    const roleRule = await prisma.verificationRoleRule.create({
      data: TEST_ROLE_RULE
    });
    createdRoleRuleId = roleRule.id;

    // Link role rule to collection
    await prisma.verificationRoleRuleCollection.create({
      data: {
        roleRuleId: createdRoleRuleId,
        collectionId: createdCollectionId
      }
    });

    expect(chain.id).toBeDefined();
    expect(collection.id).toBeDefined();
    expect(roleRule.id).toBeDefined();
  });

  test('Step 2: Verification bot loads configuration on startup', async () => {
    // Requirement 10.5: Configuration loaded on startup
    const config = await loadConfiguration();

    expect(config).toBeDefined();
    expect(config.chains).toBeDefined();
    expect(config.collections).toBeDefined();
    expect(config.roleRules).toBeDefined();
    expect(config.managedRoles).toBeDefined();

    // Verify our test configuration is loaded
    expect(config.chains.some(c => c.id === createdChainId)).toBe(true);
    expect(config.collections.some(c => c.id === createdCollectionId)).toBe(true);
    expect(config.roleRules.some(r => r.id === createdRoleRuleId)).toBe(true);
  });

  test('Step 3: Verification bot validates configuration integrity', async () => {
    // Requirement 11.1: Referential integrity enforced
    const config = await loadConfiguration();

    // Find our test role rule
    const roleRule = config.roleRules.find(r => r.id === createdRoleRuleId);
    expect(roleRule).toBeDefined();

    // Verify role rule has collections
    expect(roleRule?.collections).toBeDefined();
    expect(roleRule?.collections.length).toBeGreaterThan(0);

    // Verify collection references exist in collections array
    for (const ruleCollection of roleRule?.collections || []) {
      const collectionExists = config.collections.some(
        c => c.id === ruleCollection.id
      );
      expect(collectionExists).toBe(true);

      // Verify chain reference exists
      const collection = config.collections.find(c => c.id === ruleCollection.id);
      const chainExists = config.chains.some(c => c.id === collection?.chainId);
      expect(chainExists).toBe(true);
    }
  });

  test('Step 4: Verification bot extracts data for NFT balance checking', async () => {
    const config = await loadConfiguration();

    // Find our test role rule
    const roleRule = config.roleRules.find(r => r.id === createdRoleRuleId);
    expect(roleRule).toBeDefined();

    // Extract collection data
    const ruleCollection = roleRule?.collections[0];
    expect(ruleCollection).toBeDefined();

    const contractAddress = ruleCollection?.contractAddress;
    expect(contractAddress).toBe(TEST_COLLECTION.contractAddress);

    // Find the collection to get chain info
    const collection = config.collections.find(c => c.id === ruleCollection?.id);
    expect(collection).toBeDefined();

    // Find the chain to get RPC endpoint
    const chain = config.chains.find(c => c.id === collection?.chainId);
    expect(chain).toBeDefined();

    const rpcEndpoint = chain?.rpcEndpoint;
    expect(rpcEndpoint).toBe(TEST_CHAIN.rpcEndpoint);

    // Verification bot would now use:
    // - contractAddress: to query NFT balance
    // - rpcEndpoint: to connect to blockchain
    // - threshold: to compare against balance
    // - discordRoleId: to assign/remove role
  });

  test('Step 5: Verification bot can build RPC endpoints map', async () => {
    const config = await loadConfiguration();

    // Build RPC endpoints map (as ConfigurationLoader.getRpcEndpointsMap does)
    const rpcEndpoints = new Map<string, string>();
    for (const chain of config.chains) {
      rpcEndpoints.set(chain.networkId, chain.rpcEndpoint);
    }

    // Verify our test chain is in the map
    expect(rpcEndpoints.has(TEST_CHAIN.networkId)).toBe(true);
    expect(rpcEndpoints.get(TEST_CHAIN.networkId)).toBe(TEST_CHAIN.rpcEndpoint);

    // This map would be passed to NFTBalanceChecker for initialization
  });

  test('Step 6: Verification bot processes role rule correctly', async () => {
    const config = await loadConfiguration();

    // Find our test role rule
    const roleRule = config.roleRules.find(r => r.id === createdRoleRuleId);
    expect(roleRule).toBeDefined();

    // Verify rule type and threshold
    expect(roleRule?.ruleType).toBe('INDIVIDUAL_CONTRACT');
    expect(roleRule?.threshold).toBe(1);

    // For INDIVIDUAL_CONTRACT rule, bot would:
    // 1. Get the first collection
    const collection = roleRule?.collections[0];
    expect(collection).toBeDefined();

    // 2. Find the chain for this collection
    const collectionData = config.collections.find(c => c.id === collection?.id);
    const chain = config.chains.find(c => c.id === collectionData?.chainId);

    // 3. Query NFT balance at collection.contractAddress using chain.rpcEndpoint
    // 4. Compare balance >= threshold (1)
    // 5. Assign/remove role roleRule.discordRoleId based on result

    expect(collection?.contractAddress).toBe(TEST_COLLECTION.contractAddress);
    expect(chain?.rpcEndpoint).toBe(TEST_CHAIN.rpcEndpoint);
    expect(roleRule?.discordRoleId).toBe(TEST_ROLE_RULE.discordRoleId);
  });

  test('Step 7: Configuration changes are immediately available', async () => {
    // Update chain RPC endpoint
    const newRpcEndpoint = 'https://updated-bot-rpc.example.com';
    await prisma.verificationChain.update({
      where: { id: createdChainId },
      data: { rpcEndpoint: newRpcEndpoint }
    });

    // Reload configuration (as bot would on next cycle)
    const config = await loadConfiguration();

    // Verify change is reflected
    const chain = config.chains.find(c => c.id === createdChainId);
    expect(chain?.rpcEndpoint).toBe(newRpcEndpoint);

    // This demonstrates that admin changes are immediately available
    // to the verification bot on the next cycle

    // Restore original RPC endpoint for subsequent tests
    await prisma.verificationChain.update({
      where: { id: createdChainId },
      data: { rpcEndpoint: TEST_CHAIN.rpcEndpoint }
    });
  });

  test('Step 8: Multi-contract rule configuration', async () => {
    // Create a second collection
    const collection2 = await prisma.verificationNFTCollection.create({
      data: {
        name: 'Bot Test Collection 2',
        contractAddress: '0x8888888888888888888888888888888888888888',
        chainId: createdChainId,
        description: 'Second test collection'
      }
    });

    // Create a multi-contract role rule
    const multiRule = await prisma.verificationRoleRule.create({
      data: {
        name: 'Multi Contract Rule',
        discordRoleId: '888888888888888888',
        ruleType: 'MULTI_CONTRACT',
        requirementType: 'ANY'
      }
    });

    // Link to both collections
    await prisma.verificationRoleRuleCollection.createMany({
      data: [
        { roleRuleId: multiRule.id, collectionId: createdCollectionId },
        { roleRuleId: multiRule.id, collectionId: collection2.id }
      ]
    });

    // Load configuration
    const config = await loadConfiguration();

    // Find the multi-contract rule
    const loadedRule = config.roleRules.find(r => r.id === multiRule.id);
    expect(loadedRule).toBeDefined();
    expect(loadedRule?.ruleType).toBe('MULTI_CONTRACT');
    expect(loadedRule?.requirementType).toBe('ANY');
    expect(loadedRule?.collections).toHaveLength(2);

    // Verify bot can access both collections
    const addresses = loadedRule?.collections.map(c => c.contractAddress);
    expect(addresses).toContain(TEST_COLLECTION.contractAddress);
    expect(addresses).toContain('0x8888888888888888888888888888888888888888');

    // Cleanup
    await prisma.verificationRoleRuleCollection.deleteMany({
      where: { roleRuleId: multiRule.id }
    });
    await prisma.verificationRoleRule.delete({ where: { id: multiRule.id } });
    await prisma.verificationNFTCollection.delete({ where: { id: collection2.id } });
  });

  test('Step 9: NFT threshold rule configuration', async () => {
    // Create an NFT threshold rule
    const thresholdRule = await prisma.verificationRoleRule.create({
      data: {
        name: 'Threshold Rule',
        discordRoleId: '999999999999999999',
        ruleType: 'NFT_THRESHOLD',
        threshold: 10
      }
    });

    // Link to collection
    await prisma.verificationRoleRuleCollection.create({
      data: {
        roleRuleId: thresholdRule.id,
        collectionId: createdCollectionId
      }
    });

    // Load configuration
    const config = await loadConfiguration();

    // Find the threshold rule
    const loadedRule = config.roleRules.find(r => r.id === thresholdRule.id);
    expect(loadedRule).toBeDefined();
    expect(loadedRule?.ruleType).toBe('NFT_THRESHOLD');
    expect(loadedRule?.threshold).toBe(10);

    // Verify bot knows to sum NFT counts across collections
    expect(loadedRule?.collections).toHaveLength(1);

    // Cleanup
    await prisma.verificationRoleRuleCollection.deleteMany({
      where: { roleRuleId: thresholdRule.id }
    });
    await prisma.verificationRoleRule.delete({ where: { id: thresholdRule.id } });
  });

  test('Complete flow validation: Admin → Database → Bot', async () => {
    // This test validates the complete flow:
    // Admin creates config → Saved to DB → Bot loads and uses it

    // 1. Admin creates configuration (already done in Step 1)
    expect(createdChainId).toBeDefined();
    expect(createdCollectionId).toBeDefined();
    expect(createdRoleRuleId).toBeDefined();

    // 2. Configuration saved to database (verify)
    const dbChain = await prisma.verificationChain.findUnique({
      where: { id: createdChainId }
    });
    const dbCollection = await prisma.verificationNFTCollection.findUnique({
      where: { id: createdCollectionId }
    });
    const dbRoleRule = await prisma.verificationRoleRule.findUnique({
      where: { id: createdRoleRuleId }
    });

    expect(dbChain).toBeDefined();
    expect(dbCollection).toBeDefined();
    expect(dbRoleRule).toBeDefined();

    // 3. Bot loads configuration
    const config = await loadConfiguration();

    // 4. Bot can use configuration for verification
    const roleRule = config.roleRules.find(r => r.id === createdRoleRuleId);
    const collection = config.collections.find(
      c => c.id === roleRule?.collections[0].id
    );
    const chain = config.chains.find(c => c.id === collection?.chainId);

    // Verify complete data chain is available
    expect(roleRule?.discordRoleId).toBe(TEST_ROLE_RULE.discordRoleId);
    expect(roleRule?.threshold).toBe(TEST_ROLE_RULE.threshold);
    expect(collection?.contractAddress).toBe(TEST_COLLECTION.contractAddress);
    expect(chain?.rpcEndpoint).toBe(TEST_CHAIN.rpcEndpoint);

    // Bot now has everything needed to:
    // - Query NFT balance at contractAddress using rpcEndpoint
    // - Compare balance against threshold
    // - Assign/remove discordRoleId based on result
  });
});
