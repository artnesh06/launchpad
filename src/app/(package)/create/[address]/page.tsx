'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, Save01Icon } from '@hugeicons/core-free-icons';
import Link from 'next/link';
import { SUPPORTED_CHAINS, getChainName } from '@/config/chains';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';
import { NetworkGuard, useNetworkGuard } from '@/components/network-guard';
import { useAccount } from 'wagmi';
import { Breadcrumb } from '@/components/breadcrumb';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';

interface LaunchpadData {
  id: string;
  contractAddress: string;
  creator: string;
  name: string;
  symbol: string;
  description?: string;
  totalMaxSupply: number;
  mintedCount: number;
  volume: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
  chainId: number;
  baseURI?: string;
  contractURI?: string;
  externalLink?: string;
  treasury: string;
  royaltyRecipient?: string;
  royaltyPercentage: number;
  operatorFilteringEnabled?: boolean;
  isPaused?: boolean;
}

function EditLaunchpadPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  
  // Wallet connection for creator verification
  const { address: walletAddress, isConnected } = useAccount();

  const [launchpad, setLaunchpad] = useState<LaunchpadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  // Editable fields (only what's in form add)
  const [royaltyRecipient, setRoyaltyRecipient] = useState('');
  const [royaltyPercentage, setRoyaltyPercentage] = useState(0);

  // Mint phases state
  const [mintPhases, setMintPhases] = useState<any[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [contractSupportsPhases, setContractSupportsPhases] = useState<boolean | null>(null);

  // Phase edit/add state - now inline per phase
  const [editingPhaseId, setEditingPhaseId] = useState<number | null>(null);
  const [editingPhaseData, setEditingPhaseData] = useState<{[key: number]: any}>({});
  const [savingPhaseId, setSavingPhaseId] = useState<number | null>(null);

  // Whitelist merkle root update
  const [uploadingWhitelistPhaseId, setUploadingWhitelistPhaseId] = useState<number | null>(null);

  // Network guard hook
  const { isWrongNetwork } = useNetworkGuard(
    launchpad?.chainId,
    address
  );

  useEffect(() => {
    fetchLaunchpadData();
  }, [address]);

  // Creator verification - updates when wallet changes
  useEffect(() => {
    if (launchpad && walletAddress) {
      const creatorMatch = launchpad.creator.toLowerCase() === walletAddress.toLowerCase();
      setIsCreator(creatorMatch);
      console.log('Creator verification:', {
        launchpadCreator: launchpad.creator,
        walletAddress: walletAddress,
        isCreator: creatorMatch
      });
      
      // Cancel any ongoing edits when wallet switches
      if (editingPhaseId !== null) {
        setEditingPhaseId(null);
        setEditingPhaseData({});
      }
    } else {
      setIsCreator(false);
    }
  }, [launchpad, walletAddress]);

  const fetchLaunchpadData = async () => {
    try {
      setLoading(true);
      // Fetch from all chains to find the launchpad
      const chains = Object.values(SUPPORTED_CHAINS);

      for (const chain of chains) {
        const response = await fetch(`/api/admin/launchpads?chainId=${chain.id}&limit=1000`);
        const result = await response.json();

        if (result.success) {
          const found = result.data.launchpads?.find(
            (lp: LaunchpadData) => lp.contractAddress.toLowerCase() === address.toLowerCase()
          );

          if (found) {
            setLaunchpad(found);
            setRoyaltyRecipient(found.royaltyRecipient || '');
            setRoyaltyPercentage(found.royaltyPercentage || 0);

            // Fetch mint phases from contract
            fetchMintPhases(found);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch launchpad:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMintPhases = async (launchpadData: LaunchpadData) => {
    try {
      setLoadingPhases(true);
      console.log('=== FETCHING MINT PHASES ===');
      console.log('🔍 Contract Address:', launchpadData.contractAddress);
      console.log('🔍 Chain ID:', launchpadData.chainId);
      console.log('🔍 Chain Name:', getChainName(launchpadData.chainId));
      console.log('🔍 Factory Address:', SUPPORTED_CHAINS[launchpadData.chainId]?.launchpadFactoryAddress);

      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();

      let count = 0;
      let supportsPhases = false;

      try {
        count = await contractService.getMintPhaseCount(
          launchpadData.chainId,
          launchpadData.contractAddress
        );
        console.log('✅ getMintPhaseCount SUCCESS:', count);
        supportsPhases = true; // Contract supports phases
      } catch (countError: any) {
        console.warn('⚠️ getMintPhaseCount FAILED');
        console.warn('Error details:', countError?.message || countError);

        // Check if error is "could not decode result data" (contract doesn't have function)
        if (countError?.message?.includes('could not decode result data')) {
          console.log('❌ Contract does NOT support mint phases (old contract)');
          supportsPhases = false;
          setContractSupportsPhases(false);
          setMintPhases([]); // Empty = old contract
          setLoadingPhases(false);
          return;
        }

        // Try fetching phases one by one until error (for old contracts that might have phases)
        console.log('🔄 Trying legacy method (fetch one by one)...');
        let i = 0;
        while (i < 100) { // Max 100 phases
          try {
            const testPhase = await contractService.getMintPhase(
              launchpadData.chainId,
              launchpadData.contractAddress,
              i
            );
            console.log(`✅ Phase ${i} found:`, testPhase);
            i++;
            supportsPhases = true;
          } catch (phaseError: any) {
            // Check if this is "doesn't exist" error vs "no function" error
            if (phaseError?.message?.includes('could not decode result data')) {
              console.log('❌ Contract does NOT support getMintPhase (old contract)');
              supportsPhases = false;
              setContractSupportsPhases(false);
              count = 0;
              break;
            }

            console.log(`❌ Phase ${i} not found, stopping at index ${i}`);
            console.log('Phase error:', phaseError?.message || phaseError);
            count = i;
            supportsPhases = true; // Contract has function, just no phases at this index
            break;
          }
        }
        console.log('📊 Mint phase count (legacy):', count);
      }

      const phases = [];
      for (let i = 0; i < count; i++) {
        try {
          const phase = await contractService.getMintPhase(
            launchpadData.chainId,
            launchpadData.contractAddress,
            i
          );
          console.log(`✅ Fetched phase ${i}:`, phase);
          phases.push({ ...phase, id: i });
        } catch (phaseError: any) {
          console.error(`❌ Failed to fetch phase ${i}:`, phaseError?.message || phaseError);
        }
      }

      console.log('🎯 Total phases loaded:', phases.length);
      console.log('📦 Phases data:', phases);
      console.log('✅ Contract supports phases:', supportsPhases);
      setContractSupportsPhases(supportsPhases);
      setMintPhases(phases);
      console.log('=== END FETCH MINT PHASES ===');
    } catch (error: any) {
      console.error('❌ CRITICAL ERROR fetching mint phases:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      // Set empty array if error
      setMintPhases([]);
    } finally {
      setLoadingPhases(false);
    }
  };

  const handleAddNewPhase = () => {
    // Authorization check
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isCreator) {
      toast.error('Only the collection creator can add new phases');
      return;
    }

    // Start editing a new phase with id -1 (indicates new phase)
    setEditingPhaseId(-1);
    setEditingPhaseData({
      ...editingPhaseData,
      [-1]: {
        name: '',
        description: '',
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
        price: '0',
        maxPerWallet: 10,
        maxPerTransaction: 5,
        merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        requiresWhitelist: false,
      }
    });
  };

  const handleTogglePhase = async (phaseId: number, currentIsActive: boolean) => {
    if (!launchpad) return;

    // Authorization check
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isCreator) {
      toast.error('Only the collection creator can toggle phases');
      return;
    }

    if (isWrongNetwork) {
      toast.error('Please switch to the correct network first');
      return;
    }

    try {
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();

      await contractService.toggleMintPhase(
        launchpad.chainId,
        launchpad.contractAddress,
        phaseId,
        !currentIsActive
      );

      toast.success(`Phase ${currentIsActive ? 'disabled' : 'enabled'} successfully!`);

      // Auto-sync to database
      await syncToDatabase();

      // Refresh mint phases
      await fetchMintPhases(launchpad);
    } catch (error) {
      console.error('Failed to toggle phase:', error);
      toast.error(`Failed to toggle phase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };


  const handleEditPhaseInline = (phase: any) => {
    // Authorization check
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isCreator) {
      toast.error('Only the collection creator can edit phases');
      return;
    }

    setEditingPhaseId(phase.id);
    
    // Ensure startTime and endTime are numbers (timestamps in seconds)
    const startTime = typeof phase.startTime === 'number' ? phase.startTime : parseInt(phase.startTime) || Math.floor(Date.now() / 1000);
    const endTime = typeof phase.endTime === 'number' ? phase.endTime : parseInt(phase.endTime) || Math.floor(Date.now() / 1000) + 86400 * 7;
    
    setEditingPhaseData({
      ...editingPhaseData,
      [phase.id]: {
        name: phase.name,
        description: phase.description,
        startTime: startTime,
        endTime: endTime,
        price: phase.price,
        maxPerWallet: phase.maxPerWallet,
        maxPerTransaction: phase.maxPerTransaction,
        merkleRoot: phase.merkleRoot,
        requiresWhitelist: phase.requiresWhitelist,
      }
    });
  };

  const handleCancelEditInline = () => {
    setEditingPhaseId(null);
    setEditingPhaseData({});
  };

  const handleSavePhaseInline = async (phaseId: number) => {
    if (!launchpad || !editingPhaseData[phaseId]) return;

    // Authorization check
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isCreator) {
      toast.error('Only the collection creator can save phase changes');
      return;
    }

    if (isWrongNetwork) {
      toast.error('Please switch to the correct network first');
      return;
    }

    try {
      setSavingPhaseId(phaseId);
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();

      const phaseData = editingPhaseData[phaseId];

      // Prepare full phase data for update
      const fullPhaseData = {
        name: phaseData.name,
        description: phaseData.description,
        startTime: phaseData.startTime,
        endTime: phaseData.endTime,
        price: phaseData.price,
        maxSupply: launchpad.totalMaxSupply,
        maxPerWallet: phaseData.maxPerWallet,
        maxPerTransaction: phaseData.maxPerTransaction,
        merkleRoot: phaseData.merkleRoot,
        requiresWhitelist: phaseData.requiresWhitelist,
      };

      await contractService.updateMintPhase(
        launchpad.chainId,
        launchpad.contractAddress,
        phaseId,
        fullPhaseData
      );

      toast.success('Phase updated successfully!');

      // Auto-sync to database
      await syncToDatabase();

      // Refresh mint phases
      await fetchMintPhases(launchpad);
      setEditingPhaseId(null);
      setEditingPhaseData({});
    } catch (error) {
      console.error('Failed to save phase:', error);
      toast.error(`Failed to save phase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingPhaseId(null);
    }
  };

  const updatePhaseField = (phaseId: number, field: string, value: any) => {
    setEditingPhaseData({
      ...editingPhaseData,
      [phaseId]: {
        ...editingPhaseData[phaseId],
        [field]: value
      }
    });
  };

  const handleWhitelistUpload = async (phaseId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !launchpad) return;

    // Authorization check
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isCreator) {
      toast.error('Only the collection creator can update whitelist');
      return;
    }

    if (isWrongNetwork) {
      toast.error('Please switch to the correct network first');
      return;
    }

    try {
      setUploadingWhitelistPhaseId(phaseId);

      // Parse CSV
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header if exists
      const addresses = lines
        .filter(line => !line.toLowerCase().includes('address'))
        .map(line => {
          const parts = line.split(',');
          return {
            address: parts[0]?.trim(),
            allocation: parseInt(parts[1]?.trim() || '1')
          };
        })
        .filter(entry => entry.address && entry.address.startsWith('0x'));

      if (addresses.length === 0) {
        throw new Error('No valid addresses found in CSV. Format: address,allocation (one per line)');
      }

      console.log(`📋 Parsed ${addresses.length} addresses from CSV`);

      // Generate merkle tree
      const { WhitelistManager } = await import('@/lib/contract-service');
      const whitelistManager = new WhitelistManager();

      addresses.forEach(entry => {
        whitelistManager.addAddress(entry.address, entry.allocation);
      });

      const merkleRoot = whitelistManager.generateMerkleTree();
      console.log('🌳 Generated Merkle Root:', merkleRoot);

      // Update on blockchain
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();

      await contractService.updateMintPhaseMerkleRoot(
        launchpad.chainId,
        launchpad.contractAddress,
        phaseId,
        merkleRoot
      );

      toast.success(`Whitelist updated successfully! ${addresses.length} addresses added.`);

      // Auto-sync to database
      await syncToDatabase();

      // Refresh mint phases
      await fetchMintPhases(launchpad);
    } catch (error) {
      console.error('Failed to update whitelist:', error);
      toast.error(`Failed to update whitelist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingWhitelistPhaseId(null);
      // Reset file input
      event.target.value = '';
    }
  };

  const syncToDatabase = async () => {
    if (!launchpad) return;

    try {
      console.log('🔄 Syncing to database...');
      const response = await fetch('/api/admin/launchpads/sync-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: launchpad.chainId,
          contractAddress: launchpad.contractAddress
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Database synced successfully');
        toast.success('Changes synced to database!');
      } else {
        console.warn('⚠️ Database sync failed:', result.error);
        toast.warning('Blockchain updated but database sync failed. Please sync manually.');
      }
    } catch (error) {
      console.error('❌ Database sync error:', error);
      toast.warning('Blockchain updated but database sync failed. Please sync manually.');
    }
  };

  const handleSave = async () => {
    if (!launchpad) return;

    // Authorization check - verify creator before allowing save
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!isCreator) {
      toast.error('Only the collection creator can save changes');
      return;
    }

    if (isWrongNetwork) {
      toast.error('Please switch to the correct network first');
      return;
    }

    try {
      setSaving(true);

      // Check if royalty info changed
      const hasRoyaltyChanges =
        royaltyRecipient !== (launchpad.royaltyRecipient || '') ||
        royaltyPercentage !== (launchpad.royaltyPercentage || 0);

      if (hasRoyaltyChanges) {
        const { ContractService } = await import('@/lib/contract-service');
        const contractService = new ContractService();

        // Update royalty info on-chain
        console.log('Updating royalty info on-chain...');
        await contractService.setRoyaltyInfo(
          launchpad.chainId,
          launchpad.contractAddress,
          royaltyRecipient,
          royaltyPercentage
        );

        toast.success('Royalty info updated successfully on blockchain!');

        // Auto-sync to database
        await syncToDatabase();
      } else {
        toast.info('No changes to save.');
      }

      router.push('/create');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error(`Failed to update launchpad: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading launchpad data...</div>
        </div>
      </div>
    );
  }

  if (!launchpad) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-lg">Launchpad not found</div>
          <Link href="/create">
            <Button variant="outline">Back to List</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show read-only view if user is not the creator
  if (isConnected && !isCreator) {
    return (
      <div className="bg-[#0D0E11]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-[220px] lg:border-l-2 border-[#2F3336]">
          
          {/* Breadcrumb Navigation */}
          <div className="pt-6">
            <Breadcrumb 
              items={[
                { label: 'Creator Studio', href: '/create' },
                { label: launchpad.name || 'Collection', href: `/collection/${address}` },
                { label: 'Edit' }
              ]}
            />
          </div>

          {/* Header */}
          <div className="border border-[#2F3336]">
            <div className="grid grid-cols-1 min-h-[89px]">
              <div className="bg-[#0D0E11] flex items-center px-4 sm:px-6 gap-4">
                <Link href="/create">
                  <Button variant="ghost" size="icon">
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                  </Button>
                </Link>
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-mono font-bold text-white leading-tight">
                    {launchpad.name}
                  </h1>
                  <p className="text-xs sm:text-sm lg:text-[14px] font-mono font-normal text-white leading-relaxed">
                    Collection Details (Read-Only)
                  </p>
                </div>
                <Badge variant="outline">{SUPPORTED_CHAINS[launchpad.chainId]?.name || 'Unknown Chain'}</Badge>
              </div>
            </div>
          </div>

          {/* Not Creator Message */}
          <div className="border border-[#2F3336] border-t-0 bg-[#0D0E11] p-12">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-2xl font-mono font-bold text-[#857F94]">🔒 Access Restricted</p>
                <p className="text-sm text-[#505052] font-mono">
                  You are not the creator of this collection
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 max-w-2xl mx-auto">
                <p className="text-sm text-yellow-500 font-mono font-bold mb-3">ℹ️ INFORMATION:</p>
                <ul className="text-xs text-yellow-500/80 font-mono space-y-2 text-left list-disc list-inside">
                  <li>Only the creator can edit collection settings</li>
                  <li>Creator address: <code className="text-yellow-400">{launchpad.creator}</code></li>
                  <li>Your address: <code className="text-yellow-400">{walletAddress}</code></li>
                </ul>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href="/create">
                  <button className="px-6 py-3 rounded-md font-mono font-bold text-sm transition-colors bg-[#B392F0] text-black hover:bg-[#B392F0]/90">
                    ← BACK TO COLLECTIONS
                  </button>
                </Link>
                <Link href={`/collection/${address}`}>
                  <button className="px-6 py-3 rounded-md font-mono font-bold text-sm transition-colors bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30">
                    VIEW PUBLIC PAGE
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chain = SUPPORTED_CHAINS[launchpad.chainId];

  return (
    <div className="bg-[#0D0E11]">
      {/* Network Guard Banner */}
      {launchpad && <NetworkGuard requiredChainId={launchpad.chainId} contractAddress={address} />}
      
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-[220px] lg:border-l-2 border-[#2F3336]" style={{ marginTop: isWrongNetwork ? '60px' : '0' }}>

        {/* Breadcrumb Navigation */}
        <div className="pt-6">
          <Breadcrumb 
            items={[
              { label: 'Creator Studio', href: '/create' },
              { label: launchpad.name || 'Collection', href: `/collection/${address}` },
              { label: 'Edit' }
            ]}
          />
        </div>

        {/* Header */}
        <div className="border border-[#2F3336]">
          <div className="grid grid-cols-1 min-h-[89px]">
            <div className="bg-[#0D0E11] flex items-center px-4 sm:px-6 gap-4">
              <Link href="/create">
                <Button variant="ghost" size="icon">
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-mono font-bold text-white leading-tight">
                  Edit: {launchpad.name}
                </h1>
                <p className="text-xs sm:text-sm lg:text-[14px] font-mono font-normal text-white leading-relaxed">
                  Manage collection settings for {launchpad.symbol}
                </p>
              </div>
              <Badge variant="outline">{chain?.name || 'Unknown Chain'}</Badge>
            </div>
          </div>
        </div>

        {/* Collection Information Section */}
        <div className="border border-[#2F3336] border-t-0">
          {/* Header */}
          <div className="relative w-full h-[117px] overflow-hidden border-b border-[#2F3336]">
            <div className="absolute inset-0">
              <Image
                src="/images/information-bg-56586a.png"
                alt="Information background"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="font-mono font-black text-sm uppercase tracking-wider text-[#A9ABAF]">
                COLLECTION INFORMATION
              </h2>
            </div>
          </div>

          {/* Read-Only Info */}
          <div>
            {/* Collection Name Row (Read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Collection Name</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center px-3 min-h-[42px]">
                <span className="text-sm text-[#857F94] font-mono">{launchpad.name}</span>
              </div>
            </div>

            {/* Symbol Row (Read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Symbol</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center px-3 min-h-[42px]">
                <span className="text-sm text-[#857F94] font-mono">{launchpad.symbol}</span>
              </div>
            </div>

            {/* Description Row (Read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Description</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center px-3 min-h-[42px]">
                <span className="text-sm text-[#857F94] font-mono">{launchpad.description}</span>
              </div>
            </div>

            {/* Total Supply Row (Read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Total Max Supply</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center px-3 min-h-[42px]">
                <span className="text-sm text-[#857F94] font-mono">{launchpad.totalMaxSupply.toLocaleString()}</span>
              </div>
            </div>

            {/* Mint Income Address Row (Read-only) */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Mint Income Address</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center px-3 min-h-[42px]">
                <code className="text-sm text-[#857F94] font-mono">{launchpad.treasury}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Settings Section */}
        <div className="border border-[#2F3336] border-t-0">
          {/* Header */}
          <div className="relative w-full h-[117px] overflow-hidden border-b border-[#2F3336]">
            <div className="absolute inset-0">
              <Image
                src="/images/information-bg-56586a.png"
                alt="Editable Settings background"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="font-mono font-black text-sm uppercase tracking-wider text-[#A9ABAF]">
                EDITABLE SETTINGS
              </h2>
            </div>
          </div>

          {/* Royalty Income Address Row */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
            <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
              <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Royalty Income Address</label>
            </div>
            <div className="bg-[#0D0E11]">
              <input
                className="w-full h-[42px] bg-transparent px-3 text-[#857F94] font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                value={royaltyRecipient}
                onChange={(e) => setRoyaltyRecipient(e.target.value)}
                placeholder="0x..."
              />
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
                className="w-full h-full bg-transparent px-3 text-[#857F94] font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                value={(royaltyPercentage / 100).toString()}
                onChange={(e) => setRoyaltyPercentage(parseFloat(e.target.value) * 100)}
                placeholder="5.0"
                step="0.1"
                min="0"
                max="10"
              />
            </div>
          </div>
        </div>

        {/* Mint Phases Section */}
        <div className="border border-[#2F3336] border-t-0">
          <div className="relative w-full h-[117px] overflow-hidden border-b border-[#2F3336]">
            <div className="absolute inset-0">
              <Image
                src="/images/information-bg-56586a.png"
                alt="Mint Phases Background"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="font-mono font-black text-sm uppercase tracking-wider text-[#A9ABAF]">
                MINT PHASES MANAGEMENT
              </h2>
            </div>
          </div>

          <div className="bg-[#0D0E11] p-6 sm:p-8 lg:p-12">
            {loadingPhases ? (
              <div className="text-center py-8 text-[#857F94] font-mono">
                Loading mint phases...
              </div>
            ) : mintPhases.length === 0 ? (
              contractSupportsPhases === false ? (
                // OLD CONTRACT - Doesn't support mint phases
                <div className="text-center py-8 space-y-6">
                  <div className="space-y-2">
                    <p className="text-xl font-mono font-bold text-[#857F94]">⚠️ No Mint Phases Available</p>
                    <p className="text-sm text-[#505052] font-mono">This collection doesn't support mint phase management</p>
                  </div>

                  <div className="bg-[#1E1F22] border border-[#2E2F32] rounded-lg p-4 text-left space-y-3">
                    <p className="text-xs text-[#B392F0] font-mono font-bold">🔍 DEBUG INFO:</p>
                    <div className="text-xs text-[#505052] font-mono space-y-1 pl-4">
                      <p>• Contract: <span className="text-[#857F94]">{launchpad?.contractAddress}</span></p>
                      <p>• Chain: <span className="text-[#857F94]">{getChainName(launchpad?.chainId || 0)}</span></p>
                      <p>• Factory: <span className="text-[#857F94]">{SUPPORTED_CHAINS[launchpad?.chainId || 0]?.launchpadFactoryAddress}</span></p>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-500 font-mono font-bold mb-2">⚠️ REASON:</p>
                    <ul className="text-xs text-yellow-500/80 font-mono space-y-1 text-left list-disc list-inside">
                      <li>Collection created from OLD factory (before mint phase support)</li>
                      <li>Contract doesn't have getMintPhase() function</li>
                    </ul>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-400 font-mono font-bold mb-2">✅ SOLUTION:</p>
                    <ul className="text-xs text-blue-400/80 font-mono space-y-1 text-left list-disc list-inside">
                      <li>Create a NEW collection using the latest factory</li>
                      <li>Factory address: <span className="text-blue-300">0xbcf6444ddD494918c03A7808Cf03E7B71c3cE27e</span></li>
                      <li>Only collections from NEW factory support mint phase editing</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => window.location.href = '/create'}
                      className="px-4 py-2 rounded-md font-mono font-bold text-xs transition-colors bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30"
                    >
                      ← BACK TO ADMIN
                    </button>
                  </div>
                </div>
              ) : (
                // NEW CONTRACT - Supports phases but has 0 phases (collection created without phases)
                <div className="text-center py-8 space-y-6">
                  <div className="space-y-2">
                    <p className="text-xl font-mono font-bold text-[#857F94]">📭 No Mint Phases Yet</p>
                    <p className="text-sm text-[#505052] font-mono">This collection supports mint phases but none have been added</p>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-sm text-green-400 font-mono font-bold mb-2">✅ GOOD NEWS:</p>
                    <ul className="text-xs text-green-400/80 font-mono space-y-1 text-left list-disc list-inside">
                      <li>This collection was created with the NEW factory</li>
                      <li>Contract supports mint phase management</li>
                      <li>You can add mint phases now!</li>
                    </ul>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-400 font-mono font-bold mb-2">📝 NEXT STEP:</p>
                    <ul className="text-xs text-blue-400/80 font-mono space-y-1 text-left list-disc list-inside">
                      <li>Click "ADD FIRST MINT PHASE" to create your first mint phase</li>
                      <li>Set name, times, price, and max per wallet</li>
                      <li>Save and your phase will be added to the contract</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleAddNewPhase}
                      className="px-6 py-3 rounded-md font-mono font-bold text-sm transition-colors bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg"
                    >
                      ➕ ADD FIRST MINT PHASE
                    </button>
                    <button
                      onClick={() => launchpad && fetchMintPhases(launchpad)}
                      className="px-4 py-2 rounded-md font-mono font-bold text-xs transition-colors bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                    >
                      🔄 RETRY
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-6">
                {mintPhases.map((phase) => {
                  const isEditing = editingPhaseId === phase.id;
                  const editData = editingPhaseData[phase.id] || phase;

                  return (
                    <div
                      key={phase.id}
                      className="border border-[#2F3336] rounded-lg overflow-hidden"
                    >
                      {/* Phase Header */}
                      <div className="bg-[#0E0F11] p-4 border-b border-[#2F3336] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {isEditing ? (
                            <input
                              className="font-mono font-bold text-white bg-[#1E1F22] px-3 py-1 rounded"
                              value={editData.name}
                              onChange={(e) => updatePhaseField(phase.id, 'name', e.target.value)}
                              placeholder="Phase name"
                            />
                          ) : (
                            <span className="font-mono font-bold text-white">
                              Phase #{phase.id}: {phase.name}
                            </span>
                          )}
                          <span
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-mono font-bold",
                              phase.isActive
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            )}
                          >
                            {phase.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                          {phase.currentSupply > 0 && (
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-400">
                              {phase.currentSupply} MINTED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSavePhaseInline(phase.id)}
                                disabled={savingPhaseId === phase.id}
                                className="px-4 py-2 rounded-md font-mono font-bold text-xs transition-colors bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                              >
                                {savingPhaseId === phase.id ? 'SAVING...' : 'SAVE'}
                              </button>
                              <button
                                onClick={handleCancelEditInline}
                                disabled={savingPhaseId === phase.id}
                                className="px-4 py-2 rounded-md font-mono font-bold text-xs transition-colors bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 disabled:opacity-50"
                              >
                                CANCEL
                              </button>
                            </>
                          ) : (
                            <>
                              {phase.currentSupply === 0 && (
                                <button
                                  onClick={() => handleEditPhaseInline(phase)}
                                  className="px-4 py-2 rounded-md font-mono font-bold text-xs transition-colors bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                                >
                                  EDIT
                                </button>
                              )}
                              <button
                                onClick={() => handleTogglePhase(phase.id, phase.isActive)}
                                className={cn(
                                  "px-4 py-2 rounded-md font-mono font-bold text-xs transition-colors",
                                  phase.isActive
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                )}
                              >
                                {phase.isActive ? "DISABLE" : "ENABLE"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Phase Details - Inline Editable */}
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Description */}
                          <div className="space-y-2">
                            <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                              Description
                            </label>
                            {isEditing ? (
                              <input
                                className="w-full bg-[#1E1F22] text-[#857F94] px-3 py-2 font-mono text-sm rounded outline-none"
                                value={editData.description}
                                onChange={(e) => updatePhaseField(phase.id, 'description', e.target.value)}
                                placeholder="Phase description"
                              />
                            ) : (
                              <p className="text-[#857F94] font-mono text-sm">
                                {phase.description || 'No description'}
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="space-y-2">
                            <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                              Price (ETH)
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.001"
                                className="w-full bg-[#1E1F22] text-white px-3 py-2 font-mono text-sm rounded outline-none"
                                value={editData.price}
                                onChange={(e) => updatePhaseField(phase.id, 'price', e.target.value)}
                                placeholder="0.0"
                              />
                            ) : (
                              <p className="text-white font-mono text-sm">
                                {phase.price} ETH
                              </p>
                            )}
                          </div>

                          {/* Start Time */}
                          <div className="space-y-2">
                            <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                              Start Time
                            </label>
                            {isEditing ? (
                              <input
                                type="datetime-local"
                                className="w-full bg-[#1E1F22] text-white px-3 py-2 font-mono text-sm rounded outline-none"
                                value={(() => {
                                  const timestamp = typeof editData.startTime === 'number' ? editData.startTime : parseInt(editData.startTime) || 0;
                                  const date = new Date(timestamp * 1000);
                                  // Format untuk datetime-local: YYYY-MM-DDTHH:mm (dalam waktu lokal)
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const hours = String(date.getHours()).padStart(2, '0');
                                  const minutes = String(date.getMinutes()).padStart(2, '0');
                                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                                })()}
                                onChange={(e) => {
                                  const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000);
                                  updatePhaseField(phase.id, 'startTime', timestamp);
                                }}
                              />
                            ) : (
                              <p className="text-[#857F94] font-mono text-sm">
                                {(() => {
                                  const timestamp = typeof phase.startTime === 'number' ? phase.startTime : parseInt(phase.startTime) || 0;
                                  return new Date(timestamp * 1000).toLocaleString();
                                })()}
                              </p>
                            )}
                          </div>

                          {/* End Time */}
                          <div className="space-y-2">
                            <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                              End Time
                            </label>
                            {isEditing ? (
                              <input
                                type="datetime-local"
                                className="w-full bg-[#1E1F22] text-white px-3 py-2 font-mono text-sm rounded outline-none"
                                value={(() => {
                                  const timestamp = typeof editData.endTime === 'number' ? editData.endTime : parseInt(editData.endTime) || 0;
                                  const date = new Date(timestamp * 1000);
                                  // Format untuk datetime-local: YYYY-MM-DDTHH:mm (dalam waktu lokal)
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const hours = String(date.getHours()).padStart(2, '0');
                                  const minutes = String(date.getMinutes()).padStart(2, '0');
                                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                                })()}
                                onChange={(e) => {
                                  const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000);
                                  updatePhaseField(phase.id, 'endTime', timestamp);
                                }}
                              />
                            ) : (
                              <p className="text-[#857F94] font-mono text-sm">
                                {(() => {
                                  const timestamp = typeof phase.endTime === 'number' ? phase.endTime : parseInt(phase.endTime) || 0;
                                  return new Date(timestamp * 1000).toLocaleString();
                                })()}
                              </p>
                            )}
                          </div>

                          {/* Supply */}
                          <div className="space-y-2">
                            <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                              Supply
                            </label>
                            <p className="text-[#857F94] font-mono text-sm">
                              {phase.currentSupply} / {phase.maxSupply} ({phase.requiresWhitelist ? 'Whitelist' : 'Public'})
                            </p>
                          </div>

                          {/* Max Per Wallet */}
                          <div className="space-y-2">
                            <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                              Max Per Wallet
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                min="1"
                                className="w-full bg-[#1E1F22] text-[#857F94] px-3 py-2 font-mono text-sm rounded outline-none"
                                value={editData.maxPerWallet}
                                onChange={(e) => updatePhaseField(phase.id, 'maxPerWallet', parseInt(e.target.value) || 1)}
                              />
                            ) : (
                              <p className="text-[#857F94] font-mono text-sm">
                                {phase.maxPerWallet}
                              </p>
                            )}
                          </div>

                          {/* Max Per Transaction */}
                          <div className="space-y-2">
                            <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                              Max Per Transaction
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                min="1"
                                className="w-full bg-[#1E1F22] text-[#857F94] px-3 py-2 font-mono text-sm rounded outline-none"
                                value={editData.maxPerTransaction}
                                onChange={(e) => updatePhaseField(phase.id, 'maxPerTransaction', parseInt(e.target.value) || 1)}
                              />
                            ) : (
                              <p className="text-[#857F94] font-mono text-sm">
                                {phase.maxPerTransaction}
                              </p>
                            )}
                          </div>

                          {/* Whitelist Toggle */}
                          <div className="space-y-2">
                            <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                              Whitelist Required
                            </label>
                            {isEditing ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editData.requiresWhitelist}
                                  onChange={(e) => updatePhaseField(phase.id, 'requiresWhitelist', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <span className="text-[#857F94] font-mono text-sm">
                                  {editData.requiresWhitelist ? 'Yes' : 'No'}
                                </span>
                              </label>
                            ) : (
                              <p className="text-[#857F94] font-mono text-sm">
                                {phase.requiresWhitelist ? 'Yes' : 'No'}
                              </p>
                            )}
                          </div>

                          {/* Merkle Root - Show if whitelist */}
                          {(phase.requiresWhitelist || (isEditing && editData.requiresWhitelist)) && (
                            <div className="space-y-2 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[#B392F0] font-mono font-bold text-xs uppercase">
                                  Merkle Root
                                </label>
                                {!isEditing && (
                                  <div>
                                    <input
                                      type="file"
                                      accept=".csv"
                                      onChange={(e) => handleWhitelistUpload(phase.id, e)}
                                      className="hidden"
                                      id={`whitelist-upload-${phase.id}`}
                                    />
                                    <label
                                      htmlFor={`whitelist-upload-${phase.id}`}
                                      className={cn(
                                        "px-4 py-2 rounded-md font-mono font-bold text-xs transition-colors cursor-pointer inline-block",
                                        uploadingWhitelistPhaseId === phase.id
                                          ? "bg-gray-500/20 text-gray-400 cursor-not-allowed"
                                          : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                                      )}
                                    >
                                      {uploadingWhitelistPhaseId === phase.id ? 'UPLOADING...' : 'UPDATE WHITELIST'}
                                    </label>
                                  </div>
                                )}
                              </div>
                              <p className="text-[#857F94] font-mono text-xs break-all bg-[#0E0F11] p-3 rounded">
                                {phase.merkleRoot}
                              </p>
                              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 space-y-1">
                                <p className="text-xs text-blue-400 font-mono font-bold">📋 CSV FORMAT:</p>
                                <pre className="text-xs text-blue-400/80 font-mono">
{`address,allocation
0x1234...,1
0x5678...,2`}
                                </pre>
                                <p className="text-xs text-blue-400/80 font-mono">
                                  • First line can be header (will be skipped)
                                  • Format: address,allocation (allocation defaults to 1 if omitted)
                                </p>
                              </div>
                              {isEditing && (
                                <p className="text-xs text-yellow-500 font-mono">
                                  ℹ️ To update whitelist, save changes first, then use the "UPDATE WHITELIST" button above
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {phase.currentSupply === 0 && !isEditing && (
                          <div className="pt-4 border-t border-[#2F3336]">
                            <p className="text-xs text-yellow-500 font-mono">
                              ⚠️ No tokens minted yet - Click EDIT to modify phase settings
                            </p>
                          </div>
                        )}
                        {phase.currentSupply > 0 && (
                          <div className="pt-4 border-t border-[#2F3336]">
                            <p className="text-xs text-[#857F94] font-mono">
                              ℹ️ {phase.currentSupply} token(s) minted - Phase cannot be edited after minting starts
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Save Section */}
        <div className="border border-[#2F3336] border-t-0">
          <div className="bg-[#0D0E11] p-6 sm:p-12 lg:p-[78px]">
            <div className="text-center space-y-8 sm:space-y-10 lg:space-y-[50px]">
              {/* Header */}
              <div className="text-center">
                <p className="text-sm sm:text-[14px] font-mono font-bold text-white">Save Changes</p>
              </div>

              <div className="space-y-3 sm:space-y-[13px]">
                <h2 className="text-xl sm:text-2xl lg:text-[30px] font-mono font-medium text-[#F7F8FB] leading-tight">
                  Update Collection Settings
                </h2>
                <p className="text-[#505052] font-mono font-medium text-xs sm:text-[14px] leading-relaxed">
                  Database changes are instant. On-chain changes require blockchain transactions.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 justify-center">
                  <button
                    className={cn(
                      "rounded-md px-8 sm:px-16 lg:px-[148px] py-3 sm:py-[12px] font-mono font-bold text-sm sm:text-base lg:text-[16px] transition-colors flex items-center justify-center gap-2",
                      saving
                        ? "bg-gray-500 cursor-not-allowed text-gray-300"
                        : "bg-[#B8A8FF] hover:bg-[#A896F0] text-[#0E0F11]"
                    )}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <HugeiconsIcon icon={Save01Icon} size={16} />
                    {saving ? 'SAVING...' : 'SAVE CHANGES'}
                  </button>

                  <Link href="/create">
                    <button className="rounded-md px-8 py-3 font-mono font-bold text-sm sm:text-base border border-[#2F3336] text-[#857F94] hover:bg-[#1E1F22] transition-colors">
                      CANCEL
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="border border-[#2F3336] border-t-0 p-6 bg-[#0D0E11]">
          <div className="space-y-2 text-sm text-[#857F94]">
            <p className="font-mono font-bold text-[#B392F0]">
              ⚠️ IMPORTANT NOTES:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-xs">
              <li>Database changes (Status) - Instant, no gas fees</li>
              <li>On-chain changes (URI, Royalty, etc.) - Requires wallet approval & gas fees</li>
              <li>Mint phases - Scroll down to edit existing phases or add new ones</li>
              <li>Phase editing restrictions: Full update only if no tokens minted yet</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function EditLaunchpadPageWrapper() {
  return (
    <WagmiReadyGuard>
      <EditLaunchpadPage />
    </WagmiReadyGuard>
  );
}
