'use client';

import { Drawer } from '@/components/ui/drawer';
import { ModalFooterWithGas } from './modal-footer-with-gas';

interface Marketplace {
  id: string;
  name: string;
  logo: string;
  getUrl: (chainId: number, contractAddress: string, tokenId: string) => string;
}

interface MarketplaceDrawerProps {
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  tokenId: string;
  chainId: number;
  nftName?: string;
}

const MARKETPLACES: Marketplace[] = [
  {
    id: 'opensea',
    name: 'OpenSea',
    logo: '/marketplaces/opensea.png',
    getUrl: (chainId, contractAddress, tokenId) => {
      const chainName = chainId === 4326 ? 'megaeth' : chainId === 137 ? 'matic' : chainId === 42161 ? 'arbitrum' : 'ethereum';
      return `https://opensea.io/item/${chainName}/${contractAddress}/${tokenId}`;
    },
  },
  // {
  //   id: 'magiceden',
  //   name: 'Magic Eden',
  //   logo: '/marketplaces/magiceden.png',
  //   getUrl: (chainId, contractAddress, tokenId) => {
  //     const chainName = chainId === 1 ? 'ethereum' : chainId === 137 ? 'matic' : chainId === 42161 ? 'arbitrum' : 'ethereum';
  //     return `#`;
  //   },
  // },
    {
    id: 'rarible',
    name: 'Rarible',
    logo: '/marketplaces/rarible.png',
    getUrl: (chainId, contractAddress, tokenId) => {
      const chainName = chainId === 4326 ? 'megaeth' : chainId === 137 ? 'polygon' : 'ethereum';
      return `https://rarible.com/${chainName}/items/${contractAddress}:${tokenId}`;
    },
  },
];

export function MarketplaceDrawer({
  open,
  onClose,
  contractAddress,
  tokenId,
  chainId,
  nftName,
}: MarketplaceDrawerProps) {
  const handleMarketplaceClick = (marketplace: Marketplace) => {
    const url = marketplace.getUrl(chainId, contractAddress, tokenId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      position="bottom"
      showOverlay={true}
    >
      {/* Content - Table Layout */}
      <div className="w-full max-w-[1000px] mx-auto">
        {/* Marketplace Grid Row */}
        <div className="flex items-center justify-between px-6 pt-3 rounded-t-lg">
          <div className="flex items-center gap-4">
            {MARKETPLACES.map((marketplace) => (
              <button
                key={marketplace.id}
                onClick={() => handleMarketplaceClick(marketplace)}
              >
                {/* Marketplace Logo */}
                <div className="h-[35px] flex items-center justify-center">
                  <img
                    src={marketplace.logo}
                    alt={marketplace.name}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200"
                    onError={(e) => {
                      // Fallback to text if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<div class="text-white text-2xl font-bold">${marketplace.name.charAt(0)}</div>`;
                      }
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="relative bg-[#2F3336] w-[120px] h-10 border border-[#2F3336] rounded-[10px] overflow-hidden group hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        {/* Info Text Row */}
        <div className="px-6 py-4 flex justify-start">
          <ModalFooterWithGas chainId={chainId} />
        </div>
      </div>
    </Drawer>
  )
}
