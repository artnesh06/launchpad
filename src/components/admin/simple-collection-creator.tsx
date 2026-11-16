'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, ArrowDown01Icon, ArrowUp01Icon, Calendar01Icon, DollarCircleIcon, Globe01Icon, NewTwitterIcon, FlashIcon, Clock01Icon, UserMultiple01Icon, Coins01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
interface SimpleCollectionCreatorProps {
  factoryInfo?: {
    creationFee: string;
    platformFeePercentage: number;
  };
  onSubmit: (data: CollectionData) => void;
  loading?: boolean;
}

export interface MintPhase {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  price: string;
  maxSupply: number;
  maxPerWallet: number;
  maxPerTransaction: number;
  merkleRoot: string;
  requiresWhitelist: boolean;
  isActive: boolean;
  paymentType: 'ETH' | 'ERC20';
  paymentToken: string;
  minimumRaise: string;
  refundEnabled: boolean;
}

export interface CollectionData {
  // Basic Info (Required) - Matches DeploymentRequest struct
  name: string;
  symbol: string;
  description: string;
  baseURI: string;
  unrevealedURI: string;
  contractURI: string;
  externalLink: string;
  totalMaxSupply: number;
  treasury: string;
  royaltyRecipient: string;
  royaltyPercentage: number;

  // Collection Configuration
  chainId: number;
  isRevealed: boolean;
  partnerCode?: string;

  // Platform Fee Configuration
  platformFeePercentage: number;
  freeMintPlatformFee: string;
  platformTreasury: string;
  platformFeeEnabled: boolean;

  // Operator Filtering (OpenSea Creator Earnings)
  operatorFilteringEnabled: boolean;
  blockedOperators: string[];

  // Access Control Roles
  adminAddresses: string[];
  operatorAddresses: string[];
  minterAddresses: string[];

  // Emergency Controls
  pausable: boolean;

  // Mint Phases
  mintPhases: MintPhase[];
}

