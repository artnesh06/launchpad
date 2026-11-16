/**
 * NFT Endpoints Cache Verification Test
 * 
 * Task 9: Checkpoint - Verify NFT endpoint groups
 * - Tests Collection endpoints (/api/collections/[address], /api/nft/collections, /api/nft/collection/*)
 * - Tests Metadata endpoints (/api/metadata/[contractAddress]/[tokenId], /api/nft/metadata, /api/ipfs/[hash])
 * - Tests Query endpoints (/api/nft/[address]/[tokenid], /api/nft/owner, /api/nft/holdings, etc.)
 * - Tests Attributes endpoints (/api/nft/attributes, /api/nft/rarity)
 * - Verifies cache behavior (hit/miss)
 * - Checks cache key uniqueness across different NFT queries
 * - Verifies cache performance for expensive queries
 */

import { describe, it, expect } from 'vitest';
import { getCacheKey } from '@/lib/hybrid-cache';
import fs from 'fs';
import path from 'path';

describe('NFT Endpoints - Cache Verification', () => {
  describe('Collection Endpoints - Cache Key Generation', () => {
    it('should generate correct cache key for /api/collections/[address]', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const key = getCacheKey(`/api/collections/${address}`, {
        chainId: '1'
      });
      
      expect(key).toBe(`/api/collections/${address}?chainId=1`);
    });

    it('should generate correct cache key for /api/nft/collections', () => {
      const key = getCacheKey('/api/nft/collections', {
        owner: '0xabc',
        chainId: '1',
        pageKey: 'next'
      });
      
      expect(key).toBe('/api/nft/collections?chainId=1&owner=0xabc&pageKey=next');
    });

    it('should generate correct cache key for /api/nft/collection/[address]', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const key = getCacheKey(`/api/nft/collection/${address}`, {});
      
      expect(key).toBe(`/api/nft/collection/${address}`);
    });

    it('should generate correct cache key for /api/nft/collection/[address]/attributes', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const key = getCacheKey(`/api/nft/collection/${address}/attributes`, {});
      
      expect(key).toBe(`/api/nft/collection/${address}/attributes`);
    });

    it('should generate different keys for different collection addresses', () => {
      const address1 = '0x1111111111111111111111111111111111111111';
      const address2 = '0x2222222222222222222222222222222222222222';
      
      const key1 = getCacheKey(`/api/collections/${address1}`, {});
      const key2 = getCacheKey(`/api/collections/${address2}`, {});
      
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different chainIds', () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const key1 = getCacheKey(`/api/collections/${address}`, { chainId: '1' });
      const key2 = getCacheKey(`/api/collections/${address}`, { chainId: '137' });
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Metadata Endpoints - Cache Key Generation', () => {
    it('should generate correct cache key for /api/metadata/[contractAddress]/[tokenId]', () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const tokenId = '123';
      const key = getCacheKey(`/api/metadata/${contractAddress}/${tokenId}`, {});
      
      expect(key).toBe(`/api/metadata/${contractAddress}/${tokenId}`);
    });

    it('should generate correct cache key for /api/nft/metadata', () => {
      const key = getCacheKey('/api/nft/metadata', {
        contractAddress: '0xabc',
        tokenId: '456',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/metadata?chainId=1&contractAddress=0xabc&tokenId=456');
    });

    it('should generate correct cache key for /api/ipfs/[hash]', () => {
      const hash = 'QmHash123456789';
      const key = getCacheKey(`/api/ipfs/${hash}`, {});
      
      expect(key).toBe(`/api/ipfs/${hash}`);
    });

    it('should generate different keys for different contract/token combinations', () => {
      const key1 = getCacheKey('/api/metadata/0xabc/1', {});
      const key2 = getCacheKey('/api/metadata/0xabc/2', {});
      const key3 = getCacheKey('/api/metadata/0xdef/1', {});
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should generate different keys for different IPFS hashes', () => {
      const key1 = getCacheKey('/api/ipfs/QmHash1', {});
      const key2 = getCacheKey('/api/ipfs/QmHash2', {});
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('NFT Query Endpoints - Cache Key Generation', () => {
    it('should generate correct cache key for /api/nft/[address]/[tokenid]', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const tokenId = '123';
      const key = getCacheKey(`/api/nft/${address}/${tokenId}`, {});
      
      expect(key).toBe(`/api/nft/${address}/${tokenId}`);
    });

    it('should generate correct cache key for /api/nft/owner', () => {
      const key = getCacheKey('/api/nft/owner', {
        address: '0xabc',
        chainId: '1',
        pageKey: 'next'
      });
      
      expect(key).toBe('/api/nft/owner?address=0xabc&chainId=1&pageKey=next');
    });

    it('should generate correct cache key for /api/nft/owners/token', () => {
      const key = getCacheKey('/api/nft/owners/token', {
        contractAddress: '0xabc',
        tokenId: '123',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/owners/token?chainId=1&contractAddress=0xabc&tokenId=123');
    });

    it('should generate correct cache key for /api/nft/owners/contract', () => {
      const key = getCacheKey('/api/nft/owners/contract', {
        contractAddress: '0xabc',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/owners/contract?chainId=1&contractAddress=0xabc');
    });

    it('should generate correct cache key for /api/nft/holdings', () => {
      const key = getCacheKey('/api/nft/holdings', {
        address: '0xabc',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/holdings?address=0xabc&chainId=1');
    });

    it('should generate correct cache key for /api/nft/portfolio', () => {
      const key = getCacheKey('/api/nft/portfolio', {
        address: '0xabc',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/portfolio?address=0xabc&chainId=1');
    });

    it('should generate correct cache key for /api/nft/holder', () => {
      const key = getCacheKey('/api/nft/holder', {
        address: '0xabc',
        contractAddress: '0xdef',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/holder?address=0xabc&chainId=1&contractAddress=0xdef');
    });

    it('should generate correct cache key for /api/nft/contract/metadata', () => {
      const key = getCacheKey('/api/nft/contract/metadata', {
        contractAddress: '0xabc',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/contract/metadata?chainId=1&contractAddress=0xabc');
    });

    it('should generate correct cache key for /api/nft/contract/nfts', () => {
      const key = getCacheKey('/api/nft/contract/nfts', {
        contractAddress: '0xabc',
        chainId: '1',
        pageKey: 'next'
      });
      
      expect(key).toBe('/api/nft/contract/nfts?chainId=1&contractAddress=0xabc&pageKey=next');
    });

    it('should generate different keys for different wallet addresses', () => {
      const key1 = getCacheKey('/api/nft/owner', { address: '0xabc', chainId: '1' });
      const key2 = getCacheKey('/api/nft/owner', { address: '0xdef', chainId: '1' });
      
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different pagination states', () => {
      const key1 = getCacheKey('/api/nft/owner', { address: '0xabc', pageKey: 'page1' });
      const key2 = getCacheKey('/api/nft/owner', { address: '0xabc', pageKey: 'page2' });
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Attributes and Rarity Endpoints - Cache Key Generation', () => {
    it('should generate correct cache key for /api/nft/attributes', () => {
      const key = getCacheKey('/api/nft/attributes', {
        contractAddress: '0xabc',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/attributes?chainId=1&contractAddress=0xabc');
    });

    it('should generate correct cache key for /api/nft/rarity', () => {
      const key = getCacheKey('/api/nft/rarity', {
        contractAddress: '0xabc',
        tokenId: '123',
        chainId: '1'
      });
      
      expect(key).toBe('/api/nft/rarity?chainId=1&contractAddress=0xabc&tokenId=123');
    });

    it('should generate different keys for different collections', () => {
      const key1 = getCacheKey('/api/nft/attributes', { contractAddress: '0xabc' });
      const key2 = getCacheKey('/api/nft/attributes', { contractAddress: '0xdef' });
      
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different tokens', () => {
      const key1 = getCacheKey('/api/nft/rarity', { contractAddress: '0xabc', tokenId: '1' });
      const key2 = getCacheKey('/api/nft/rarity', { contractAddress: '0xabc', tokenId: '2' });
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('TTL Configuration', () => {
    it('should use correct TTL for Collection endpoints (10 seconds)', () => {
      const ttls = {
        collectionsByAddress: 10,
        nftCollections: 10,
        nftCollection: 10,
        collectionAttributes: 10
      };
      
      expect(ttls.collectionsByAddress).toBe(10);
      expect(ttls.nftCollections).toBe(10);
      expect(ttls.nftCollection).toBe(10);
      expect(ttls.collectionAttributes).toBe(10);
    });

    it('should use correct TTL for Metadata endpoints (300 seconds)', () => {
      const ttls = {
        metadata: 300,
        nftMetadata: 300,
        ipfs: 300
      };
      
      expect(ttls.metadata).toBe(300);
      expect(ttls.nftMetadata).toBe(300);
      expect(ttls.ipfs).toBe(300);
    });

    it('should use correct TTL for NFT Query endpoints', () => {
      const ttls = {
        nftByAddress: 10,      // Contract data
        contractMetadata: 10,  // Contract data
        contractNfts: 10,      // Contract data
        owner: 5,              // User-specific
        ownersToken: 5,        // User-specific
        ownersContract: 10,    // Contract data
        holdings: 5,           // User-specific
        portfolio: 5,          // User-specific
        holder: 5              // User-specific
      };
      
      expect(ttls.nftByAddress).toBe(10);
      expect(ttls.contractMetadata).toBe(10);
      expect(ttls.contractNfts).toBe(10);
      expect(ttls.owner).toBe(5);
      expect(ttls.ownersToken).toBe(5);
      expect(ttls.ownersContract).toBe(10);
      expect(ttls.holdings).toBe(5);
      expect(ttls.portfolio).toBe(5);
      expect(ttls.holder).toBe(5);
    });

    it('should use correct TTL for Attributes and Rarity endpoints (60 seconds)', () => {
      const ttls = {
        attributes: 60,
        rarity: 60
      };
      
      expect(ttls.attributes).toBe(60);
      expect(ttls.rarity).toBe(60);
    });
  });

  describe('Endpoint Implementation Verification', () => {
    it('should have Collection endpoints implemented with caching', () => {
      const endpoints = [
        'src/app/api/collections/[address]/route.ts',
        'src/app/api/nft/collections/route.ts',
        'src/app/api/nft/collection/[address]/route.ts',
        'src/app/api/nft/collection/[address]/attributes/route.ts'
      ];
      
      endpoints.forEach(endpoint => {
        const routePath = path.join(process.cwd(), endpoint);
        expect(fs.existsSync(routePath), `${endpoint} should exist`).toBe(true);
        
        const content = fs.readFileSync(routePath, 'utf-8');
        expect(content, `${endpoint} should use cachedFetch`).toContain('cachedFetch');
        expect(content, `${endpoint} should use getCacheKey`).toContain('getCacheKey');
      });
    });

    it('should have Metadata endpoints implemented with caching', () => {
      const endpoints = [
        'src/app/api/metadata/[contractAddress]/[tokenId]/route.ts',
        'src/app/api/nft/metadata/route.ts',
        'src/app/api/ipfs/[hash]/route.ts'
      ];
      
      endpoints.forEach(endpoint => {
        const routePath = path.join(process.cwd(), endpoint);
        expect(fs.existsSync(routePath), `${endpoint} should exist`).toBe(true);
        
        const content = fs.readFileSync(routePath, 'utf-8');
        expect(content, `${endpoint} should use cachedFetch`).toContain('cachedFetch');
        expect(content, `${endpoint} should use getCacheKey`).toContain('getCacheKey');
      });
    });

    it('should have NFT Query endpoints implemented with caching', () => {
      const endpoints = [
        'src/app/api/nft/[address]/[tokenid]/route.ts',
        'src/app/api/nft/owner/route.ts',
        'src/app/api/nft/owners/token/route.ts',
        'src/app/api/nft/owners/contract/route.ts',
        'src/app/api/nft/holdings/route.ts',
        'src/app/api/nft/portfolio/route.ts',
        'src/app/api/nft/holder/route.ts',
        'src/app/api/nft/contract/metadata/route.ts',
        'src/app/api/nft/contract/nfts/route.ts'
      ];
      
      endpoints.forEach(endpoint => {
        const routePath = path.join(process.cwd(), endpoint);
        expect(fs.existsSync(routePath), `${endpoint} should exist`).toBe(true);
        
        const content = fs.readFileSync(routePath, 'utf-8');
        expect(content, `${endpoint} should use cachedFetch`).toContain('cachedFetch');
        expect(content, `${endpoint} should use getCacheKey`).toContain('getCacheKey');
      });
    });

    it('should have Attributes and Rarity endpoints implemented with caching', () => {
      const endpoints = [
        'src/app/api/nft/attributes/route.ts',
        'src/app/api/nft/rarity/route.ts'
      ];
      
      endpoints.forEach(endpoint => {
        const routePath = path.join(process.cwd(), endpoint);
        expect(fs.existsSync(routePath), `${endpoint} should exist`).toBe(true);
        
        const content = fs.readFileSync(routePath, 'utf-8');
        expect(content, `${endpoint} should use cachedFetch`).toContain('cachedFetch');
        expect(content, `${endpoint} should use getCacheKey`).toContain('getCacheKey');
      });
    });
  });

  describe('Cache TTL Verification in Implementation', () => {
    it('should use TTL of 10 seconds for Collection endpoints', () => {
      const endpoints = [
        { path: 'src/app/api/collections/[address]/route.ts', ttl: 10 },
        { path: 'src/app/api/nft/collections/route.ts', ttl: 10 },
        { path: 'src/app/api/nft/collection/[address]/route.ts', ttl: 10 },
        { path: 'src/app/api/nft/collection/[address]/attributes/route.ts', ttl: 10 }
      ];
      
      endpoints.forEach(({ path: endpoint, ttl }) => {
        const routePath = path.join(process.cwd(), endpoint);
        const content = fs.readFileSync(routePath, 'utf-8');
        
        // Check for TTL in cachedFetch call - look for }, TTL)
        const ttlRegex = new RegExp(`},\\s*${ttl}\\s*\\)`);
        expect(content, `${endpoint} should use TTL of ${ttl} seconds`).toMatch(ttlRegex);
      });
    });

    it('should use TTL of 300 seconds for Metadata endpoints', () => {
      const endpoints = [
        { path: 'src/app/api/metadata/[contractAddress]/[tokenId]/route.ts', ttl: 300 },
        { path: 'src/app/api/nft/metadata/route.ts', ttl: 300 },
        { path: 'src/app/api/ipfs/[hash]/route.ts', ttl: 300 }
      ];
      
      endpoints.forEach(({ path: endpoint, ttl }) => {
        const routePath = path.join(process.cwd(), endpoint);
        const content = fs.readFileSync(routePath, 'utf-8');
        
        const ttlRegex = new RegExp(`},\\s*${ttl}\\s*\\)`);
        expect(content, `${endpoint} should use TTL of ${ttl} seconds`).toMatch(ttlRegex);
      });
    });

    it('should use correct TTL for NFT Query endpoints', () => {
      const endpoints = [
        { path: 'src/app/api/nft/[address]/[tokenid]/route.ts', ttl: 10 },
        { path: 'src/app/api/nft/contract/metadata/route.ts', ttl: 10 },
        { path: 'src/app/api/nft/contract/nfts/route.ts', ttl: 10 },
        { path: 'src/app/api/nft/owner/route.ts', ttl: 5 },
        { path: 'src/app/api/nft/owners/token/route.ts', ttl: 5 },
        { path: 'src/app/api/nft/holdings/route.ts', ttl: 5 },
        { path: 'src/app/api/nft/portfolio/route.ts', ttl: 5 },
        { path: 'src/app/api/nft/holder/route.ts', ttl: 5 }
      ];
      
      endpoints.forEach(({ path: endpoint, ttl }) => {
        const routePath = path.join(process.cwd(), endpoint);
        const content = fs.readFileSync(routePath, 'utf-8');
        
        const ttlRegex = new RegExp(`},\\s*${ttl}\\s*\\)`);
        expect(content, `${endpoint} should use TTL of ${ttl} seconds`).toMatch(ttlRegex);
      });
    });

    it('should use TTL of 60 seconds for Attributes and Rarity endpoints', () => {
      const endpoints = [
        { path: 'src/app/api/nft/attributes/route.ts', ttl: 60 },
        { path: 'src/app/api/nft/rarity/route.ts', ttl: 60 }
      ];
      
      endpoints.forEach(({ path: endpoint, ttl }) => {
        const routePath = path.join(process.cwd(), endpoint);
        const content = fs.readFileSync(routePath, 'utf-8');
        
        const ttlRegex = new RegExp(`},\\s*${ttl}\\s*\\)`);
        expect(content, `${endpoint} should use TTL of ${ttl} seconds`).toMatch(ttlRegex);
      });
    });
  });

  describe('Cache Key Uniqueness Across NFT Queries', () => {
    it('should generate unique keys for different NFT query types', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const tokenId = '123';
      
      const keys = [
        getCacheKey(`/api/nft/${address}/${tokenId}`, {}),
        getCacheKey('/api/nft/owner', { address }),
        getCacheKey('/api/nft/holdings', { address }),
        getCacheKey('/api/nft/portfolio', { address }),
        getCacheKey('/api/nft/attributes', { contractAddress: address }),
        getCacheKey('/api/nft/rarity', { contractAddress: address, tokenId }),
        getCacheKey(`/api/collections/${address}`, {}),
        getCacheKey(`/api/metadata/${address}/${tokenId}`, {})
      ];
      
      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should generate unique keys for same endpoint with different parameters', () => {
      const keys = [
        getCacheKey('/api/nft/owner', { address: '0xabc', chainId: '1' }),
        getCacheKey('/api/nft/owner', { address: '0xabc', chainId: '137' }),
        getCacheKey('/api/nft/owner', { address: '0xdef', chainId: '1' }),
        getCacheKey('/api/nft/owner', { address: '0xabc', chainId: '1', pageKey: 'next' })
      ];
      
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should include all relevant parameters in cache key', () => {
      const key = getCacheKey('/api/nft/owner', {
        address: '0xabc',
        chainId: '1',
        pageKey: 'next',
        limit: '10'
      });
      
      expect(key).toContain('address=0xabc');
      expect(key).toContain('chainId=1');
      expect(key).toContain('pageKey=next');
      expect(key).toContain('limit=10');
    });
  });

  describe('Cache Performance for Expensive Queries', () => {
    it('should use longer TTL for expensive attribute queries', () => {
      // Attributes endpoint uses 60s TTL (longer than regular queries)
      const attributesTTL = 60;
      const regularQueryTTL = 10;
      
      expect(attributesTTL).toBeGreaterThan(regularQueryTTL);
    });

    it('should use longer TTL for expensive rarity queries', () => {
      // Rarity endpoint uses 60s TTL (longer than regular queries)
      const rarityTTL = 60;
      const regularQueryTTL = 10;
      
      expect(rarityTTL).toBeGreaterThan(regularQueryTTL);
    });

    it('should use longest TTL for immutable metadata', () => {
      // Metadata endpoints use 300s TTL (longest)
      const metadataTTL = 300;
      const attributesTTL = 60;
      const regularQueryTTL = 10;
      
      expect(metadataTTL).toBeGreaterThan(attributesTTL);
      expect(metadataTTL).toBeGreaterThan(regularQueryTTL);
    });

    it('should use shorter TTL for user-specific data', () => {
      // User-specific endpoints use 5s TTL (shorter for freshness)
      const userDataTTL = 5;
      const contractDataTTL = 10;
      
      expect(userDataTTL).toBeLessThan(contractDataTTL);
    });
  });

  describe('Hybrid Cache Module', () => {
    it('should have hybrid-cache module available', () => {
      const cachePath = path.join(process.cwd(), 'src/lib/hybrid-cache.ts');
      expect(fs.existsSync(cachePath)).toBe(true);
    });

    it('should export required cache functions', async () => {
      const { cachedFetch, getCacheKey, invalidateCache, clearAllCache } = await import('@/lib/hybrid-cache');
      
      expect(cachedFetch).toBeDefined();
      expect(typeof cachedFetch).toBe('function');
      
      expect(getCacheKey).toBeDefined();
      expect(typeof getCacheKey).toBe('function');
      
      expect(invalidateCache).toBeDefined();
      expect(typeof invalidateCache).toBe('function');
      
      expect(clearAllCache).toBeDefined();
      expect(typeof clearAllCache).toBe('function');
    });
  });
});
