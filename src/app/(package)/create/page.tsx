'use client';

import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Refresh01Icon } from '@hugeicons/core-free-icons';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { CustomSelect } from '@/components/ui/custom-select';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAccount } from 'wagmi';
import { WalletConnectionGuard } from '@/components/wallet-connection-guard';
import { formatPrice as formatPriceUtil } from '@/lib/format-utils';
import { ActionPopover } from '@/components/action-popover';
import { GetFeaturedModal } from '@/components/get-featured-modal';
import { getChainSelectOptions } from '@/lib/chain-utils';
import { UpdateCollectionModal } from '@/components/update-collection-modal';
import { UpdateCollectionImagesModal } from '@/components/update-collection-images-modal';
import { UpdateWhitelistModal } from '@/components/update-whitelist-modal';
import { UpdatePublicMintModal } from '@/components/update-public-mint-modal';
import { SendNftModal } from '@/components/send-nft-modal';
import { BurnNftModal } from '@/components/burn-nft-modal';
import { SnapshotHoldersModal } from '@/components/snapshot-holders-modal';
import { WithdrawTreasuryModal } from '@/components/withdraw-treasury-modal';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';
import { JoinCommunitySection } from '@/components/join-community-section';
import { getCreatorAuthHeadersSafe } from '@/lib/creator-auth-client';

interface LaunchpadData {
  id: string;
  contractAddress: string;
  creator: string;
  name: string;
  symbol: string;
  description?: string;
  externalLink?: string;
  totalMaxSupply: number;
  mintedCount: number;
  volume: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  chainId: number;
  treasury?: string;
  royaltyRecipient?: string;
  royaltyPercentage?: number;
  treasuryBalance?: string;
  metadata?: {
    image?: string;
    bannerImage?: string;
    twitter?: string;
    discord?: string;
  };
}

interface StatsData {
  total: number;
  active: number;
  mintOut: number;
  volume: number;
}

interface PaginationData {
  current: number;
  total: number;
  count: number;
  limit: number;
}

