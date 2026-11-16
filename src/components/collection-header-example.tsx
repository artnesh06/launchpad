/**
 * CollectionHeader Component Example Usage
 * 
 * This file demonstrates how to use the CollectionHeader component
 * with sample data for testing and development purposes.
 */

import { CollectionHeader } from './collection-header';
import { ContractMetadata } from '@/types/alchemy';

// Example 1: Basic collection with OpenSea metadata
export function BasicCollectionExample() {
  const collection: ContractMetadata = {
    address: '0x1234567890123456789012345678901234567890',
    name: 'Cool NFT Collection',
    symbol: 'COOL',
    totalSupply: '10000',
    tokenType: 'ERC721',
    contractDeployer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    openSeaMetadata: {
      collectionName: 'Cool NFT Collection',
      description: 'A collection of 10,000 unique digital collectibles living on the Ethereum blockchain.',
      imageUrl: 'https://example.com/collection-image.png',
      bannerImageUrl: 'https://example.com/collection-banner.png',
      twitterUsername: 'coolnftcollection',
      discordUrl: 'https://discord.gg/coolnft',
      externalUrl: 'https://coolnftcollection.com',
    },
  };

  const stats = {
    totalSupply: 10000,
    mintedCount: 7500,
    mintPercentage: 75,
  };

  return <CollectionHeader collection={collection} stats={stats} />;
}

// Example 2: Collection with launchpad data and mint phases
export function LaunchpadCollectionExample() {
  const collection: ContractMetadata = {
    address: '0x9876543210987654321098765432109876543210',
    name: 'Launchpad NFT',
    symbol: 'LNFT',
    totalSupply: '5000',
    tokenType: 'ERC721',
    contractDeployer: '0x1111111111111111111111111111111111111111',
  };

  const launchpadData = {
    id: 'launchpad-1',
    contractAddress: '0x9876543210987654321098765432109876543210',
    creator: '0x1111111111111111111111111111111111111111',
    name: 'Launchpad NFT Collection',
    symbol: 'LNFT',
    description: 'An exclusive NFT collection launched on our platform with multiple mint phases.',
    totalMaxSupply: 5000,
    mintedCount: 2000,
    volume: 150,
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    chainId: 1,
    metadata: {
      image: 'https://example.com/launchpad-image.png',
      bannerImage: 'https://example.com/launchpad-banner.png',
    },
    phases: [
      {
        id: 'phase-1',
        name: 'Early Access',
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-07'),
        price: '0.03',
        isActive: false,
        maxPerWallet: 3,
        totalLimit: 1000,
        mintedCount: 1000,
      },
      {
        id: 'phase-2',
        name: 'Whitelist',
        startTime: new Date('2024-01-08'),
        endTime: new Date('2024-01-15'),
        price: '0.05',
        isActive: true,
        maxPerWallet: 5,
        totalLimit: 2000,
        mintedCount: 1000,
      },
      {
        id: 'phase-3',
        name: 'Public Sale',
        startTime: new Date('2024-01-16'),
        endTime: null,
        price: '0.08',
        isActive: false,
        maxPerWallet: 10,
        totalLimit: 2000,
      },
    ],
  };

  const stats = {
    totalSupply: 5000,
    mintedCount: 2000,
    mintPercentage: 40,
  };

  return (
    <CollectionHeader
      collection={collection}
      launchpadData={launchpadData}
      stats={stats}
    />
  );
}

// Example 3: Minimal collection without optional metadata
export function MinimalCollectionExample() {
  const collection: ContractMetadata = {
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    name: 'Simple NFT',
    symbol: 'SNFT',
    totalSupply: '1000',
    tokenType: 'ERC721',
  };

  const stats = {
    totalSupply: 1000,
    mintedCount: 100,
    mintPercentage: 10,
  };

  return <CollectionHeader collection={collection} stats={stats} />;
}

// Example 4: Collection with IPFS images
export function IPFSCollectionExample() {
  const collection: ContractMetadata = {
    address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    name: 'IPFS Collection',
    symbol: 'IPFS',
    totalSupply: '2000',
    tokenType: 'ERC721',
    contractDeployer: '0x2222222222222222222222222222222222222222',
    openSeaMetadata: {
      collectionName: 'IPFS Collection',
      description: 'A collection with images stored on IPFS',
      imageUrl: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      bannerImageUrl: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdH',
    },
  };

  const stats = {
    totalSupply: 2000,
    mintedCount: 2000,
    mintPercentage: 100,
  };

  return <CollectionHeader collection={collection} stats={stats} />;
}

// Example 5: Collection with all social links
export function SocialLinksCollectionExample() {
  const collection: ContractMetadata = {
    address: '0xcccccccccccccccccccccccccccccccccccccccc',
    name: 'Social NFT',
    symbol: 'SNFT',
    totalSupply: '3000',
    tokenType: 'ERC721',
    openSeaMetadata: {
      collectionName: 'Social NFT Collection',
      description: 'A highly social NFT collection with all the links',
      imageUrl: 'https://example.com/social-image.png',
      bannerImageUrl: 'https://example.com/social-banner.png',
      twitterUsername: 'socialnft',
      discordUrl: 'https://discord.gg/socialnft',
      externalUrl: 'https://socialnft.io',
    },
  };

  const stats = {
    totalSupply: 3000,
    mintedCount: 1500,
    mintPercentage: 50,
  };

  return <CollectionHeader collection={collection} stats={stats} />;
}

// Example 6: Collection without social links
export function NoSocialLinksExample() {
  const collection: ContractMetadata = {
    address: '0xdddddddddddddddddddddddddddddddddddddddd',
    name: 'Private Collection',
    symbol: 'PRIV',
    totalSupply: '500',
    tokenType: 'ERC721',
    openSeaMetadata: {
      collectionName: 'Private Collection',
      description: 'A private collection with no social media presence',
      imageUrl: 'https://example.com/private-image.png',
      bannerImageUrl: 'https://example.com/private-banner.png',
    },
  };

  const stats = {
    totalSupply: 500,
    mintedCount: 250,
    mintPercentage: 50,
  };

  return <CollectionHeader collection={collection} stats={stats} />;
}
