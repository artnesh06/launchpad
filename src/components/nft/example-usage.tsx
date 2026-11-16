/**
 * Example usage of NFT components
 * This file demonstrates how to use the NFT display components
 */

import React from 'react';
import { NFTCard, NFTGrid, NFTAttributes, RarityDisplay } from './index';
import { NFTMetadata, NFTRarity } from '@/types/alchemy';

// Example NFT data
const exampleNFT: NFTMetadata = {
  contract: {
    address: '0x1234567890123456789012345678901234567890',
    name: 'Cool NFT Collection',
    symbol: 'COOL',
  },
  tokenId: '42',
  name: 'Cool NFT #42',
  description: 'A really cool NFT from the collection',
  image: {
    cachedUrl: 'https://example.com/nft/42.png',
    thumbnailUrl: 'https://example.com/nft/42-thumb.png',
  },
  raw: {
    metadata: {
      attributes: [
        { trait_type: 'Background', value: 'Blue' },
        { trait_type: 'Eyes', value: 'Laser' },
        { trait_type: 'Hat', value: 'Crown' },
      ],
    },
  },
};

// Example rarity data
const exampleRarity: NFTRarity = {
  strategyId: 'openrarity',
  strategyVersion: '1.0',
  rank: 50,
  score: 85.5,
  maxRank: 1000,
  totalSupply: 1000,
  rarityScore: 85.5,
  prevalence: 0.05,
};

// Example attributes with prevalence
const exampleAttributes = [
  { trait_type: 'Background', value: 'Blue', prevalence: 0.15 },
  { trait_type: 'Eyes', value: 'Laser', prevalence: 0.05 },
  { trait_type: 'Hat', value: 'Crown', prevalence: 0.02 },
];

export function NFTComponentsExample() {
  const handleNFTClick = (nft: NFTMetadata) => {
    console.log('NFT clicked:', nft);
  };

  return (
    <div className="space-y-8 p-8">
      {/* Single NFT Card */}
      <section>
        <h2 className="mb-4 font-mono text-2xl font-bold">NFT Card</h2>
        <div className="max-w-xs">
          <NFTCard nft={exampleNFT} onClick={() => handleNFTClick(exampleNFT)} />
        </div>
      </section>

      {/* NFT Grid */}
      <section>
        <h2 className="mb-4 font-mono text-2xl font-bold">NFT Grid</h2>
        <NFTGrid
          nfts={[exampleNFT, exampleNFT, exampleNFT, exampleNFT]}
        />
      </section>

      {/* NFT Attributes */}
      <section>
        <h2 className="mb-4 font-mono text-2xl font-bold">NFT Attributes</h2>
        <NFTAttributes attributes={exampleAttributes} />
      </section>

      {/* Rarity Display */}
      <section>
        <h2 className="mb-4 font-mono text-2xl font-bold">Rarity Display</h2>
        <div className="max-w-md">
          <RarityDisplay rarity={exampleRarity} totalSupply={1000} />
        </div>
      </section>
    </div>
  );
}
