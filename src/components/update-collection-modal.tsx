'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { OddsLaunchpadABI } from '@/abi/OddsLaunchpad';
import { ModalFooterWithGas } from '@/components/modal-footer-with-gas';
import { getCreatorAuthHeadersSafe } from '@/lib/creator-auth-client';

interface UpdateCollectionModalProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
  contractAddress: string;
  chainId: number;
  collectionData: {
    name: string;
    symbol: string;
    description: string;
    externalLink?: string;
    maxSupply: number;
    royaltyPercentage: number;
    royaltyRecipient: string;
    treasury: string;
    metadata?: {
      twitter?: string;
      discord?: string;
    };
  };
}

export function UpdateCollectionModal({ open, onClose, collectionId, contractAddress, chainId, collectionData }: UpdateCollectionModalProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [name, setName] = React.useState(collectionData.name);
  const [symbol, setSymbol] = React.useState(collectionData.symbol);
  const [description, setDescription] = React.useState(collectionData.description);
  const [externalLink, setExternalLink] = React.useState(collectionData.externalLink || '');
  const [maxSupply, setMaxSupply] = React.useState(collectionData.maxSupply.toString());
  const [royaltyPercentage, setRoyaltyPercentage] = React.useState(collectionData.royaltyPercentage.toString());
  const [royaltyAddress, setRoyaltyAddress] = React.useState(collectionData.royaltyRecipient);
  const [mintRevenueAddress, setMintRevenueAddress] = React.useState(collectionData.treasury);
  
  // Social media links
  const [twitter, setTwitter] = React.useState(collectionData.metadata?.twitter || '');
  const [discord, setDiscord] = React.useState(collectionData.metadata?.discord || '');
  
  const [loading, setLoading] = React.useState(false);

  // Update state when collectionData changes (when modal opens with new data)
  React.useEffect(() => {
    if (open) {
      setName(collectionData.name);
      setSymbol(collectionData.symbol);
      setDescription(collectionData.description);
      setExternalLink(collectionData.externalLink || '');
      setMaxSupply(collectionData.maxSupply.toString());
      setRoyaltyPercentage(collectionData.royaltyPercentage.toString());
      setRoyaltyAddress(collectionData.royaltyRecipient);
      setMintRevenueAddress(collectionData.treasury);
      
      // Social media links
      setTwitter(collectionData.metadata?.twitter || '');
      setDiscord(collectionData.metadata?.discord || '');
    }
  }, [open, collectionData]);

  const handleExecute = async () => {
    if (!address || !walletClient) {
      toast.error('Please connect your wallet', { id: TOAST_ID });
      return;
    }

    setLoading(true);
    try {
      // Check if contract updates are needed
      const needsContractUpdate = 
        externalLink !== collectionData.externalLink ||
        mintRevenueAddress !== collectionData.treasury ||
        royaltyAddress !== collectionData.royaltyRecipient ||
        royaltyPercentage !== collectionData.royaltyPercentage.toString();

      // Step 1: Update smart contract if needed
      if (needsContractUpdate) {
        toast.info('Updating smart contract... Please confirm transactions in your wallet', { id: TOAST_ID });

        // Update external link
        if (externalLink !== collectionData.externalLink) {
          const hash = await walletClient.writeContract({
            address: contractAddress as `0x${string}`,
            abi: OddsLaunchpadABI,
            functionName: 'updateExternalLink',
            args: [externalLink || ''],
            chain: { id: chainId } as any
          });
          toast.info('External link transaction submitted...', { id: TOAST_ID });
          await publicClient?.waitForTransactionReceipt({ hash });
        }

        // Update treasury
        if (mintRevenueAddress !== collectionData.treasury) {
          const hash = await walletClient.writeContract({
            address: contractAddress as `0x${string}`,
            abi: OddsLaunchpadABI,
            functionName: 'updateTreasury',
            args: [mintRevenueAddress as `0x${string}`],
            chain: { id: chainId } as any
          });
          toast.info('Treasury transaction submitted...', { id: TOAST_ID });
          await publicClient?.waitForTransactionReceipt({ hash });
        }

        // Update royalty recipient
        if (royaltyAddress !== collectionData.royaltyRecipient) {
          const hash = await walletClient.writeContract({
            address: contractAddress as `0x${string}`,
            abi: OddsLaunchpadABI,
            functionName: 'updateRoyaltyRecipient',
            args: [royaltyAddress as `0x${string}`],
            chain: { id: chainId } as any
          });
          toast.info('Royalty recipient transaction submitted...', { id: TOAST_ID });
          await publicClient?.waitForTransactionReceipt({ hash });
        }

        // Update royalty percentage
        if (royaltyPercentage !== collectionData.royaltyPercentage.toString()) {
          const feeNumerator = BigInt(parseInt(royaltyPercentage) * 100);
          const hash = await walletClient.writeContract({
            address: contractAddress as `0x${string}`,
            abi: OddsLaunchpadABI,
            functionName: 'setDefaultRoyalty',
            args: [royaltyAddress as `0x${string}`, feeNumerator],
            chain: { id: chainId } as any
          });
          toast.info('Royalty percentage transaction submitted...', { id: TOAST_ID });
          await publicClient?.waitForTransactionReceipt({ hash });
        }

        toast.success('Smart contract updated successfully!', { id: TOAST_ID });
      }

      // Step 2: Update database
      const authHeaders = await getCreatorAuthHeadersSafe('collection:update', collectionId);
      const response = await fetch('/api/collections/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          collectionId,
          name,
          symbol,
          description,
          externalLink,
          maxSupply,
          royaltyPercentage,
          royaltyRecipient: royaltyAddress,
          treasury: mintRevenueAddress,
          metadata: {
            twitter,
            discord
          }
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update database');
      }
      
      toast.success('Collection updated successfully!', { id: TOAST_ID });
      onClose();
      
      // Refresh page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Failed to update collection:', error);
      
      // Check if user rejected transaction
      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        toast.error('Transaction cancelled', { id: TOAST_ID });
      } else {
        toast.error('Failed to update collection', {
          description: error.message || 'Please try again'
        , id: TOAST_ID });
      }
    } finally {
      setLoading(false);
    }
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
        {/* Collection Name Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Collection Name</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Odds NFT"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Symbol Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Symbol</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="ODDS"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Description Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Description</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Odds is the great collection ever made."
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Link Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Link</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://www.oddsgarden.io/"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Twitter Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Twitter</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://twitter.com/username"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Discord Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Discord</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              placeholder="https://discord.gg/invite"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Maximum Supply Row - Read Only */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Maximum Supply</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={maxSupply}
              disabled
              placeholder="1,000"
              className="w-full h-[42px] bg-transparent px-3 text-[#6A7282] font-mono text-[15px] outline-none placeholder:text-[#857F94] cursor-not-allowed"
              title="Maximum supply cannot be changed after deployment"
            />
          </div>
        </div>

        {/* Info Row - Contract Updates */}
        <div className="grid grid-cols-1 border-b border-[#2F3336] bg-[#1E1F22]/30">
          <div className="px-6 py-3">
            <p className="text-[#F7B955] font-mono text-xs leading-relaxed">
              ⚠️ Note: Changes to Link, Royalty settings, and Treasury will update the smart contract and require gas fees.
              Name, Symbol, Description, Twitter, and Discord are stored off-chain only.
            </p>
          </div>
        </div>

        {/* Royalty percentage Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Royalty percentage</label>
          </div>
          <div className="bg-[#0D0E11] flex items-center">
            <input
              type="number"
              value={(parseFloat(royaltyPercentage) / 100).toString()}
              onChange={(e) => setRoyaltyPercentage((parseFloat(e.target.value) * 100).toString())}
              placeholder="5.0"
              step="0.1"
              min="0"
              max="10"
              className="w-full h-full bg-transparent px-3 text-[#857F94] font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Royalty Address Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Royalty Address</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={royaltyAddress}
              onChange={(e) => setRoyaltyAddress(e.target.value)}
              placeholder="0xb33225ef8d8B4Be185129141c70d3eF2C3eb7Ca9"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Mint Revenue Address Row */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
          <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
            <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Mint Revenue Address</label>
          </div>
          <div className="bg-[#0D0E11]">
            <input
              type="text"
              value={mintRevenueAddress}
              onChange={(e) => setMintRevenueAddress(e.target.value)}
              placeholder="0xb33225ef8d8B4Be185129141c70d3eF2C3eb7Ca9"
              className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
            />
          </div>
        </div>

        {/* Execute Button Row */}
        <div className="flex items-center px-6 py-2 justify-between border-b border-[#2F3336]">
          <ModalFooterWithGas chainId={chainId} />
          <div className="flex items-center gap-4">
            <button
              onClick={handleExecute}
              disabled={loading}
              className="w-[150px] h-10 bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                'Execute'
              )}
            </button>
            <button
              onClick={onClose}
              className="relative bg-[#2F3336] w-[120px] h-10 border border-[#2F3336] rounded-[10px] overflow-hidden group hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}


