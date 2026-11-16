'use client';

import { useState, useEffect, useRef } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { CustomSelect } from '@/components/ui/custom-select';
import { toast } from 'sonner';
import { TOAST_ID } from '@/constants/toast-ids';
import { useGasPrice } from '@/hooks/use-gas-price';
import { usePlatformFee } from '@/hooks/use-platform-fee';
import { useWalletMint } from '@/hooks/useWalletMint';
import { MintSuccessModal } from '@/components/modal/mint-success-modal';

interface Phase {
  id: string;
  name: string;
  phaseType: string; // 'PUBLIC' | 'ALLOWLIST' | 'WHITELIST'
  startTime: string;
  endTime: string;
  price: string;
  maxPerWallet: number;
  totalLimit: number;
  mintedCount: number;
  isActive: boolean;
  merkleRoot?: string;
  requiresWhitelist: boolean;
  phaseIndex?: number;
}

interface NFTCollection {
  rank: number;
  name: string;
  collection: string;
  mintPrice: string;
  minted: string;
  minted24h?: number;
  holders: number;
  volume: string;
  change: number;
  avatar: string;
  image?: string;
  launchpadId: string;
  contractAddress: string;
  chainId: number;
  chartData?: Array<{
    timestamp: string;
    volume: number;
    mints: number;
  }>;
  phases?: Phase[];
  activePhase?: Phase;
}

interface MintDrawerProps {
  open: boolean;
  onClose: () => void;
  collection: NFTCollection | null;
  isConnected: boolean;
  address: string | undefined;
  switchChain: any;
  currentChainId: number;
  onMintSuccess?: () => void;
}

