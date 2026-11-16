/**
 * SEO Utils Verification Tests
 * 
 * These tests verify that SEO metadata and structured data are generated correctly
 * for NFT collection and detail pages.
 */

import { describe, it, expect } from 'vitest';
import {
  generateCollectionMetadata,
  generateNFTMetadata,
  generateCollectionStructuredData,
  generateNFTStructuredData,
} from '@/lib/seo-utils';
import { ContractMetadata, NFTMetadata } from '@/types/alchemy';

describe('SEO Utils', () => {
  describe('generateCollectionMetadata', () => {
    it('should generate complete metadata for collection with all fields', () => {
      const collection: ContractMetadata = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Collection',
        symbol: 'TEST',
        totalSupply: '1000',
        openSeaMetadata: {
          description: 'A test NFT collection',
          bannerImageUrl: 'https://example.com/banner.jpg',
          imageUrl: 'https://example.com/image.jpg',
          twitterUsername: 'testcollection',
        },
      };

      const stats = {
        totalSupply: 1000,
        mintedCount: 500,
        mintPercentage: 50,
      };

      const metadata = generateCollectionMetadata(collection, stats);

      expect(metadata.title).toBe('Test Collection | NFT Collection');
      expect(metadata.description).toContain('Test Collection');
      expect(metadata.description).toContain('500 of 1000');
      expect(metadata.openGraph?.title).toBe('Test Collection | NFT Collection');
      expect(metadata.openGraph?.siteName).toBe('ODDS NFT Launchpad');
      expect(metadata.twitter?.card).toBe('summary_large_image');
      expect(metadata.twitter?.creator).toBe('@testcollection');
    });

    it('should handle collection with missing optional fields', () => {
      const collection: ContractMetadata = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Minimal Collection',
      };

      const stats = {
        totalSupply: 100,
        mintedCount: 50,
        mintPercentage: 50,
      };

      const metadata = generateCollectionMetadata(collection, stats);

      expect(metadata.title).toBe('Minimal Collection | NFT Collection');
      expect(metadata.description).toContain('Minimal Collection');
      expect(metadata.openGraph?.images).toEqual([]);
      expect(metadata.twitter?.creator).toBeUndefined();
    });

    it('should convert IPFS URLs in images', () => {
      const collection: ContractMetadata = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'IPFS Collection',
        openSeaMetadata: {
          bannerImageUrl: 'ipfs://QmTest123',
        },
      };

      const stats = {
        totalSupply: 100,
        mintedCount: 50,
        mintPercentage: 50,
      };

      const metadata = generateCollectionMetadata(collection, stats);

      expect(metadata.openGraph?.images?.[0]?.url).toContain('https://');
      expect(metadata.openGraph?.images?.[0]?.url).not.toContain('ipfs://');
    });
  });

  describe('generateNFTMetadata', () => {
    it('should generate complete metadata for NFT with all fields', () => {
      const nft: NFTMetadata = {
        contract: {
          address: '0x1234567890123456789012345678901234567890',
          name: 'Test Collection',
        },
        tokenId: '123',
        name: 'Test NFT #123',
        description: 'A test NFT',
        image: {
          cachedUrl: 'https://example.com/nft.jpg',
        },
      };

      const collection: ContractMetadata = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Collection',
        openSeaMetadata: {
          twitterUsername: 'testcollection',
        },
      };

      const metadata = generateNFTMetadata(nft, collection);

      expect(metadata.title).toBe('Test NFT #123 | Test Collection');
      expect(metadata.description).toBe('A test NFT');
      expect(metadata.openGraph?.title).toBe('Test NFT #123 | Test Collection');
      expect(metadata.twitter?.creator).toBe('@testcollection');
    });

    it('should handle NFT with missing name and description', () => {
      const nft: NFTMetadata = {
        contract: {
          address: '0x1234567890123456789012345678901234567890',
        },
        tokenId: '456',
      };

      const collection: ContractMetadata = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Collection',
      };

      const metadata = generateNFTMetadata(nft, collection);

      expect(metadata.title).toBe('#456 | Test Collection');
      expect(metadata.description).toContain('#456');
      expect(metadata.description).toContain('Test Collection');
    });
  });

  describe('generateCollectionStructuredData', () => {
    it('should generate valid Schema.org CollectionPage structured data', () => {
      const collection: ContractMetadata = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Collection',
        contractDeployer: '0xabcdef1234567890abcdef1234567890abcdef12',
        openSeaMetadata: {
          description: 'A test collection',
          imageUrl: 'https://example.com/image.jpg',
          externalUrl: 'https://example.com',
        },
      };

      const stats = {
        totalSupply: 1000,
        mintedCount: 500,
      };

      const structuredData = generateCollectionStructuredData(collection, stats);

      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('CollectionPage');
      expect(structuredData.name).toBe('Test Collection');
      expect(structuredData.numberOfItems).toBe(500);
      expect(structuredData.creator).toBeDefined();
      expect(structuredData.creator?.['@type']).toBe('Person');
      expect(structuredData.about).toBeDefined();
      expect(structuredData.about?.additionalType).toBe('NFT Collection');
    });
  });

  describe('generateNFTStructuredData', () => {
    it('should generate valid Schema.org VisualArtwork structured data', () => {
      const nft: NFTMetadata = {
        contract: {
          address: '0x1234567890123456789012345678901234567890',
        },
        tokenId: '123',
        name: 'Test NFT',
        description: 'A test NFT',
        image: {
          cachedUrl: 'https://example.com/nft.jpg',
        },
        raw: {
          metadata: {
            attributes: [
              { trait_type: 'Background', value: 'Blue' },
              { trait_type: 'Eyes', value: 'Green' },
            ],
          },
        },
      };

      const collection: ContractMetadata = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Collection',
        contractDeployer: '0xabcdef1234567890abcdef1234567890abcdef12',
      };

      const owners = ['0x9876543210987654321098765432109876543210'];

      const structuredData = generateNFTStructuredData(nft, collection, owners);

      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('VisualArtwork');
      expect(structuredData.name).toBe('Test NFT');
      expect(structuredData.identifier).toBe('0x1234567890123456789012345678901234567890/123');
      expect(structuredData.creator).toBeDefined();
      expect(structuredData.owner).toHaveLength(1);
      expect(structuredData.isPartOf).toBeDefined();
      expect(structuredData.isPartOf?.name).toBe('Test Collection');
      expect(structuredData.additionalProperty).toHaveLength(2);
      expect(structuredData.artMedium).toBe('Digital');
      expect(structuredData.artform).toBe('NFT');
    });

    it('should handle NFT with no attributes', () => {
      const nft: NFTMetadata = {
        contract: {
          address: '0x1234567890123456789012345678901234567890',
        },
        tokenId: '456',
        name: 'Simple NFT',
      };

      const collection: ContractMetadata = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Collection',
      };

      const owners: string[] = [];

      const structuredData = generateNFTStructuredData(nft, collection, owners);

      expect(structuredData.additionalProperty).toEqual([]);
      expect(structuredData.owner).toBeUndefined();
    });
  });
});
