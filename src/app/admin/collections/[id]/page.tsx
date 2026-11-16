'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminLaunchpadDetail } from '@/hooks/useAdminLaunchpadDetail';
import { getChainName } from '@/config/chains';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowUpRight01Icon, Refresh01Icon, Calendar01Icon, UserMultipleIcon, UserMultiple01Icon, DollarCircleIcon, PackageIcon, Clock01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';
import { adminApiClient } from '@/lib/admin-api-client';
import { ActionPopover } from '@/components/action-popover';
import { UpdateCollectionModal } from '@/components/update-collection-modal';
import { UpdateWhitelistModal } from '@/components/update-whitelist-modal';
import { UpdatePublicMintModal } from '@/components/update-public-mint-modal';
import { formatPrice } from '@/lib/format-utils';

interface LaunchpadDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LaunchpadDetailPage({ params }: LaunchpadDetailPageProps) {
  const { id } = await params;
  return <LaunchpadDetailContent id={id} />;
}

function LaunchpadDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { launchpad, isLoading, error, refetch } = useAdminLaunchpadDetail(id);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [showPublicMintModal, setShowPublicMintModal] = useState(false);

  const handleBack = () => {
    router.push('/admin/collections');
  };

  const handleSyncMints = async () => {
    if (!launchpad) return;

    setIsSyncing(true);
    try {
      const response: any = await adminApiClient.post('/launchpads/sync-mints', {
        launchpadId: launchpad.id,
        contractAddress: launchpad.contractAddress,
        chainId: launchpad.chainId
      });

      if (response.success) {
        toast.success(response.message || 'Mints synced successfully');
        await refetch();
      } else {
        throw new Error(response.error || 'Failed to sync mints');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync mints';
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num === 0) return '0 ETH';
    return `${num.toFixed(4)} ETH`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseTypeColor = (phaseType: string) => {
    switch (phaseType) {
      case 'ALLOWLIST':
      case 'PRESALE':
        return 'bg-purple-100 text-purple-800';
      case 'PUBLIC':
        return 'bg-blue-100 text-blue-800';
      case 'FREE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 bg-[#1E1F22]" />
          <Skeleton className="h-8 w-64 bg-[#1E1F22]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 bg-[#0D0E11] border-[#2F3336]">
              <Skeleton className="h-4 w-20 mb-2 bg-[#1E1F22]" />
              <Skeleton className="h-8 w-32 bg-[#1E1F22]" />
            </Card>
          ))}
        </div>
        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <Skeleton className="h-6 w-32 mb-4 bg-[#1E1F22]" />
          <Skeleton className="h-40 w-full bg-[#1E1F22]" />
        </Card>
      </div>
    );
  }

  if (error || !launchpad) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack} className="text-white hover:bg-[#1E1F22] font-mono">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="mr-2" />
          Back to Collections
        </Button>
        <Card className="p-12 text-center bg-[#0D0E11] border-[#2F3336]">
          <p className="text-red-400 mb-4 font-mono">
            {error?.message || 'Launchpad not found'}
          </p>
          <Button onClick={handleBack} className="bg-[#B392F0] hover:bg-[#9370DB] text-white font-mono">Return to Collections</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="text-white hover:bg-[#1E1F22] font-mono">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">{launchpad.name}</h1>
            <p className="text-gray-400 font-mono">{launchpad.symbol}</p>
          </div>
          <Badge className={getStatusColor(launchpad.status) + " font-mono"}>
            {launchpad.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleSyncMints}
            disabled={isSyncing}
            className="border-[#2F3336] text-white hover:bg-[#1E1F22] font-mono"
          >
            <HugeiconsIcon icon={Refresh01Icon} size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Mints'}
          </Button>
          <ActionPopover
            actions={[
              {
                label: 'Update Collection Page',
                onClick: () => setShowCollectionModal(true)
              },
              {
                label: 'Update Whitelist Mint',
                onClick: () => setShowWhitelistModal(true)
              },
              {
                label: 'Update Public Mint',
                onClick: () => setShowPublicMintModal(true)
              }
            ]}
          />
        </div>
      </div>

      {/* Modals */}
      <UpdateCollectionModal
        open={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        collectionData={{
          name: launchpad.name,
          description: launchpad.description || '',
          contractAddress: launchpad.contractAddress,
          treasury: launchpad.creator,
          royaltyRecipient: launchpad.creator,
          royaltyPercentage: 2.5
        }}
      />
      <UpdateWhitelistModal
        open={showWhitelistModal}
        onClose={() => setShowWhitelistModal(false)}
        contractAddress={launchpad.contractAddress}
        chainId={launchpad.chainId}
      />
      <UpdatePublicMintModal
        open={showPublicMintModal}
        onClose={() => setShowPublicMintModal(false)}
        contractAddress={launchpad.contractAddress}
        chainId={launchpad.chainId}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <HugeiconsIcon icon={PackageIcon} size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-mono">Minted</p>
              <p className="text-2xl font-bold text-white font-mono">
                {launchpad.mintedCount}/{launchpad.totalMaxSupply}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                {launchpad.mintPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/30 rounded-lg">
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-mono">Volume</p>
              <p className="text-2xl font-bold text-white font-mono">{formatVolume(launchpad.volume)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/30 rounded-lg">
              <HugeiconsIcon icon={DollarCircleIcon} size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-mono">Mint Price</p>
              <p className="text-2xl font-bold text-white font-mono">
                {formatPrice(parseFloat(launchpad.mintPrice), 6)} ETH
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-900/30 rounded-lg">
              <HugeiconsIcon icon={UserMultiple01Icon} size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-mono">Unique Holders</p>
              <p className="text-2xl font-bold text-white font-mono">
                {launchpad.analytics?.uniqueHolders || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Basic Information */}
      <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
        <h2 className="text-lg font-semibold mb-4 text-white font-mono">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[#B392F0] font-mono">Contract Address</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono text-sm text-white">{launchpad.contractAddress}</p>
              <a
                href={`https://explorer.example.com/address/${launchpad.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />
              </a>
            </div>
          </div>
          <div>
            <p className="text-sm text-[#B392F0] font-mono">Creator</p>
            <p className="font-mono text-sm mt-1 text-white">{launchpad.creator}</p>
          </div>
          <div>
            <p className="text-sm text-[#B392F0] font-mono">Chain</p>
            <p className="text-sm mt-1 text-white font-mono">{getChainName(launchpad.chainId)}</p>
          </div>
          <div>
            <p className="text-sm text-[#B392F0] font-mono">Created</p>
            <p className="text-sm mt-1 text-white font-mono">{formatDate(launchpad.createdAt)}</p>
          </div>
          {launchpad.lastMintAt && (
            <div>
              <p className="text-sm text-[#B392F0] font-mono">Last Mint</p>
              <p className="text-sm mt-1 text-white font-mono">{formatDate(launchpad.lastMintAt)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-[#B392F0] font-mono">Last Sync</p>
            <p className="text-sm mt-1 text-white font-mono">{formatDate(launchpad.lastSyncAt)}</p>
          </div>
        </div>
        {launchpad.description && (
          <div className="mt-4">
            <p className="text-sm text-[#B392F0] font-mono">Description</p>
            <p className="text-sm mt-1 text-gray-400 font-mono">{launchpad.description}</p>
          </div>
        )}
      </Card>

      {/* Metadata */}
      {launchpad.metadata && (
        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <h2 className="text-lg font-semibold mb-4 text-white font-mono">Metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {launchpad.metadata.image && (
              <div>
                <p className="text-sm text-gray-600">Image</p>
                <img 
                  src={launchpad.metadata.image} 
                  alt={launchpad.name}
                  className="mt-2 w-32 h-32 object-cover rounded-lg"
                />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Links</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {launchpad.metadata.website && (
                  <a
                    href={launchpad.metadata.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Website
                  </a>
                )}
                {launchpad.metadata.twitter && (
                  <a
                    href={launchpad.metadata.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Twitter
                  </a>
                )}
                {launchpad.metadata.discord && (
                  <a
                    href={launchpad.metadata.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Discord
                  </a>
                )}
              </div>
            </div>
            {launchpad.metadata.tags && launchpad.metadata.tags.length > 0 && (
              <div>
                <p className="text-sm text-gray-600">Tags</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {launchpad.metadata.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="flex gap-2 mt-2">
                {launchpad.metadata.featured && (
                  <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                )}
                {launchpad.metadata.verified && (
                  <Badge className="bg-blue-100 text-blue-800">Verified</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Phases */}
      {launchpad.phases && launchpad.phases.length > 0 && (
        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <h2 className="text-lg font-semibold mb-4 text-white font-mono">Mint Phases</h2>
          <div className="space-y-4">
            {launchpad.phases.map((phase, index) => (
              <div 
                key={phase.id} 
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold">Phase {index + 1}</span>
                    <span className="text-gray-600">{phase.name}</span>
                    <Badge className={getPhaseTypeColor(phase.phaseType)}>
                      {phase.phaseType}
                    </Badge>
                    {phase.isActive && (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {parseFloat(phase.price).toFixed(4)} ETH
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Start Time</p>
                    <p className="font-medium">{formatDate(phase.startTime)}</p>
                  </div>
                  {phase.endTime && (
                    <div>
                      <p className="text-gray-600">End Time</p>
                      <p className="font-medium">{formatDate(phase.endTime)}</p>
                    </div>
                  )}
                  {phase.maxMintPerWallet && (
                    <div>
                      <p className="text-gray-600">Max Per Wallet</p>
                      <p className="font-medium">{phase.maxMintPerWallet}</p>
                    </div>
                  )}
                  {phase.totalLimit && (
                    <div>
                      <p className="text-gray-600">Total Limit</p>
                      <p className="font-medium">{phase.totalLimit}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Minted</p>
                    <p className="font-medium">{phase.mintedCount}</p>
                  </div>
                  {(phase.phaseType === 'ALLOWLIST' || phase.phaseType === 'PRESALE') && (
                    <div>
                      <p className="text-gray-600">Whitelist</p>
                      <p className="font-medium">Required</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Whitelist */}
      {launchpad.whitelist && launchpad.whitelist.length > 0 && (
        <Card className="p-6 bg-[#0D0E11] border-[#2F3336]">
          <h2 className="text-lg font-semibold mb-4 text-white font-mono">
            Whitelist ({launchpad.whitelistCount || launchpad.whitelist.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1E1F22] border-b border-[#2F3336]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">
                    Allocation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#B392F0] uppercase font-mono">
                    Phase
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1F22]">
                {launchpad.whitelist.slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#1E1F22]">
                    <td className="px-4 py-3 text-sm font-mono text-white">
                      {entry.address}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                      {entry.allocation}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                      Phase {entry.phaseId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {launchpad.whitelist.length > 10 && (
              <p className="text-sm text-gray-400 text-center mt-4 font-mono">
                Showing 10 of {launchpad.whitelist.length} entries
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
