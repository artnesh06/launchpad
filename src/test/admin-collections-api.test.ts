/**
 * Admin Collection Configuration API Tests
 * 
 * Tests for collection configuration CRUD endpoints.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { verificationDb } from '@/lib/verification-db';

describe('Admin Collection Configuration API', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let testChainId: string | null = null;
  let testCollectionId: string | null = null;

  // Cleanup function to remove test data
  const cleanup = async () => {
    try {
      // Delete test collections
      await verificationDb.verificationNFTCollection.deleteMany({
        where: {
          OR: [
            { name: { contains: 'Test Collection' } },
            { contractAddress: { startsWith: '0x1234' } },
            { contractAddress: { startsWith: '0xabcd' } },
          ],
        },
      });

      // Delete test chains
      await verificationDb.verificationChain.deleteMany({
        where: {
          networkId: { startsWith: 'test-collection-chain-' },
        },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  beforeAll(async () => {
    await cleanup();

    // Create a test chain for collections
    const chain = await verificationDb.verificationChain.create({
      data: {
        name: 'Test Collection Chain',
        networkId: 'test-collection-chain-1',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      },
    });
    testChainId = chain.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('GET /api/admin/collections', () => {
    it('should return list of collections', async () => {
      const response = await fetch(`${baseUrl}/api/admin/collections`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return collections ordered by creation date', async () => {
      const response = await fetch(`${baseUrl}/api/admin/collections`);
      const data = await response.json();

      if (data.data.length > 1) {
        const dates = data.data.map((collection: any) => new Date(collection.createdAt).getTime());
        const sortedDates = [...dates].sort((a, b) => b - a);
        expect(dates).toEqual(sortedDates);
      }
    });

    it('should include chain information in response', async () => {
      const response = await fetch(`${baseUrl}/api/admin/collections`);
      const data = await response.json();

      if (data.data.length > 0) {
        const collection = data.data[0];
        expect(collection).toHaveProperty('chain');
        expect(collection.chain).toHaveProperty('id');
        expect(collection.chain).toHaveProperty('name');
      }
    });
  });

  describe('POST /api/admin/collections', () => {
    it('should create a new collection with valid data', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      const collectionData = {
        name: 'Test Collection 1',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: testChainId,
        description: 'A test NFT collection',
      };

      const response = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(collectionData.name);
      expect(data.data.contractAddress).toBe(collectionData.contractAddress);
      expect(data.data.chainId).toBe(collectionData.chainId);
      expect(data.data.description).toBe(collectionData.description);
      expect(data.data).toHaveProperty('chain');

      // Store for later tests
      testCollectionId = data.data.id;
    });

    it('should reject collection with missing name', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      const collectionData = {
        contractAddress: '0xabcd567890123456789012345678901234567890',
        chainId: testChainId,
      };

      const response = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('Collection name is required');
    });

    it('should reject collection with missing contract address', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      const collectionData = {
        name: 'Test Collection No Address',
        chainId: testChainId,
      };

      const response = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('Contract address is required');
    });

    it('should reject collection with missing chain ID', async () => {
      const collectionData = {
        name: 'Test Collection No Chain',
        contractAddress: '0xabcd567890123456789012345678901234567891',
      };

      const response = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('Chain selection is required');
    });

    it('should reject collection with invalid contract address format', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      const collectionData = {
        name: 'Test Collection Invalid Address',
        contractAddress: 'not-a-valid-address',
        chainId: testChainId,
      };

      const response = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors.some((e: string) => e.includes('valid Ethereum address'))).toBe(true);
    });

    it('should reject collection with short contract address', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      const collectionData = {
        name: 'Test Collection Short Address',
        contractAddress: '0x1234',
        chainId: testChainId,
      };

      const response = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors.some((e: string) => e.includes('valid Ethereum address'))).toBe(true);
    });

    it('should reject collection with non-existent chain', async () => {
      const collectionData = {
        name: 'Test Collection Non-existent Chain',
        contractAddress: '0xabcd567890123456789012345678901234567892',
        chainId: 'non-existent-chain-id',
      };

      const response = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors.some((e: string) => e.includes('does not exist'))).toBe(true);
    });

    it('should reject duplicate contract address on same chain', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      // First, create a collection
      const collectionData1 = {
        name: 'Test Collection Duplicate 1',
        contractAddress: '0xabcd567890123456789012345678901234567893',
        chainId: testChainId,
      };

      await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData1),
      });

      // Try to create another collection with the same contract address on the same chain
      const collectionData2 = {
        name: 'Test Collection Duplicate 2',
        contractAddress: '0xabcd567890123456789012345678901234567893',
        chainId: testChainId,
      };

      const response = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData2),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors.some((e: string) => e.includes('already exists on this chain'))).toBe(true);
    });

    it('should allow same contract address on different chains', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      // Create a second test chain
      const chain2 = await verificationDb.verificationChain.create({
        data: {
          name: 'Test Collection Chain 2',
          networkId: 'test-collection-chain-2',
          rpcEndpoint: 'https://rpc.ankr.com/polygon',
        },
      });

      const contractAddress = '0xabcd567890123456789012345678901234567894';

      // Create collection on first chain
      const collectionData1 = {
        name: 'Test Collection Chain 1',
        contractAddress: contractAddress,
        chainId: testChainId,
      };

      const response1 = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData1),
      });

      expect(response1.status).toBe(201);

      // Create collection with same address on second chain
      const collectionData2 = {
        name: 'Test Collection Chain 2',
        contractAddress: contractAddress,
        chainId: chain2.id,
      };

      const response2 = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData2),
      });

      expect(response2.status).toBe(201);

      const data2 = await response2.json();
      expect(data2).toHaveProperty('success', true);
      expect(data2.data.contractAddress).toBe(contractAddress);
      expect(data2.data.chainId).toBe(chain2.id);

      // Cleanup
      await verificationDb.verificationChain.delete({
        where: { id: chain2.id },
      });
    });
  });

  describe('PUT /api/admin/collections/:id', () => {
    it('should update an existing collection', async () => {
      if (!testCollectionId || !testChainId) {
        console.warn('⚠️ No test collection ID available - skipping test');
        return;
      }

      const updatedData = {
        name: 'Test Collection 1 Updated',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: testChainId,
        description: 'Updated description',
      };

      const response = await fetch(`${baseUrl}/api/admin/collections/${testCollectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data.name).toBe(updatedData.name);
      expect(data.data.description).toBe(updatedData.description);
    });

    it('should return 404 for non-existent collection', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      const updatedData = {
        name: 'Non-existent Collection',
        contractAddress: '0xabcd567890123456789012345678901234567895',
        chainId: testChainId,
      };

      const response = await fetch(`${baseUrl}/api/admin/collections/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Collection not found');
    });

    it('should reject update with invalid data', async () => {
      if (!testCollectionId || !testChainId) {
        console.warn('⚠️ No test collection ID available - skipping test');
        return;
      }

      const updatedData = {
        name: '',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: testChainId,
      };

      const response = await fetch(`${baseUrl}/api/admin/collections/${testCollectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
    });

    it('should allow updating collection with same contract address', async () => {
      if (!testCollectionId || !testChainId) {
        console.warn('⚠️ No test collection ID available - skipping test');
        return;
      }

      const updatedData = {
        name: 'Test Collection Same Address',
        contractAddress: '0x1234567890123456789012345678901234567890',
        chainId: testChainId,
        description: 'Same address update',
      };

      const response = await fetch(`${baseUrl}/api/admin/collections/${testCollectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
    });
  });

  describe('DELETE /api/admin/collections/:id', () => {
    it('should return 404 for non-existent collection', async () => {
      const response = await fetch(`${baseUrl}/api/admin/collections/non-existent-id`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Collection not found');
    });

    it('should prevent deletion of collection with dependencies', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      // Create a collection
      const collectionData = {
        name: 'Test Collection With Dependencies',
        contractAddress: '0xabcd567890123456789012345678901234567896',
        chainId: testChainId,
      };

      const collectionResponse = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      const collectionResult = await collectionResponse.json();
      const collectionId = collectionResult.data.id;

      // Create a role rule that depends on this collection
      const roleRule = await verificationDb.verificationRoleRule.create({
        data: {
          name: 'Test Role Rule',
          discordRoleId: '123456789',
          ruleType: 'INDIVIDUAL_CONTRACT',
          threshold: 1,
        },
      });

      await verificationDb.verificationRoleRuleCollection.create({
        data: {
          roleRuleId: roleRule.id,
          collectionId: collectionId,
        },
      });

      // Try to delete the collection
      const response = await fetch(`${baseUrl}/api/admin/collections/${collectionId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Cannot delete collection with dependencies');
      expect(data).toHaveProperty('dependencies');
      expect(data.dependencies.length).toBeGreaterThan(0);

      // Cleanup: delete the role rule
      await verificationDb.verificationRoleRule.delete({
        where: { id: roleRule.id },
      });
    });

    it('should successfully delete collection without dependencies', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      // Create a collection
      const collectionData = {
        name: 'Test Collection To Delete',
        contractAddress: '0xabcd567890123456789012345678901234567897',
        chainId: testChainId,
      };

      const collectionResponse = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      const collectionResult = await collectionResponse.json();
      const collectionId = collectionResult.data.id;

      // Delete the collection
      const response = await fetch(`${baseUrl}/api/admin/collections/${collectionId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message', 'Collection deleted successfully');

      // Verify collection is deleted
      const verifyResponse = await fetch(`${baseUrl}/api/admin/collections`);
      const verifyData = await verifyResponse.json();
      const deletedCollection = verifyData.data.find((c: any) => c.id === collectionId);
      expect(deletedCollection).toBeUndefined();
    });
  });

  describe('Configuration Persistence', () => {
    it('should persist collection configuration to database', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      const collectionData = {
        name: 'Test Collection Persistence',
        contractAddress: '0xabcd567890123456789012345678901234567898',
        chainId: testChainId,
        description: 'Persistence test',
      };

      // Create collection via API
      const createResponse = await fetch(`${baseUrl}/api/admin/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData),
      });

      const createData = await createResponse.json();
      const collectionId = createData.data.id;

      // Retrieve collection directly from database
      const dbCollection = await verificationDb.verificationNFTCollection.findUnique({
        where: { id: collectionId },
      });

      expect(dbCollection).not.toBeNull();
      expect(dbCollection?.name).toBe(collectionData.name);
      expect(dbCollection?.contractAddress).toBe(collectionData.contractAddress);
      expect(dbCollection?.chainId).toBe(collectionData.chainId);
      expect(dbCollection?.description).toBe(collectionData.description);

      // Cleanup
      await verificationDb.verificationNFTCollection.delete({
        where: { id: collectionId },
      });
    });

    it('should retrieve persisted collection configuration', async () => {
      if (!testChainId) {
        throw new Error('Test chain not created');
      }

      const collectionData = {
        name: 'Test Collection Retrieval',
        contractAddress: '0xabcd567890123456789012345678901234567899',
        chainId: testChainId,
      };

      // Create collection directly in database
      const dbCollection = await verificationDb.verificationNFTCollection.create({
        data: collectionData,
      });

      // Retrieve via API
      const response = await fetch(`${baseUrl}/api/admin/collections`);
      const data = await response.json();

      const retrievedCollection = data.data.find((c: any) => c.id === dbCollection.id);
      expect(retrievedCollection).not.toBeUndefined();
      expect(retrievedCollection.name).toBe(collectionData.name);
      expect(retrievedCollection.contractAddress).toBe(collectionData.contractAddress);
      expect(retrievedCollection.chainId).toBe(collectionData.chainId);

      // Cleanup
      await verificationDb.verificationNFTCollection.delete({
        where: { id: dbCollection.id },
      });
    });
  });
});
