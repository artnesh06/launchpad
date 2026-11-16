/**
 * Admin Role Rules Configuration API Tests
 * 
 * Tests for role rule configuration CRUD endpoints.
 * 
 * Requirements: 8.1, 8.2, 8.8, 8.9
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { verificationDb } from '@/lib/verification-db';

describe('Admin Role Rules Configuration API', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let testRoleRuleId: string | null = null;
  let testChainId: string | null = null;
  let testCollectionId1: string | null = null;
  let testCollectionId2: string | null = null;

  // Cleanup function to remove test data
  const cleanup = async () => {
    try {
      // Delete test role rules
      await verificationDb.verificationRoleRule.deleteMany({
        where: {
          name: { contains: 'Test Role Rule' },
        },
      });

      // Delete test collections
      await verificationDb.verificationNFTCollection.deleteMany({
        where: {
          name: { contains: 'Test Collection' },
        },
      });

      // Delete test chains
      await verificationDb.verificationChain.deleteMany({
        where: {
          networkId: { startsWith: 'test-role-rule-' },
        },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  beforeAll(async () => {
    await cleanup();

    // Create test chain
    const chain = await verificationDb.verificationChain.create({
      data: {
        name: 'Test Chain for Role Rules',
        networkId: 'test-role-rule-chain-1',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      },
    });
    testChainId = chain.id;

    // Create test collections
    const collection1 = await verificationDb.verificationNFTCollection.create({
      data: {
        name: 'Test Collection 1',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: testChainId,
      },
    });
    testCollectionId1 = collection1.id;

    const collection2 = await verificationDb.verificationNFTCollection.create({
      data: {
        name: 'Test Collection 2',
        contractAddress: '0x2234567890123456789012345678901234567890',
        chainId: testChainId,
      },
    });
    testCollectionId2 = collection2.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('GET /api/admin/role-rules', () => {
    it('should return list of role rules', async () => {
      const response = await fetch(`${baseUrl}/api/admin/role-rules`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return role rules ordered by creation date', async () => {
      const response = await fetch(`${baseUrl}/api/admin/role-rules`);
      const data = await response.json();

      if (data.data.length > 1) {
        const dates = data.data.map((rule: any) => new Date(rule.createdAt).getTime());
        const sortedDates = [...dates].sort((a, b) => b - a);
        expect(dates).toEqual(sortedDates);
      }
    });
  });

  describe('POST /api/admin/role-rules', () => {
    it('should create a new individual_contract role rule with valid data', async () => {
      if (!testCollectionId1) {
        throw new Error('Test collection not created');
      }

      const roleRuleData = {
        name: 'Test Role Rule 1',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(roleRuleData.name);
      expect(data.data.discordRoleId).toBe(roleRuleData.discordRoleId);
      expect(data.data.ruleType).toBe(roleRuleData.ruleType);
      expect(data.data.threshold).toBe(roleRuleData.threshold);
      expect(data.data.collections).toHaveLength(1);

      // Store for later tests
      testRoleRuleId = data.data.id;
    });

    it('should create a multi_contract role rule with ANY requirement', async () => {
      if (!testCollectionId1 || !testCollectionId2) {
        throw new Error('Test collections not created');
      }

      const roleRuleData = {
        name: 'Test Role Rule 2',
        discordRoleId: '223456789012345678',
        ruleType: 'MULTI_CONTRACT',
        contracts: [testCollectionId1, testCollectionId2],
        requirementType: 'ANY',
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data.data.ruleType).toBe(roleRuleData.ruleType);
      expect(data.data.requirementType).toBe(roleRuleData.requirementType);
      expect(data.data.collections).toHaveLength(2);
    });

    it('should create a nft_threshold role rule', async () => {
      if (!testCollectionId1 || !testCollectionId2) {
        throw new Error('Test collections not created');
      }

      const roleRuleData = {
        name: 'Test Role Rule 3',
        discordRoleId: '323456789012345678',
        ruleType: 'NFT_THRESHOLD',
        contracts: [testCollectionId1, testCollectionId2],
        threshold: 5,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data.data.ruleType).toBe(roleRuleData.ruleType);
      expect(data.data.threshold).toBe(roleRuleData.threshold);
    });

    it('should reject role rule with missing name', async () => {
      const roleRuleData = {
        discordRoleId: '423456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('Role rule name is required');
    });

    it('should reject role rule with missing discord role ID', async () => {
      const roleRuleData = {
        name: 'Test Role Rule Missing Discord',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('Discord role selection is required');
    });

    it('should reject role rule with no contracts', async () => {
      const roleRuleData = {
        name: 'Test Role Rule No Contracts',
        discordRoleId: '523456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('At least one NFT contract must be selected');
    });

    it('should reject individual_contract rule with multiple contracts', async () => {
      const roleRuleData = {
        name: 'Test Role Rule Invalid Individual',
        discordRoleId: '623456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1, testCollectionId2],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data.errors).toContain('Individual contract rule must reference exactly one contract');
    });

    it('should reject multi_contract rule with only one contract', async () => {
      const roleRuleData = {
        name: 'Test Role Rule Invalid Multi',
        discordRoleId: '723456789012345678',
        ruleType: 'MULTI_CONTRACT',
        contracts: [testCollectionId1],
        requirementType: 'ANY',
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data.errors).toContain('Multi-contract rule must reference at least two contracts');
    });

    it('should reject role rule with non-existent collection', async () => {
      const roleRuleData = {
        name: 'Test Role Rule Invalid Collection',
        discordRoleId: '823456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: ['non-existent-collection-id'],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data.errors.some((e: string) => e.includes('does not exist'))).toBe(true);
    });

    it('should reject role rule with invalid discord role ID format', async () => {
      const roleRuleData = {
        name: 'Test Role Rule Invalid Discord ID',
        discordRoleId: 'not-a-number',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data.errors).toContain('Discord role ID must be a numeric string');
    });
  });

  describe('PUT /api/admin/role-rules/:id', () => {
    it('should update an existing role rule', async () => {
      if (!testRoleRuleId || !testCollectionId1) {
        throw new Error('Test role rule or collection not created');
      }

      const updatedData = {
        name: 'Test Role Rule 1 Updated',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1],
        threshold: 2,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules/${testRoleRuleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data.data.name).toBe(updatedData.name);
      expect(data.data.threshold).toBe(updatedData.threshold);
    });

    it('should return 404 for non-existent role rule', async () => {
      const updatedData = {
        name: 'Non-existent Role Rule',
        discordRoleId: '923456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data.error).toBe('Role rule not found');
    });

    it('should reject update with invalid data', async () => {
      if (!testRoleRuleId) {
        throw new Error('Test role rule not created');
      }

      const invalidData = {
        name: '',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1],
        threshold: 1,
      };

      const response = await fetch(`${baseUrl}/api/admin/role-rules/${testRoleRuleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
    });
  });

  describe('DELETE /api/admin/role-rules/:id', () => {
    it('should return 404 for non-existent role rule', async () => {
      const response = await fetch(`${baseUrl}/api/admin/role-rules/non-existent-id`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data.error).toBe('Role rule not found');
    });

    it('should delete an existing role rule', async () => {
      if (!testCollectionId1) {
        throw new Error('Test collection not created');
      }

      // Create a role rule to delete
      const roleRuleData = {
        name: 'Test Role Rule To Delete',
        discordRoleId: '999456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [testCollectionId1],
        threshold: 1,
      };

      const createResponse = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      const createData = await createResponse.json();
      const roleRuleId = createData.data.id;

      // Delete the role rule
      const response = await fetch(`${baseUrl}/api/admin/role-rules/${roleRuleId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data.message).toBe('Role rule deleted successfully');

      // Verify role rule is deleted
      const verifyResponse = await fetch(`${baseUrl}/api/admin/role-rules`);
      const verifyData = await verifyResponse.json();
      const deletedRule = verifyData.data.find((r: any) => r.id === roleRuleId);
      expect(deletedRule).toBeUndefined();
    });
  });

  describe('Configuration persistence round-trip', () => {
    it('should persist and retrieve role rule configuration correctly', async () => {
      if (!testCollectionId1 || !testCollectionId2) {
        throw new Error('Test collections not created');
      }

      // Create role rule via API
      const roleRuleData = {
        name: 'Test Role Rule Persistence',
        discordRoleId: '111456789012345678',
        ruleType: 'MULTI_CONTRACT',
        contracts: [testCollectionId1, testCollectionId2],
        requirementType: 'ALL',
      };

      const createResponse = await fetch(`${baseUrl}/api/admin/role-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleRuleData),
      });

      const createData = await createResponse.json();
      const roleRuleId = createData.data.id;

      // Retrieve via API
      const response = await fetch(`${baseUrl}/api/admin/role-rules`);
      const data = await response.json();

      const retrievedRule = data.data.find((r: any) => r.id === roleRuleId);
      expect(retrievedRule).toBeDefined();
      expect(retrievedRule.name).toBe(roleRuleData.name);
      expect(retrievedRule.discordRoleId).toBe(roleRuleData.discordRoleId);
      expect(retrievedRule.ruleType).toBe(roleRuleData.ruleType);
      expect(retrievedRule.requirementType).toBe(roleRuleData.requirementType);
      expect(retrievedRule.collections).toHaveLength(2);

      // Verify collections are correctly associated
      const collectionIds = retrievedRule.collections.map((c: any) => c.collectionId);
      expect(collectionIds).toContain(testCollectionId1);
      expect(collectionIds).toContain(testCollectionId2);
    });
  });
});
