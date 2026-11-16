/**
 * Unit tests for ConfigurationValidator service
 * 
 * Tests configuration validation and dependency checking functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigurationValidator } from '../configuration-validator';
import { verificationDb } from '../../verification-db';
import type { ChainConfig, CollectionConfig, RoleRuleConfig } from '../configuration-validator';

// Mock the verification database
vi.mock('../../verification-db', () => ({
  verificationDb: {
    verificationChain: {
      findUnique: vi.fn(),
    },
    verificationNFTCollection: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    verificationRoleRuleCollection: {
      findMany: vi.fn(),
    },
  },
}));

// Mock fetch for RPC endpoint testing
global.fetch = vi.fn();

describe('ConfigurationValidator', () => {
  let validator: ConfigurationValidator;

  beforeEach(() => {
    validator = new ConfigurationValidator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateChain', () => {
    it('should validate a valid chain configuration', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://eth.llamarpc.com',
        explorerUrl: 'https://etherscan.io',
      };

      // Mock database check - no existing chain
      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue(null);

      // Mock successful RPC call
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x1234567' }),
      } as Response);

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject chain with missing name', async () => {
      const chain: ChainConfig = {
        name: '',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://eth.llamarpc.com',
      };

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chain name is required');
    });

    it('should reject chain with missing network ID', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: '',
        rpcEndpoint: 'https://eth.llamarpc.com',
      };

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Network ID is required');
    });

    it('should reject chain with missing RPC endpoint', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: 'ethereum-1',
        rpcEndpoint: '',
      };

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('RPC endpoint is required');
    });

    it('should reject chain with invalid RPC endpoint URL', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: 'ethereum-1',
        rpcEndpoint: 'not-a-valid-url',
      };

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('RPC endpoint must be a valid URL');
    });

    it('should reject chain with invalid protocol', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: 'ethereum-1',
        rpcEndpoint: 'ftp://invalid-protocol.com',
      };

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('RPC endpoint must use HTTP, HTTPS, WS, or WSS protocol');
    });

    it('should reject chain with duplicate network ID', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://eth.llamarpc.com',
      };

      // Mock database check - existing chain found
      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue({
        id: 'existing-chain-id',
        name: 'Existing Chain',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://other-rpc.com',
        explorerUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Network ID "ethereum-1" is already in use');
    });

    it('should reject chain with unreachable RPC endpoint', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://unreachable-rpc.com',
      };

      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue(null);

      // Mock failed RPC call
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('RPC endpoint is not reachable or not responding correctly');
    });

    it('should reject chain when RPC endpoint returns error', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://eth.llamarpc.com',
      };

      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue(null);

      // Mock RPC error response
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'Error' } }),
      } as Response);

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('RPC endpoint is not reachable or not responding correctly');
    });

    it('should handle RPC endpoint timeout', async () => {
      const chain: ChainConfig = {
        name: 'Ethereum Mainnet',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://slow-rpc.com',
      };

      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue(null);

      // Mock timeout
      vi.mocked(global.fetch).mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const result = await validator.validateChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('RPC endpoint is not reachable or not responding correctly');
    });
  });

  describe('validateCollection', () => {
    it('should validate a valid collection configuration', async () => {
      const collection: CollectionConfig = {
        name: 'Bored Ape Yacht Club',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: 'chain-123',
        description: 'A collection of Bored Apes',
      };

      // Mock chain exists
      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue({
        id: 'chain-123',
        name: 'Ethereum',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://eth.llamarpc.com',
        explorerUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock no existing collection
      vi.mocked(verificationDb.verificationNFTCollection.findUnique).mockResolvedValue(null);

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject collection with missing name', async () => {
      const collection: CollectionConfig = {
        name: '',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: 'chain-123',
      };

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Collection name is required');
    });

    it('should reject collection with missing contract address', async () => {
      const collection: CollectionConfig = {
        name: 'Bored Ape Yacht Club',
        contractAddress: '',
        chainId: 'chain-123',
      };

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract address is required');
    });

    it('should reject collection with missing chain ID', async () => {
      const collection: CollectionConfig = {
        name: 'Bored Ape Yacht Club',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: '',
      };

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chain selection is required');
    });

    it('should reject collection with invalid contract address format', async () => {
      const collection: CollectionConfig = {
        name: 'Bored Ape Yacht Club',
        contractAddress: 'invalid-address',
        chainId: 'chain-123',
      };

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract address must be a valid Ethereum address (0x followed by 40 hexadecimal characters)');
    });

    it('should reject collection with short contract address', async () => {
      const collection: CollectionConfig = {
        name: 'Bored Ape Yacht Club',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f1',
        chainId: 'chain-123',
      };

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract address must be a valid Ethereum address (0x followed by 40 hexadecimal characters)');
    });

    it('should reject collection with non-existent chain', async () => {
      const collection: CollectionConfig = {
        name: 'Bored Ape Yacht Club',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: 'non-existent-chain',
      };

      // Mock chain not found
      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue(null);

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chain with ID "non-existent-chain" does not exist');
    });

    it('should reject collection with duplicate contract address on same chain', async () => {
      const collection: CollectionConfig = {
        name: 'Bored Ape Yacht Club',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: 'chain-123',
      };

      // Mock chain exists
      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue({
        id: 'chain-123',
        name: 'Ethereum',
        networkId: 'ethereum-1',
        rpcEndpoint: 'https://eth.llamarpc.com',
        explorerUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock existing collection
      vi.mocked(verificationDb.verificationNFTCollection.findUnique).mockResolvedValue({
        id: 'existing-collection-id',
        name: 'Existing Collection',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: 'chain-123',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Contract address "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D" already exists on this chain');
    });

    it('should accept same contract address on different chains', async () => {
      const collection: CollectionConfig = {
        name: 'Bored Ape Yacht Club',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: 'chain-456',
      };

      // Mock chain exists
      vi.mocked(verificationDb.verificationChain.findUnique).mockResolvedValue({
        id: 'chain-456',
        name: 'Polygon',
        networkId: 'polygon-137',
        rpcEndpoint: 'https://polygon-rpc.com',
        explorerUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock no existing collection on this chain
      vi.mocked(verificationDb.verificationNFTCollection.findUnique).mockResolvedValue(null);

      const result = await validator.validateCollection(collection);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateRoleRule', () => {
    it('should validate a valid individual_contract rule', async () => {
      const rule: RoleRuleConfig = {
        name: 'BAYC Holder',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: ['collection-1'],
        threshold: 1,
      };

      // Mock collection exists
      vi.mocked(verificationDb.verificationNFTCollection.findUnique).mockResolvedValue({
        id: 'collection-1',
        name: 'BAYC',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: 'chain-123',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid multi_contract rule with ANY requirement', async () => {
      const rule: RoleRuleConfig = {
        name: 'Blue Chip Holder',
        discordRoleId: '123456789012345678',
        ruleType: 'MULTI_CONTRACT',
        contracts: ['collection-1', 'collection-2'],
        requirementType: 'ANY',
      };

      // Mock collections exist
      vi.mocked(verificationDb.verificationNFTCollection.findUnique)
        .mockResolvedValueOnce({
          id: 'collection-1',
          name: 'BAYC',
          contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
          chainId: 'chain-123',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'collection-2',
          name: 'MAYC',
          contractAddress: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
          chainId: 'chain-123',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid nft_threshold rule', async () => {
      const rule: RoleRuleConfig = {
        name: 'NFT Whale',
        discordRoleId: '123456789012345678',
        ruleType: 'NFT_THRESHOLD',
        contracts: ['collection-1', 'collection-2'],
        threshold: 10,
      };

      // Mock collections exist
      vi.mocked(verificationDb.verificationNFTCollection.findUnique)
        .mockResolvedValueOnce({
          id: 'collection-1',
          name: 'BAYC',
          contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
          chainId: 'chain-123',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'collection-2',
          name: 'MAYC',
          contractAddress: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
          chainId: 'chain-123',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rule with missing name', async () => {
      const rule: RoleRuleConfig = {
        name: '',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: ['collection-1'],
        threshold: 1,
      };

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Role rule name is required');
    });

    it('should reject rule with missing Discord role ID', async () => {
      const rule: RoleRuleConfig = {
        name: 'BAYC Holder',
        discordRoleId: '',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: ['collection-1'],
        threshold: 1,
      };

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Discord role selection is required');
    });

    it('should reject rule with invalid Discord role ID format', async () => {
      const rule: RoleRuleConfig = {
        name: 'BAYC Holder',
        discordRoleId: 'not-a-number',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: ['collection-1'],
        threshold: 1,
      };

      // Mock collection exists
      vi.mocked(verificationDb.verificationNFTCollection.findUnique).mockResolvedValue({
        id: 'collection-1',
        name: 'BAYC',
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        chainId: 'chain-123',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Discord role ID must be a numeric string');
    });

    it('should reject rule with no contracts', async () => {
      const rule: RoleRuleConfig = {
        name: 'BAYC Holder',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: [],
        threshold: 1,
      };

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one NFT contract must be selected');
    });

    it('should reject individual_contract rule with multiple contracts', async () => {
      const rule: RoleRuleConfig = {
        name: 'BAYC Holder',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: ['collection-1', 'collection-2'],
        threshold: 1,
      };

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Individual contract rule must reference exactly one contract');
    });

    it('should reject individual_contract rule without threshold', async () => {
      const rule: RoleRuleConfig = {
        name: 'BAYC Holder',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: ['collection-1'],
      };

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Individual contract rule requires a minimum ownership threshold of at least 1');
    });

    it('should reject multi_contract rule with only one contract', async () => {
      const rule: RoleRuleConfig = {
        name: 'Blue Chip Holder',
        discordRoleId: '123456789012345678',
        ruleType: 'MULTI_CONTRACT',
        contracts: ['collection-1'],
        requirementType: 'ANY',
      };

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Multi-contract rule must reference at least two contracts');
    });

    it('should reject multi_contract rule without requirement type', async () => {
      const rule: RoleRuleConfig = {
        name: 'Blue Chip Holder',
        discordRoleId: '123456789012345678',
        ruleType: 'MULTI_CONTRACT',
        contracts: ['collection-1', 'collection-2'],
      };

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Multi-contract rule requires a valid requirement type (ANY or ALL)');
    });

    it('should reject nft_threshold rule without threshold', async () => {
      const rule: RoleRuleConfig = {
        name: 'NFT Whale',
        discordRoleId: '123456789012345678',
        ruleType: 'NFT_THRESHOLD',
        contracts: ['collection-1', 'collection-2'],
      };

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('NFT threshold rule requires a minimum threshold of at least 1');
    });

    it('should reject rule with non-existent collection', async () => {
      const rule: RoleRuleConfig = {
        name: 'BAYC Holder',
        discordRoleId: '123456789012345678',
        ruleType: 'INDIVIDUAL_CONTRACT',
        contracts: ['non-existent-collection'],
        threshold: 1,
      };

      // Mock collection not found
      vi.mocked(verificationDb.verificationNFTCollection.findUnique).mockResolvedValue(null);

      const result = await validator.validateRoleRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Collection with ID "non-existent-collection" does not exist');
    });
  });

  describe('checkDependencies', () => {
    it('should find collections dependent on a chain', async () => {
      // Mock collections that depend on the chain
      vi.mocked(verificationDb.verificationNFTCollection.findMany).mockResolvedValue([
        {
          id: 'collection-1',
          name: 'BAYC',
          contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
          chainId: 'chain-123',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'collection-2',
          name: 'MAYC',
          contractAddress: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
          chainId: 'chain-123',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await validator.checkDependencies('chain', 'chain-123');

      expect(result.hasDependencies).toBe(true);
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]).toEqual({
        type: 'collection',
        id: 'collection-1',
        name: 'BAYC',
      });
      expect(result.dependencies[1]).toEqual({
        type: 'collection',
        id: 'collection-2',
        name: 'MAYC',
      });
    });

    it('should return no dependencies for chain with no collections', async () => {
      vi.mocked(verificationDb.verificationNFTCollection.findMany).mockResolvedValue([]);

      const result = await validator.checkDependencies('chain', 'chain-123');

      expect(result.hasDependencies).toBe(false);
      expect(result.dependencies).toHaveLength(0);
    });

    it('should find role rules dependent on a collection', async () => {
      // Mock role rules that depend on the collection
      vi.mocked(verificationDb.verificationRoleRuleCollection.findMany).mockResolvedValue([
        {
          roleRuleId: 'rule-1',
          collectionId: 'collection-1',
          roleRule: {
            id: 'rule-1',
            name: 'BAYC Holder',
            discordRoleId: '123456789012345678',
            ruleType: 'INDIVIDUAL_CONTRACT',
            threshold: 1,
            requirementType: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          roleRuleId: 'rule-2',
          collectionId: 'collection-1',
          roleRule: {
            id: 'rule-2',
            name: 'Blue Chip Holder',
            discordRoleId: '987654321098765432',
            ruleType: 'MULTI_CONTRACT',
            threshold: null,
            requirementType: 'ANY',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ]);

      const result = await validator.checkDependencies('collection', 'collection-1');

      expect(result.hasDependencies).toBe(true);
      expect(result.dependencies).toHaveLength(2);
      expect(result.dependencies[0]).toEqual({
        type: 'roleRule',
        id: 'rule-1',
        name: 'BAYC Holder',
      });
      expect(result.dependencies[1]).toEqual({
        type: 'roleRule',
        id: 'rule-2',
        name: 'Blue Chip Holder',
      });
    });

    it('should return no dependencies for collection with no role rules', async () => {
      vi.mocked(verificationDb.verificationRoleRuleCollection.findMany).mockResolvedValue([]);

      const result = await validator.checkDependencies('collection', 'collection-1');

      expect(result.hasDependencies).toBe(false);
      expect(result.dependencies).toHaveLength(0);
    });

    it('should return no dependencies for unknown entity type', async () => {
      const result = await validator.checkDependencies('unknown', 'entity-123');

      expect(result.hasDependencies).toBe(false);
      expect(result.dependencies).toHaveLength(0);
    });
  });
});
