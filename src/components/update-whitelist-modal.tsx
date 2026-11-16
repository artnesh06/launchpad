'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { ContractService } from '@/lib/contract-service';
import { CustomSelect } from '@/components/ui/custom-select';
import { SingleDateTimePicker } from '@/components/ui/single-date-time-picker';
import { ModalFooterWithGas } from '@/components/modal-footer-with-gas';
import { getCreatorAuthHeadersSafe } from '@/lib/creator-auth-client';

interface UpdateWhitelistModalProps {
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  chainId?: number;
}

interface NewPhase {
  name: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  price: string;
  maxSupply: string;
  maxMintPerAddress: string;
  addresses: string;
}

export function UpdateWhitelistModal({ open, onClose, contractAddress, chainId = 11155111 }: UpdateWhitelistModalProps) {
  const [mode, setMode] = React.useState<'update' | 'add'>('update');
  const [phases, setPhases] = React.useState<any[]>([]);
  const [allPhasesCount, setAllPhasesCount] = React.useState<number>(0); // Track total phases count
  const [selectedPhaseId, setSelectedPhaseId] = React.useState<number>(0);
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [maxMintPerAddress, setMaxMintPerAddress] = React.useState('');
  const [maxSupply, setMaxSupply] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [addresses, setAddresses] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [loadingAddresses, setLoadingAddresses] = React.useState(false);
  const [totalCollectionSupply, setTotalCollectionSupply] = React.useState<number>(0);
  
  // New phase state
  const [newPhase, setNewPhase] = React.useState<NewPhase>({
    name: '',
    startDate: new Date(), // Default to current date/time
    endDate: undefined,
    price: '',
    maxSupply: '',
    maxMintPerAddress: '',
    addresses: ''
  });

  // Load phases when modal opens
  React.useEffect(() => {
    if (open && contractAddress) {
      loadPhases();
      // Reset form when modal opens
      setMode('update');
      setNewPhase({
        name: '',
        startDate: new Date(),
        endDate: undefined,
        price: '',
        maxSupply: '',
        maxMintPerAddress: '',
        addresses: ''
      });
    }
  }, [open, contractAddress]);

  // Load addresses when switching to update mode
  React.useEffect(() => {
    if (mode === 'update' && phases.length > 0) {
      // Reload addresses when switching back to update mode
      const currentPhase = phases.find(p => p.index === selectedPhaseId);
      if (currentPhase) {
        loadWhitelistAddresses(selectedPhaseId);
      }
    }
    // Note: We preserve addresses in newPhase.addresses when switching to 'add' mode
    // to preserve user input
  }, [mode]);

  // Sync addresses between modes to prevent data loss
  React.useEffect(() => {
    if (mode === 'add' && addresses && !newPhase.addresses) {
      // Copy addresses from update mode to add mode if add mode is empty
      setNewPhase(prev => ({ ...prev, addresses }));
    }
  }, [mode, addresses]);

  const loadPhases = async () => {
    setLoading(true);
    try {
      const service = new ContractService();
      
      // Get total phase count from contract first
      const totalPhaseCount = await service.getMintPhaseCount(chainId, contractAddress);
      setAllPhasesCount(totalPhaseCount);
      
      console.log(`📋 Total phases in contract: ${totalPhaseCount}`);
      
      // Get all phases with their correct contract indices
      const allPhases = await service.getActiveMintPhases(chainId, contractAddress);
      
      console.log(`📋 Loaded ${allPhases.length} phases for ${contractAddress}`);
      console.log(`   All phases:`, allPhases.map((p: any) => `[${p.index}] ${p.name} (whitelist: ${p.requiresWhitelist})`));
      
      // Get total collection supply
      const collectionInfo = await service.getCollectionInfo(chainId, contractAddress);
      const totalSupply = collectionInfo.maxSupply || 10000;
      setTotalCollectionSupply(totalSupply);
      
      // Set default maxSupply for new phase
      setNewPhase(prev => ({ ...prev, maxSupply: totalSupply.toString() }));
      
      // Filter whitelist phases (requiresWhitelist = true)
      const whitelistPhases = allPhases.filter((p: any) => p.requiresWhitelist);
      setPhases(whitelistPhases);
      
      console.log(`📋 Filtered ${whitelistPhases.length} whitelist phases`);
      console.log(`   Whitelist phases:`, whitelistPhases.map((p: any) => `[${p.index}] ${p.name}`));
      
      if (whitelistPhases.length > 0) {
        const firstPhase = whitelistPhases[0];
        // IMPORTANT: Use the actual phase index from contract, not array index
        setSelectedPhaseId(firstPhase.index);
        
        console.log(`📌 Selected phase index ${firstPhase.index}: ${firstPhase.name}`);
        
        setStartDate(new Date(firstPhase.startTime * 1000));
        setEndDate(new Date(firstPhase.endTime * 1000));
        setMaxMintPerAddress(firstPhase.maxPerWallet.toString());
        setMaxSupply(firstPhase.maxSupply.toString());
        
        // Use price in ETH format for display
        setPrice(firstPhase.price);
        
        // Load addresses for first phase using actual contract index
        await loadWhitelistAddresses(firstPhase.index);
      } else {
        // Reset form when no whitelist phases
        setAddresses('');
        setSelectedPhaseId(0);
        setStartDate(undefined);
        setEndDate(undefined);
        setMaxMintPerAddress('');
        setMaxSupply('');
        setPrice('');
        console.log('⚠️ No whitelist phases found');
      }
    } catch (error) {
      console.error('Failed to load phases:', error);
      toast.error('Failed to load mint phases', { id: TOAST_ID });
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseChange = async (phaseId: number) => {
    console.log(`🔄 Phase selection changed to contract index: ${phaseId}`);
    
    setSelectedPhaseId(phaseId);
    const phase = phases.find(p => p.index === phaseId);
    
    if (!phase) {
      console.error(`❌ Phase with contract index ${phaseId} not found in whitelist phases`);
      console.log(`   Available whitelist phases:`, phases.map(p => `[${p.index}] ${p.name}`));
      toast.error('Phase not found. Try refreshing the page.', { id: TOAST_ID });
      
      // Try to reload phases
      await loadPhases();
      return;
    }
    
    console.log(`✅ Selected phase: [${phase.index}] ${phase.name}`);
    
    // Update form with phase data
    setStartDate(new Date(phase.startTime * 1000));
    setEndDate(new Date(phase.endTime * 1000));
    setMaxMintPerAddress(phase.maxPerWallet.toString());
    setMaxSupply(phase.maxSupply.toString());
    
    // Use price in ETH format for display
    setPrice(phase.price);
    
    // Load existing whitelist addresses using contract phase index
    await loadWhitelistAddresses(phaseId);
  };

  const loadWhitelistAddresses = async (phaseId: number) => {
    setLoadingAddresses(true);
    try {
      console.log(`🔍 Loading whitelist addresses for contract phase index ${phaseId}...`);
      const response = await fetch(`/api/whitelist/list?contractAddress=${contractAddress}&phaseId=${phaseId}&chainId=${chainId}`);
      const result = await response.json();
      
      console.log(`📋 Whitelist API response for phase ${phaseId}:`, result);
      
      if (result.success && result.data.addresses) {
        const addressList = result.data.addresses.join('\n');
        setAddresses(addressList);
        console.log(`✅ Loaded ${result.data.addresses.length} addresses for phase ${phaseId}`);
      } else {
        setAddresses('');
        console.log(`⚠️ No addresses found for phase ${phaseId}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Failed to load whitelist addresses for phase ${phaseId}:`, error);
      setAddresses('');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddPhase = async () => {
    // Validate required fields (End date is optional)
    if (!newPhase.name || !newPhase.startDate || !newPhase.price || !newPhase.maxSupply || !newPhase.maxMintPerAddress) {
      toast.error('Please fill in all required fields', {
        id: TOAST_ID,
        description: 'End Date is optional - leave empty for no end time'
      });
      return;
    }

    // Parse and validate addresses
    const addressList = newPhase.addresses
      .split('\n')
      .map(addr => addr.trim().toLowerCase())
      .filter(addr => addr.length > 0 && addr.startsWith('0x'));

    console.log(`📝 Preparing to add new phase...`);
    console.log(`   Phase name: ${newPhase.name}`);
    console.log(`   Addresses input: ${newPhase.addresses.split('\n').length} lines`);
    console.log(`   Parsed addresses: ${addressList.length} valid addresses`);

    // Validate minimum 2 addresses
    if (addressList.length < 2) {
      toast.error('Minimum 2 addresses required', {
        id: TOAST_ID,
        description: 'Please add at least 2 different wallet addresses for whitelist'
      });
      return;
    }

    // Check for duplicate addresses
    const uniqueAddresses = Array.from(new Set(addressList));
    if (uniqueAddresses.length !== addressList.length) {
      const duplicateCount = addressList.length - uniqueAddresses.length;
      toast.error('Duplicate addresses found', {
        id: TOAST_ID,
        description: `${duplicateCount} duplicate address(es) detected. All addresses must be unique.`
      });
      return;
    }

    console.log(`✅ Validation passed: ${uniqueAddresses.length} unique addresses`);

    setUpdating(true);
    toast.loading('Adding new whitelist phase...', { id: TOAST_ID });

    try {
      const service = new ContractService();

      // Generate merkle root if addresses provided
      let merkleRoot = '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (uniqueAddresses.length > 0) {
        // Import WhitelistManager to generate merkle root
        const { WhitelistManager } = await import('@/lib/contract-service');
        const whitelistManager = new WhitelistManager();
        
        // Add all addresses with allocation = 1
        uniqueAddresses.forEach(addr => {
          whitelistManager.addAddress(addr, 1);
        });
        
        // Generate merkle root
        merkleRoot = whitelistManager.generateMerkleTree();
        console.log('🌳 Generated merkle root for new phase:', merkleRoot);
      }

      // NEW: Validate allPhasesCount matches expected next index
      console.log(`📝 Adding new whitelist phase to contract...`);
      console.log(`   Current total phases in contract: ${allPhasesCount}`);
      console.log(`   New phase will have contract index: ${allPhasesCount}`);
      console.log(`   Phase name: ${newPhase.name}`);
      console.log(`   Addresses to add: ${uniqueAddresses.length}`);
      
      // Add new phase
      // If endDate is not set, use a far future timestamp (year 2100)
      const endTime = newPhase.endDate 
        ? Math.floor(newPhase.endDate.getTime() / 1000)
        : Math.floor(new Date('2100-01-01').getTime() / 1000);

      const txHash = await service.addMintPhase(
        chainId,
        contractAddress,
        {
          name: newPhase.name,
          description: '', // Required by interface but not used in contract
          startTime: Math.floor(newPhase.startDate.getTime() / 1000),
          endTime: endTime,
          price: newPhase.price || '0',
          maxSupply: parseInt(newPhase.maxSupply),
          maxPerWallet: parseInt(newPhase.maxMintPerAddress),
          maxPerTransaction: parseInt(newPhase.maxMintPerAddress),
          merkleRoot,
          requiresWhitelist: true
          // Note: isActive and currentSupply are set automatically in batchAddMintPhases
        }
      );

      toast.success('Whitelist phase added!', {
        id: TOAST_ID,
        description: `Transaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      });

      // CRITICAL: Sync phases to database FIRST before adding addresses
      toast.loading('Syncing phases to database...', { id: TOAST_ID });
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for blockchain confirmation
      
      try {
        const syncResponse = await fetch('/api/admin/launchpads/sync-phases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractAddress,
            chainId
          })
        });
        const syncResult = await syncResponse.json();
        if (syncResult.success) {
          console.log('✅ Phases synced to database');
        } else {
          throw new Error('Phase sync failed');
        }
      } catch (err) {
        console.error('Failed to sync phases:', err);
        toast.error('Failed to sync phases to database', { id: TOAST_ID });
        return; // Stop here if sync fails
      }

      // If addresses provided, update whitelist via API (AFTER sync)
      if (uniqueAddresses.length > 0) {
        toast.loading('Adding whitelist addresses...', { id: TOAST_ID });
        
        try {
          // Use allPhasesCount as the new phase ID (next available contract index)
          const newPhaseId = allPhasesCount;
          
          console.log(`📝 Saving whitelist addresses for new phase...`);
          console.log(`   Contract phase index: ${newPhaseId}`);
          console.log(`   Phase name: ${newPhase.name}`);
          console.log(`   Total addresses: ${uniqueAddresses.length}`);
          
          const authHeaders = await getCreatorAuthHeadersSafe('whitelist:update', contractAddress);
          const response = await fetch('/api/whitelist/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
              contractAddress,
              phaseId: newPhaseId,
              addresses: uniqueAddresses,
              chainId
            })
          });

          const result = await response.json();
          
          if (result.success) {
            toast.success('Whitelist addresses added!', {
              id: TOAST_ID,
              description: `${uniqueAddresses.length} addresses added to phase ${newPhaseId}`
            });
          } else {
            toast.warning('Phase added but whitelist sync failed', {
              id: TOAST_ID,
              description: result.error || 'Unknown error'
            });
            console.error('Whitelist API error:', result);
          }
        } catch (apiError) {
          console.error('Failed to add whitelist via API:', apiError);
          toast.warning('Phase added but whitelist sync failed', { id: TOAST_ID });
        }
      }

      // Reset form and reload phases
      setNewPhase({
        name: '',
        startDate: new Date(), // Reset to current date/time
        endDate: undefined,
        price: '',
        maxSupply: totalCollectionSupply.toString(),
        maxMintPerAddress: '',
        addresses: ''
      });
      setMode('update');
      await loadPhases();
    } catch (error: any) {
      console.error('Failed to add whitelist phase:', error);
      toast.error('Failed to add whitelist phase', {
        id: TOAST_ID,
        description: error.message || 'Please try again'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePhase = async () => {
    // End date is optional
    if (!startDate || !maxMintPerAddress) {
      toast.error('Please fill in all required fields (End Date is optional)', { id: TOAST_ID });
      return;
    }

    // Validate maxSupply
    const currentPhase = phases.find(p => p.index === selectedPhaseId);
    if (currentPhase && parseInt(maxSupply) < currentPhase.currentSupply) {
      toast.error('Max Supply cannot be less than current supply', {
        id: TOAST_ID,
        description: `Current supply: ${currentPhase.currentSupply}, New max supply: ${maxSupply}`
      });
      return;
    }

    console.log('🔄 Starting phase update...');
    console.log(`   Contract phase index: ${selectedPhaseId}`);
    console.log(`   Phase name: ${currentPhase?.name}`);
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Chain ID: ${chainId}`);

    setUpdating(true);
    toast.loading('Updating whitelist phase...', { id: TOAST_ID });

    try {
      const service = new ContractService();
      
      // Parse addresses (one per line, normalize and filter)
      const addressList = addresses
        .split('\n')
        .map(addr => addr.trim().toLowerCase())
        .filter(addr => addr.length > 0 && addr.startsWith('0x'));

      console.log(`📝 Parsed ${addressList.length} addresses from input`);

      // Validate addresses format (basic check)
      const invalidAddresses = addressList.filter(addr => addr.length !== 42);
      if (invalidAddresses.length > 0) {
        toast.error('Invalid address format detected', {
          id: TOAST_ID,
          description: `${invalidAddresses.length} address(es) are not valid Ethereum addresses (must be 42 characters)`
        });
        return;
      }

      // Get current phase data
      if (!currentPhase) {
        throw new Error('Phase not found');
      }

      // Generate merkle root if addresses provided
      let merkleRoot = currentPhase.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      if (addressList.length > 0) {
        // Import WhitelistManager to generate merkle root
        const { WhitelistManager } = await import('@/lib/contract-service');
        const whitelistManager = new WhitelistManager();
        
        // Add all addresses with allocation = 1
        addressList.forEach(addr => {
          whitelistManager.addAddress(addr, 1);
        });
        
        // Generate merkle root
        merkleRoot = whitelistManager.generateMerkleTree();
        console.log('🌳 Generated merkle root:', merkleRoot);
      }

      // Update phase with new data
      // If endDate is not set, use a far future timestamp (year 2100)
      const endTime = endDate 
        ? Math.floor(endDate.getTime() / 1000)
        : Math.floor(new Date('2100-01-01').getTime() / 1000);

      const txHash = await service.updateMintPhase(
        chainId,
        contractAddress,
        selectedPhaseId,
        {
          name: currentPhase.name,
          startTime: Math.floor(startDate.getTime() / 1000),
          endTime: endTime,
          price: price,
          maxSupply: parseInt(maxSupply),
          maxPerWallet: parseInt(maxMintPerAddress),
          maxPerTransaction: parseInt(maxMintPerAddress),
          merkleRoot: merkleRoot,
          isActive: currentPhase.isActive !== undefined ? currentPhase.isActive : true,
          requiresWhitelist: true,
          currentSupply: currentPhase.currentSupply || 0
        }
      );

      toast.success('Whitelist phase updated!', {
        id: TOAST_ID,
        description: `Transaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      });

      // If addresses provided, update whitelist via API
      if (addressList.length > 0) {
        toast.loading('Updating whitelist addresses...', { id: TOAST_ID });
        
        try {
          console.log(`📝 Updating whitelist addresses...`);
          console.log(`   Contract phase index: ${selectedPhaseId}`);
          console.log(`   Phase name: ${currentPhase.name}`);
          console.log(`   Total addresses: ${addressList.length}`);
          
          const authHeaders = await getCreatorAuthHeadersSafe('whitelist:update', contractAddress);
          const response = await fetch('/api/whitelist/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
              contractAddress,
              phaseId: selectedPhaseId,
              addresses: addressList,
              chainId
            })
          });

          const result = await response.json();
          
          console.log(`📋 Whitelist update API response:`, result);
          
          if (result.success) {
            toast.success('Whitelist addresses updated!', {
              id: TOAST_ID,
              description: `${addressList.length} addresses saved to phase ${selectedPhaseId}`
            });
          } else {
            toast.warning('Phase updated but whitelist sync failed', {
              id: TOAST_ID,
              description: result.error
            });
          }
        } catch (apiError) {
          console.error('Failed to update whitelist via API:', apiError);
          toast.warning('Phase updated but whitelist sync failed', { id: TOAST_ID });
        }
      } else {
        // If no addresses, clear whitelist for this phase
        console.log(`🗑️ No addresses provided, clearing whitelist for phase ${selectedPhaseId}`);
      }

      // Wait and sync phases before closing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Sync phases to database
      try {
        const syncResponse = await fetch('/api/admin/launchpads/sync-phases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractAddress,
            chainId
          })
        });
        const syncResult = await syncResponse.json();
        if (syncResult.success) {
          console.log('✅ Phases synced to database');
        }
      } catch (err) {
        console.error('Failed to sync phases:', err);
      }

      // Reload phases to show updated data
      await loadPhases();
      
      toast.success('Phase updated successfully!', { id: TOAST_ID });
      onClose();
      
      // Trigger page refresh after modal closes
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to update whitelist:', error);
      toast.error('Failed to update whitelist', {
        id: TOAST_ID,
        description: error.message || 'Please try again'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleExecute = () => {
    if (mode === 'add') {
      handleAddPhase();
    } else {
      handleUpdatePhase();
    }
  };

  const handleRemovePhase = async () => {
    const currentPhase = phases.find(p => p.index === selectedPhaseId);
    
    if (!currentPhase) {
      toast.error('Phase not found', { id: TOAST_ID });
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to remove "${currentPhase.name}"?\n\n` +
      `This action cannot be undone and will:\n` +
      `- Remove the phase from the contract\n` +
      `- Delete all whitelist addresses for this phase\n` +
      `- Reindex remaining phases`
    );

    if (!confirmed) return;

    setUpdating(true);
    toast.loading('Removing phase...', { id: TOAST_ID });

    try {
      const service = new ContractService();

      console.log('🗑️ Removing phase...');
      console.log(`   Contract phase index: ${selectedPhaseId}`);
      console.log(`   Phase name: ${currentPhase.name}`);
      console.log(`   Contract: ${contractAddress}`);

      // Remove phase from contract
      const txHash = await service.removePhase(chainId, contractAddress, selectedPhaseId);

      toast.success('Phase removed from contract!', {
        id: TOAST_ID,
        description: `Transaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      });

      // Delete whitelist addresses from database
      try {
        toast.loading('Cleaning up whitelist data...', { id: TOAST_ID });
        
        const authHeaders = await getCreatorAuthHeadersSafe('whitelist:delete', contractAddress);
        const response = await fetch('/api/whitelist/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            contractAddress,
            phaseId: selectedPhaseId,
            chainId
          })
        });

        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Whitelist data cleaned up');
        } else {
          console.warn('⚠️ Failed to clean up whitelist data:', result.error);
        }
      } catch (apiError) {
        console.error('Failed to clean up whitelist via API:', apiError);
      }

      // Wait and sync phases
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Sync phases to database
      try {
        const syncResponse = await fetch('/api/admin/launchpads/sync-phases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractAddress,
            chainId
          })
        });
        const syncResult = await syncResponse.json();
        if (syncResult.success) {
          console.log('✅ Phases synced to database');
        }
      } catch (err) {
        console.error('Failed to sync phases:', err);
      }

      // Reload phases
      await loadPhases();
      
      toast.success('Phase removed successfully!', { id: TOAST_ID });
      
      // Trigger page refresh after modal closes
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to remove phase:', error);
      toast.error('Failed to remove phase', {
        id: TOAST_ID,
        description: error.message || 'Please try again'
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      position="bottom"
      showOverlay={true}
    >
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#B392F0] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white text-lg font-mono">Loading phases...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mode Toggle Row */}
          <div className="w-full max-w-[1000px] mx-auto border-b border-[#2F3336] px-6 py-2">
            <div className="flex items-center gap-2 rounded">
              <button
                onClick={() => setMode('update')}
                className={`px-4 py-1 text-sm font-mono transition-colors ${
                  mode === 'update' 
                    ? 'bg-[#B392F0] text-black' 
                    : 'text-[#6A7282] hover:text-white'
                }`}
              >
                Update Phase
              </button>
              <button
                onClick={() => setMode('add')}
                className={`px-4 py-1 text-sm font-mono transition-colors ${
                  mode === 'add' 
                    ? 'bg-[#B392F0] text-black' 
                    : 'text-[#6A7282] hover:text-white'
                }`}
              >
                + Add Phase
              </button>
            </div>
          </div>

          {/* Content - 3 Column Layout */}
          <div className="w-full max-w-[1000px] mx-auto grid grid-cols-[200px_1fr_350px] lg:grid-cols-[270px_1fr_350px]">
            {/* Left Column - Labels */}
            <div className="border-r border-[#2F3336]">
              {mode === 'add' ? (
                <>
                  <div className="h-[42px] border-b border-[#2F3336] flex items-center px-3 bg-[#0D0E11]/50">
                    <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Phase Name</label>
                  </div>
                </>
              ) : (
                <div className="h-[42px] border-b border-[#2F3336] flex items-center px-3 bg-[#0D0E11]/50">
                  <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Choose Phase</label>
                </div>
              )}
              <div className="h-[42px] border-b border-[#2F3336] flex items-center px-3 bg-[#0D0E11]/50">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">
                  Max Supply
                  {mode === 'update' && phases.find(p => p.index === selectedPhaseId) && (
                    <span className="text-[#6A7282] text-xs ml-2">
                      (Current: {phases.find(p => p.index === selectedPhaseId)?.currentSupply || 0})
                    </span>
                  )}
                </label>
              </div>
              {/* Start Time Label */}
              <div className="h-[42px] border-b border-[#2F3336] flex items-center px-3 bg-[#0D0E11]/50">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Start Time</label>
              </div>
              {/* End Time Label */}
              <div className="h-[42px] border-b border-[#2F3336] flex items-center px-3 bg-[#0D0E11]/50">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">End Time</label>
              </div>
              {/* Mint Price Label */}
              <div className="h-[42px] border-b border-[#2F3336] flex items-center px-3 bg-[#0D0E11]/50">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Mint Price</label>
              </div>
              {/* Max Mint Per Address Label */}
              <div className="h-[42px] border-b border-[#2F3336] flex items-center px-3 bg-[#0D0E11]/50">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Max Mint Per Address</label>
              </div>
            </div>

            {/* Middle Column - Inputs */}
            <div className="border-r border-[#2F3336]">
              {mode === 'add' ? (
                <>
                  <div className="h-[42px] border-b border-[#2F3336] bg-[#0D0E11]">
                    <input
                      type="text"
                      value={newPhase.name}
                      onChange={(e) => setNewPhase(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Whitelist Phase 1"
                      className="w-full h-full bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                    />
                  </div>
                </>
              ) : (
                <div className="h-[42px] border-b border-[#2F3336] bg-[#0D0E11] flex items-center">
                  <CustomSelect
                    options={phases.length === 0 ? [{ value: '0', label: 'No whitelist phases' }] : phases.map((phase) => ({
                      value: String(phase.index),
                      label: phase.name
                    }))}
                    value={String(selectedPhaseId)}
                    onValueChange={(value) => handlePhaseChange(Number(value))}
                    containerClassName="w-full space-y-0"
                    labelClassName="hidden"
                  />
                </div>
              )}
              <div className="h-[42px] border-b border-[#2F3336] bg-[#0D0E11]">
                <input
                  type="number"
                  value={mode === 'add' ? newPhase.maxSupply : maxSupply}
                  onChange={(e) => mode === 'add' ? setNewPhase(prev => ({ ...prev, maxSupply: e.target.value })) : setMaxSupply(e.target.value)}
                  placeholder={`e.g., ${totalCollectionSupply || 10000}`}
                  min="1"
                  className="w-full h-full bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                />
              </div>
              {/* Start Time Input */}
              <div className="h-[42px] border-b border-[#2F3336] bg-[#0D0E11] flex items-center">
                <SingleDateTimePicker
                  date={mode === 'add' ? newPhase.startDate : startDate}
                  onDateChange={(date) => mode === 'add' ? setNewPhase(prev => ({ ...prev, startDate: date })) : setStartDate(date)}
                  placeholder="Select start date & time"
                  className="w-full space-y-0"
                />
              </div>
              {/* End Time Input */}
              <div className="h-[42px] border-b border-[#2F3336] bg-[#0D0E11] flex items-center">
                <SingleDateTimePicker
                  date={mode === 'add' ? newPhase.endDate : endDate}
                  onDateChange={(date) => mode === 'add' ? setNewPhase(prev => ({ ...prev, endDate: date })) : setEndDate(date)}
                  placeholder="Select end date & time"
                  className="w-full space-y-0"
                />
              </div>
              {/* Mint Price Input */}
              <div className="h-[42px] border-b border-[#2F3336] bg-[#0D0E11]">
                <input
                  type="text"
                  value={mode === 'add' ? newPhase.price : price}
                  onChange={(e) => mode === 'add' ? setNewPhase(prev => ({ ...prev, price: e.target.value })) : setPrice(e.target.value)}
                  placeholder="e.g., 0.01"
                  className="w-full h-full bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                />
              </div>
              {/* Max Mint Per Address Input */}
              <div className="h-[42px] border-b border-[#2F3336] bg-[#0D0E11]">
                <input
                  type="number"
                  value={mode === 'add' ? newPhase.maxMintPerAddress : maxMintPerAddress}
                  onChange={(e) => mode === 'add' ? setNewPhase(prev => ({ ...prev, maxMintPerAddress: e.target.value })) : setMaxMintPerAddress(e.target.value)}
                  placeholder="e.g., 2"
                  min="0"
                  className="w-full h-full bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                />
              </div>
            </div>

            {/* Right Column - Add Address Section */}
            <div className="row-span-6 border-b border-[#2F3336] bg-[#0D0E11] flex flex-col">
              {/* Header with Upload */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2F3336]">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">address:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const text = event.target?.result as string;
                          const lines = text.split('\n')
                            .map(line => line.trim())
                            .filter(line => line && line.startsWith('0x'));
                          
                          const addressList = lines.join('\n');
                          if (mode === 'add') {
                            setNewPhase(prev => ({ ...prev, addresses: addressList }));
                          } else {
                            setAddresses(addressList);
                          }
                          toast.success(`${lines.length} addresses loaded from CSV`, { id: TOAST_ID });
                        };
                        reader.readAsText(file);
                      }
                      // Reset input
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="px-3 py-1 bg-[#1E1F22] text-[#B392F0] font-mono text-xs rounded cursor-pointer hover:bg-[#2D253E] transition-colors"
                  >
                    Upload CSV
                  </label>
                </div>
              </div>
              {/* Address List */}
              <div className="flex-1 p-4">
                {loadingAddresses ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-[#B392F0] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-white/50 text-xs font-mono">Loading addresses...</p>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={mode === 'add' ? newPhase.addresses : addresses}
                    onChange={(e) => mode === 'add' ? setNewPhase(prev => ({ ...prev, addresses: e.target.value })) : setAddresses(e.target.value)}
                    placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&#10;0x123sdca...123acs&#10;0x456def...456def"
                    className="w-full h-full bg-transparent border border-dashed border-[#2F3336] rounded p-2 text-white/70 font-mono text-[13px] resize-none outline-none focus:ring-2 focus:ring-[#B392F0] overflow-y-auto"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Execute Button Row */}
          <div className="w-full max-w-[1000px] mx-auto flex items-center px-6 py-2 justify-between border-b border-[#2F3336]">
            <ModalFooterWithGas chainId={chainId} />
            <div className="flex items-center gap-4">
              {mode === 'update' && phases.length > 0 && (
                <button
                  onClick={handleRemovePhase}
                  disabled={updating}
                  className="w-[150px] h-10 bg-red-600 text-white text-[16px] font-semibold font-mono hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
                >
                  {updating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    'Remove Phase'
                  )}
                </button>
              )}
              <button
                onClick={handleExecute}
                disabled={updating || (mode === 'update' && phases.length === 0)}
                className="w-[150px] h-10 bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
              >
                {updating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  mode === 'add' ? 'Add Phase' : 'Update Phase'
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
        </>
      )}
    </Drawer>
  );
}


