/**
 * Admin Chain Configuration API Tests
 * 
 * Tests for chain configuration CRUD endpoints.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { verificationDb } from '@/lib/verification-db';

describe('Admin Chain Configuration API', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let testChainId: string | null = null;

  // Cleanup function to remove test data
  const cleanup = async () => {
    try {
      // Delete test chains
      await verificationDb.verificationChain.deleteMany({
        where: {
          OR: [
            { networkId: { startsWith: 'test-' } },
            { name: { contains: 'Test Chain' } },
          ],
        },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('GET /api/admin/chains', () => {
    it('should return list of chains', async () => {
      const response = await fetch(`${baseUrl}/api/admin/chains`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return chains ordered by creation date', async () => {
      const response = await fetch(`${baseUrl}/api/admin/chains`);
      const data = await response.json();

      if (data.data.length > 1) {
        const dates = data.data.map((chain: any) => new Date(chain.createdAt).getTime());
        const sortedDates = [...dates].sort((a, b) => b - a);
        expect(dates).toEqual(sortedDates);
      }
    });
  });

  describe('POST /api/admin/chains', () => {
    it('should create a new chain with valid data', async () => {
      const chainData = {
        name: 'Test Chain 1',
        networkId: 'test-chain-1',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
        explorerUrl: 'https://etherscan.io',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(chainData.name);
      expect(data.data.networkId).toBe(chainData.networkId);
      expect(data.data.rpcEndpoint).toBe(chainData.rpcEndpoint);
      expect(data.data.explorerUrl).toBe(chainData.explorerUrl);

      // Store for later tests
      testChainId = data.data.id;
    });

    it('should reject chain with missing name', async () => {
      const chainData = {
        networkId: 'test-chain-no-name',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('Chain name is required');
    });

    it('should reject chain with missing network ID', async () => {
      const chainData = {
        name: 'Test Chain No Network ID',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('Network ID is required');
    });

    it('should reject chain with missing RPC endpoint', async () => {
      const chainData = {
        name: 'Test Chain No RPC',
        networkId: 'test-chain-no-rpc',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('RPC endpoint is required');
    });

    it('should reject chain with invalid RPC endpoint URL', async () => {
      const chainData = {
        name: 'Test Chain Invalid RPC',
        networkId: 'test-chain-invalid-rpc',
        rpcEndpoint: 'not-a-valid-url',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors.some((e: string) => e.includes('valid URL'))).toBe(true);
    });

    it('should reject chain with duplicate network ID', async () => {
      // First, create a chain
      const chainData1 = {
        name: 'Test Chain Duplicate 1',
        networkId: 'test-chain-duplicate',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData1),
      });

      // Try to create another chain with the same network ID
      const chainData2 = {
        name: 'Test Chain Duplicate 2',
        networkId: 'test-chain-duplicate',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData2),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors.some((e: string) => e.includes('already in use'))).toBe(true);
    });

    it('should reject chain with unreachable RPC endpoint', async () => {
      const chainData = {
        name: 'Test Chain Unreachable',
        networkId: 'test-chain-unreachable',
        rpcEndpoint: 'https://invalid-rpc-endpoint-that-does-not-exist.com',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('errors');
      expect(data.errors.some((e: string) => e.includes('not reachable'))).toBe(true);
    });
  });

  describe('PUT /api/admin/chains/:id', () => {
    it('should update an existing chain', async () => {
      if (!testChainId) {
        console.warn('⚠️ No test chain ID available - skipping test');
        return;
      }

      const updatedData = {
        name: 'Test Chain 1 Updated',
        networkId: 'test-chain-1',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
        explorerUrl: 'https://etherscan.io/updated',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains/${testChainId}`, {
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
      expect(data.data.explorerUrl).toBe(updatedData.explorerUrl);
    });

    it('should return 404 for non-existent chain', async () => {
      const updatedData = {
        name: 'Non-existent Chain',
        networkId: 'non-existent',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains/non-existent-id`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Chain not found');
    });

    it('should reject update with invalid data', async () => {
      if (!testChainId) {
        console.warn('⚠️ No test chain ID available - skipping test');
        return;
      }

      const updatedData = {
        name: '',
        networkId: 'test-chain-1',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      const response = await fetch(`${baseUrl}/api/admin/chains/${testChainId}`, {
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
  });

  describe('DELETE /api/admin/chains/:id', () => {
    it('should return 404 for non-existent chain', async () => {
      const response = await fetch(`${baseUrl}/api/admin/chains/non-existent-id`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Chain not found');
    });

    it('should prevent deletion of chain with dependencies', async () => {
      // Create a chain
      const chainData = {
        name: 'Test Chain With Dependencies',
        networkId: 'test-chain-with-deps',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      const chainResponse = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      const chainResult = await chainResponse.json();
      const chainId = chainResult.data.id;

      // Create a collection that depends on this chain
      await verificationDb.verificationNFTCollection.create({
        data: {
          name: 'Test Collection',
          contractAddress: '0x1234567890123456789012345678901234567890',
          chainId: chainId,
        },
      });

      // Try to delete the chain
      const response = await fetch(`${baseUrl}/api/admin/chains/${chainId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Cannot delete chain with dependencies');
      expect(data).toHaveProperty('dependencies');
      expect(data.dependencies.length).toBeGreaterThan(0);

      // Cleanup: delete the collection
      await verificationDb.verificationNFTCollection.deleteMany({
        where: { chainId: chainId },
      });
    });

    it('should successfully delete chain without dependencies', async () => {
      // Create a chain
      const chainData = {
        name: 'Test Chain To Delete',
        networkId: 'test-chain-to-delete',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      const chainResponse = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      const chainResult = await chainResponse.json();
      const chainId = chainResult.data.id;

      // Delete the chain
      const response = await fetch(`${baseUrl}/api/admin/chains/${chainId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message', 'Chain deleted successfully');

      // Verify chain is deleted
      const verifyResponse = await fetch(`${baseUrl}/api/admin/chains`);
      const verifyData = await verifyResponse.json();
      const deletedChain = verifyData.data.find((c: any) => c.id === chainId);
      expect(deletedChain).toBeUndefined();
    });
  });

  describe('Configuration Persistence', () => {
    it('should persist chain configuration to database', async () => {
      const chainData = {
        name: 'Test Chain Persistence',
        networkId: 'test-chain-persistence',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
        explorerUrl: 'https://etherscan.io',
      };

      // Create chain via API
      const createResponse = await fetch(`${baseUrl}/api/admin/chains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chainData),
      });

      const createData = await createResponse.json();
      const chainId = createData.data.id;

      // Retrieve chain directly from database
      const dbChain = await verificationDb.verificationChain.findUnique({
        where: { id: chainId },
      });

      expect(dbChain).not.toBeNull();
      expect(dbChain?.name).toBe(chainData.name);
      expect(dbChain?.networkId).toBe(chainData.networkId);
      expect(dbChain?.rpcEndpoint).toBe(chainData.rpcEndpoint);
      expect(dbChain?.explorerUrl).toBe(chainData.explorerUrl);

      // Cleanup
      await verificationDb.verificationChain.delete({
        where: { id: chainId },
      });
    });

    it('should retrieve persisted chain configuration', async () => {
      const chainData = {
        name: 'Test Chain Retrieval',
        networkId: 'test-chain-retrieval',
        rpcEndpoint: 'https://rpc.ankr.com/eth',
      };

      // Create chain directly in database
      const dbChain = await verificationDb.verificationChain.create({
        data: chainData,
      });

      // Retrieve via API
      const response = await fetch(`${baseUrl}/api/admin/chains`);
      const data = await response.json();

      const retrievedChain = data.data.find((c: any) => c.id === dbChain.id);
      expect(retrievedChain).not.toBeUndefined();
      expect(retrievedChain.name).toBe(chainData.name);
      expect(retrievedChain.networkId).toBe(chainData.networkId);
      expect(retrievedChain.rpcEndpoint).toBe(chainData.rpcEndpoint);

      // Cleanup
      await verificationDb.verificationChain.delete({
        where: { id: dbChain.id },
      });
    });
  });
});
