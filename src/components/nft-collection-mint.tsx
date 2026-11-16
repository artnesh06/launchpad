'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock01Icon, UserMultiple01Icon, Coins01Icon, FlashIcon } from '@hugeicons/core-free-icons';
import { useNFTCollection } from '@/hooks/use-nft-collection';

interface MintPhaseData {
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  price: string;
  maxSupply: number;
  maxPerWallet: number;
  maxPerTransaction: number;
  currentSupply: number;
  isActive: boolean;
  requiresWhitelist: boolean;
  paymentType: number; // 0 = ETH, 1 = ERC20
}

interface NFTCollectionMintProps {
  collectionAddress: string;
  collectionName?: string;
  collectionSymbol?: string;
}

export function NFTCollectionMint({
  collectionAddress,
  collectionName = 'NFT Collection',
  collectionSymbol = 'NFT'
}: NFTCollectionMintProps) {
  const {
    isConnected,
    account,
    mintFromPhase,
    calculateMintCost,
    getActiveMintPhases,
    connectWallet
  } = useNFTCollection();

  const [mintPhases, setMintPhases] = useState<MintPhaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [mintQuantity, setMintQuantity] = useState(1);
  const [mintCost, setMintCost] = useState<{
    mintCost: string;
    platformFee: string;
    totalCost: string;
    isFreeMint: boolean;
  } | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  // Load active mint phases
  useEffect(() => {
    const loadMintPhases = async () => {
      try {
        setLoading(true);
        const phases = await getActiveMintPhases(collectionAddress);
        setMintPhases(phases);

        // Auto-select first active phase
        if (phases.length > 0) {
          setSelectedPhase(0);
        }
      } catch (error) {
        console.error('Error loading mint phases:', error);
      } finally {
        setLoading(false);
      }
    };

    if (collectionAddress) {
      loadMintPhases();
    }
  }, [collectionAddress, getActiveMintPhases]);

  // Calculate mint cost when phase or quantity changes
  useEffect(() => {
    const updateMintCost = async () => {
      if (selectedPhase !== null && mintQuantity > 0) {
        try {
          const cost = await calculateMintCost(collectionAddress, selectedPhase, mintQuantity);
          setMintCost(cost);
        } catch (error) {
          console.error('Error calculating mint cost:', error);
          setMintCost(null);
        }
      }
    };

    updateMintCost();
  }, [selectedPhase, mintQuantity, collectionAddress, calculateMintCost]);

  const handleMint = async () => {
    if (selectedPhase === null || !mintCost) return;

    try {
      setIsMinting(true);
      await mintFromPhase(collectionAddress, selectedPhase, mintQuantity);

      // Refresh phases to update current supply
      const updatedPhases = await getActiveMintPhases(collectionAddress);
      setMintPhases(updatedPhases);

      // Reset quantity
      setMintQuantity(1);

    } catch (error) {
      console.error('Error minting:', error);
    } finally {
      setIsMinting(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const isPhaseActive = (phase: MintPhaseData, index: number) => {
    const now = Math.floor(Date.now() / 1000);
    return phase.isActive &&
           now >= phase.startTime &&
           now <= phase.endTime &&
           phase.currentSupply < phase.maxSupply;
  };

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
        <p className="text-muted-foreground mb-6">
          Connect your wallet to mint from this collection
        </p>
        <Button onClick={connectWallet}>
          Login
        </Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading mint phases...</p>
      </Card>
    );
  }

  if (mintPhases.length === 0) {
    return (
      <Card className="p-8 text-center">
        <HugeiconsIcon icon={Clock01Icon} size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Active Mint Phases</h3>
        <p className="text-muted-foreground">
          There are currently no active mint phases for this collection.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Collection Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{collectionName}</h2>
        <Badge variant="outline">{collectionSymbol}</Badge>
        <p className="text-sm text-muted-foreground mt-2">
          Collection Address: {collectionAddress.slice(0, 6)}...{collectionAddress.slice(-4)}
        </p>
      </div>

      {/* Mint Phases */}
      <div className="grid gap-4">
        {mintPhases.map((phase, index) => (
          <Card
            key={index}
            className={`p-6 cursor-pointer transition-colors ${
              selectedPhase === index
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
            } ${
              !isPhaseActive(phase, index) ? 'opacity-50' : ''
            }`}
            onClick={() => isPhaseActive(phase, index) && setSelectedPhase(index)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  isPhaseActive(phase, index) ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <h4 className="text-lg font-medium">{phase.name}</h4>
                {phase.requiresWhitelist && (
                  <Badge variant="secondary">Whitelist Only</Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {phase.price === '0' ? 'FREE' : `${phase.price} ETH`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {phase.currentSupply} / {phase.maxSupply} minted
                </p>
              </div>
            </div>

            {phase.description && (
              <p className="text-sm text-muted-foreground mb-4">{phase.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Clock01Icon} size={16} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">Start</p>
                  <p className="text-muted-foreground">{formatTime(phase.startTime)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={Clock01Icon} size={16} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">End</p>
                  <p className="text-muted-foreground">{formatTime(phase.endTime)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={UserMultiple01Icon} size={16} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">Max per Wallet</p>
                  <p className="text-muted-foreground">{phase.maxPerWallet}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={FlashIcon} size={16} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">Max per TX</p>
                  <p className="text-muted-foreground">{phase.maxPerTransaction}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Mint Interface */}
      {selectedPhase !== null && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Mint NFTs</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  max={mintPhases[selectedPhase]?.maxPerTransaction || 1}
                  value={mintQuantity}
                  onChange={(e) => setMintQuantity(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max {mintPhases[selectedPhase]?.maxPerTransaction} per transaction
                </p>
              </div>

              {mintCost && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Mint Cost:</span>
                    <span>{mintCost.mintCost} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Platform Fee:</span>
                    <span>{mintCost.platformFee} ETH</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>Total Cost:</span>
                    <span>{mintCost.totalCost} ETH</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-end">
              <Button
                onClick={handleMint}
                disabled={isMinting || selectedPhase === null || !mintCost}
                className="w-full h-12"
              >
                {isMinting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Minting...
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Coins01Icon} size={16} className="mr-2" />
                    Mint {mintQuantity} NFT{mintQuantity > 1 ? 's' : ''}
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground mt-2 text-center">
                Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}