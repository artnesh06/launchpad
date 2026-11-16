/**
 * ConfigurationValidator Service
 * 
 * Validates configuration integrity and dependencies for the NFT holder verification system.
 * Ensures referential integrity between chains, collections, and role rules.
 * 
 * Requirements: 6.3, 6.4, 7.3, 7.4, 8.8, 11.1, 11.2, 11.3
 */

import { verificationDb } from '../verification-db';
import type { 
  VerificationChain, 
  VerificationNFTCollection, 
  VerificationRoleRule 
} from '@prisma/client';

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Information about entities that depend on another entity
 */
export interface DependencyCheck {
  hasDependencies: boolean;
  dependencies: Array<{
    type: string;
    id: string;
    name: string;
  }>;
}

/**
 * Chain configuration input
 */
export interface ChainConfig {
  name: string;
  networkId: string;
  rpcEndpoint: string;
  explorerUrl?: string;
}

/**
 * Collection configuration input
 */
export interface CollectionConfig {
  name: string;
  contractAddress: string;
  chainId: string;
  description?: string;
}

/**
 * Role rule configuration input
 */
export interface RoleRuleConfig {
  name: string;
  discordRoleId: string;
  ruleType: 'INDIVIDUAL_CONTRACT' | 'MULTI_CONTRACT' | 'NFT_THRESHOLD';
  contracts: string[]; // Collection IDs
  threshold?: number;
  requirementType?: 'ANY' | 'ALL';
}

/**
 * ConfigurationValidator Service
 * 
 * Provides validation methods for configuration entities and dependency checking.
 */
export class ConfigurationValidator {
  /**
   * Validate chain configuration
   * 
   * Checks that:
   * - All required fields are present
   * - Network ID is unique
   * - RPC endpoint is reachable
   * 
   * @param chain - Chain configuration to validate
   * @returns ValidationResult with any errors found
   * 
   * Requirements: 6.3, 6.4
   */
  async validateChain(chain: ChainConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate required fields
    if (!chain.name || chain.name.trim() === '') {
      errors.push('Chain name is required');
    }

    if (!chain.networkId || chain.networkId.trim() === '') {
      errors.push('Network ID is required');
    }

    if (!chain.rpcEndpoint || chain.rpcEndpoint.trim() === '') {
      errors.push('RPC endpoint is required');
    }

    // Validate RPC endpoint format
    if (chain.rpcEndpoint) {
      try {
        const url = new URL(chain.rpcEndpoint);
        if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
          errors.push('RPC endpoint must use HTTP, HTTPS, WS, or WSS protocol');
        }
      } catch (error) {
        errors.push('RPC endpoint must be a valid URL');
      }
    }

    // Check network ID uniqueness
    if (chain.networkId) {
      const existing = await verificationDb.verificationChain.findUnique({
        where: { networkId: chain.networkId },
      });

      if (existing) {
        errors.push(`Network ID "${chain.networkId}" is already in use`);
      }
    }