export function MintDrawer({
  open,
  onClose,
  collection,
  isConnected,
  address,
  switchChain,
  currentChainId,
  onMintSuccess,
}: MintDrawerProps) {
  const [mintAmount, setMintAmount] = useState(1);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [minting, setMinting] = useState(false);
  const [userMintedCount, setUserMintedCount] = useState<number>(0);
  const [isEligible, setIsEligible] = useState<boolean>(true);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [countdownStatus, setCountdownStatus] = useState<'before-start' | 'active' | 'ended' | 'minted-out' | 'no-phase'>('no-phase');
  const { gasPrice } = useGasPrice(collection?.chainId);
  const { platformFee } = usePlatformFee(collection?.contractAddress, collection?.chainId);
  const [mintSuccessModalOpen, setMintSuccessModalOpen] = useState(false);
  const [lastMintData, setLastMintData] = useState<{
    tokenIds: string[];
    quantity: number;
    txHash: string;
    chainId: number;
    contractAddress: string;
    collectionName: string;
    collectionImage?: string;
    nftImages?: { tokenId: string; imageUrl: string }[];
  } | null>(null);
  const mintDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingMintTokenIds, setPendingMintTokenIds] = useState<string[]>([]);

  // Wallet mint hook for tracking user's mints
  const { userMints } = useWalletMint({
    walletAddress: address,
    contractAddress: collection?.contractAddress,
    enabled: isConnected && open,
  });

  // Refs to hold latest values for setTimeout callback (avoid stale closure)
  const userMintsRef = useRef(userMints);
  const collectionRef = useRef(collection);

  // Listen to user mints and show success modal with debounce for batch mints
  useEffect(() => {
    // Update refs with latest values
    userMintsRef.current = userMints;
    collectionRef.current = collection;

    if (userMints.length > 0 && collection && open) {
      const latestMint = userMints[0];
      
      // Only process new mints (entering state)
      if (latestMint.animationState === 'entering') {
        // Add new token ID to pending list
        setPendingMintTokenIds(prev => {
          if (!prev.includes(latestMint.tokenId)) {
            return [...prev, latestMint.tokenId];
          }
          return prev;
        });

        // Clear existing debounce timer
        if (mintDebounceRef.current) {
          clearTimeout(mintDebounceRef.current);
        }

        // Set debounce timer - wait 2 seconds for more mint events before showing modal
        mintDebounceRef.current = setTimeout(() => {
          // Use refs to get latest values (avoid stale closure)
          const currentCollection = collectionRef.current;

          if (!currentCollection) {
            return;
          }

          // Use pending token IDs that we collected during the debounce period
          setPendingMintTokenIds(currentPending => {
            if (currentPending.length > 0) {
              // Get image URLs from userMints for the pending tokens
              const currentUserMints = userMintsRef.current;
              const nftImages = currentPending.map(tokenId => {
                const mint = currentUserMints.find(m => m.tokenId === tokenId);
                return {
                  tokenId,
                  imageUrl: mint?.imageUrl || currentCollection.image || ''
                };
              });

              setLastMintData({
                tokenIds: currentPending,
                quantity: currentPending.length,
                txHash: '', // Will be populated from transaction
                chainId: currentCollection.chainId,
                contractAddress: currentCollection.contractAddress,
                collectionName: currentCollection.name,
                collectionImage: currentCollection.image || undefined,
                nftImages: nftImages,
              });
              
              setMintSuccessModalOpen(true);
            }

            // Clear pending tokens after processing
            return [];
          });
        }, 2000); // 2 second debounce
      }
    }

    // Cleanup
    return () => {
      if (mintDebounceRef.current) {
        clearTimeout(mintDebounceRef.current);
      }
    };
  }, [userMints, collection, open]);

  // Reset state when drawer opens
  useEffect(() => {
    if (open && collection) {
      setMintAmount(1);

      // Set default phase to active phase
      if (collection.phases && collection.phases.length > 0) {
        // Find the active phase index
        const activePhaseIndex = collection.phases.findIndex((p) => p.isActive);
        
        // If no active phase found, default to first phase
        const defaultIndex = activePhaseIndex >= 0 ? activePhaseIndex : 0;
        
        setSelectedPhaseIndex(defaultIndex);
      } else {
        setSelectedPhaseIndex(0);
      }
    }
  }, [open, collection]);

  // Fetch user's minted count for current phase
  const fetchUserMintedCount = async () => {
    if (!address || !collection || !collection.phases || collection.phases.length === 0) {
      setUserMintedCount(0);
      return;
    }

    const selectedPhase = collection.phases[selectedPhaseIndex];
    if (!selectedPhase || !selectedPhase.isActive) {
      setUserMintedCount(0);
      return;
    }

    try {
      const { getChainConfig } = await import('@/config/chains');
      const chain = getChainConfig(collection.chainId);

      if (!chain) {
        console.error('Chain not supported:', collection.chainId);
        setUserMintedCount(0);
        return;
      }

      const { ethers } = await import('ethers');
      const OddsLaunchpadABI = (await import('@/../abi/OddsLaunchpad.json')).default;
      const { makeRpcUrlAbsolute } = await import('@/lib/rpc-proxy');

      // Make sure the URL is absolute for ethers.js
      const rpcUrl = makeRpcUrlAbsolute(chain.rpcUrl);

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(collection.contractAddress, OddsLaunchpadABI, provider);

      const contractPhaseId = selectedPhase.phaseIndex ?? selectedPhaseIndex;
      const mintedCount = await contract.getUserMintedInPhase(contractPhaseId, address);
      const mintedCountNumber = Number(mintedCount);

      setUserMintedCount(mintedCountNumber);
      console.log(`👤 User minted: ${mintedCountNumber} NFTs in phase ${contractPhaseId}`);
    } catch (error) {
      console.error('Failed to fetch user minted count:', error);
      setUserMintedCount(0);
    }
  };

  // Check if user is eligible for current phase
  const checkEligibility = async () => {
    if (!address || !collection || !collection.phases || collection.phases.length === 0) {
      setIsEligible(true); // Default to eligible if no wallet or no phases
      return;
    }

    const selectedPhase = collection.phases[selectedPhaseIndex];
    if (!selectedPhase || !selectedPhase.isActive) {
      setIsEligible(true);
      return;
    }

    // If phase doesn't require whitelist, everyone is eligible
    if (!selectedPhase.requiresWhitelist) {
      setIsEligible(true);
      return;
    }

    try {
      setCheckingEligibility(true);
      
      // Use contract phase ID for whitelist API
      const contractPhaseId = selectedPhase.phaseIndex ?? selectedPhaseIndex;
      const proofResponse = await fetch(
        `/api/whitelist/proof?contractAddress=${collection.contractAddress}&phaseId=${contractPhaseId}&address=${address}`
      );
      const proofResult = await proofResponse.json();

      if (proofResult.success && proofResult.data.isWhitelisted) {
        setIsEligible(true);
      } else {
        setIsEligible(false);
      }
    } catch (error) {
      console.error('Failed to check eligibility:', error);
      setIsEligible(false);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Fetch user minted count when drawer opens or phase changes
  useEffect(() => {
    if (open && address && collection) {
      fetchUserMintedCount();
    }
  }, [open, address, selectedPhaseIndex, collection?.contractAddress]);

  // Check eligibility when drawer opens or phase changes
  useEffect(() => {
    if (open && address && collection) {
      checkEligibility();
    } else if (!address) {
      // Reset eligibility when wallet disconnects
      setIsEligible(true);
    }
  }, [open, address, selectedPhaseIndex, collection?.contractAddress]);

  // Calculate countdown status
  useEffect(() => {
    if (!collection || !collection.phases || collection.phases.length === 0) {
      setCountdownStatus('no-phase');
      return;
    }

    const selectedPhase = collection.phases[selectedPhaseIndex];

    if (!selectedPhase || !selectedPhase.isActive) {
      setCountdownStatus('no-phase');
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const startTime = new Date(selectedPhase.startTime).getTime();

      // Check if minted out
      if (selectedPhase.mintedCount >= selectedPhase.totalLimit) {
        setCountdownStatus('minted-out');
        clearInterval(timer);
        return;
      }

      // Check if before start time
      if (now < startTime) {
        setCountdownStatus('before-start');
        return;
      }

      // Check if endTime is null first
      if (!selectedPhase.endTime) {
        // No end date = mint forever
        setCountdownStatus('active');
        return;
      }

      const endTime = new Date(selectedPhase.endTime).getTime();
      const distance = endTime - now;

      // Check if endTime is very far in the future (e.g., year 2100+)
      const isFarFuture = endTime > new Date('2100-01-01').getTime();

      if (isFarFuture) {
        // Far future = mint forever
        setCountdownStatus('active');
      } else if (distance <= 0) {
        setCountdownStatus('ended');
        clearInterval(timer);
      } else {
        setCountdownStatus('active');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [collection, selectedPhaseIndex, open]);

  const handleMint = async () => {
    if (!collection) return;

    if (!collection.phases || collection.phases.length === 0) {
      toast.error('No mint phases available', { id: TOAST_ID });
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first', { id: TOAST_ID });
      return;
    }

    const selectedPhase = collection.phases[selectedPhaseIndex];

    if (!selectedPhase || !selectedPhase.isActive) {
      toast.error('Selected phase is not active', { id: TOAST_ID });
      return;
    }

    // Check if user is eligible
    if (!isEligible) {
      toast.error('You are not eligible to mint in this phase', {
        description: 'This phase requires whitelist and you are not whitelisted'
      , id: TOAST_ID });
      return;
    }

    // Validate max per wallet
    if (selectedPhase.maxPerWallet && mintAmount > selectedPhase.maxPerWallet) {
      toast.error(`Maximum ${selectedPhase.maxPerWallet} NFTs per wallet for this phase`, { id: TOAST_ID });
      return;
    }

    // Validate remaining mints for user
    const remainingMints = selectedPhase.maxPerWallet
      ? Math.max(0, selectedPhase.maxPerWallet - userMintedCount)
      : Infinity;

    if (remainingMints === 0) {
      toast.error('You have already minted the maximum allowed for this phase', { id: TOAST_ID });
      return;
    }

    if (mintAmount > remainingMints) {
      toast.error(`You can only mint ${remainingMints} more NFT(s, { id: TOAST_ID }) in this phase`);
      return;
    }

    // Validate mint amount is positive
    if (mintAmount < 1) {
      toast.error('Mint amount must be at least 1', { id: TOAST_ID });
      return;
    }

    setMinting(true);

    const loadingToast = toast.loading('Processing mint transaction...', { id: TOAST_ID });

    try {
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();

      // Check if user is on wrong network and auto-switch
      if (currentChainId !== collection.chainId) {
        toast.loading(`Switching to ${collection.collection}...`, {  id: loadingToast , id: TOAST_ID });

        try {
          await switchChain({ chainId: collection.chainId });
          toast.loading('Network switched! Preparing mint...', {  id: loadingToast , id: TOAST_ID });

          // Wait for the network to fully switch
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 500));

            if (window.ethereum) {
              try {
                const { ethers } = await import('ethers');
                const provider = new ethers.BrowserProvider(window.ethereum as any);
                const network = await provider.getNetwork();
                const providerChainId = Number(network.chainId);

                if (providerChainId === collection.chainId) {
                  console.log('✅ Network fully switched to:', providerChainId);
                  break;
                }
              } catch (e) {
                console.log('Waiting for network switch...', attempts);
              }
            }

            attempts++;
          }

          if (attempts >= maxAttempts) {
            toast.dismiss(loadingToast);
            toast.error('Network switch timeout', {
              id: TOAST_ID,
              description: 'Please try again or switch network manually'
            });
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (switchError: any) {
          toast.dismiss(loadingToast);

          if (switchError.message?.includes('User rejected')) {
            toast.error('Network switch was rejected', {
              description: `Please switch to ${collection.collection} manually to continue`,
              id: TOAST_ID
            });
          } else {
            toast.error('Failed to switch network', {
              id: TOAST_ID,
              description: switchError.message || 'Please switch network manually'
            });
          }
          return;
        }
      }

      // Get user's wallet address
      let userAddress: string | null = null;
      if (window.ethereum) {
        const accounts = await (window.ethereum as any).request({
          method: 'eth_accounts',
        });
        userAddress = accounts[0] || null;
      }

      if (!userAddress) {
        toast.dismiss(loadingToast);
        toast.error('Wallet address not found', { id: TOAST_ID });
        return;
      }

      // Check if phase requires whitelist and get merkle proof
      let merkleProof: string[] = [];
      const contractPhaseId = selectedPhase.phaseIndex ?? selectedPhaseIndex;

      console.log('🔍 Checking whitelist requirement:', {
        requiresWhitelist: selectedPhase.requiresWhitelist,
        phaseType: selectedPhase.phaseType,
        phaseName: selectedPhase.name,
        selectedPhase: selectedPhase
      });

      // Force check for ALLOWLIST phase type as fallback
      const needsWhitelist = selectedPhase.requiresWhitelist || selectedPhase.phaseType === 'ALLOWLIST';
      console.log('🔍 Needs whitelist:', needsWhitelist);

      if (needsWhitelist) {
        console.log('📋 Fetching merkle proof...');
        toast.loading('Checking whitelist...', {  id: loadingToast , id: TOAST_ID });

        try {
          const proofUrl = `/api/whitelist/proof?contractAddress=${collection.contractAddress}&phaseId=${contractPhaseId}&address=${userAddress}`;
          console.log('📋 Proof URL:', proofUrl);

          const proofResponse = await fetch(proofUrl);
          const proofResult = await proofResponse.json();

          console.log('📋 Proof result:', proofResult);

          if (!proofResult.success) {
            console.error('❌ Proof fetch failed:', proofResult.error);
            toast.dismiss(loadingToast);
            toast.error('Failed to get whitelist proof', {
              id: TOAST_ID,
              description: proofResult.error
            });
            return;
          }

          if (!proofResult.data.isWhitelisted) {
            console.error('❌ Not whitelisted');
            toast.dismiss(loadingToast);
            toast.error('You are not whitelisted for this phase', { id: TOAST_ID });
            return;
          }

          merkleProof = proofResult.data.proof;
          console.log('✅ Merkle proof obtained:', merkleProof);
          console.log('✅ Proof length:', merkleProof.length);
          console.log('✅ Allocation:', proofResult.data.allocation);
        } catch (proofError) {
          console.error('❌ Failed to get merkle proof:', proofError);
          toast.dismiss(loadingToast);
          toast.error('Failed to verify whitelist status', { id: TOAST_ID });
          return;
        }
      } else {
        console.log('ℹ️ Phase does not require whitelist, skipping proof fetch');
      }

      toast.loading('Calculating mint cost...', {  id: loadingToast , id: TOAST_ID });

      console.log('📋 Mint Parameters:');
      console.log('  - Contract Address:', collection.contractAddress);
      console.log('  - Chain ID:', collection.chainId);
      console.log('  - Selected Phase Index:', selectedPhaseIndex);
      console.log('  - Phase Index from API:', selectedPhase.phaseIndex);
      console.log('  - Contract Phase ID (using):', contractPhaseId);
      console.log('  - Mint Amount:', mintAmount);
      console.log('  - Selected Phase:', selectedPhase);
      console.log('  - All Phases:', collection.phases);

      const cost = await contractService.calculateMintCost(
        collection.chainId,
        collection.contractAddress,
        contractPhaseId,
        mintAmount
      );

      if (!cost) {
        toast.dismiss(loadingToast);
        toast.error('Failed to calculate mint cost', { id: TOAST_ID });
        return;
      }

      toast.loading('Please confirm transaction in your wallet...', {  id: loadingToast , id: TOAST_ID });

      const txHash = await contractService.mintNFT(
        collection.chainId,
        collection.contractAddress,
        contractPhaseId,
        mintAmount,
        merkleProof
      );

      toast.dismiss(loadingToast);
      toast.success('Minting successful!', {
        description: `Transaction: ${txHash.slice(0, 10, { id: TOAST_ID })}...${txHash.slice(-8)}`,
        duration: 5000,
      });

      console.log('Mint transaction:', txHash);

      // Store transaction hash for modal
      if (lastMintData) {
        setLastMintData({
          ...lastMintData,
          txHash: txHash,
        });
      }

      // Call success callback
      if (onMintSuccess) {
        onMintSuccess();
      }

      // Close drawer after successful mint
      onClose();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Minting failed:', error);

      if (error.message?.includes('user rejected')) {
        toast.error('Transaction was rejected by user', { id: TOAST_ID });
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds to complete the mint', { id: TOAST_ID });
      } else if (error.message?.includes('Not whitelisted')) {
        toast.error('You are not whitelisted for this phase', { id: TOAST_ID });
      } else if (error.message?.includes('InvalidPhaseId')) {
        toast.error('Invalid Phase Configuration', {
          id: TOAST_ID,
          description: 'The selected phase does not exist in the smart contract.'
        });
      } else if (error.message) {
        toast.error('Minting failed', {
          id: TOAST_ID,
          description: error.message
        });
      } else {
        toast.error('Minting failed. Please try again.', { id: TOAST_ID });
      }
    } finally {
      setMinting(false);
    }
  };

  if (!collection) return null;

  const selectedPhase = collection.phases?.[selectedPhaseIndex];
  const maxPerWallet = selectedPhase?.maxPerWallet || 100;
  const remainingMints = selectedPhase?.maxPerWallet
    ? Math.max(1, maxPerWallet - userMintedCount)
    : 100;

  // Generate phase options for CustomSelect
  const phaseOptions = collection.phases && collection.phases.length > 0
    ? collection.phases.map((phase, index) => ({
        value: index.toString(),
        label: phase.name,
      }))
    : [{ value: '0', label: 'No Phase' }];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="md:max-w-[1000px]"
      height="auto"
      position="bottom"
      showOverlay={false}
    >
      <div className="overflow-visible">
        {/* Body - Horizontal Layout */}
        <div className="flex items-center justify-between px-6 gap-4 py-3 overflow-visible">
          {/* Phase Select */}
          <div className="w-[180px] relative overflow-visible">
            <div className="h-10 rounded-[10px] overflow-visible">
              <CustomSelect
                value={selectedPhaseIndex.toString()}
                onValueChange={(value) => setSelectedPhaseIndex(parseInt(value))}
                options={phaseOptions}
                placeholder="Select Phase"
                containerClassName="w-full h-full rounded-[10px]"
              />
            </div>
          </div>

          {/* Slider */}
          <div className="flex-1 flex items-center gap-4">
            <input
              type="range"
              min="1"
              max={remainingMints}
              value={mintAmount}
              disabled={
                minting || 
                countdownStatus === 'before-start' || 
                countdownStatus === 'ended' || 
                countdownStatus === 'minted-out' ||
                countdownStatus === 'no-phase' ||
                !isEligible ||
                (selectedPhase?.maxPerWallet && userMintedCount >= selectedPhase.maxPerWallet)
              }
              onChange={(e) => setMintAmount(parseInt(e.target.value))}
              className="flex-1 h-2 bg-[#1E1F22] rounded-full appearance-none cursor-pointer slider-thumb disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #0BFF75 0%, #0BFF75 ${((mintAmount - 1) / (remainingMints - 1 || 1)) * 100
                  }%, #1E1F22 ${((mintAmount - 1) / (remainingMints - 1 || 1)) * 100}%, #1E1F22 100%)`,
              }}
            />
          </div>

          {/* Quantity Display with +/- */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMintAmount(Math.max(1, mintAmount - 1))}
              disabled={
                minting || 
                countdownStatus === 'before-start' || 
                countdownStatus === 'ended' || 
                countdownStatus === 'minted-out' ||
                countdownStatus === 'no-phase' ||
                !isEligible ||
                (selectedPhase?.maxPerWallet && userMintedCount >= selectedPhase.maxPerWallet)
              }
              className="w-8 h-8 flex items-center justify-center text-white text-lg font-medium bg-[#1E192B] border border-[#2F3336] rounded-md hover:bg-[#2D253E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            <div className="text-white text-2xl font-bold font-mono min-w-[50px] text-center">
              {mintAmount}
            </div>
            <button
              onClick={() => setMintAmount(Math.min(remainingMints, mintAmount + 1))}
              disabled={
                minting || 
                countdownStatus === 'before-start' || 
                countdownStatus === 'ended' || 
                countdownStatus === 'minted-out' ||
                countdownStatus === 'no-phase' ||
                !isEligible ||
                (selectedPhase?.maxPerWallet && userMintedCount >= selectedPhase.maxPerWallet)
              }
              className="w-8 h-8 flex items-center justify-center text-white text-lg font-medium bg-[#1E192B] border border-[#2F3336] rounded-md hover:bg-[#2D253E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>

          {/* Buy Button */}
          <button
            onClick={handleMint}
            disabled={
              minting || 
              countdownStatus === 'before-start' || 
              countdownStatus === 'ended' || 
              countdownStatus === 'minted-out' ||
              countdownStatus === 'no-phase' ||
              !isEligible ||
              (selectedPhase?.maxPerWallet && userMintedCount >= selectedPhase.maxPerWallet)
            }
            title={
              countdownStatus === 'before-start' ? 'Mint has not started yet' :
              countdownStatus === 'ended' ? 'Mint has ended' :
              countdownStatus === 'minted-out' ? 'Sold out' :
              countdownStatus === 'no-phase' ? 'No active mint phase' :
              !isEligible ? 'You are not eligible for this phase' :
              (selectedPhase?.maxPerWallet && userMintedCount >= selectedPhase.maxPerWallet) ? 'You have reached the maximum mint limit' :
              ''
            }
            className="relative w-[220px] h-10 border border-[#2F3336] rounded-[10px] overflow-hidden group hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-[#B392F0]"></div>
            {minting ? (
              <div className="relative z-10 flex items-center gap-2 justify-center">
                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span className="text-black text-base font-bold font-mono">Minting...</span>
              </div>
            ) : countdownStatus === 'before-start' ? (
              <span className="relative z-10 text-black text-base font-bold font-mono">
                Not Started
              </span>
            ) : countdownStatus === 'ended' ? (
              <span className="relative z-10 text-black text-base font-bold font-mono">
                Mint Ended
              </span>
            ) : countdownStatus === 'minted-out' ? (
              <span className="relative z-10 text-black text-base font-bold font-mono">
                Sold Out
              </span>
            ) : countdownStatus === 'no-phase' ? (
              <span className="relative z-10 text-black text-base font-bold font-mono">
                No Active Phase
              </span>
            ) : !isEligible ? (
              <span className="relative z-10 text-black text-base font-bold font-mono">
                Not Eligible
              </span>
            ) : (selectedPhase?.maxPerWallet && userMintedCount >= selectedPhase.maxPerWallet) ? (
              <span className="relative z-10 text-black text-base font-bold font-mono">
                Max Minted
              </span>
            ) : (
              <span className="relative z-10 text-black text-base font-bold font-mono">
                {parseFloat(selectedPhase?.price || '0') === 0 
                  ? `Mint ${mintAmount} - FREE`
                  : `Buy ${mintAmount} for ${(parseFloat(selectedPhase?.price || '0') * mintAmount).toFixed(4)} ETH`
                }
              </span>
            )}
          </button>
          <button
            onClick={onClose}
            className="relative bg-[#2F3336] w-[120px] h-10 border border-[#2F3336] rounded-[10px] overflow-hidden group hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
        <div className='flex items-center px-6 gap-4 pb-3'>
          <span>{collection.name}</span> 
          <span className='text-xs text-[#6A7282]'>|</span>
          
          {/* Status Indicator */}
          {countdownStatus === 'before-start' && (
            <span className='text-xs text-[#FFA500] font-semibold'>⏳ Mint Not Started</span>
          )}
          {countdownStatus === 'minted-out' && (
            <span className='text-xs text-[#F87683] font-semibold'>🔥 Sold Out</span>
          )}
          {countdownStatus === 'ended' && (
            <span className='text-xs text-[#F87683] font-semibold'>⏰ Mint Ended</span>
          )}
          {countdownStatus === 'no-phase' && (
            <span className='text-xs text-[#857F94] font-semibold'>No Active Phase</span>
          )}
          {countdownStatus === 'active' && (
            <>
              {checkingEligibility ? (
                <span className='text-xs text-[#6A7282]'>Checking eligibility...</span>
              ) : isEligible ? (
                <span className='text-xs text-[#0BFF75]'>✓ Eligible</span>
              ) : (
                <span className='text-xs text-[#FF0B0B]'>✗ Not Eligible</span>
              )}
            </>
          )}
          
          <span className='text-xs text-[#6A7282]'>|</span>
          <span className='text-xs text-[#6A7282]'>Gas ${gasPrice} GWEI</span>
          <span className='text-xs text-[#6A7282]'>|</span>
          <span className='text-xs text-[#6A7282]'>Platform Fee: {platformFee} ETH</span>
        </div>
      </div>

      {/* Mint Success Modal */}
      {lastMintData && (
        <MintSuccessModal
          open={mintSuccessModalOpen}
          onClose={() => setMintSuccessModalOpen(false)}
          mintData={lastMintData}
        />
      )}
    </Drawer>
  );
}