export function SimpleCollectionCreator({ 
  factoryInfo, 
  onSubmit, 
  loading = false 
}: SimpleCollectionCreatorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [data, setData] = useState<CollectionData>({
    name: '',
    symbol: '',
    description: '',
    baseURI: '',
    unrevealedURI: '',
    contractURI: '',
    externalLink: '',
    totalMaxSupply: 1000,
    treasury: '',
    royaltyRecipient: '',
    royaltyPercentage: 500, // 5% in basis points (500/10000)

    // Collection Configuration
    chainId: 6343, // Default to MegaETH
    isRevealed: false,

    // Platform Fee Configuration
    platformFeePercentage: 250, // 2.5%
    freeMintPlatformFee: '0.001',
    platformTreasury: '',
    platformFeeEnabled: true,

    // Operator Filtering
    operatorFilteringEnabled: true,
    blockedOperators: [],

    // Access Control
    adminAddresses: [],
    operatorAddresses: [],
    minterAddresses: [],

    // Emergency Controls
    pausable: true,

    // Mint Phases
    mintPhases: []
  });

  const updateData = (field: keyof CollectionData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Mint Phase functions
  const addMintPhase = () => {
    const newPhase: MintPhase = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Phase ${data.mintPhases.length + 1}`,
      description: '',
      startTime: '',
      endTime: '',
      price: '0.01',
      maxSupply: Math.floor(data.totalMaxSupply / 2),
      maxPerWallet: 5,
      maxPerTransaction: 3,
      merkleRoot: '',
      requiresWhitelist: data.mintPhases.length === 0 ? false : true,
      isActive: true,
      paymentType: 'ETH',
      paymentToken: '',
      minimumRaise: '0',
      refundEnabled: false
    };

    updateData('mintPhases', [...data.mintPhases, newPhase]);
  };

  const removeMintPhase = (id: string) => {
    updateData('mintPhases', data.mintPhases.filter(phase => phase.id !== id));
  };

  // Helper function to normalize price input (convert comma to dot)
  const normalizePriceInput = (value: string): string => {
    // Replace comma with dot for decimal separator
    return value.replace(',', '.');
  };

  const updateMintPhase = (id: string, field: keyof MintPhase, value: any) => {
    // Normalize price input if field is 'price'
    const normalizedValue = field === 'price' && typeof value === 'string' 
      ? normalizePriceInput(value) 
      : value;
    
    updateData('mintPhases', data.mintPhases.map(phase =>
      phase.id === id ? { ...phase, [field]: normalizedValue } : phase
    ));
  };

  const isFormValid = () => {
    return data.name &&
           data.symbol &&
           data.totalMaxSupply > 0 &&
           data.treasury &&
           data.royaltyRecipient;
  };

  const getCompletedFields = () => {
    const requiredFields = ['name', 'symbol', 'totalMaxSupply', 'treasury', 'royaltyRecipient'];
    const optionalFields = ['description', 'baseURI', 'unrevealedURI', 'contractURI', 'externalLink'];

    const requiredComplete = requiredFields.filter(field =>
      data[field as keyof CollectionData]
    ).length;

    const optionalComplete = optionalFields.filter(field =>
      data[field as keyof CollectionData]
    ).length;

    return {
      required: requiredComplete,
      optional: optionalComplete,
      total: requiredComplete + optionalComplete,
      max: requiredFields.length + optionalFields.length
    };
  };

  const completion = getCompletedFields();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Form */}
      <div className="lg:col-span-3 space-y-6">
        {/* Essential Information */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <h4 className="text-lg font-semibold">Essential Information</h4>
              <p className="text-sm text-muted-foreground">Basic details for your NFT collection</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Collection Name *</label>
                <Input 
                  placeholder="My Awesome NFTs"
                  value={data.name}
                  onChange={(e) => updateData('name', e.target.value)}
                  className={data.name ? 'border-green-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Symbol *</label>
                <Input 
                  placeholder="MANT"
                  value={data.symbol}
                  onChange={(e) => updateData('symbol', e.target.value.toUpperCase())}
                  className={data.symbol ? 'border-green-500' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Max Supply *</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={data.totalMaxSupply}
                  onChange={(e) => updateData('totalMaxSupply', parseInt(e.target.value) || 0)}
                  className={data.totalMaxSupply > 0 ? 'border-green-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Chain ID *</label>
                <Input
                  type="number"
                  placeholder="6343"
                  value={data.chainId}
                  onChange={(e) => updateData('chainId', parseInt(e.target.value) || 6343)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">6343 for MegaETH, 1 for Ethereum</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={data.isRevealed}
                  onCheckedChange={(checked) => updateData('isRevealed', checked)}
                />
                <span className="text-sm">Collection Revealed</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={data.pausable}
                  onCheckedChange={(checked) => updateData('pausable', checked)}
                />
                <span className="text-sm">Pausable Contract</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea 
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-input rounded-md resize-none"
                placeholder="Describe your NFT collection..."
                value={data.description}
                onChange={(e) => updateData('description', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Treasury & Royalty Configuration */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <h4 className="text-lg font-semibold">Treasury & Royalty Configuration</h4>
              <p className="text-sm text-muted-foreground">Set up treasury and royalty settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Treasury Address *</label>
              <Input
                placeholder="0x..."
                value={data.treasury}
                onChange={(e) => updateData('treasury', e.target.value)}
                className={data.treasury ? 'border-green-500' : ''}
              />
              <p className="text-xs text-muted-foreground">Address where collection proceeds will be sent</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Royalty Recipient *</label>
                <Input
                  placeholder="0x..."
                  value={data.royaltyRecipient}
                  onChange={(e) => updateData('royaltyRecipient', e.target.value)}
                  className={data.royaltyRecipient ? 'border-green-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Royalty Percentage</label>
                <Input
                  type="number"
                  placeholder="500"
                  value={data.royaltyPercentage}
                  onChange={(e) => updateData('royaltyPercentage', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">In basis points (500 = 5%)</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Platform Fee Configuration */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <h4 className="text-lg font-semibold">Platform Fee Configuration</h4>
              <p className="text-sm text-muted-foreground">Configure platform fees and treasury settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Switch
                checked={data.platformFeeEnabled}
                onCheckedChange={(checked) => updateData('platformFeeEnabled', checked)}
              />
              <span className="text-sm font-medium">Enable Platform Fees</span>
            </div>

            {data.platformFeeEnabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Platform Fee %</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={data.platformFeePercentage / 100}
                      onChange={(e) => updateData('platformFeePercentage', parseFloat(e.target.value) * 100 || 0)}
                      placeholder="2.5"
                    />
                    <p className="text-xs text-muted-foreground">Percentage of sale revenue (max 10%)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Free Mint Platform Fee</label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={data.freeMintPlatformFee}
                      onChange={(e) => updateData('freeMintPlatformFee', e.target.value)}
                      placeholder="0.001"
                    />
                    <p className="text-xs text-muted-foreground">Fee for free mint operations (ETH)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Platform Treasury *</label>
                    <Input
                      value={data.platformTreasury}
                      onChange={(e) => updateData('platformTreasury', e.target.value)}
                      placeholder="0x..."
                      className={data.platformTreasury ? 'border-green-500' : ''}
                    />
                    <p className="text-xs text-muted-foreground">Where platform fees are collected</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Mint Phases Configuration */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h4 className="text-lg font-semibold">Mint Phases Setup</h4>
                <p className="text-sm text-muted-foreground">Configure different sale phases with pricing and timing</p>
              </div>
            </div>
            <Button onClick={addMintPhase} size="sm">
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Add Phase
            </Button>
          </div>

          <div className="space-y-4">
            {data.mintPhases.length === 0 ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <HugeiconsIcon icon={Clock01Icon} size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No mint phases configured yet. Add phases to control when and how users can mint.
                </p>
                <Button onClick={addMintPhase} variant="outline">
                  <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                  Create Your First Phase
                </Button>
              </div>
            ) : (
              data.mintPhases.map((phase, index) => (
                <Card key={phase.id} className="p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={phase.isActive ? "default" : "secondary"}>
                        Phase {index + 1}
                      </Badge>
                      <Input
                        value={phase.name}
                        onChange={(e) => updateMintPhase(phase.id, 'name', e.target.value)}
                        className="font-medium bg-transparent border-none px-2 py-1 h-auto max-w-xs"
                        placeholder="Phase Name"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Active</span>
                        <Switch
                          checked={phase.isActive}
                          onCheckedChange={(checked) => updateMintPhase(phase.id, 'isActive', checked)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMintPhase(phase.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        <HugeiconsIcon icon={Calendar01Icon} size={12} className="inline mr-1" />
                        Start Time *
                      </label>
                      <Input
                        type="datetime-local"
                        value={phase.startTime}
                        onChange={(e) => updateMintPhase(phase.id, 'startTime', e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        <HugeiconsIcon icon={Calendar01Icon} size={12} className="inline mr-1" />
                        End Time *
                      </label>
                      <Input
                        type="datetime-local"
                        value={phase.endTime}
                        onChange={(e) => updateMintPhase(phase.id, 'endTime', e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        <HugeiconsIcon icon={Coins01Icon} size={12} className="inline mr-1" />
                        Price (ETH) *
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={phase.price}
                        onChange={(e) => updateMintPhase(phase.id, 'price', e.target.value)}
                        placeholder="0.01"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Max Supply *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={phase.maxSupply}
                        onChange={(e) => updateMintPhase(phase.id, 'maxSupply', parseInt(e.target.value) || 1)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        <HugeiconsIcon icon={UserMultiple01Icon} size={12} className="inline mr-1" />
                        Max per Wallet
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={phase.maxPerWallet}
                        onChange={(e) => updateMintPhase(phase.id, 'maxPerWallet', parseInt(e.target.value) || 1)}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Max per Transaction
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={phase.maxPerTransaction}
                        onChange={(e) => updateMintPhase(phase.id, 'maxPerTransaction', parseInt(e.target.value) || 1)}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Payment Type *
                      </label>
                      <select
                        value={phase.paymentType}
                        onChange={(e) => updateMintPhase(phase.id, 'paymentType', e.target.value as 'ETH' | 'ERC20')}
                        className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="ETH">ETH</option>
                        <option value="ERC20">ERC20 Token</option>
                      </select>
                    </div>
                  </div>

                  {phase.paymentType === 'ERC20' && (
                    <div className="mt-4">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Payment Token Address *
                      </label>
                      <Input
                        value={phase.paymentToken}
                        onChange={(e) => updateMintPhase(phase.id, 'paymentToken', e.target.value)}
                        placeholder="0x..."
                        className="text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Minimum Raise (ETH)
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={phase.minimumRaise}
                        onChange={(e) => updateMintPhase(phase.id, 'minimumRaise', e.target.value)}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={phase.refundEnabled}
                          onCheckedChange={(checked) => updateMintPhase(phase.id, 'refundEnabled', checked)}
                        />
                        <span className="text-sm">Enable Refunds</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={phase.requiresWhitelist}
                          onCheckedChange={(checked) => updateMintPhase(phase.id, 'requiresWhitelist', checked)}
                        />
                        <span className="text-sm">Requires Whitelist</span>
                      </div>
                    </div>

                    {phase.requiresWhitelist && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Merkle Root (for whitelist verification)
                        </label>
                        <Input
                          value={phase.merkleRoot}
                          onChange={(e) => updateMintPhase(phase.id, 'merkleRoot', e.target.value)}
                          placeholder="0x..."
                          className="text-sm font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Generate merkle tree from whitelist addresses and paste root hash here
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mt-4">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <Input
                      value={phase.description}
                      onChange={(e) => updateMintPhase(phase.id, 'description', e.target.value)}
                      placeholder="Optional phase description"
                      className="text-sm"
                    />
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Phase Summary */}
          {data.mintPhases.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 mt-6">
              <h5 className="text-sm font-medium mb-2">Phases Summary</h5>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Phases:</span>
                  <p className="font-medium">{data.mintPhases.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Active:</span>
                  <p className="font-medium">{data.mintPhases.filter(p => p.isActive).length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Whitelist:</span>
                  <p className="font-medium">{data.mintPhases.filter(p => p.requiresWhitelist).length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Supply:</span>
                  <p className="font-medium">{data.mintPhases.reduce((sum, p) => sum + p.maxSupply, 0)}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Advanced Options (Collapsible) */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center text-sm font-bold">
                5
              </div>
              <div>
                <h4 className="text-lg font-semibold">Metadata & Links</h4>
                <p className="text-sm text-muted-foreground">URIs and external links for your collection</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <HugeiconsIcon icon={ArrowUp01Icon} size={16} /> : <HugeiconsIcon icon={ArrowDown01Icon} size={16} />}
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Base URI</label>
                  <Input
                    placeholder="https://api.yoursite.com/metadata/"
                    value={data.baseURI}
                    onChange={(e) => updateData('baseURI', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Base URI for token metadata</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unrevealed URI</label>
                  <Input
                    placeholder="https://api.yoursite.com/unrevealed.json"
                    value={data.unrevealedURI}
                    onChange={(e) => updateData('unrevealedURI', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">URI shown before reveal</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contract URI</label>
                  <Input
                    placeholder="https://api.yoursite.com/contract-metadata"
                    value={data.contractURI}
                    onChange={(e) => updateData('contractURI', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Contract-level metadata URI</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <HugeiconsIcon icon={Globe01Icon} size={16} />
                    External Link
                  </label>
                  <Input
                    placeholder="https://yourproject.com"
                    value={data.externalLink}
                    onChange={(e) => updateData('externalLink', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Project website or homepage</p>
                </div>
              </div>

              {/* Operator Filtering (OpenSea Creator Earnings) */}
              <div className="border-t pt-6 mt-6">
                <h5 className="font-medium mb-4">OpenSea Creator Earnings</h5>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={data.operatorFilteringEnabled}
                      onCheckedChange={(checked) => updateData('operatorFilteringEnabled', checked)}
                    />
                    <span className="text-sm">Enable Operator Filtering</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enforces creator earnings on OpenSea by blocking transfers through filtered operators
                  </p>

                  {data.blockedOperators.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Blocked Operators</label>
                      <div className="space-y-2">
                        {data.blockedOperators.map((address, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={address}
                              onChange={(e) => {
                                const newOperators = [...data.blockedOperators];
                                newOperators[index] = e.target.value;
                                updateData('blockedOperators', newOperators);
                              }}
                              placeholder="0x..."
                              className="text-sm font-mono"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newOperators = data.blockedOperators.filter((_, i) => i !== index);
                                updateData('blockedOperators', newOperators);
                              }}
                              className="text-red-500"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateData('blockedOperators', [...data.blockedOperators, ''])}
                  >
                    <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                    Add Blocked Operator
                  </Button>
                </div>
              </div>

              {/* Access Control Roles */}
              <div className="border-t pt-6 mt-6">
                <h5 className="font-medium mb-4">Access Control Roles</h5>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Admin Addresses</label>
                    <div className="space-y-2">
                      {data.adminAddresses.map((address, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={address}
                            onChange={(e) => {
                              const newAddresses = [...data.adminAddresses];
                              newAddresses[index] = e.target.value;
                              updateData('adminAddresses', newAddresses);
                            }}
                            placeholder="0x..."
                            className="text-sm font-mono"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newAddresses = data.adminAddresses.filter((_, i) => i !== index);
                              updateData('adminAddresses', newAddresses);
                            }}
                            className="text-red-500"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateData('adminAddresses', [...data.adminAddresses, ''])}
                      className="mt-2"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                      Add Admin
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Operator Addresses</label>
                    <div className="space-y-2">
                      {data.operatorAddresses.map((address, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={address}
                            onChange={(e) => {
                              const newAddresses = [...data.operatorAddresses];
                              newAddresses[index] = e.target.value;
                              updateData('operatorAddresses', newAddresses);
                            }}
                            placeholder="0x..."
                            className="text-sm font-mono"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newAddresses = data.operatorAddresses.filter((_, i) => i !== index);
                              updateData('operatorAddresses', newAddresses);
                            }}
                            className="text-red-500"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateData('operatorAddresses', [...data.operatorAddresses, ''])}
                      className="mt-2"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                      Add Operator
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Minter Addresses</label>
                    <div className="space-y-2">
                      {data.minterAddresses.map((address, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={address}
                            onChange={(e) => {
                              const newAddresses = [...data.minterAddresses];
                              newAddresses[index] = e.target.value;
                              updateData('minterAddresses', newAddresses);
                            }}
                            placeholder="0x..."
                            className="text-sm font-mono"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newAddresses = data.minterAddresses.filter((_, i) => i !== index);
                              updateData('minterAddresses', newAddresses);
                            }}
                            className="text-red-500"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateData('minterAddresses', [...data.minterAddresses, ''])}
                      className="mt-2"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
                      Add Minter
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Creation Summary */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <h4 className="font-semibold mb-4">Creation Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Creation Fee:</span>
              <span className="font-medium">{factoryInfo?.creationFee || '0.01'} ETH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee:</span>
              <span className="font-medium">{factoryInfo?.platformFeePercentage || 2.5}%</span>
            </div>
          </div>
          
          <Button 
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={!isFormValid() || loading}
            onClick={() => onSubmit(data)}
          >
            {loading ? 'Creating...' : 'Create Collection'}
          </Button>
        </Card>


      </div>
    </div>
  );
}