    // Test RPC endpoint connectivity
    if (chain.rpcEndpoint && errors.length === 0) {
      const isReachable = await this.testRpcEndpoint(chain.rpcEndpoint);
      if (!isReachable) {
        errors.push('RPC endpoint is not reachable or not responding correctly');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate collection configuration
   * 
   * Checks that:
   * - All required fields are present
   * - Contract address format is valid
   * - Referenced chain exists
   * - Contract address is unique for the chain
   * 
   * @param collection - Collection configuration to validate
   * @returns ValidationResult with any errors found
   * 
   * Requirements: 7.3, 7.4, 11.3
   */
  async validateCollection(collection: CollectionConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate required fields
    if (!collection.name || collection.name.trim() === '') {
      errors.push('Collection name is required');
    }

    if (!collection.contractAddress || collection.contractAddress.trim() === '') {
      errors.push('Contract address is required');
    }

    if (!collection.chainId || collection.chainId.trim() === '') {
      errors.push('Chain selection is required');
    }

    // Validate contract address format (Ethereum-style address)
    if (collection.contractAddress) {
      const addressPattern = /^0x[a-fA-F0-9]{40}$/;
      if (!addressPattern.test(collection.contractAddress)) {
        errors.push('Contract address must be a valid Ethereum address (0x followed by 40 hexadecimal characters)');
      }
    }

    // Verify chain exists
    if (collection.chainId) {
      const chain = await verificationDb.verificationChain.findUnique({
        where: { id: collection.chainId },
      });

      if (!chain) {
        errors.push(`Chain with ID "${collection.chainId}" does not exist`);
      }
    }

    // Check contract address uniqueness for the chain
    if (collection.contractAddress && collection.chainId) {
      const existing = await verificationDb.verificationNFTCollection.findUnique({
        where: {
          chainId_contractAddress: {
            chainId: collection.chainId,
            contractAddress: collection.contractAddress,
          },
        },
      });

      if (existing) {
        errors.push(`Contract address "${collection.contractAddress}" already exists on this chain`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate role rule configuration
   * 
   * Checks that:
   * - All required fields are present
   * - Referenced collections exist
   * - Discord role exists (placeholder for now)
   * - Threshold is valid for the rule type
   * - Requirement type is valid for multi_contract rules
   * 
   * @param rule - Role rule configuration to validate
   * @returns ValidationResult with any errors found
   * 
   * Requirements: 8.8, 11.1, 11.2
   */
  async validateRoleRule(rule: RoleRuleConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate required fields
    if (!rule.name || rule.name.trim() === '') {
      errors.push('Role rule name is required');
    }

    if (!rule.discordRoleId || rule.discordRoleId.trim() === '') {
      errors.push('Discord role selection is required');
    }

    if (!rule.ruleType) {
      errors.push('Rule type is required');
    }

    if (!rule.contracts || rule.contracts.length === 0) {
      errors.push('At least one NFT contract must be selected');
    }

    // Validate rule type specific requirements
    if (rule.ruleType === 'INDIVIDUAL_CONTRACT') {
      if (rule.contracts && rule.contracts.length !== 1) {
        errors.push('Individual contract rule must reference exactly one contract');
      }
      if (rule.threshold === undefined || rule.threshold < 1) {
        errors.push('Individual contract rule requires a minimum ownership threshold of at least 1');
      }
    }

    if (rule.ruleType === 'MULTI_CONTRACT') {
      if (rule.contracts && rule.contracts.length < 2) {
        errors.push('Multi-contract rule must reference at least two contracts');
      }
      if (!rule.requirementType || !['ANY', 'ALL'].includes(rule.requirementType)) {
        errors.push('Multi-contract rule requires a valid requirement type (ANY or ALL)');
      }
    }

    if (rule.ruleType === 'NFT_THRESHOLD') {
      if (rule.threshold === undefined || rule.threshold < 1) {
        errors.push('NFT threshold rule requires a minimum threshold of at least 1');
      }
    }

    // Verify all referenced collections exist
    if (rule.contracts && rule.contracts.length > 0) {
      for (const collectionId of rule.contracts) {
        const collection = await verificationDb.verificationNFTCollection.findUnique({
          where: { id: collectionId },
        });

        if (!collection) {
          errors.push(`Collection with ID "${collectionId}" does not exist`);
        }
      }
    }

    // TODO: Verify Discord role exists in the connected Discord server
    // This would require Discord API integration
    // For now, we just validate the format
    if (rule.discordRoleId) {
      const roleIdPattern = /^\d+$/;
      if (!roleIdPattern.test(rule.discordRoleId)) {
        errors.push('Discord role ID must be a numeric string');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check dependencies for an entity
   * 
   * Finds all entities that depend on the specified entity.
   * Used to warn administrators before deleting entities.
   * 
   * @param entityType - Type of entity ('chain', 'collection', 'roleRule')
   * @param entityId - ID of the entity to check
   * @returns DependencyCheck with list of dependent entities
   * 
   * Requirements: 6.5, 7.5, 11.1
   */
  async checkDependencies(entityType: string, entityId: string): Promise<DependencyCheck> {
    const dependencies: Array<{ type: string; id: string; name: string }> = [];

    if (entityType === 'chain') {
      // Find collections that reference this chain
      const collections = await verificationDb.verificationNFTCollection.findMany({
        where: { chainId: entityId },
      });

      for (const collection of collections) {
        dependencies.push({
          type: 'collection',
          id: collection.id,
          name: collection.name,
        });
      }
    }

    if (entityType === 'collection') {
      // Find role rules that reference this collection
      const roleRuleCollections = await verificationDb.verificationRoleRuleCollection.findMany({
        where: { collectionId: entityId },
        include: {
          roleRule: true,
        },
      });

      for (const rrc of roleRuleCollections) {
        dependencies.push({
          type: 'roleRule',
          id: rrc.roleRule.id,
          name: rrc.roleRule.name,
        });
      }
    }

    return {
      hasDependencies: dependencies.length > 0,
      dependencies,
    };
  }

  /**
   * Test RPC endpoint connectivity
   * 
   * Attempts to connect to the RPC endpoint and verify it responds correctly.
   * Uses a simple eth_blockNumber call to test connectivity.
   * 
   * @param rpcEndpoint - RPC endpoint URL to test
   * @returns true if endpoint is reachable and responding, false otherwise
   * 
   * Requirements: 6.3
   */
  private async testRpcEndpoint(rpcEndpoint: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`RPC endpoint returned status ${response.status}`);
        return false;
      }

      const data = await response.json();

      // Check if we got a valid response
      if (data.error) {
        console.error('RPC endpoint returned error:', data.error);
        return false;
      }

      // Check if we got a block number result
      if (!data.result) {
        console.error('RPC endpoint did not return a result');
        return false;
      }

      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('RPC endpoint request timed out');
        } else {
          console.error('Error testing RPC endpoint:', error.message);
        }
      }
      return false;
    }
  }
}

/**
 * Singleton instance of ConfigurationValidator
 */
export const configurationValidator = new ConfigurationValidator();
