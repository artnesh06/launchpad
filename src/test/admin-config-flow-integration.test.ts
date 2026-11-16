/**
 * Task 20.3: Complete Admin Configuration Flow Integration Test
 * 
 * Tests the complete admin configuration flow:
 * 1. Add chain → 2. Add collection → 3. Add role rule → 
 * 4. Verify in database → 5. Check verification uses new config
 * 
 * Requirements: 6.1-6.6, 7.1-7.6, 8.1-8.9, 11.1-11.5
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test data
const TEST_CHAIN = {
  name: 'Test Chain',
  networkId: 'test-chain-999',
  rpcEndpoint: 'https://test-rpc.example.com',
  explorerUrl: 'https://test-explorer.example.com'
};

const TEST_COLLECTION = {
  name: 'Test NFT Collection',
  contractAddress: '0x1234567890123456789012345678901234567890',
  description: 'Test collection for integration testing'
};

const TEST_ROLE_RULE = {
  name: 'Test Role Rule',
  discordRoleId: '123456789012345678',
  ruleType: 'INDIVIDUAL_CONTRACT' as const,
  threshold: 1
};

describe('Task 20.3: Complete Admin Configuration Flow', () => {
  let createdChainId: string;
  let createdCollectionId: string;
  let createdRoleRuleId: string;

  // Cleanup function
  const cleanup = async () => {
    try {
      // Delete in reverse order of dependencies
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

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test('Step 1: Add chain configuration', async () => {
    // Requirement 6.2: Chain configuration requires all fields
    const chain = await prisma.verificationChain.create({
      data: TEST_CHAIN
    });

    expect(chain).toBeDefined();
    expect(chain.id).toBeDefined();
    expect(chain.name).toBe(TEST_CHAIN.name);
    expect(chain.networkId).toBe(TEST_CHAIN.networkId);
    expect(chain.rpcEndpoint).toBe(TEST_CHAIN.rpcEndpoint);
    expect(chain.explorerUrl).toBe(TEST_CHAIN.explorerUrl);

    createdChainId = chain.id;

    // Requirement 6.6: Chain configurations persisted to database
    const retrieved = await prisma.verificationChain.findUnique({
      where: { id: createdChainId }
    });
    expect(retrieved).toEqual(expect.objectContaining(TEST_CHAIN));
  });

  test('Step 2: Add collection configuration', async () => {
    expect(createdChainId).toBeDefined();

    // Requirement 7.2: Collection configuration requires all fields
    const collection = await prisma.verificationNFTCollection.create({
      data: {
        ...TEST_COLLECTION,
        chainId: createdChainId
      }
    });

    expect(collection).toBeDefined();
    expect(collection.id).toBeDefined();
    expect(collection.name).toBe(TEST_COLLECTION.name);
    expect(collection.contractAddress).toBe(TEST_COLLECTION.contractAddress);
    expect(collection.chainId).toBe(createdChainId);
    expect(collection.description).toBe(TEST_COLLECTION.description);

    createdCollectionId = collection.id;

    // Requirement 7.6: Collection configurations persisted to database
    const retrieved = await prisma.verificationNFTCollection.findUnique({
      where: { id: createdCollectionId },
      include: { chain: true }
    });
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe(TEST_COLLECTION.name);
    expect(retrieved?.chain.id).toBe(createdChainId);
  });

  test('Step 3: Add role rule configuration', async () => {
    expect(createdCollectionId).toBeDefined();

    // Requirement 8.2: Role rule requires all fields
    const roleRule = await prisma.verificationRoleRule.create({
      data: TEST_ROLE_RULE
    });

    expect(roleRule).toBeDefined();
    expect(roleRule.id).toBeDefined();
    expect(roleRule.name).toBe(TEST_ROLE_RULE.name);
    expect(roleRule.discordRoleId).toBe(TEST_ROLE_RULE.discordRoleId);
    expect(roleRule.ruleType).toBe(TEST_ROLE_RULE.ruleType);
    expect(roleRule.threshold).toBe(TEST_ROLE_RULE.threshold);

    createdRoleRuleId = roleRule.id;

    // Link role rule to collection
    await prisma.verificationRoleRuleCollection.create({
      data: {
        roleRuleId: createdRoleRuleId,
        collectionId: createdCollectionId
      }
    });

    // Requirement 8.9: Role rule configurations persisted to database
    const retrieved = await prisma.verificationRoleRule.findUnique({
      where: { id: createdRoleRuleId },
      include: {
        collections: {
          include: {
            collection: true
          }
        }
      }
    });
    expect(retrieved).toBeDefined();
    expect(retrieved?.collections).toHaveLength(1);
    expect(retrieved?.collections[0].collectionId).toBe(createdCollectionId);
  });

  test('Step 4: Verify complete configuration in database', async () => {
    // Requirement 10.2, 10.3, 10.4: All configurations stored in database
    
    // Verify chain exists
    const chain = await prisma.verificationChain.findUnique({
      where: { id: createdChainId }
    });
    expect(chain).toBeDefined();
    expect(chain?.networkId).toBe(TEST_CHAIN.networkId);

    // Verify collection exists and references chain
    const collection = await prisma.verificationNFTCollection.findUnique({
      where: { id: createdCollectionId },
      include: { chain: true }
    });
    expect(collection).toBeDefined();
    expect(collection?.chainId).toBe(createdChainId);
    expect(collection?.chain.networkId).toBe(TEST_CHAIN.networkId);

    // Verify role rule exists and references collection
    const roleRule = await prisma.verificationRoleRule.findUnique({
      where: { id: createdRoleRuleId },
      include: {
        collections: {
          include: {
            collection: {
              include: {
                chain: true
              }
            }
          }
        }
      }
    });
    expect(roleRule).toBeDefined();
    expect(roleRule?.collections).toHaveLength(1);
    expect(roleRule?.collections[0].collection.id).toBe(createdCollectionId);
    expect(roleRule?.collections[0].collection.chain.id).toBe(createdChainId);

    // Requirement 11.1: Referential integrity enforced
    // Verify the complete chain: role rule → collection → chain
    expect(roleRule?.collections[0].collection.chain.networkId).toBe(TEST_CHAIN.networkId);
  });

  test('Step 5: Verify configuration can be loaded for verification service', async () => {
    // Requirement 10.5: Configuration loaded on startup
    
    // Simulate loading all configurations as verification service would
    const chains = await prisma.verificationChain.findMany();
    expect(chains.length).toBeGreaterThan(0);
    expect(chains.some(c => c.id === createdChainId)).toBe(true);

    const collections = await prisma.verificationNFTCollection.findMany({
      include: { chain: true }
    });
    expect(collections.length).toBeGreaterThan(0);
    expect(collections.some(c => c.id === createdCollectionId)).toBe(true);

    const roleRules = await prisma.verificationRoleRule.findMany({
      include: {
        collections: {
          include: {
            collection: {
              include: {
                chain: true
              }
            }
          }
        }
      }
    });
    expect(roleRules.length).toBeGreaterThan(0);
    expect(roleRules.some(r => r.id === createdRoleRuleId)).toBe(true);

    // Verify the loaded role rule has complete nested data
    const loadedRoleRule = roleRules.find(r => r.id === createdRoleRuleId);
    expect(loadedRoleRule).toBeDefined();
    expect(loadedRoleRule?.collections[0].collection.contractAddress).toBe(TEST_COLLECTION.contractAddress);
    expect(loadedRoleRule?.collections[0].collection.chain.rpcEndpoint).toBe(TEST_CHAIN.rpcEndpoint);
  });

  test('Requirement 11.3: Collection references valid chain', async () => {
    // Verify collection cannot be created with invalid chain reference
    await expect(
      prisma.verificationNFTCollection.create({
        data: {
          name: 'Invalid Collection',
          contractAddress: '0x9999999999999999999999999999999999999999',
          chainId: 'non-existent-chain-id'
        }
      })
    ).rejects.toThrow();
  });

  test('Requirement 6.5: Chain deletion warns on dependencies', async () => {
    // Attempt to delete chain that has dependent collections
    // Should fail due to RESTRICT constraint
    await expect(
      prisma.verificationChain.delete({
        where: { id: createdChainId }
      })
    ).rejects.toThrow();
  });

  test('Requirement 7.5: Collection deletion warns on dependencies', async () => {
    // Attempt to delete collection that has dependent role rules
    // Should fail due to RESTRICT constraint
    await expect(
      prisma.verificationNFTCollection.delete({
        where: { id: createdCollectionId }
      })
    ).rejects.toThrow();
  });

  test('Property 43: Configuration persistence round-trip', async () => {
    // Test that saved configuration can be retrieved identically
    
    // Chain round-trip
    const chainData = {
      name: 'Round Trip Chain',
      networkId: 'round-trip-999',
      rpcEndpoint: 'https://round-trip.example.com',
      explorerUrl: 'https://explorer.example.com'
    };
    const savedChain = await prisma.verificationChain.create({ data: chainData });
    const retrievedChain = await prisma.verificationChain.findUnique({
      where: { id: savedChain.id }
    });
    expect(retrievedChain).toMatchObject(chainData);
    await prisma.verificationChain.delete({ where: { id: savedChain.id } });

    // Collection round-trip
    const collectionData = {
      name: 'Round Trip Collection',
      contractAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      chainId: createdChainId,
      description: 'Round trip test'
    };
    const savedCollection = await prisma.verificationNFTCollection.create({
      data: collectionData
    });
    const retrievedCollection = await prisma.verificationNFTCollection.findUnique({
      where: { id: savedCollection.id }
    });
    expect(retrievedCollection).toMatchObject(collectionData);
    await prisma.verificationNFTCollection.delete({ where: { id: savedCollection.id } });

    // Role rule round-trip
    const roleRuleData = {
      name: 'Round Trip Rule',
      discordRoleId: '999999999999999999',
      ruleType: 'NFT_THRESHOLD' as const,
      threshold: 5
    };
    const savedRoleRule = await prisma.verificationRoleRule.create({
      data: roleRuleData
    });
    const retrievedRoleRule = await prisma.verificationRoleRule.findUnique({
      where: { id: savedRoleRule.id }
    });
    expect(retrievedRoleRule).toMatchObject(roleRuleData);
    await prisma.verificationRoleRule.delete({ where: { id: savedRoleRule.id } });
  });
});
