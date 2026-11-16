/**
 * Marketplace Drawer Component - Example Usage
 * 
 * Component ini menampilkan drawer dengan daftar marketplace (OpenSea, Blur, LooksRare, X2Y2, Rarible)
 * yang dapat digunakan untuk listing NFT.
 * 
 * Ketika user klik pada salah satu marketplace, akan membuka tab baru yang mengarah ke
 * halaman detail NFT di marketplace tersebut.
 */

'use client';

import { useState } from 'react';
import { MarketplaceDrawer } from './marketplace-drawer';

export function MarketplaceDrawerExample() {
  const [open, setOpen] = useState(false);

  // Example NFT data
  const exampleNFT = {
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', // BAYC
    tokenId: '1234',
    chainId: 1, // Ethereum mainnet
    nftName: 'Bored Ape',
  };

  return (
    <div className="p-8">
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-[#B392F0] text-black font-mono rounded-lg hover:brightness-110"
      >
        Open Marketplace Drawer
      </button>

      <MarketplaceDrawer
        open={open}
        onClose={() => setOpen(false)}
        contractAddress={exampleNFT.contractAddress}
        tokenId={exampleNFT.tokenId}
        chainId={exampleNFT.chainId}
        nftName={exampleNFT.nftName}
      />
    </div>
  );
}

/**
 * Integration dengan NFT Card:
 * 
 * 1. Import MarketplaceDrawer di component NFT card
 * 2. Tambahkan state untuk mengontrol drawer:
 *    const [marketplaceDrawerOpen, setMarketplaceDrawerOpen] = useState(false);
 * 
 * 3. Tambahkan handler untuk button "List":
 *    const handleListClick = (e: React.MouseEvent) => {
 *      e.stopPropagation();
 *      setMarketplaceDrawerOpen(true);
 *    };
 * 
 * 4. Render MarketplaceDrawer di dalam component:
 *    <MarketplaceDrawer
 *      open={marketplaceDrawerOpen}
 *      onClose={() => setMarketplaceDrawerOpen(false)}
 *      contractAddress={contractAddress}
 *      tokenId={tokenId}
 *      chainId={chainId}
 *      nftName={nftName}
 *    />
 */
