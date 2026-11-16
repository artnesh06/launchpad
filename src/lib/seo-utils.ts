import { Metadata } from 'next';
import { ContractMetadata, NFTMetadata } from '@/types/alchemy';
import { ipfsToHttp } from './ipfs-utils';

/**
 * Generate metadata for NFT collection pages
 */
export function generateCollectionMetadata(
  collection: ContractMetadata,
  stats: {
    totalSupply: number;
    mintedCount: number;
    mintPercentage: number;
  }
): Metadata {
  const collectionName = collection.name || 'NFT Collection';
  const description = collection.openSeaMetadata?.description || 
    `Explore ${collectionName} - ${stats.mintedCount} of ${stats.totalSupply} NFTs minted (${stats.mintPercentage.toFixed(1)}%)`;
  
  const imageUrl = collection.openSeaMetadata?.bannerImageUrl || 
    collection.openSeaMetadata?.imageUrl;
  const processedImageUrl = imageUrl ? ipfsToHttp(imageUrl) : null;

  const title = `${collectionName} | NFT Collection`;
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://odds.wtf'}/collection/${collection.address}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'ODDS NFT Launchpad',
      type: 'website',
      images: processedImageUrl ? [
        {
          url: processedImageUrl,
          width: 1200,
          height: 630,
          alt: collectionName,
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: processedImageUrl ? [processedImageUrl] : [],
      creator: collection.openSeaMetadata?.twitterUsername ? 
        `@${collection.openSeaMetadata.twitterUsername}` : undefined,
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate metadata for NFT detail pages
 */
export function generateNFTMetadata(
  nft: NFTMetadata,
  collection: ContractMetadata
): Metadata {
  const nftName = nft.name || `#${nft.tokenId}`;
  const collectionName = collection.name || 'NFT Collection';
  const description = nft.description || 
    `${nftName} from ${collectionName} collection`;

  const imageUrl = nft.image?.cachedUrl ||
    nft.image?.thumbnailUrl ||
    nft.image?.pngUrl ||
    nft.image?.originalUrl ||
    nft.raw?.metadata?.image;
  const processedImageUrl = imageUrl ? ipfsToHttp(imageUrl) : null;

  const title = `${nftName} | ${collectionName}`;
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://odds.wtf'}/nft/${nft.contract.address}/${nft.tokenId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'ODDS NFT Launchpad',
      type: 'website',
      images: processedImageUrl ? [
        {
          url: processedImageUrl,
          width: 1200,
          height: 1200,
          alt: nftName,
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: processedImageUrl ? [processedImageUrl] : [],
      creator: collection.openSeaMetadata?.twitterUsername ? 
        `@${collection.openSeaMetadata.twitterUsername}` : undefined,
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate JSON-LD structured data for NFT collection
 */
export function generateCollectionStructuredData(
  collection: ContractMetadata,
  stats: {
    totalSupply: number;
    mintedCount: number;
  }
) {
  const imageUrl = collection.openSeaMetadata?.bannerImageUrl || 
    collection.openSeaMetadata?.imageUrl;
  const processedImageUrl = imageUrl ? ipfsToHttp(imageUrl) : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.name || 'NFT Collection',
    description: collection.openSeaMetadata?.description || 
      `NFT Collection with ${stats.totalSupply} total supply`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://odds.wtf'}/collection/${collection.address}`,
    image: processedImageUrl,
    creator: collection.contractDeployer ? {
      '@type': 'Person',
      identifier: collection.contractDeployer,
    } : undefined,
    about: {
      '@type': 'CreativeWork',
      name: collection.name,
      identifier: collection.address,
      additionalType: 'NFT Collection',
    },
    numberOfItems: stats.mintedCount,
    ...(collection.openSeaMetadata?.externalUrl && {
      sameAs: collection.openSeaMetadata.externalUrl,
    }),
  };
}

/**
 * Generate JSON-LD structured data for individual NFT
 */
export function generateNFTStructuredData(
  nft: NFTMetadata,
  collection: ContractMetadata,
  owners: string[]
) {
  const imageUrl = nft.image?.cachedUrl ||
    nft.image?.thumbnailUrl ||
    nft.image?.pngUrl ||
    nft.image?.originalUrl ||
    nft.raw?.metadata?.image;
  const processedImageUrl = imageUrl ? ipfsToHttp(imageUrl) : null;

  const attributes = nft.raw?.metadata?.attributes || [];

  return {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: nft.name || `#${nft.tokenId}`,
    description: nft.description,
    image: processedImageUrl,
    identifier: `${nft.contract.address}/${nft.tokenId}`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://odds.wtf'}/nft/${nft.contract.address}/${nft.tokenId}`,
    creator: collection.contractDeployer ? {
      '@type': 'Person',
      identifier: collection.contractDeployer,
    } : undefined,
    owner: owners.length > 0 ? owners.map(owner => ({
      '@type': 'Person',
      identifier: owner,
    })) : undefined,
    isPartOf: {
      '@type': 'Collection',
      name: collection.name,
      identifier: collection.address,
    },
    additionalProperty: attributes.map((attr: any) => ({
      '@type': 'PropertyValue',
      name: attr.trait_type,
      value: attr.value,
    })),
    artMedium: 'Digital',
    artform: 'NFT',
  };
}
