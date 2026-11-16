'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { ContractService } from '@/lib/contract-service';
import { CustomSelect } from '@/components/ui/custom-select';
import { SingleDateTimePicker } from '@/components/ui/single-date-time-picker';
import { ModalFooterWithGas } from '@/components/modal-footer-with-gas';

interface UpdatePublicMintModalProps {
  open: boolean;
  onClose: () => void;
  contractAddress: string;
  chainId?: number;
}

export function UpdatePublicMintModal({ open, onClose, contractAddress, chainId = 11155111 }: UpdatePublicMintModalProps) {
  const [phases, setPhases] = React.useState<any[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = React.useState<number>(0);
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [maxMintPerAddress, setMaxMintPerAddress] = React.useState('');
  const [maxSupply, setMaxSupply] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  // Load phases when modal opens
  React.useEffect(() => {
    if (open && contractAddress) {
      loadPhases();
    }
  }, [open, contractAddress]);

  const loadPhases = async () => {
    setLoading(true);
    try {
      const service = new ContractService();
      const allPhases = await service.getActiveMintPhases(chainId, contractAddress);
      
      // Filter public phases (requiresWhitelist = false)
      const publicPhases = allPhases.filter((p: any) => !p.requiresWhitelist);
      setPhases(publicPhases);
      
      if (publicPhases.length > 0) {
        const firstPhase = publicPhases[0];
        setSelectedPhaseId(firstPhase.index);
        setStartDate(new Date(firstPhase.startTime * 1000));
        setEndDate(new Date(firstPhase.endTime * 1000));
        setMaxMintPerAddress(firstPhase.maxPerWallet.toString());
        setMaxSupply(firstPhase.maxSupply.toString());
        
        // Use price in ETH format for display
        setPrice(firstPhase.price);
      }
    } catch (error) {
      console.error('Failed to load phases:', error);
      toast.error('Failed to load mint phases', { id: TOAST_ID });
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseChange = (phaseId: number) => {
    setSelectedPhaseId(phaseId);
    const phase = phases.find(p => p.index === phaseId);
    if (phase) {
      setStartDate(new Date(phase.startTime * 1000));
      setEndDate(new Date(phase.endTime * 1000));
      setMaxMintPerAddress(phase.maxPerWallet.toString());
      setMaxSupply(phase.maxSupply.toString());
      
      // Use price in ETH format for display
      setPrice(phase.price);
    }
  };

  const handleExecute = async () => {
    // End date is optional
    if (!startDate || !maxMintPerAddress || !maxSupply || !price) {
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

    setUpdating(true);
    const loadingToast = toast.loading('Updating public mint phase...', { id: TOAST_ID });

    try {
      const service = new ContractService();
      
      // Get current phase data
      const currentPhase = phases.find(p => p.index === selectedPhaseId);
      if (!currentPhase) {
        throw new Error('Phase not found');
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
          merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
          isActive: currentPhase.isActive !== undefined ? currentPhase.isActive : true,
          requiresWhitelist: false,
          currentSupply: currentPhase.currentSupply || 0
        }
      );

      toast.success('Public mint phase updated!', {
        id: TOAST_ID,
        description: `Transaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      });

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

      onClose();
      
      // Trigger page refresh after modal closes
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Failed to update public mint:', error);
      toast.error('Failed to update public mint', {
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
          {/* Content - Table Layout */}
          <div className="w-full max-w-[1000px] mx-auto">
            {/* Phase Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Phase Name</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center">
                <CustomSelect
                  options={phases.length === 0 ? [{ value: '0', label: 'No public phases' }] : phases.map((phase) => ({
                    value: String(phase.index),
                    label: phase.name
                  }))}
                  value={String(selectedPhaseId)}
                  onValueChange={(value) => handlePhaseChange(Number(value))}
                  containerClassName="w-full space-y-0"
                  labelClassName="hidden"
                />
              </div>
            </div>

            {/* Start Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Start Time</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center">
                <SingleDateTimePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  placeholder="dd/mm/yyyy. 7 PM UTC"
                  className="w-full space-y-0"
                />
              </div>
            </div>

            {/* End Time Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">End Time</label>
              </div>
              <div className="bg-[#0D0E11] flex items-center">
                <SingleDateTimePicker
                  date={endDate}
                  onDateChange={setEndDate}
                  placeholder="dd/mm/yyyy. 7 PM UTC"
                  className="w-full space-y-0"
                />
              </div>
            </div>

            {/* Max Supply Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">
                  Max Supply
                  {phases.find(p => p.index === selectedPhaseId) && (
                    <span className="text-[#6A7282] text-xs ml-2">
                      (Current: {phases.find(p => p.index === selectedPhaseId)?.currentSupply || 0})
                    </span>
                  )}
                </label>
              </div>
              <div className="bg-[#0D0E11]">
                <input
                  type="number"
                  value={maxSupply}
                  onChange={(e) => setMaxSupply(e.target.value)}
                  placeholder="e.g., 10000"
                  min="1"
                  className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                />
              </div>
            </div>

            {/* Mint Price Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Mint Price</label>
              </div>
              <div className="bg-[#0D0E11]">
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., 0.01"
                  className="w-full h-[42px] bg-transparent px-3 text-white font-mono text-[15px] outline-none placeholder:text-[#857F94]"
                />
              </div>
            </div>

            {/* Max Mint Per Address Row */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[303px_1fr] min-h-[42px] border-b border-[#2F3336]">
              <div className="md:border-r border-b md:border-b-0 border-[#2F3336] flex items-center px-3 py-2 md:py-0 bg-[#0D0E11]/50 md:bg-transparent">
                <label className="text-[#B392F0] font-mono font-bold text-sm md:text-[15px]">Max Mint Per Address</label>
              </div>
              <div className="bg-[#0D0E11]">
                <input
                  type="number"
                  value={maxMintPerAddress}
                  onChange={(e) => setMaxMintPerAddress(e.target.value)}
                  placeholder="1"
                  min="0"
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
                  disabled={updating || phases.length === 0}
                  className="w-[150px] h-10 bg-[#B392F0] text-black text-[16px] font-semibold font-mono hover:bg-[#9B7FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px]"
                >
                  {updating ? (
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
        </>
      )}
    </Drawer>
  );
}