// Lazy load treasury balance component
function TreasuryBalanceCell({ chainId, contractAddress, ethPrice }: { 
  chainId: number; 
  contractAddress: string; 
  ethPrice: number | null;
}) {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const fetchBalance = async () => {
      try {
        const { ContractService } = await import('@/lib/contract-service');
        const service = new ContractService();
        const bal = await service.getTreasuryPendingBalance(chainId, contractAddress);
        if (!cancelled) {
          setBalance(bal);
        }
      } catch (error) {
        console.error(`Failed to fetch treasury balance:`, error);
        if (!cancelled) {
          setBalance('0');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBalance();
    
    return () => { cancelled = true; };
  }, [chainId, contractAddress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-3 h-3 border border-[#B392F0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const balanceNum = parseFloat(balance || '0');
  const balanceUsd = ethPrice ? (balanceNum * ethPrice).toFixed(2) : null;

  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-sm text-white font-mono">
        {formatPriceUtil(balanceNum)} ETH
      </span>
      {balanceUsd && (
        <span className="text-xs text-[#857F94] font-mono">
          ≈ ${balanceUsd}
        </span>
      )}
    </div>
  );
}

function CreatePage() {
  const { address, isConnected } = useAccount();
  const [launchpads, setLaunchpads] = useState<LaunchpadData[]>([]);
  const [stats, setStats] = useState<StatsData>({ total: 0, active: 0, mintOut: 0, volume: 0 });
  const [pagination, setPagination] = useState<PaginationData>({ current: 1, total: 1, count: 0, limit: 10 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [featuredModalOpen, setFeaturedModalOpen] = useState(false);
  const [updateCollectionModalOpen, setUpdateCollectionModalOpen] = useState(false);
  const [updateCollectionImagesModalOpen, setUpdateCollectionImagesModalOpen] = useState(false);
  const [updateWhitelistModalOpen, setUpdateWhitelistModalOpen] = useState(false);
  const [updatePublicMintModalOpen, setUpdatePublicMintModalOpen] = useState(false);
  const [sendNftModalOpen, setSendNftModalOpen] = useState(false);
  const [burnNftModalOpen, setBurnNftModalOpen] = useState(false);
  const [snapshotHoldersModalOpen, setSnapshotHoldersModalOpen] = useState(false);
  const [withdrawTreasuryModalOpen, setWithdrawTreasuryModalOpen] = useState(false);
  const [selectedLaunchpad, setSelectedLaunchpad] = useState<LaunchpadData | null>(null);

  // Fetch ETH price using fallback API
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('/api/crypto-price?symbol=ETH&currency=USD');
        const data = await response.json();
        if (data.success && data.data?.price) {
          setEthPrice(data.data.price);
        }
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    };

    fetchEthPrice();

    // Update price every 60 seconds
    const interval = setInterval(fetchEthPrice, 60000);

    return () => clearInterval(interval);
  }, []);

  // Chain options - dynamically from centralized config with "All Chains" option
  const chainOptions = [
    { value: 'all', label: 'All Chains', icon: '/images/Chain/AllChain.png' },
    ...getChainSelectOptions()
  ];

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Debounce search query and reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchLaunchpads();
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when chain or status changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedChain, selectedStatus]);

  // Fetch immediately when chain, status, page, or wallet address changes
  useEffect(() => {
    if (address) {
      fetchLaunchpads();
    }
  }, [selectedChain, selectedStatus, currentPage, address]);

  // Fetch stats separately when chain or wallet address changes
  useEffect(() => {
    if (address) {
      fetchStats();
    }
  }, [selectedChain, address]);

  // Handle wallet disconnection - clear data when wallet disconnects
  useEffect(() => {
    if (!isConnected || !address) {
      setLaunchpads([]);
      setStats({ total: 0, active: 0, mintOut: 0, volume: 0 });
    }
  }, [isConnected, address]);

  // Handle wallet switching - refresh collections when wallet address changes
  useEffect(() => {
    if (address && isConnected) {
      // Show loading state during wallet switch
      setLoading(true);
      setStatsLoading(true);

      // Fetch data for new wallet
      fetchLaunchpads();
      fetchStats();
    }
  }, [address]);

  const fetchStats = async () => {
    if (!address) return;

    try {
      setStatsLoading(true);

      const params = new URLSearchParams({
        creatorAddress: address,
      });

      // Only add chainId if not "all"
      if (selectedChain !== 'all') {
        params.append('chainId', selectedChain.toString());
      }

      const response = await fetch(`/api/admin/stats?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        console.error('Failed to fetch stats:', result.error);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchLaunchpads = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        creatorAddress: address,
      });

      // Only add chainId if not "all"
      if (selectedChain !== 'all') {
        params.append('chainId', selectedChain.toString());
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/admin/launchpads?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data) {
        setLaunchpads(result.data.items || []);
        setPagination(result.data.pagination || { current: 1, total: 1, count: 0, limit: 10 });
      } else {
        console.error('Failed to fetch launchpads:', result.error);
        toast.error('Failed to load collections');
        setLaunchpads([]);
      }
    } catch (error) {
      console.error('Failed to fetch launchpads:', error);
      toast.error('Failed to load collections');
      setLaunchpads([]);
    } finally {
      setLoading(false);
    }
  };

  // Data sudah difilter oleh API, tidak perlu filter lagi di client
  const filteredLaunchpads = launchpads;

  // Calculate USD value from ETH volume
  const volumeUSD = ethPrice ? stats.volume * ethPrice : null;

  const formatUSD = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (mintPercentage: number) => {
    if (mintPercentage >= 100) {
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg border border-[#05DF72] bg-[#05DF72]/10 text-[15px] font-normal text-[#05DF72] font-mono">
          100%
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg border border-[#F87683] bg-[#F87683]/10 text-[15px] font-normal text-[#F87683] font-mono">
          {mintPercentage.toFixed(0)}%
        </span>
      );
    }
  };

  const handleToggleVisibility = async (launchpad: LaunchpadData) => {
    const isCurrentlyHidden = launchpad.status === 'cancelled';
    const newStatus = isCurrentlyHidden ? 'ACTIVE' : 'CANCELLED';
    const actionText = isCurrentlyHidden ? 'show' : 'hide';

    try {
      toast.loading(`${isCurrentlyHidden ? 'Showing' : 'Hiding'} collection...`, { id: 'toggle-visibility' });

      const authHeaders = await getCreatorAuthHeadersSafe('launchpad:status', launchpad.contractAddress);
      const response = await fetch(`/api/admin/launchpads/${launchpad.contractAddress}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to ${actionText} collection`);
      }

      toast.success(`Collection ${isCurrentlyHidden ? 'shown' : 'hidden'} successfully!`, { id: 'toggle-visibility' });
      
      // Refresh the list
      fetchLaunchpads();
      fetchStats();
    } catch (error: any) {
      console.error(`Failed to ${actionText} collection:`, error);
      toast.error(`Failed to ${actionText} collection`, {
        description: error.message || 'Please try again',
        id: 'toggle-visibility'
      });
    }
  };

  const getActions = (launchpad: LaunchpadData) => {
    const isHidden = launchpad.status === 'cancelled';
    
    return [
      {
        label: isHidden ? 'Show Collection' : 'Hide Collection',
        onClick: () => handleToggleVisibility(launchpad)
      },
      {
        label: 'Get Featured',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setFeaturedModalOpen(true);
        }
      },
      {
        label: 'Update Collection Images',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setUpdateCollectionImagesModalOpen(true);
        }
      },
      {
        label: 'Update Collection Page',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setUpdateCollectionModalOpen(true);
        }
      },
      {
        label: 'Update Whitelist Mint',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setUpdateWhitelistModalOpen(true);
        }
      },
      {
        label: 'Update Public Mint',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setUpdatePublicMintModalOpen(true);
        }
      },
      {
        label: 'Send NFT',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setSendNftModalOpen(true);
        }
      },
      {
        label: 'Burn NFT',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setBurnNftModalOpen(true);
        }
      },
      {
        label: 'Snapshot Holders',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setSnapshotHoldersModalOpen(true);
        }
      },
      {
        label: 'Withdraw Treasury',
        onClick: () => {
          setSelectedLaunchpad(launchpad);
          setWithdrawTreasuryModalOpen(true);
        }
      }
    ];
  };

  return (
    <WalletConnectionGuard>
      {/* Get Featured Modal */}
      <GetFeaturedModal
        open={featuredModalOpen}
        chainId={selectedLaunchpad?.chainId}
        onClose={() => {
          setFeaturedModalOpen(false);
          setSelectedLaunchpad(null);
        }}
      />

      {/* Update Collection Modal */}
      {selectedLaunchpad && (
        <UpdateCollectionModal
          open={updateCollectionModalOpen}
          onClose={() => {
            setUpdateCollectionModalOpen(false);
            setSelectedLaunchpad(null);
          }}
          collectionId={selectedLaunchpad.id}
          contractAddress={selectedLaunchpad.contractAddress}
          chainId={selectedLaunchpad.chainId}
          collectionData={{
            name: selectedLaunchpad.name,
            symbol: selectedLaunchpad.symbol,
            description: selectedLaunchpad.description || '',
            externalLink: selectedLaunchpad.externalLink,
            maxSupply: selectedLaunchpad.totalMaxSupply,
            treasury: selectedLaunchpad.treasury || selectedLaunchpad.creator,
            royaltyRecipient: selectedLaunchpad.royaltyRecipient || selectedLaunchpad.creator,
            royaltyPercentage: selectedLaunchpad.royaltyPercentage || 0,
            metadata: {
              twitter: selectedLaunchpad.metadata?.twitter,
              discord: selectedLaunchpad.metadata?.discord
            }
          }}
        />
      )}

      {/* Update Collection Images Modal */}
      <UpdateCollectionImagesModal
        open={updateCollectionImagesModalOpen}
        onClose={() => {
          setUpdateCollectionImagesModalOpen(false);
          setSelectedLaunchpad(null);
        }}
        onSuccess={() => {
          fetchLaunchpads();
        }}
        collectionId={selectedLaunchpad?.id}
        currentImages={{
          coverImage: selectedLaunchpad?.metadata?.image ? ipfsToHttp(selectedLaunchpad.metadata.image) || undefined : undefined,
          bannerImage: selectedLaunchpad?.metadata?.bannerImage ? ipfsToHttp(selectedLaunchpad.metadata.bannerImage) || undefined : undefined,
        }}
      />

      {/* Update Whitelist Modal */}
      <UpdateWhitelistModal
        open={updateWhitelistModalOpen}
        onClose={() => {
          setUpdateWhitelistModalOpen(false);
          setSelectedLaunchpad(null);
        }}
        contractAddress={selectedLaunchpad?.contractAddress || ''}
        chainId={selectedLaunchpad?.chainId}
      />

      {/* Update Public Mint Modal */}
      <UpdatePublicMintModal
        open={updatePublicMintModalOpen}
        onClose={() => {
          setUpdatePublicMintModalOpen(false);
          setSelectedLaunchpad(null);
        }}
        contractAddress={selectedLaunchpad?.contractAddress || ''}
        chainId={selectedLaunchpad?.chainId}
      />

      {/* Send NFT Modal */}
      <SendNftModal
        open={sendNftModalOpen}
        onClose={() => {
          setSendNftModalOpen(false);
          setSelectedLaunchpad(null);
        }}
        contractAddress={selectedLaunchpad?.contractAddress || ''}
        chainId={selectedLaunchpad?.chainId}
      />

      {/* Burn NFT Modal */}
      <BurnNftModal
        open={burnNftModalOpen}
        onClose={() => {
          setBurnNftModalOpen(false);
          setSelectedLaunchpad(null);
        }}
        contractAddress={selectedLaunchpad?.contractAddress || ''}
      />

      {/* Snapshot Holders Modal */}
      <SnapshotHoldersModal
        open={snapshotHoldersModalOpen}
        onClose={() => {
          setSnapshotHoldersModalOpen(false);
          setSelectedLaunchpad(null);
        }}
        contractAddress={selectedLaunchpad?.contractAddress || ''}
      />

      {/* Withdraw Treasury Modal */}
      <WithdrawTreasuryModal
        open={withdrawTreasuryModalOpen}
        onClose={() => {
          setWithdrawTreasuryModalOpen(false);
          setSelectedLaunchpad(null);
        }}
        contractAddress={selectedLaunchpad?.contractAddress || ''}
        chainId={selectedLaunchpad?.chainId}
        collectionName={selectedLaunchpad?.name}
        onWithdrawSuccess={() => {
          fetchLaunchpads();
        }}
      />

      <div className="bg-[#0D0E11]">
        <div className="border-x border-[#2F3336] max-w-[1000px] mx-auto">
          {/* Header Section with Background */}
          <div className="max-w-[1000px] mx-auto">
            <div className="relative border-b border-[#2F3336] overflow-hidden">
              {/* Background Image Container */}
              <div className="absolute inset-0">
                <img
                  src="/create/header-bg.png"
                  alt="Header Background"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="relative px-6 py-8 text-center">
                <div className="flex items-center justify-center">
                  <div>
                    <h1 className="text-[36px] font-bold text-white mb-2 font-mono leading-tight tracking-[-0.08em]">
                      Creator Studio
                    </h1>
                    <p className="text-[14px] text-white font-normal font-mono leading-relaxed">
                      View and manage all NFT collections created on the platform.
                    </p>
                  </div>
                </div>
                <Link href="/create/add">
                  <button className="w-full px-8 py-2.5 mt-4 bg-[#B392F0] rounded-lg text-black !font-black text-base font-mono hover:bg-white transition-colors whitespace-nowrap">
                    + CREATE NFT COLLECTION
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="max-w-[1000px] mx-auto">
            <div className="relative border-b border-[#2F3336] overflow-hidden">
              {/* Background Image - positioned on the right */}
              <div className="h-full absolute right-0 top-0 bottom-0 h-[150px] opacity-50 pointer-events-none">
                <img
                  src="/create/stats-background-177aa5.png"
                  alt="Stats Background"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Stats Grid - Mint Revenue is wider */}
              <div className="relative grid grid-cols-[1fr_1fr_1fr_1.5fr]">
                {/* Your Collections */}
                <div className="border-r border-[#2F3336] px-6 py-6">
                  <div className="text-[15px] font-bold text-[#B392F0] mb-5 font-mono leading-tight">
                    Your Collections
                  </div>
                  <div className="text-2xl font-bold text-white font-mono leading-[50px] tracking-[-0.125em]">
                    {stats.total}
                  </div>
                </div>

                {/* Active/Live */}
                <div className="border-r border-[#2F3336] px-6 py-6">
                  <div className="text-[15px] font-bold text-[#B392F0] mb-5 font-mono leading-tight">
                    Active/Live
                  </div>
                  <div className="text-2xl font-bold text-white font-mono leading-[50px] tracking-[-0.125em]">
                    {stats.active}
                  </div>
                </div>

                {/* Minted Out */}
                <div className="border-r border-[#2F3336] px-6 py-6">
                  <div className="text-[15px] font-bold text-[#B392F0] mb-5 font-mono leading-tight">
                    Minted Out
                  </div>
                  <div className="text-2xl font-bold text-white font-mono leading-[50px] tracking-[-0.125em]">
                    {stats.mintOut}
                  </div>
                </div>

                {/* Mint Revenue - Wider column */}
                <div className="px-6 py-6">
                  <div className="text-[15px] font-bold text-[#B392F0] mb-5 font-mono leading-tight">
                    Mint Revenue
                  </div>
                  <div className="text-2xl font-bold text-white font-mono leading-[50px] tracking-[-0.125em]">
                    {formatPriceUtil(stats.volume)} ETH <span className='text-base !text-[#857f94]'>/ {volumeUSD ? formatUSD(volumeUSD) : '0'} USD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="max-w-[1000px] mx-auto">
            <div className="flex gap-0">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name, symbol, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[42px] px-4 bg-transparent text-sm text-[#99A1AF] font-normal outline-none placeholder:text-[#99A1AF] font-inter"
                />
              </div>

              {/* Chain Selector */}
              <CustomSelect
                options={chainOptions}
                value={String(selectedChain)}
                onValueChange={(value) => setSelectedChain(value === 'all' ? 'all' : Number(value))}
                containerClassName="w-[306px] border-x border-[#2F3336]"
              />

              {/* Status Filter */}
              <CustomSelect
                options={statusOptions}
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value)}
                containerClassName="w-[200px] border-r border-[#2F3336]"
              />

              {/* Refresh Button */}
              <button
                onClick={() => {
                  fetchLaunchpads();
                  fetchStats();
                }}
                disabled={loading || statsLoading}
                className="w-[50px] flex items-center justify-center hover:bg-[#1E1F22]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HugeiconsIcon icon={Refresh01Icon} size={16} className="{` text-white ${loading || statsLoading ? 'animate-spin' : ''}" />
              </button>
            </div>
          </div>

          {/* Table Section */}
          <div className="max-w-[1000px] mx-auto">
            <div className="border-y border-[#2F3336]">
              {/* Table Header */}
              <div className="border-b border-[#2F3336] px-6 py-3">
                <div className="grid grid-cols-[50px_1fr_150px_120px_180px] gap-4 items-center">
                  <div className="text-sm font-normal text-[#B392F0] font-mono">No.</div>
                  <div className="text-sm font-normal text-[#B392F0] font-mono">Name</div>
                  <div className="text-sm font-normal text-[#B392F0] font-mono text-center">Treasury</div>
                  <div className="text-sm font-normal text-[#B392F0] font-mono text-center">Status</div>
                  <div className="text-sm font-normal text-[#B392F0] font-mono text-right">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              {loading ? (
                <div className="px-6 py-12 text-center text-[#99A1AF] font-mono">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border border-[#B392F0] border-t-transparent rounded-full animate-spin" />
                    <span>Loading collections...</span>
                  </div>
                </div>
              ) : filteredLaunchpads.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  {searchQuery || selectedStatus !== 'all' ? (
                    // Filtered but no results
                    <div className="space-y-4">
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-xl text-[#99A1AF] font-mono font-bold mb-2">No collections found</p>
                      <p className="text-sm text-[#6A7282] font-mono mb-6">
                        Try adjusting your search or filters
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedStatus('all');
                        }}
                        className="px-6 py-2 bg-[#1E1F22] rounded-lg text-[#B392F0] font-mono text-sm hover:bg-[#2E2F32] transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  ) : (
                    // No collections at all - empty state
                    <div className="space-y-6 max-w-md mx-auto">
                      <div className="text-7xl mb-4">🎨</div>
                      <div className="space-y-2">
                        <p className="text-2xl text-[#F7F8FB] font-mono font-bold">No Collections Yet</p>
                        <p className="text-sm text-[#6A7282] font-mono leading-relaxed">
                          You haven't created any NFT collections yet. Start your journey by creating your first collection!
                        </p>
                      </div>

                      <Link href="/create/add">
                        <button className="w-full px-8 py-2.5 mt-4 bg-[#B392F0] rounded-lg text-black !font-black text-base font-mono hover:bg-white transition-colors whitespace-nowrap">
                          + CREATE YOUR FIRST COLLECTION
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                filteredLaunchpads.map((lp, index) => {
                  const mintPercentage = (lp.mintedCount / lp.totalMaxSupply) * 100;

                  // Get cover image from metadata and convert IPFS to HTTP
                  const coverImageRaw = lp.metadata?.image;
                  const coverImage = coverImageRaw ? ipfsToHttp(coverImageRaw) : undefined;

                  // Generate avatar from first letter of name
                  const avatar = lp.name?.charAt(0)?.toUpperCase() || '?';

                  return (
                    <div
                      key={lp.id}
                      className="border-b border-[#2F3336] last:border-b-0"
                    >
                      <div className="px-6 py-4 grid grid-cols-[50px_1fr_150px_120px_180px] gap-4 items-center">
                        {/* Number */}
                        <div className="flex items-center">
                          <span className="text-sm text-[#99A1AF] font-normal font-inter">{index + 1}.</span>
                        </div>

                        {/* Name with Image */}
                        <div className="flex items-center gap-4">
                          <Link href={`/l/${lp.contractAddress}`}>
                            <Avatar className="w-14 h-14 bg-[#2D253E] rounded-md flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                              {coverImage ? (
                                <AvatarImage
                                  src={coverImage}
                                  alt={lp.name}
                                  className="object-cover rounded-md"
                                />
                              ) : null}
                              <AvatarFallback className="bg-[#2D253E] text-2xl rounded-md">
                                {avatar}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div>
                            <Link href={`/l/${lp.contractAddress}`}>
                              <div className="text-sm font-medium text-white font-mono mb-1 cursor-pointer hover:text-[#B392F0] transition-colors">{lp.name}</div>
                            </Link>
                            <div className="flex items-center gap-2">
                              <Link href={`/l/${lp.contractAddress}`}>
                                <span className="text-sm text-[#99A1AF] font-mono hover:text-[#B392F0] transition-colors cursor-pointer">
                                  {lp.contractAddress.slice(0, 6)}...{lp.contractAddress.slice(-4)}
                                </span>
                              </Link>
                              <button
                                onClick={() => copyToClipboard(lp.contractAddress)}
                                className="flex items-center hover:opacity-80 transition-opacity"
                              >
                                <Image
                                  src="/create/copy-icon.png"
                                  alt="Copy"
                                  width={12}
                                  height={13}
                                  className="opacity-70"
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Treasury Balance - Lazy loaded */}
                        <TreasuryBalanceCell 
                          chainId={lp.chainId} 
                          contractAddress={lp.contractAddress} 
                          ethPrice={ethPrice} 
                        />

                        {/* Status */}
                        <div className="flex items-center justify-center">
                          {getStatusBadge(mintPercentage)}
                        </div>

                        {/* Actions Dropdown */}
                        <div className="flex items-center justify-end">
                          <ActionPopover actions={getActions(lp)} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination Section */}
          {!loading && filteredLaunchpads.length > 0 && pagination.total > 1 && (
            <div className="max-w-[1000px] mx-auto">
              <div className="border border-[#2F3336] px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Page Info */}
                  <div className="text-sm text-[#99A1AF] font-mono">
                    Showing {((currentPage - 1) * pagination.limit) + 1} - {Math.min(currentPage * pagination.limit, pagination.count)} of {pagination.count} collections
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-[#1E1F22] rounded-lg text-white font-mono text-sm hover:bg-[#2E2F32] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                        let pageNum;
                        if (pagination.total <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= pagination.total - 2) {
                          pageNum = pagination.total - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 rounded-lg font-mono text-sm transition-colors ${currentPage === pageNum
                                ? 'bg-[#B392F0] text-black font-bold'
                                : 'bg-[#1E1F22] text-white hover:bg-[#2E2F32]'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(pagination.total, prev + 1))}
                      disabled={currentPage === pagination.total}
                      className="px-4 py-2 bg-[#1E1F22] rounded-lg text-white font-mono text-sm hover:bg-[#2E2F32] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Join the Community Section */}
          <JoinCommunitySection />
        </div>
      </div>
    </WalletConnectionGuard>
  );
}


export default function CreatePageWrapper() {
  return (
    <WagmiReadyGuard>
      <CreatePage />
    </WagmiReadyGuard>
  );
}
