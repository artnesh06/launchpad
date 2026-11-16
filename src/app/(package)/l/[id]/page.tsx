"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import Link from 'next/link';
import { ipfsToHttp } from '@/lib/ipfs-utils';
import { getChainName, SUPPORTED_CHAINS } from '@/config/chains';
import { toast } from 'sonner';
import { NetworkGuard, useNetworkGuard } from '@/components/network-guard';
import { CollectionData } from '@/types/collection';
import InfoModal from '@/components/modal/info-modal';
import { formatAddress } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';
import { useLaunchpadSocket } from '@/hooks/useLaunchpadSocket';
import { useWalletMint } from '@/hooks/useWalletMint';
import { MintAnimation } from '@/components/mint-animation';
import { MintSuccessModal } from '@/components/modal/mint-success-modal';
import { triggerConfetti } from '@/lib/confetti';
import { AnimatedCounter } from '@/components/animated-counter';
import { TOAST_ID } from '@/constants/toast-ids';
import { getContractAddressFromSlug } from '@/constants/collection-slugs';

function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // Resolve slug to contract address
  const contractAddress = getContractAddressFromSlug(params.id as string);
  const { isConnected, address } = useAccount();
  const { switchChain } = useSwitchChain();
  const currentChainId = useChainId();
  const [mintAmount, setMintAmount] = useState(1);
  const [copied, setCopied] = useState(false);
  const [collection, setCollection] = useState<CollectionData | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [countdownStatus, setCountdownStatus] = useState<'before-start' | 'active' | 'ended' | 'minted-out' | 'no-phase'>('no-phase');
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  // Persist selected phase index in localStorage
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`selectedPhase_${contractAddress}`);
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });

  // Save to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`selectedPhase_${contractAddress}`, selectedPhaseIndex.toString());
    }
  }, [selectedPhaseIndex, contractAddress]);

  // Validate selectedPhaseIndex when collection phases change
  useEffect(() => {
    if (collection?.phases && collection.phases.length > 0) {
      // If selected index is out of bounds, reset to 0
      if (selectedPhaseIndex >= collection.phases.length) {
        console.warn(`Selected phase index ${selectedPhaseIndex} is out of bounds, resetting to 0`);
        setSelectedPhaseIndex(0);
      }
    }
  }, [collection?.phases?.length]);
  const [infoModal, setInfoModal] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState(false);
  const [userMintedCount, setUserMintedCount] = useState<number>(0);
  const [loadingUserMints, setLoadingUserMints] = useState(false);
  const [lastMintTime, setLastMintTime] = useState<number>(0);
  const [isEligible, setIsEligible] = useState<boolean>(true);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [contractNotDeployed, setContractNotDeployed] = useState<boolean>(false);
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
  const [pendingMintTokenIds, setPendingMintTokenIds] = useState<string[]>([]);
  const mintDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [progressAnimating, setProgressAnimating] = useState(false);
  const prevMintedCountRef = useRef<number>(0);
  const processedTokenIdsRef = useRef<Set<string>>(new Set()); // Track processed tokens to prevent duplicates
  const lastProcessedBatchRef = useRef<string>(''); // Track last processed batch by timestamp
  const modalClosedByUserRef = useRef<boolean>(false); // Track if user manually closed modal
  const currentMintSessionRef = useRef<number>(0); // Track current mint session to prevent mixing events
  const mintSuccessModalOpenRef = useRef<boolean>(false); // Track modal open state for callbacks
  
  // Latest mints state (for all users, not just current wallet)
  const [latestMints, setLatestMints] = useState<Array<{
    tokenId: string;
    minter: string;
    imageUrl: string;
    timestamp: Date;
    animationState: 'entering' | 'visible';
  }>>([]);

  // Network guard hook
  const { isWrongNetwork, detectedChainId } = useNetworkGuard(
    undefined,
    contractAddress
  );

  // WebSocket hook for real-time updates
  const { totalMinted, mintedPercent, recentMints, activePhase, phaseProgress, isConnected: wsConnected } = useLaunchpadSocket({
    contractAddress: contractAddress,
    enabled: true,
  });

  // Wallet mint hook for user's own mints animation
  const { userMints, mintCount, showAnimation } = useWalletMint({
    walletAddress: address,
    contractAddress: contractAddress,
    enabled: isConnected,
  });

  // Refs to hold latest values for setTimeout callback (avoid stale closure)
  const userMintsRef = useRef(userMints);
  const collectionRef = useRef(collection);

  // Sync modal open state to ref for use in callbacks
  useEffect(() => {
    mintSuccessModalOpenRef.current = mintSuccessModalOpen;
  }, [mintSuccessModalOpen]);

  // Listen to user mints and show success modal with debounce for batch mints
  useEffect(() => {
    // Update refs with latest values
    userMintsRef.current = userMints;
    collectionRef.current = collection;

    // CRITICAL: If user manually closed the modal, don't process any more events
    if (modalClosedByUserRef.current) {
      console.log('[Modal Debug] Modal was closed by user, ignoring new mint events');
      return;
    }

    if (userMints.length > 0 && collection) {
      // Find all new mints (entering state) that haven't been processed yet
      const newMints = userMints.filter(mint => 
        mint.animationState === 'entering' && 
        !processedTokenIdsRef.current.has(mint.tokenId)
      );

      if (newMints.length > 0) {
        console.log('[Modal Debug] New mints entering:', newMints.map(m => m.tokenId));

        // Mark these tokens as processed immediately to prevent duplicates
        newMints.forEach(mint => processedTokenIdsRef.current.add(mint.tokenId));

        // If modal is already open AND not closed by user, update the existing lastMintData with new tokens
        if (mintSuccessModalOpen && !modalClosedByUserRef.current) {
          console.log('[Modal Debug] Modal already open, adding new tokens to existing modal');
          const newTokenIds = newMints.map(m => m.tokenId);
          
          setLastMintData(prev => {
            if (!prev) return prev;
            
            // Add new token IDs that aren't already in the list
            const updatedTokenIds = [...prev.tokenIds];
            const updatedNftImages = [...(prev.nftImages || [])];
            
            newMints.forEach(mint => {
              if (!updatedTokenIds.includes(mint.tokenId)) {
                updatedTokenIds.push(mint.tokenId);
                // Add the NFT image data for the new mint
                updatedNftImages.push({
                  tokenId: mint.tokenId,
                  imageUrl: mint.imageUrl
                });
              }
            });
            
            console.log('[Modal Debug] Updated token IDs in modal:', updatedTokenIds);
            console.log('[Modal Debug] Updated NFT images in modal:', updatedNftImages);
            
            return {
              ...prev,
              tokenIds: updatedTokenIds,
              quantity: updatedTokenIds.length,
              nftImages: updatedNftImages,
            };
          });
        } else if (!mintSuccessModalOpen && !modalClosedByUserRef.current) {
          // Modal not open yet and not closed by user, add to pending list
          const newTokenIds = newMints.map(m => m.tokenId);
          
          setPendingMintTokenIds(prev => {
            const filtered = newTokenIds.filter(id => !prev.includes(id));
            
            if (filtered.length > 0) {
              console.log('[Modal Debug] Adding token IDs to pending:', filtered);
              return [...prev, ...filtered];
            }
            return prev;
          });

          // Clear existing debounce timer
          if (mintDebounceRef.current) {
            clearTimeout(mintDebounceRef.current);
            mintDebounceRef.current = null;
          }

          // Set debounce timer - wait 500ms for first batch before showing modal
          // Shorter delay for better UX - modal opens quickly with first NFT
          mintDebounceRef.current = setTimeout(() => {
            console.log('[Modal Debug] Debounce timer fired, checking if should open modal...');

            // Double-check: don't open modal if user already closed it
            if (modalClosedByUserRef.current) {
              console.log('[Modal Debug] Modal was closed by user during debounce, aborting');
              setPendingMintTokenIds([]);
              return;
            }

            const currentCollection = collectionRef.current;

            if (!currentCollection) {
              console.log('[Modal Debug] No collection data available');
              return;
            }

            // Use pending token IDs that we collected during the debounce period
            setPendingMintTokenIds(currentPending => {
              console.log('[Modal Debug] Pending token IDs:', currentPending);

              if (currentPending.length > 0 && !modalClosedByUserRef.current) {
                // Check if modal was already opened by handleMint using ref
                if (mintSuccessModalOpenRef.current) {
                  console.log('[Modal Debug] Modal already opened by handleMint, updating with WebSocket data');
                  
                  // Get image URLs from userMints for the pending tokens
                  const currentUserMints = userMintsRef.current;
                  const newNftImages = currentPending.map(tokenId => {
                    const mint = currentUserMints.find(m => m.tokenId === tokenId);
                    return {
                      tokenId,
                      imageUrl: mint?.imageUrl || currentCollection.image || ''
                    };
                  });
                  
                  // Update the token IDs and NFT images in existing modal data
                  setLastMintData(prev => {
                    if (!prev) return prev;
                    
                    const updatedTokenIds = [...prev.tokenIds];
                    currentPending.forEach(tokenId => {
                      if (!updatedTokenIds.includes(tokenId)) {
                        updatedTokenIds.push(tokenId);
                      }
                    });
                    
                    // Merge new NFT images with existing ones, replacing placeholders
                    const updatedNftImages = [...(prev.nftImages || [])];
                    newNftImages.forEach(newImg => {
                      const existingIndex = updatedNftImages.findIndex(
                        img => img.tokenId === newImg.tokenId || img.tokenId.startsWith('pending-')
                      );
                      if (existingIndex >= 0) {
                        // Replace placeholder with actual image
                        updatedNftImages[existingIndex] = newImg;
                      } else {
                        // Add new image
                        updatedNftImages.push(newImg);
                      }
                    });
                    
                    console.log('[Modal Debug] Updated token IDs and images in existing modal:', updatedTokenIds, updatedNftImages);
                    
                    return {
                      ...prev,
                      tokenIds: updatedTokenIds,
                      quantity: updatedTokenIds.length,
                      nftImages: updatedNftImages,
                    };
                  });
                  return [];
                }

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
                  chainId: getChainIdFromName(currentCollection.chain),
                  contractAddress: currentCollection.contractAddress,
                  collectionName: currentCollection.name,
                  collectionImage: currentCollection.image || undefined,
                  nftImages: nftImages,
                });

                console.log('[Modal Debug] Opening modal from WebSocket with tokens:', currentPending);
                setMintSuccessModalOpen(true);
                // Don't set modalClosedByUserRef here - let it be controlled by user action only
              }

              // Clear pending tokens after processing
              return [];
            });
            
            // Clear the timeout ref
            mintDebounceRef.current = null;
          }, 500); // 500ms debounce - fast modal open, then real-time updates
        }
      }
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (mintDebounceRef.current) {
        clearTimeout(mintDebounceRef.current);
        mintDebounceRef.current = null;
      }
    };
  }, [userMints, collection, mintSuccessModalOpen]);

  // Reset processed tokens when modal closes
  useEffect(() => {
    if (!mintSuccessModalOpen) {
      // Mark that user closed the modal
      modalClosedByUserRef.current = true;
      console.log('[Modal Debug] User closed modal, will ignore future events from this mint session');
      
      // Clear any pending debounce timer
      if (mintDebounceRef.current) {
        clearTimeout(mintDebounceRef.current);
        mintDebounceRef.current = null;
        console.log('[Modal Debug] Cleared pending debounce timer');
      }
      
      // Clear pending tokens immediately when modal closes
      setPendingMintTokenIds([]);
      
      // Clear processed tokens after modal closes to allow future mints
      const timer = setTimeout(() => {
        processedTokenIdsRef.current.clear();
        lastProcessedBatchRef.current = '';
        console.log('[Modal Debug] Cleared processed tokens and batch ID');
      }, 3000); // Wait 3 seconds after modal closes
      
      return () => clearTimeout(timer);
    }
  }, [mintSuccessModalOpen]);

  // Fetch collection data
  const fetchCollection = async (showPollingIndicator = false, silent = false) => {
    try {
      if (showPollingIndicator && !silent) {
        setIsPolling(true);
      }

      // Use query parameter endpoint (works without restart)
      const cacheBuster = Date.now();
      const response = await fetch(`/api/admin/launchpads?contractAddress=${contractAddress}&_t=${cacheBuster}`, {
        cache: 'no-store' // Disable Next.js caching
      });
      const result = await response.json();

      if (result.success && result.data.items && result.data.items.length > 0) {
        const launchpad = result.data.items[0];
        const imageUrl = launchpad.metadata?.image ? ipfsToHttp(launchpad.metadata.image) : null;

        // Debug royalty value
        if (!silent) {
          console.log('Raw royaltyPercentage from API:', launchpad.royaltyPercentage);
        }

        // Detect if data changed (untuk debugging progress bar issue)
        if (collection && collection.totalMinted !== launchpad.mintedCount) {
          console.log(`🔄 Mint count changed: ${collection.totalMinted} → ${launchpad.mintedCount}`);
        }

        const collectionData: CollectionData = {
          id: launchpad.id,
          name: launchpad.name || "Unknown Collection",
          creator: launchpad.creator || "Unknown",
          chain: getChainName(launchpad.chainId),
          description: launchpad.description || "No description available",
          image: imageUrl,
          contractAddress: launchpad.contractAddress,
          website: launchpad.metadata?.website || "#",
          twitter: launchpad.metadata?.twitter || "",
          discord: launchpad.metadata?.discord || "",
          sellPrice: `${launchpad.mintPrice || 0} ETH`,
          walletLimit: `${launchpad.mintedCount || 0}/${launchpad.totalMaxSupply || 0}`,
          eligible: true, // TODO: Check from contract or whitelist
          totalSupply: launchpad.totalMaxSupply || 0,
          totalMinted: launchpad.mintedCount || 0,
          airdropPercent: 0, // TODO: Calculate from analytics or remove
          mintedPercent: launchpad.totalMaxSupply > 0
            ? parseFloat(((launchpad.mintedCount / launchpad.totalMaxSupply) * 100).toFixed(2))
            : 0,
          createdAt: launchpad.createdAt ? new Date(launchpad.createdAt) : undefined,
          royalties: launchpad.royaltyPercentage
            ? (() => {
              const value = launchpad.royaltyPercentage > 100
                ? launchpad.royaltyPercentage / 100
                : launchpad.royaltyPercentage;
              // Jika desimal adalah 0, tampilkan sebagai integer
              return value % 1 === 0 ? value.toString() : value.toFixed(1);
            })()
            : "0",
          phases: launchpad.phases || []
        };

        if (!silent) {
          console.log('Processed royalties:', collectionData.royalties);
          console.log('Phases from API:', launchpad.phases);
          console.log('Phases with IDs:', collectionData.phases?.map(p => ({ name: p.name, id: (p as any).id })));
        }

        setCollection(collectionData);

        // Check if contract is deployed on blockchain (async, non-blocking)
        if (!silent) {
          // Run contract check in background without blocking
          (async () => {
            const chainId = getChainIdFromName(collectionData.chain);
            const { getChainConfig } = await import('@/config/chains');
            const chain = getChainConfig(chainId);

            if (chain) {
              try {
                const { ethers } = await import('ethers');
                const { makeRpcUrlAbsolute } = await import('@/lib/rpc-proxy');
                // Make sure the URL is absolute for ethers.js
                const rpcUrl = makeRpcUrlAbsolute(chain.rpcUrl);
                const provider = new ethers.JsonRpcProvider(rpcUrl);
                const code = await provider.getCode(collectionData.contractAddress);

                if (code === '0x') {
                  console.warn('⚠️ Contract not deployed at this address');
                  setContractNotDeployed(true);
                } else {
                  setContractNotDeployed(false);
                }
              } catch (e) {
                console.warn('⚠️ Failed to check contract deployment:', e);
              }
            }
          })();
        }

        // Set default selected phase to the first active phase (only on initial load when no saved preference)
        if (collectionData.phases && collectionData.phases.length > 0 && !collection) {
          // Only set default if no saved preference exists
          const savedPhase = typeof window !== 'undefined'
            ? localStorage.getItem(`selectedPhase_${contractAddress}`)
            : null;

          if (!savedPhase) {
            const activePhaseIndex = collectionData.phases.findIndex(p => p.isActive);
            setSelectedPhaseIndex(activePhaseIndex >= 0 ? activePhaseIndex : 0);
          }
        }
      } else {
        setError('Collection not found');
        console.warn('Collection not found for address:', contractAddress);
      }
    } catch (error) {
      console.error('Failed to fetch collection:', error);
      if (!silent) {
        setError('Failed to load collection data. Please try again later.');
      }
    } finally {
      if (showPollingIndicator && !silent) {
        setIsPolling(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      await fetchCollection();
      setLoading(false);
      
      // Fetch latest mints in background (non-blocking)
      fetchLatestMints();
    };

    loadInitialData();
  }, [contractAddress]);

  // Fetch latest mints from API
  const fetchLatestMints = async () => {
    try {
      const response = await fetch(`/api/admin/launchpads/${contractAddress}/latest-mints?limit=10`);
      const result = await response.json();
      
      if (result.success && result.data?.mints) {
        setLatestMints(result.data.mints.map((mint: any) => ({
          tokenId: mint.tokenId,
          minter: mint.minter,
          imageUrl: mint.imageUrl || '',
          timestamp: new Date(mint.timestamp),
          animationState: 'visible' as const,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch latest mints:', error);
    }
  };

  // Adaptive polling: lebih cepat setelah mint, normal setelah 30 detik
  useEffect(() => {
    const getPollingInterval = () => {
      const timeSinceLastMint = Date.now() - lastMintTime;
      // Jika baru saja mint (dalam 30 detik terakhir), poll setiap 3 detik
      // Jika tidak, poll setiap 15 detik
      return timeSinceLastMint < 30000 ? 3000 : 15000;
    };

    const setupPolling = () => {
      const interval = getPollingInterval();
      console.log(`🔄 Setting up polling with ${interval}ms interval`);

      const pollingInterval = setInterval(() => {
        console.log('🔄 Polling collection data...');
        fetchCollection(false, true); // Silent polling - no indicator, no toast
      }, interval);

      return pollingInterval;
    };

    const pollingInterval = setupPolling();

    // Re-setup polling when lastMintTime changes
    return () => clearInterval(pollingInterval);
  }, [contractAddress, lastMintTime]);

  useEffect(() => {
    if (!collection || !collection.phases || collection.phases.length === 0) {
      setCountdownStatus('no-phase');
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const selectedPhase = collection.phases[selectedPhaseIndex];

    if (!selectedPhase || !selectedPhase.isActive) {
      setCountdownStatus('no-phase');
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const startTime = new Date(selectedPhase.startTime).getTime();

      // Check if minted out
      if (collection.totalMinted >= collection.totalSupply) {
        setCountdownStatus('minted-out');
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }

      // Check if before start time
      if (now < startTime) {
        const distanceToStart = startTime - now;
        setCountdownStatus('before-start');
        setCountdown({
          days: Math.floor(distanceToStart / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distanceToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distanceToStart % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distanceToStart % (1000 * 60)) / 1000)
        });
        return;
      }

      // Check if endTime is null first
      if (!selectedPhase.endTime) {
        // No end date = mint forever
        setCountdownStatus('active');
        setCountdown({ days: 999, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const endTime = new Date(selectedPhase.endTime).getTime();
      const distance = endTime - now;

      // Check if endTime is very far in the future (e.g., year 2100+)
      const isFarFuture = endTime > new Date('2100-01-01').getTime();

      if (isFarFuture) {
        // Far future = mint forever
        setCountdownStatus('active');
        setCountdown({ days: 999, hours: 0, minutes: 0, seconds: 0 });
      } else if (distance <= 0) {
        setCountdownStatus('ended');
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        setCountdownStatus('active');
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [collection, selectedPhaseIndex]);

  const handleCopyAddress = () => {
    if (collection) {
      navigator.clipboard.writeText(collection.contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        // Trigger confetti for whitelist eligible (non-public phase)
        triggerConfetti({ duration: 1500 });
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

  // Fetch user's minted count for current phase
  const fetchUserMintedCount = async (showLoading = false) => {
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
      // Only show loading indicator on first load or when explicitly requested
      if (showLoading) {
        setLoadingUserMints(true);
      }

      const chainId = getChainIdFromName(collection.chain);
      const contractPhaseId = selectedPhase.phaseIndex ?? selectedPhaseIndex;

      // Get chain config
      const { getChainConfig } = await import('@/config/chains');
      const chain = getChainConfig(chainId);

      if (!chain) {
        console.error('Chain not supported:', chainId);
        setUserMintedCount(0);
        return;
      }

      // Create provider and contract instance
      const { ethers } = await import('ethers');
      const OddsLaunchpadABI = (await import('@/../abi/OddsLaunchpad.json')).default;

      // Convert relative RPC URL to absolute URL for client-side
      const rpcUrl = chain.rpcUrl.startsWith('/')
        ? `${window.location.origin}${chain.rpcUrl}`
        : chain.rpcUrl;

      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Check if contract exists before calling functions
      const code = await provider.getCode(collection.contractAddress);
      if (code === '0x') {
        console.warn('⚠️ Contract not deployed at this address:', collection.contractAddress);
        setUserMintedCount(0);
        return;
      }

      const contract = new ethers.Contract(collection.contractAddress, OddsLaunchpadABI, provider);

      // Call getUserMintedInPhase from contract
      const mintedCount = await contract.getUserMintedInPhase(contractPhaseId, address);
      const mintedCountNumber = Number(mintedCount);

      setUserMintedCount(mintedCountNumber);
      console.log(`👤 User minted: ${mintedCountNumber} NFTs in phase ${contractPhaseId}`);
    } catch (error: any) {
      // Silently handle errors for better UX
      if (error?.message?.includes('could not decode result data')) {
        console.warn('⚠️ Contract function not available or no phases configured');
      } else {
        console.error('Failed to fetch user minted count:', error?.message || error);
      }
      setUserMintedCount(0);
    } finally {
      if (showLoading) {
        setLoadingUserMints(false);
      }
    }
  };

  // Check eligibility when wallet connects or phase changes
  useEffect(() => {
    if (address && collection) {
      checkEligibility();
    } else if (!address) {
      // Reset eligibility when wallet disconnects
      setIsEligible(true);
    }
  }, [address, selectedPhaseIndex, collection?.contractAddress]);

  // Fetch user minted count when wallet connects or phase changes
  useEffect(() => {
    if (address && collection) {
      // Only show loading on first fetch (when userMintedCount is 0 and not yet loaded)
      const isFirstLoad = userMintedCount === 0 && !loadingUserMints;
      fetchUserMintedCount(isFirstLoad);
    } else if (!address) {
      // Reset count when wallet disconnects
      setUserMintedCount(0);
      setLoadingUserMints(false);
    }
  }, [address, selectedPhaseIndex, collection?.contractAddress]);

  // Handle real-time updates from WebSocket - refresh data from API when mint event received
  useEffect(() => {
    if (recentMints.length > 0 && collection) {
      const latestMint = recentMints[0];
      
      // Check if this is a new mint (not already processed)
      const isNewMint = !latestMints.some(
        m => m.tokenId === latestMint.tokenId && m.minter === latestMint.minter
      );
      
      if (isNewMint) {
        console.log(`🔄 New mint detected via WebSocket, refreshing data...`);
        
        // Trigger progress bar animation
        setProgressAnimating(true);
        setTimeout(() => setProgressAnimating(false), 1000);
        
        // Refresh collection data from API (includes updated totalMinted)
        fetchCollection(false, true);
        
        // Add to latestMints with collection image first, then fetch actual NFT image
        const newMint = {
          tokenId: latestMint.tokenId,
          minter: latestMint.minter,
          imageUrl: collection?.image || '', // Use collection image as placeholder
          timestamp: latestMint.timestamp,
          animationState: 'entering' as const,
        };
        
        setLatestMints(prev => [newMint, ...prev].slice(0, 20));
        
        // Fetch actual NFT image
        fetchNftImage(latestMint.tokenId, latestMint.minter);
        
        // Transition to visible after animation
        setTimeout(() => {
          setLatestMints(current =>
            current.map(mint =>
              mint.tokenId === newMint.tokenId && mint.minter === newMint.minter
                ? { ...mint, animationState: 'visible' }
                : mint
            )
          );
        }, 500);
      }
    }
  }, [recentMints]);

  // Trigger progress animation when totalMinted changes
  useEffect(() => {
    if (collection && prevMintedCountRef.current !== collection.totalMinted) {
      // Skip animation on initial load
      if (prevMintedCountRef.current !== 0) {
        setProgressAnimating(true);
        setTimeout(() => setProgressAnimating(false), 1000);
      }
      prevMintedCountRef.current = collection.totalMinted;
    }
  }, [collection?.totalMinted]);

  // Fetch NFT image for a specific token
  const fetchNftImage = async (tokenId: string, minter: string) => {
    try {
      const response = await fetch(`/api/nft/${params.id}/${tokenId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.nft) {
          const nft = result.data.nft;
          
          // Import utilities dynamically
          const { resolveImagePath, ipfsToHttp } = await import('@/lib/ipfs-utils');
          
          // Get raw image URL
          const rawImageUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl;
          
          // Resolve relative paths using tokenUri
          const resolvedImageUrl = resolveImagePath(rawImageUrl, nft.tokenUri);
          
          // Convert to HTTP URL
          const imageUrl = resolvedImageUrl ? ipfsToHttp(resolvedImageUrl) : null;
          
          if (imageUrl) {
            setLatestMints(current =>
              current.map(mint =>
                mint.tokenId === tokenId && mint.minter === minter
                  ? { ...mint, imageUrl }
                  : mint
              )
            );
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch NFT image for token ${tokenId}:`, error);
    }
  };

  // Fetch NFT images from transaction receipt
  const fetchNftImagesFromTx = async (txHash: string, contractAddress: string, chainId: number, expectedQuantity: number) => {
    try {
      console.log('[NFT Fetch] Fetching NFT images from transaction:', txHash);
      
      const { ethers } = await import('ethers');
      const { getChainConfig } = await import('@/config/chains');
      const chain = getChainConfig(chainId);
      
      if (!chain) {
        console.error('[NFT Fetch] Chain not supported:', chainId);
        return [];
      }

      const { makeRpcUrlAbsolute } = await import('@/lib/rpc-proxy');
      const rpcUrl = makeRpcUrlAbsolute(chain.rpcUrl);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Get transaction receipt to find Transfer events
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        console.error('[NFT Fetch] No receipt found for tx:', txHash);
        return [];
      }

      // Parse Transfer events to get token IDs
      // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
      const transferEventSignature = ethers.id('Transfer(address,address,uint256)');
      
      const tokenIds: string[] = [];
      for (const log of receipt.logs) {
        if (log.topics[0] === transferEventSignature && log.address.toLowerCase() === contractAddress.toLowerCase()) {
          // Token ID is the 3rd topic (indexed parameter)
          const tokenId = ethers.toBigInt(log.topics[3]).toString();
          tokenIds.push(tokenId);
        }
      }

      console.log('[NFT Fetch] Found token IDs from transaction:', tokenIds);

      // Fetch images for each token ID
      const nftImages = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            const response = await fetch(`/api/nft/${contractAddress}/${tokenId}`);
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data?.nft) {
                const nft = result.data.nft;
                
                // Import utilities dynamically
                const { resolveImagePath, ipfsToHttp } = await import('@/lib/ipfs-utils');
                
                // Get raw image URL
                const rawImageUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl;
                
                // Resolve relative paths using tokenUri
                const resolvedImageUrl = resolveImagePath(rawImageUrl, nft.tokenUri);
                
                // Convert to HTTP URL
                const imageUrl = resolvedImageUrl ? ipfsToHttp(resolvedImageUrl) : null;
                
                return {
                  tokenId,
                  imageUrl: imageUrl || collection?.image || ''
                };
              }
            }
            
            // Fallback to collection image if fetch fails
            return {
              tokenId,
              imageUrl: collection?.image || ''
            };
          } catch (error) {
            console.error(`[NFT Fetch] Failed to fetch image for token ${tokenId}:`, error);
            return {
              tokenId,
              imageUrl: collection?.image || ''
            };
          }
        })
      );

      console.log('[NFT Fetch] Fetched NFT images:', nftImages);
      return nftImages;
    } catch (error) {
      console.error('[NFT Fetch] Failed to fetch NFT images from transaction:', error);
      return [];
    }
  };

  const handleMint = async () => {
    if (!collection || !collection.phases || collection.phases.length === 0) {
      toast.error('No mint phase available', { id: TOAST_ID });
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first', { id: TOAST_ID });
      return;
    }

    if (isWrongNetwork) {
      toast.error('Please switch to the correct network first', { id: TOAST_ID });
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
        id: TOAST_ID,
        description: 'This phase requires whitelist and you are not whitelisted'
      });
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
      toast.error(`You can only mint ${remainingMints} more NFTs in this phase`, { id: TOAST_ID });
      return;
    }

    // Validate mint amount is positive
    if (mintAmount < 1) {
      toast.error('Minimum mint amount is 1', { id: TOAST_ID });
      return;
    }

    // Reset modal closed flag when starting a new mint
    modalClosedByUserRef.current = false;
    currentMintSessionRef.current = Date.now(); // New mint session
    console.log('[Modal Debug] Starting new mint session:', currentMintSessionRef.current);

    setMinting(true);

    // Show loading toast
    toast.loading('Processing mint transaction...', { id: TOAST_ID });

    try {
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();
      const chainId = getChainIdFromName(collection.chain);

      // Check if user is on wrong network and auto-switch
      if (currentChainId !== chainId) {
        toast.loading(`Switching to ${collection.chain}...`, { id: TOAST_ID });

        try {
          await switchChain({ chainId: chainId });
          toast.loading('Network switched! Preparing mint...', { id: TOAST_ID });

          // Wait for the network to fully switch and verify
          let attempts = 0;
          const maxAttempts = 10;

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if provider has switched
            if (window.ethereum) {
              try {
                const { ethers } = await import('ethers');
                const provider = new ethers.BrowserProvider(window.ethereum as any);
                const network = await provider.getNetwork();
                const providerChainId = Number(network.chainId);

                if (providerChainId === chainId) {
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
            toast.error('Network switch timeout', {
              id: TOAST_ID,
              description: 'Please try again or switch network manually'
            });
            return;
          }

          // Additional small delay to ensure everything is ready
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (switchError: any) {
          if (switchError.message?.includes('User rejected')) {
            toast.error('Network switch was rejected', {
              id: TOAST_ID,
              description: `Please switch to ${collection.chain} manually to continue`
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

      // Get user's wallet address from window.ethereum
      let userAddress: string | null = null;
      if (window.ethereum) {
        const accounts = await (window.ethereum as any).request({
          method: 'eth_accounts'
        });
        userAddress = accounts[0] || null;
      }

      if (!userAddress) {
        toast.error('Wallet address not found', { id: TOAST_ID });
        return;
      }

      // Check if phase requires whitelist and get merkle proof
      let merkleProof: string[] = [];
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
        toast.loading('Checking whitelist...', { id: TOAST_ID });

        try {
          // Use contract phase ID for whitelist API (matches smart contract)
          const contractPhaseId = selectedPhase.phaseIndex ?? selectedPhaseIndex;
          const proofUrl = `/api/whitelist/proof?contractAddress=${collection.contractAddress}&phaseId=${contractPhaseId}&address=${userAddress}`;
          console.log('📋 Proof URL:', proofUrl);

          const proofResponse = await fetch(proofUrl);
          const proofResult = await proofResponse.json();

          console.log('📋 Proof result:', proofResult);

          if (!proofResult.success) {
            console.error('❌ Proof fetch failed:', proofResult.error);
            toast.error('Failed to get whitelist proof', {
              id: TOAST_ID,
              description: proofResult.error
            });
            return;
          }

          if (!proofResult.data.isWhitelisted) {
            console.error('❌ Not whitelisted');
            toast.error('You are not whitelisted for this phase', { id: TOAST_ID });
            return;
          }

          merkleProof = proofResult.data.proof;
          console.log('✅ Merkle proof obtained:', merkleProof);
          console.log('✅ Proof length:', merkleProof.length);
          console.log('✅ Allocation:', proofResult.data.allocation);
        } catch (proofError) {
          console.error('❌ Failed to get merkle proof:', proofError);
          toast.error('Failed to verify whitelist status', { id: TOAST_ID });
          return;
        }
      } else {
        console.log('ℹ️ Phase does not require whitelist, skipping proof fetch');
      }

      toast.loading('Calculating mint cost...', { id: TOAST_ID });

      // Use phaseIndex from API if available, otherwise use selectedPhaseIndex
      // Smart contract uses integer index (0-based), not database string ID
      const contractPhaseId = selectedPhase.phaseIndex ?? selectedPhaseIndex;
      console.log('📋 Mint Parameters:');
      console.log('  - Contract Address:', collection.contractAddress);
      console.log('  - Chain ID:', chainId);
      console.log('  - Selected Phase Index:', selectedPhaseIndex);
      console.log('  - Phase Index from API:', selectedPhase.phaseIndex);
      console.log('  - Contract Phase ID (using):', contractPhaseId);
      console.log('  - Mint Amount:', mintAmount);
      console.log('  - Selected Phase:', selectedPhase);
      console.log('  - All Phases:', collection.phases);

      const cost = await contractService.calculateMintCost(
        chainId,
        collection.contractAddress,
        contractPhaseId,
        mintAmount
      );

      if (!cost) {
        toast.error('Failed to calculate mint cost', { id: TOAST_ID });
        return;
      }

      toast.loading('Please confirm transaction in your wallet...', { id: TOAST_ID });

      // Mint with merkle proof using contract phase ID
      const txHash = await contractService.mintNFT(
        chainId,
        collection.contractAddress,
        contractPhaseId,
        mintAmount,
        merkleProof
      );

      // Wait for transaction confirmation before showing success
      toast.loading('Waiting for transaction confirmation...', { id: TOAST_ID });

      try {
        const { ethers } = await import('ethers');
        const { getChainConfig } = await import('@/config/chains');
        const chain = getChainConfig(chainId);
        
        if (chain) {
          const { makeRpcUrlAbsolute } = await import('@/lib/rpc-proxy');
          const rpcUrl = makeRpcUrlAbsolute(chain.rpcUrl);
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Wait for transaction receipt
          const receipt = await provider.waitForTransaction(txHash, 1);
          
          // Check if transaction was successful
          if (receipt && receipt.status === 1) {
            toast.success('Mint successful!', {
              id: TOAST_ID,
              description: `Transaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
              duration: 5000,
            });

            console.log('Mint transaction confirmed:', txHash);

            // Store transaction hash for modal
            if (lastMintData) {
              setLastMintData({
                ...lastMintData,
                txHash: txHash,
              });
            }

            // Set last mint time untuk adaptive polling
            setLastMintTime(Date.now());

            // Check if modal was already opened by WebSocket using ref
            if (mintSuccessModalOpenRef.current) {
              console.log('[Modal Debug] Modal already opened by WebSocket, skipping handleMint modal open');
              // Just update the txHash in existing modal data
              setLastMintData(prev => prev ? { ...prev, txHash } : null);
            } else {
              // WebSocket hasn't opened modal yet, open it from handleMint
              console.log('🎉 Opening mint success modal after confirmation (WebSocket not opened yet)');
              
              // Fetch actual NFT images from transaction in background
              const chainId = getChainIdFromName(collection.chain);
              fetchNftImagesFromTx(txHash, collection.contractAddress, chainId, mintAmount).then(nftImages => {
                if (nftImages.length > 0) {
                  console.log('[NFT Fetch] Updating modal with fetched NFT images');
                  setLastMintData(prev => prev ? { ...prev, nftImages, tokenIds: nftImages.map(img => img.tokenId) } : null);
                }
              });
              
              // Open modal immediately with loading state
              setLastMintData({
                tokenIds: [], // Will be populated after fetch
                quantity: mintAmount,
                txHash: txHash,
                chainId: getChainIdFromName(collection.chain),
                contractAddress: collection.contractAddress,
                collectionName: collection.name,
                collectionImage: collection.image || undefined,
                nftImages: [], // Will be populated after fetch
              });
              setMintSuccessModalOpen(true);
            }
          } else {
            // Transaction failed
            throw new Error('Transaction failed on blockchain');
          }
        }
      } catch (confirmError: any) {
        console.error('Transaction confirmation failed:', confirmError);
        toast.error('Transaction failed', {
          id: TOAST_ID,
          description: 'The transaction was sent but failed on the blockchain',
        });
        return; // Don't open modal if confirmation failed
      }

      // Auto-sync mint menggunakan transaction hash dengan async processing (background)
      const syncMintData = async (): Promise<void> => {
        try {
          console.log(`🔄 Queuing mint sync job in background...`);
          const chainId = getChainIdFromName(collection.chain);

          // Queue the sync job (returns immediately)
          const queueResponse = await fetch('/api/admin/launchpads/sync-mint-tx-async', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              launchpadId: collection.id,
              contractAddress: collection.contractAddress,
              chainId: chainId,
              txHash: txHash
            })
          });

          const queueResult = await queueResponse.json();

          if (!queueResult.success) {
            console.error('❌ Failed to queue sync job:', queueResult.error);
            // Fallback to full data fetch
            await fetchCollection(false, true);
            await fetchUserMintedCount();
            return;
          }

          console.log('✅ Sync job queued, data will be updated via WebSocket');
          
          // Refresh user minted count in background
          await fetchUserMintedCount();
          
          // Verify data consistency after a short delay
          setTimeout(() => {
            console.log('🔄 Verifying data consistency...');
            fetchCollection(false, true);
          }, 3000);

        } catch (syncError) {
          console.error('❌ Failed to sync mint data:', syncError);
          // Fallback: fetch full data
          await fetchCollection(false, true);
          await fetchUserMintedCount();
        }
      };

      // Run sync in background without blocking modal
      syncMintData();
    } catch (error: any) {
      console.error('Minting failed:', error);

      // Show error toast with specific message
      if (error.message?.includes('user rejected')) {
        toast.error('Transaction rejected by user', { id: TOAST_ID });
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds to complete mint', { id: TOAST_ID });
      } else if (error.message?.includes('Not whitelisted')) {
        toast.error('You are not whitelisted for this phase', { id: TOAST_ID });
      } else if (error.message?.includes('InvalidPhaseId')) {
        toast.error('Invalid Phase Configuration', {
          id: TOAST_ID,
          description: 'The selected phase does not exist in the smart contract. Please contact the collection creator to add phases to the contract.',
        });
        console.error('❌ InvalidPhaseId Error Details:');
        console.error('  This means the smart contract has no phases configured.');
        console.error('  Database phases:', collection.phases);
        console.error('  Attempted phase ID:', selectedPhase.phaseIndex ?? selectedPhaseIndex);
        console.error('  Solution: Add phases to the contract using admin panel or contract functions.');
      } else if (error.message) {
        toast.error('Mint failed', {
          id: TOAST_ID,
          description: error.message,
        });
      } else {
        toast.error('Mint failed. Please try again.', { id: TOAST_ID });
      }
    } finally {
      setMinting(false);
    }
  };

  const getChainIdFromName = (chainName: string): number => {
    const chain = Object.values(SUPPORTED_CHAINS).find(
      c => c.name.toLowerCase() === chainName.toLowerCase()
    );
    return chain?.id || 6343;
  };

  if (loading) {
    return (
      <div className="min-h-screen overflow-y-auto overflow-x-hidden relative text-white bg-[#0D0E11]">
        {/* Background */}
        <div className="fixed inset-0 z-0 bg-[#0D0E11]" />

        <div className="relative z-20 max-w-[1000px] mx-auto px-4 py-8 w-full min-h-screen flex items-center justify-center pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-[560px_393px] gap-8 lg:gap-[56px] items-stretch w-full">
            {/* Left Column - Info Skeleton */}
            <div className="w-full order-2 lg:order-1 flex flex-col gap-4">
              {/* Title Skeleton */}
              <div>
                <div className="h-10 lg:h-12 bg-[#1E192B] rounded-lg w-3/4 animate-pulse mb-2" />
                <div className="h-5 bg-[#1E192B] rounded w-48 animate-pulse mb-1" />
                <div className="h-5 bg-[#1E192B] rounded w-32 animate-pulse" />
              </div>

              {/* Description Skeleton */}
              <div className="bg-[#18181B] border border-[#2f3336] p-3 rounded-lg">
                <div className="h-4 bg-[#1E192B] rounded w-full animate-pulse mb-2" />
                <div className="h-4 bg-[#1E192B] rounded w-5/6 animate-pulse mb-2" />
                <div className="h-4 bg-[#1E192B] rounded w-2/3 animate-pulse" />
              </div>

              {/* Phase Select & Countdown Skeleton */}
              <div className="bg-[#18181B] border border-[#2f3336] p-3 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 bg-[#1E192B] rounded-lg w-40 animate-pulse" />
                  <div className="hidden md:flex items-center gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-7 w-10 bg-[#1E192B] rounded animate-pulse" />
                    ))}
                  </div>
                </div>

                {/* Progress Bar Skeleton */}
                <div className="pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="h-4 bg-[#1E192B] rounded w-24 animate-pulse" />
                    <div className="h-4 bg-[#1E192B] rounded w-32 animate-pulse" />
                  </div>
                  <div className="h-[10px] bg-[#2F3336] rounded-[5px] w-full animate-pulse" />
                </div>

                {/* Price Info Skeleton */}
                <div className="pt-4">
                  <div className="bg-[#0D0E11] border border-[#2f3336] p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-3 bg-[#1E192B] rounded w-16 animate-pulse mb-3" />
                        <div className="h-6 bg-[#1E192B] rounded w-20 animate-pulse" />
                      </div>
                      <div className="text-center">
                        <div className="h-3 bg-[#1E192B] rounded w-16 animate-pulse mb-3" />
                        <div className="h-6 bg-[#1E192B] rounded w-12 animate-pulse" />
                      </div>
                      <div className="text-right">
                        <div className="h-3 bg-[#1E192B] rounded w-14 animate-pulse mb-3" />
                        <div className="h-6 bg-[#1E192B] rounded w-10 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mint Controls Skeleton */}
              <div className="mt-auto">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-4 bg-[#1E192B] rounded w-20 animate-pulse" />
                  <div className="h-4 bg-[#1E192B] rounded w-28 animate-pulse" />
                </div>
                <div className="flex flex-row items-stretch gap-2 lg:gap-4">
                  <div className="w-1/2 lg:w-1/3 h-[32px] bg-[#1E192B] rounded-lg animate-pulse" />
                  <div className="w-1/2 lg:w-2/3 h-[32px] bg-[#1E192B] rounded-lg animate-pulse" />
                </div>
              </div>
            </div>

            {/* Right Column - Image Skeleton */}
            <div className="w-full order-1 lg:order-2 flex flex-col justify-between">
              <div className="relative w-full aspect-square lg:aspect-auto lg:w-[393px] lg:h-[393px] rounded-lg overflow-hidden bg-[#1E192B] animate-pulse" />

              {/* Contract Address Skeleton */}
              <div className="mt-4">
                <div className="w-full bg-[#0D0E11] border border-[#2f3336] p-2 rounded-lg flex items-center justify-between">
                  <div className="h-5 bg-[#1E192B] rounded w-40 animate-pulse" />
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-5 w-5 bg-[#1E192B] rounded animate-pulse" />
                    ))}
                  </div>
                </div>
                 <div className="mt-4 w-full h-[32px] bg-[#1E192B] rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-[#0D0E11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
          <div className="text-6xl">🔍</div>
          <h1 className="text-2xl font-bold text-white">
            {error || 'Collection not found'}
          </h1>
          <p className="text-[#857F94] text-sm">
            The collection you're looking for doesn't exist or has been removed.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => router.back()}
              className="bg-[#B392F0] hover:bg-[#B392F0]/90 text-black font-bold"
            >
              Go Back
            </Button>
            <Link href="/">
              <Button
                variant="outline"
                className="border-[#B392F0] text-[#B392F0] hover:bg-[#B392F0]/10"
              >
                Browse Collections
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto overflow-x-hidden relative text-white">
      {/* Background Banner with Blur and Overlay */}
      {collection.image && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center blur-xl"
            style={{
              backgroundImage: `url(${collection.image})`,
            }}
          />
          <div className="absolute inset-0 bg-black/80" />
          {/* Top gradient overlay */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent pointer-events-none" />
          {/* Bottom gradient overlay */}
          <div className="absolute bottom-0 left-0 w-full h-50 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </div>
      )}

      {/* Network Guard Banner */}
      <NetworkGuard contractAddress={params.id as string} />
      <InfoModal collection={collection} isOpen={infoModal} onClose={() => { setInfoModal(false) }} />


      {/* Contract Not Deployed Warning */}
      {contractNotDeployed && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
          <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-yellow-500 font-semibold mb-1">Contract Not Deployed</h3>
              <p className="text-yellow-200 text-sm">
                This collection has not been deployed to the blockchain yet. Minting is currently unavailable. Please contact the collection creator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Polling Indicator */}
      {isPolling && (
        <div className="fixed top-20 right-4 z-50 bg-[#B392F0]/10 border border-[#B392F0] rounded-lg px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-[#B392F0] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[#B392F0] text-sm">Updating data...</span>
        </div>
      )}

      <div className="relative z-20 max-w-[1100px] mx-auto px-4 py-8 w-full min-h-screen flex items-center justify-center pt-20" style={{ marginTop: isWrongNetwork ? '60px' : '0' }}>
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-[560px_393px] gap-8 lg:gap-[56px] items-stretch">
            <div className="w-full order-2 lg:order-1 flex flex-col gap-4">
              <div>
                <h1
                  className="text-2xl lg:text-[42px] font-semibold leading-tight text-white truncate"
                >
                  {collection.name}
                </h1>
                <p className="text-[#B392F0] text-sm leading-[27px]">
                  Created by {formatAddress(collection.creator)}
                </p>
                <p className="text-[#B392F0] text-sm leading-[27px]">
                  Chain: {collection.chain}
                </p>
              </div>

              <div>
                <div className='bg-[#18181B] border border-[#2f3336] p-3 rounded-lg'>
                  <p className="text-white text-sm leading-[22px]">
                    <span className="hidden md:inline">
                      {collection.description.length > 100
                        ? collection.description.substring(0, 100) + '...'
                        : collection.description}
                    </span>
                    <span className="inline md:hidden">
                      {collection.description.length > 65
                        ? collection.description.substring(0, 65) + '...'
                        : collection.description}
                    </span>
                    <span
                      className="ml-2 text-xs md:!text-base cursor-pointer text-[#B392F0]"
                      onClick={() => { setInfoModal(true) }}
                    >
                      more.
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <div className='bg-[#18181B] border border-[#2f3336] p-3 rounded-lg'>
                  {/* Mobile Status Indicator */}
                  <div className="md:hidden mb-3 flex items-center justify-center gap-1">
                    {countdownStatus === 'before-start' && (
                      <>
                        <span className="text-[#B392F0] text-sm leading-[18px] font-semibold">
                          Start in
                        </span>
                        {countdown.days > 0 && (
                          <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                            {countdown.days}d
                          </span>
                        )}
                        {(countdown.hours > 0 || countdown.days > 0) && (
                          <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                            {countdown.hours}h
                          </span>
                        )}
                        {(countdown.minutes > 0 || countdown.hours > 0 || countdown.days > 0) && (
                          <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                            {countdown.minutes}m
                          </span>
                        )}
                        <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                          {countdown.seconds}s
                        </span>
                      </>
                    )}
                    {countdownStatus === 'active' && (
                      countdown.days === 999 ? (
                        <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                          No End Date
                        </span>
                      ) : (
                        <>
                          <span className="text-[#B392F0] text-sm leading-[18px] font-semibold">
                            End in
                          </span>
                          {countdown.days > 0 && (
                            <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                              {countdown.days}d
                            </span>
                          )}
                          {(countdown.hours > 0 || countdown.days > 0) && (
                            <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                              {countdown.hours}h
                            </span>
                          )}
                          {(countdown.minutes > 0 || countdown.hours > 0 || countdown.days > 0) && (
                            <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                              {countdown.minutes}m
                            </span>
                          )}
                          <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                            {countdown.seconds}s
                          </span>
                        </>
                      )
                    )}
                    {countdownStatus === 'minted-out' && (
                      <span className="text-[#0BFF75] text-sm leading-[18px] font-semibold">
                        Minted Out
                      </span>
                    )}
                    {countdownStatus === 'ended' && (
                      <span className="text-[#0BFF75] text-sm leading-[18px] font-semibold">
                        Mint Ended
                      </span>
                    )}
                    {countdownStatus === 'no-phase' && (
                      <span className="text-[#0BFF75] text-sm leading-[18px] font-semibold">
                        No Active Mint
                      </span>
                    )}
                  </div>
                  {!isEligible && isConnected && (
                    <div className="md:hidden mb-3 bg-[#F87683]/10 border border-[#F87683] rounded-lg p-2 flex items-center justify-center gap-2">
                      <span className="text-[#F87683] text-xs font-semibold">
                        ❌ You are not eligible for this phase
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="w-full">
                      <CustomSelect
                        value={selectedPhaseIndex.toString()}
                        onValueChange={(value) => setSelectedPhaseIndex(parseInt(value))}
                        options={
                          collection.phases && collection.phases.length > 0
                            ? collection.phases.map((phase, index) => ({
                              value: index.toString(),
                              label: phase.name,
                              isActive: phase.isActive,
                            }))
                            : [{ value: '0', label: 'No Phase' }]
                        }
                        placeholder="Select Phase"
                        containerClassName="rounded-lg w-full"
                      />
                    </div>
                    <div className="hidden w-full md:flex items-center justify-end gap-2">
                      {countdownStatus === 'before-start' && (
                        <div className="flex items-center gap-1">
                          <span className="text-[#B392F0] text-sm leading-[18px] font-semibold">
                            Start in
                          </span>
                          {countdown.days > 0 && (
                            <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                              {countdown.days}d
                            </span>
                          )}
                          {(countdown.hours > 0 || countdown.days > 0) && (
                            <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                              {countdown.hours}h
                            </span>
                          )}
                          {(countdown.minutes > 0 || countdown.hours > 0 || countdown.days > 0) && (
                            <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                              {countdown.minutes}m
                            </span>
                          )}
                          <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                            {countdown.seconds}s
                          </span>
                        </div>
                      )}
                      {countdownStatus === 'active' && (
                        countdown.days === 999 ? (
                          <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                            No End Date
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-[#B392F0] text-sm leading-[18px] font-semibold">
                              End in
                            </span>
                            {countdown.days > 0 && (
                              <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                                {countdown.days}d
                              </span>
                            )}
                            {(countdown.hours > 0 || countdown.days > 0) && (
                              <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                                {countdown.hours}h
                              </span>
                            )}
                            {(countdown.minutes > 0 || countdown.hours > 0 || countdown.days > 0) && (
                              <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                                {countdown.minutes}m
                              </span>
                            )}
                            <span className="bg-[#1E192B] text-[#0BFF75] text-sm leading-[18px] font-semibold p-1 rounded">
                              {countdown.seconds}s
                            </span>
                          </div>
                        )
                      )}
                      {countdownStatus === 'minted-out' && (
                        <span className="text-[#0BFF75] text-sm leading-[18px] font-semibold">
                          Minted Out
                        </span>
                      )}
                      {countdownStatus === 'ended' && (
                        <span className="text-[#0BFF75] text-sm leading-[18px] font-semibold">
                          Mint Ended
                        </span>
                      )}
                      {countdownStatus === 'no-phase' && (
                        <span className="text-[#0BFF75] text-sm leading-[18px] font-semibold">
                          No Active Mint
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex justify-between items-center mb-[6px]">
                      <span className="text-[#B392F0] text-sm leading-[18px]">
                        Total Minted
                      </span>
                      <span className="text-[#B392F0] text-sm leading-[18px] text-right">
                        <AnimatedCounter 
                          value={collection.mintedPercent}
                          className="text-[#B392F0] text-sm leading-[18px]"
                          formatter={(v) => `${v.toFixed(2)}%`}
                        />
                        {' ('}
                        <AnimatedCounter 
                          value={collection.totalMinted}
                          className="text-[#B392F0] text-sm leading-[18px]"
                          formatter={(v) => v.toLocaleString()}
                        />
                        /{collection.totalSupply.toLocaleString()})
                      </span>
                    </div>
                    <div className="relative w-full h-[10px] bg-[#2F3336] border border-[#2F3336] rounded-[5px] overflow-hidden">
                      {/* Blur layer */}
                      <div
                        className={`absolute top-0 left-0 h-full bg-[#0BFF75] rounded-[5px] transition-all duration-1000 ease-out ${
                          progressAnimating ? 'animate-pulse' : ''
                        }`}
                        style={{
                          width: `${collection.mintedPercent}%`,
                          filter: 'blur(8.3px)',
                          boxShadow: progressAnimating ? '0 0 20px rgba(11, 255, 117, 0.8)' : 'none'
                        }}
                      />
                      {/* Solid layer */}
                      <div
                        className={`absolute top-0 left-0 h-full bg-[#0BFF75] rounded-[5px] transition-all duration-1000 ease-out ${
                          progressAnimating ? 'brightness-125' : ''
                        }`}
                        style={{ 
                          width: `${collection.mintedPercent}%`,
                          boxShadow: progressAnimating ? '0 0 15px rgba(11, 255, 117, 0.6)' : 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className='bg-[#0D0E11] border border-[#2f3336] p-3 rounded-lg'>
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <p className="text-[#857F94] text-sm leading-[4px] mb-[17px]">
                            Mint Price
                          </p>
                          <p className="text-white text-[20px] leading-[18px]">
                            {(() => {
                              const price = collection.phases && collection.phases[selectedPhaseIndex]
                                ? collection.phases[selectedPhaseIndex].price
                                : collection.sellPrice.split(' ')[0];

                              const priceStr = String(price);
                              
                              // Debug logging
                              console.log('🔍 Price Display:', {
                                raw: price,
                                string: priceStr,
                                parsed: parseFloat(priceStr),
                                selectedPhaseIndex
                              });
                              
                              // Jika price adalah "0" atau 0, tampilkan FREE
                              if (priceStr === '0' || parseFloat(priceStr) === 0) {
                                return <span className="text-white font-semibold">FREE</span>;
                              }

                              // Format price dengan menghindari scientific notation
                              const formatEthPrice = (value: string): string => {
                                // Parse as number
                                const num = parseFloat(value);
                                
                                if (num === 0) return '0';
                                
                                // Untuk nilai sangat kecil (< 0.000001), tampilkan sebagai "< 0.000001"
                                if (num < 0.000001 && num > 0) {
                                  return '< 0.000001';
                                }
                                
                                // Untuk nilai kecil, gunakan toFixed dengan banyak decimals
                                if (num < 0.01) {
                                  const fixed = num.toFixed(8);
                                  return fixed.replace(/\.?0+$/, '');
                                }
                                
                                // Untuk nilai normal, gunakan toFixed dengan max 6 decimals
                                if (num < 1) {
                                  const fixed = num.toFixed(6);
                                  return fixed.replace(/\.?0+$/, '');
                                }
                                
                                // Untuk nilai >= 1, gunakan 4 decimals
                                const fixed = num.toFixed(4);
                                return fixed.replace(/\.?0+$/, '');
                              };

                              return (
                                <>
                                  {formatEthPrice(priceStr)}
                                  {' ETH'}
                                </>
                              );
                            })()}
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className="text-[#857F94] text-sm leading-[4px] mb-[17px]">
                            Max Mint
                          </p>
                          <p className="text-white text-[20px] leading-[18px]">
                            {collection.phases && collection.phases[selectedPhaseIndex]
                              ? collection.phases[selectedPhaseIndex].maxPerWallet || 'Unlimited'
                              : collection.walletLimit}x
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className="text-[#857F94] text-sm leading-[4px] mb-[17px]">
                            Eligible
                          </p>
                          {checkingEligibility ? (
                            <p className="text-[#857F94] text-[20px] leading-[18px]">
                              ...
                            </p>
                          ) : (
                            <p className={`text-[20px] leading-[18px] font-semibold ${isEligible ? 'text-[#0BFF75]' : 'text-[#F87683]'}`}>
                              {isEligible ? 'YES' : 'NO'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Collection Button - Mobile Only (moved above mint controls) */}
              <div className="pt-4 lg:hidden">
                <Button
                  disabled={true}
                  onClick={() => router.push(`/collection/${collection.contractAddress}`)}
                  className="w-full bg-[#B392F0] hover:bg-[#B392F0]/90 text-black font-bold rounded-lg h-[40px]"
                >
                  View Collection
                </Button>
              </div>

              <div className="mt-auto">
                <div className="flex items-center justify-between mb-[11px]">
                  <p className="text-[#857F94] text-sm leading-[18px]">
                    # to Mint
                  </p>
                  {collection.phases && collection.phases[selectedPhaseIndex]?.maxPerWallet && (
                    <p className="text-[#857F94] text-sm leading-[18px]">
                      Minted: <span className="text-[#B392F0] font-semibold">
                        <AnimatedCounter 
                          value={userMintedCount}
                          className="text-[#B392F0] font-semibold"
                        />
                      </span>
                      {' / '}
                      <span className="text-white font-semibold">{collection.phases[selectedPhaseIndex].maxPerWallet}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-row items-stretch gap-2 lg:gap-4">
                  <div className="w-1/2 lg:w-1/3 h-[40px] lg:h-[32px] bg-[#B392F0]/50 rounded-lg flex items-center justify-between pl-3 gap-2 overflow-hidden">
                    <input
                      type="number"
                      min="1"
                      value={mintAmount}
                      disabled={
                        minting || 
                        contractNotDeployed || 
                        countdownStatus === 'before-start' || 
                        countdownStatus === 'ended' || 
                        countdownStatus === 'minted-out' ||
                        countdownStatus === 'no-phase' ||
                        !isEligible ||
                        Boolean(collection.phases?.[selectedPhaseIndex]?.maxPerWallet && userMintedCount >= collection.phases[selectedPhaseIndex].maxPerWallet)
                      }
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        const maxPerWallet = collection.phases && collection.phases[selectedPhaseIndex]
                          ? collection.phases[selectedPhaseIndex].maxPerWallet || 10
                          : 10;

                        // Calculate remaining mints
                        const remainingMints = Math.max(0, maxPerWallet - userMintedCount);

                        // Limit to remaining mints
                        if (value > remainingMints) {
                          setMintAmount(remainingMints);
                          toast.warning(`You can only mint ${remainingMints} more NFT(s) in this phase`);
                        } else {
                          setMintAmount(value);
                        }
                      }}
                      className="w-full bg-transparent text-center text-white text-sm leading-[20px] font-semibold outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ letterSpacing: '-2.5%' }}
                    />
                    <button
                      onClick={() => {
                        const maxPerWallet = collection.phases && collection.phases[selectedPhaseIndex]
                          ? collection.phases[selectedPhaseIndex].maxPerWallet || 10
                          : 10;

                        // Calculate remaining mints for user
                        const remainingMints = Math.max(0, maxPerWallet - userMintedCount);

                        // Set to remaining or 1 if already maxed out
                        setMintAmount(remainingMints > 0 ? remainingMints : 1);

                        if (remainingMints === 0) {
                          toast.warning('You have reached the maximum mint limit for this phase');
                        }
                      }}
                      disabled={
                        minting || 
                        contractNotDeployed || 
                        countdownStatus === 'before-start' || 
                        countdownStatus === 'ended' || 
                        countdownStatus === 'minted-out' ||
                        countdownStatus === 'no-phase' ||
                        !isEligible ||
                        Boolean(collection.phases?.[selectedPhaseIndex]?.maxPerWallet && userMintedCount >= collection.phases[selectedPhaseIndex].maxPerWallet)
                      }
                      className="w-full h-full bg-[#B392F0] text-[#0E0F11] text-[12px] leading-[16px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      MAX
                    </button>
                  </div>
                  <Button
                    onClick={handleMint}
                    disabled={
                      minting || 
                      contractNotDeployed || 
                      countdownStatus === 'before-start' || 
                      countdownStatus === 'ended' || 
                      countdownStatus === 'minted-out' ||
                      countdownStatus === 'no-phase' ||
                      !isEligible ||
                      Boolean(collection.phases?.[selectedPhaseIndex]?.maxPerWallet && userMintedCount >= collection.phases[selectedPhaseIndex].maxPerWallet)
                    }
                    className="w-1/2 lg:w-2/3 h-[40px] lg:h-[32px] bg-white text-black hover:bg-white/90 rounded-lg text-sm leading-[20px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ letterSpacing: '-2.5%' }}
                    title={
                      contractNotDeployed ? 'Contract not deployed yet' : 
                      countdownStatus === 'before-start' ? 'Mint has not started yet' :
                      countdownStatus === 'ended' ? 'Mint has ended' :
                      countdownStatus === 'minted-out' ? 'Sold out' :
                      countdownStatus === 'no-phase' ? 'No active mint phase' :
                      !isEligible ? 'You are not eligible for this phase' :
                      Boolean(collection.phases?.[selectedPhaseIndex]?.maxPerWallet && userMintedCount >= collection.phases[selectedPhaseIndex].maxPerWallet) ? 'You have reached the maximum mint limit' :
                      ''
                    }
                  >
                    {minting ? (
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-3 h-3 border-2 border-[#0E0F11] border-t-transparent rounded-full animate-spin"></div>
                        <span>Minting...</span>
                      </div>
                    ) : contractNotDeployed ? (
                      'Contract Not Deployed'
                    ) : countdownStatus === 'before-start' ? (
                      'Mint Not Started'
                    ) : countdownStatus === 'ended' ? (
                      'Mint Ended'
                    ) : countdownStatus === 'minted-out' ? (
                      'Sold Out'
                    ) : countdownStatus === 'no-phase' ? (
                      'No Active Phase'
                    ) : !isEligible ? (
                      'Not Eligible'
                    ) : Boolean(collection.phases?.[selectedPhaseIndex]?.maxPerWallet && userMintedCount >= collection.phases[selectedPhaseIndex].maxPerWallet) ? (
                      'Max Minted'
                    ) : (
                      'Mint'
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-full order-1 lg:order-2 flex flex-col justify-between">
              <div className="relative w-full aspect-square lg:aspect-auto lg:w-[393px] lg:h-[393px] rounded-lg overflow-hidden bg-[#2D253E]">
                {imageLoading && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#B392F0] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {imageError || !collection.image ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
                    <svg className="w-24 h-24 text-[#857F94]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-[#857F94] text-sm text-center">
                      {imageError ? 'Failed to load image' : 'No image available'}
                    </p>
                  </div>
                ) : (
                  <img
                    src={collection.image}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                      console.warn('Failed to load IPFS image:', collection.image);
                    }}
                    style={{ display: imageLoading ? 'none' : 'block' }}
                  />
                )}
              </div>

              <div className="mt-[16px]">
                <div className='w-full bg-[#0D0E11] border border-[#2f3336] p-2 rounded-lg flex items-center justify-between'>
                  <div className="flex items-center gap-2">
                    <span className="text-[#B392F0] text-sm leading-[18px]">
                      CA: {formatAddress(collection.contractAddress)}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-[#B392F0] hover:text-[#B392F0]/80 transition-colors"
                      title="Copy contract address"
                    >
                      {copied ? <HugeiconsIcon icon={Tick01Icon} size={16} /> : <HugeiconsIcon icon={Copy01Icon} size={16} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Website icon (Link2) - urutan: Website, Discord, Twitter */}
                    {collection.website && collection.website !== "#" && (
                      <Link
                        href={collection.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B392F0] hover:text-white transition-colors"
                        title="Website"
                      >
                        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                          <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                          <line x1="8" x2="16" y1="12" y2="12" />
                        </svg>
                      </Link>
                    )}
                    {/* Discord icon (outline) */}
                    {collection.discord && (
                      <Link
                        href={collection.discord.startsWith('http') ? collection.discord : `https://discord.gg/${collection.discord}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B392F0] hover:text-white transition-colors"
                        title="Discord"
                      >
                        <svg className="h-[16px] w-[19px]" viewBox="0 0 127.14 96.36" fill="currentColor">
                          <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                        </svg>
                      </Link>
                    )}
                    {/* Twitter/X icon */}
                    {collection.twitter && (
                      <Link
                        href={collection.twitter.startsWith('http') ? collection.twitter : `https://x.com/${collection.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B392F0] hover:text-white transition-colors"
                        title="Twitter"
                      >
                        <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* View Collection Button - Desktop Only */}
              <div className="pt-4 hidden lg:block">
                <Button
                  onClick={() => router.push(`/collection/${collection.contractAddress}`)}
                  className="w-full bg-[#B392F0] hover:bg-[#B392F0]/90 text-black font-bold rounded-lg h-[32px]"
                >
                  View Collection
                </Button>
              </div>
            </div>
          </div>

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
    </div>
  );
}

export default function CollectionDetailPageWrapper() {
  return (
    <WagmiReadyGuard>
      <CollectionDetailPage />
    </WagmiReadyGuard>
  );
}
