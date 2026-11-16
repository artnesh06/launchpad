'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  DollarCircleIcon,
  Shield01Icon,
  Alert01Icon,
  ArrowUpDown01Icon,
  CreditCard01Icon,
  Settings01Icon,
  View01Icon,
  ArrowUpRight01Icon,
  Wallet01Icon,
  Database01Icon,
  Lock01Icon,
  Unlock01Icon,
  Refresh01Icon
} from '@hugeicons/core-free-icons';

interface FactoryInfo {
  version: string;
  chainId: number;
  totalLaunchpads: number;
  creationFee: string;
  platformFeePercentage: number;
  freeMintPlatformFee: string;
  treasury: string;
  owner: string;
}

interface EnhancedAdminControlsProps {
  factoryInfo?: FactoryInfo;
  isOwner: boolean;
}

export function EnhancedAdminControls({ factoryInfo, isOwner }: EnhancedAdminControlsProps) {
  const [creationFeeInput, setCreationFeeInput] = useState('');
  const [platformFeeInput, setPlatformFeeInput] = useState('');
  const [freeMintFeeInput, setFreeMintFeeInput] = useState('');
  const [treasuryAddressInput, setTreasuryAddressInput] = useState('');
  const [newOwnerInput, setNewOwnerInput] = useState('');
  const [indexInput, setIndexInput] = useState('');

  if (!isOwner) {
    return (
      <Card className="border-orange-200 dark:border-orange-800">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">Only the contract owner can access admin controls.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleUpdateCreationFee = async () => {
    try {
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();
      const chainId = factoryInfo?.chainId || 6343;
      await contractService.setCreationFee(chainId, creationFeeInput);
      console.log('✅ Creation fee updated');
      setCreationFeeInput('');
    } catch (error) {
      console.error('❌ Failed to update creation fee:', error);
    }
  };

  const handleUpdatePlatformFee = async () => {
    try {
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();
      const chainId = factoryInfo?.chainId || 6343;
      const percentage = Math.round(parseFloat(platformFeeInput) * 100);
      const freeMintFee = factoryInfo?.freeMintPlatformFee || '0.001';
      await contractService.setPlatformFee(chainId, percentage, freeMintFee);
      console.log('✅ Platform fee updated');
      setPlatformFeeInput('');
    } catch (error) {
      console.error('❌ Failed to update platform fee:', error);
    }
  };

  const handleUpdateFreeMintFee = async () => {
    try {
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();
      const chainId = factoryInfo?.chainId || 6343;
      const currentPercentage = factoryInfo?.platformFeePercentage || 250;
      await contractService.setPlatformFee(chainId, currentPercentage, freeMintFeeInput);
      console.log('✅ Free mint fee updated');
      setFreeMintFeeInput('');
    } catch (error) {
      console.error('❌ Failed to update free mint fee:', error);
    }
  };

  const handleUpdateTreasury = async () => {
    try {
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();
      const chainId = factoryInfo?.chainId || 6343;
      await contractService.setPlatformTreasury(chainId, treasuryAddressInput);
      console.log('✅ Treasury address updated');
      setTreasuryAddressInput('');
    } catch (error) {
      console.error('❌ Failed to update treasury:', error);
    }
  };

  const handleEmergencyWithdraw = async () => {
    if (confirm('Are you sure you want to perform emergency withdraw? This action cannot be undone.')) {
      try {
        const { ContractService } = await import('@/lib/contract-service');
        const contractService = new ContractService();
        const chainId = factoryInfo?.chainId || 6343;
        await contractService.emergencyWithdraw(chainId);
        console.log('✅ Emergency withdraw completed');
      } catch (error) {
        console.error('❌ Emergency withdraw failed:', error);
      }
    }
  };

  const handleTransferOwnership = async () => {
    if (newOwnerInput && confirm('Are you absolutely sure? This will transfer ownership permanently!')) {
      try {
        const { ContractService } = await import('@/lib/contract-service');
        const contractService = new ContractService();
        const chainId = factoryInfo?.chainId || 6343;
        await contractService.transferOwnership(chainId, newOwnerInput);
        console.log('✅ Ownership transferred to:', newOwnerInput);
        setNewOwnerInput('');
      } catch (error) {
        console.error('❌ Failed to transfer ownership:', error);
      }
    }
  };

  const handleRenounceOwnership = async () => {
    if (confirm('WARNING: This will permanently renounce ownership! The contract will become ownerless. Are you sure?')) {
      try {
        const { ContractService } = await import('@/lib/contract-service');
        const contractService = new ContractService();
        const chainId = factoryInfo?.chainId || 6343;
        await contractService.renounceOwnership(chainId);
        console.log('✅ Ownership renounced');
      } catch (error) {
        console.error('❌ Failed to renounce ownership:', error);
      }
    }
  };

  const handleGetLaunchpadByIndex = async () => {
    try {
      const index = parseInt(indexInput);
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();
      const chainId = factoryInfo?.chainId || 6343;
      const address = await contractService.getLaunchpadByIndex(chainId, index);
      console.log(`Launchpad at index ${index}:`, address);
    } catch (error) {
      console.error('❌ Failed to get launchpad by index:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertDescription className="text-orange-700 dark:text-orange-300">
          <strong>Admin Controls:</strong> These operations can permanently affect the contract.
          Use with extreme caution and ensure you understand the implications.
        </AlertDescription>
      </Alert>

      {/* Fee Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Fee Management
          </CardTitle>
          <CardDescription>Configure platform fees and creation costs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Creation Fee */}
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="text-sm font-medium">Current Creation Fee</label>
                <p className="text-lg font-bold text-green-600">{factoryInfo?.creationFee || '0.01'} ETH</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Creation Fee (ETH)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.01"
                    value={creationFeeInput}
                    onChange={(e) => setCreationFeeInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleUpdateCreationFee} disabled={!creationFeeInput}>
                    Update
                  </Button>
                </div>
              </div>
            </div>

            {/* Platform Fee */}
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="text-sm font-medium">Current Platform Fee</label>
                <p className="text-lg font-bold text-blue-600">{factoryInfo?.platformFeePercentage || 2.5}%</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Platform Fee (%)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={platformFeeInput}
                    onChange={(e) => setPlatformFeeInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleUpdatePlatformFee} disabled={!platformFeeInput}>
                    Update
                  </Button>
                </div>
              </div>
            </div>

            {/* Free Mint Fee */}
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="text-sm font-medium">Current Free Mint Fee</label>
                <p className="text-lg font-bold text-purple-600">{factoryInfo?.freeMintPlatformFee || '0.001'} ETH</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Free Mint Fee (ETH)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="0.001"
                    value={freeMintFeeInput}
                    onChange={(e) => setFreeMintFeeInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleUpdateFreeMintFee} disabled={!freeMintFeeInput}>
                    Update
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treasury Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Treasury Management
          </CardTitle>
          <CardDescription>Manage treasury address and emergency operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <label className="text-sm font-medium text-muted-foreground">Current Treasury</label>
                <p className="font-mono text-sm break-all mt-1">{factoryInfo?.treasury || '0'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Treasury Address</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="0x..."
                    value={treasuryAddressInput}
                    onChange={(e) => setTreasuryAddressInput(e.target.value)}
                    className="flex-1 font-mono"
                  />
                  <Button onClick={handleUpdateTreasury} disabled={!treasuryAddressInput}>
                    Update
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 border-2 border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20">
                <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">Emergency Operations</h4>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  Use only in critical situations. These operations are irreversible.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleEmergencyWithdraw}
                  className="w-full"
                  size="sm"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Emergency Withdraw
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Launchpad Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            Launchpad Browser
          </CardTitle>
          <CardDescription>Query and inspect launchpad contracts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h6 className="font-medium mb-2">Get by Index</h6>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Index (0-based)"
                  value={indexInput}
                  onChange={(e) => setIndexInput(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleGetLaunchpadByIndex}
                  disabled={!indexInput}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Query Index
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h6 className="font-medium mb-2">Get All Addresses</h6>
              <p className="text-xs text-muted-foreground mb-3">Retrieve all launchpad addresses</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    const { ContractService } = await import('@/lib/contract-service');
                    const contractService = new ContractService();
                    const chainId = factoryInfo?.chainId || 6343;
                    const addresses = await contractService.getAllLaunchpadsFromBlockchain(chainId);
                    console.log('All launchpad addresses:', addresses);
                  } catch (error) {
                    console.error('❌ Failed to get all addresses:', error);
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Get All
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h6 className="font-medium mb-2">Total Launchpads</h6>
              <p className="text-2xl font-bold text-blue-600 mb-2">
                {factoryInfo?.totalLaunchpads || 0}
              </p>
              <Badge variant="outline" className="text-xs">
                Active Contracts
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ownership Management */}
      <Card className="border-2 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <Shield className="h-5 w-5" />
            Ownership Management
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">
            Critical operations that permanently affect contract ownership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <label className="text-sm font-medium text-red-700 dark:text-red-300">Current Owner</label>
            <p className="font-mono text-sm break-all mt-1">{factoryInfo?.owner || '0'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Transfer Ownership</h4>
              <div className="space-y-2">
                <Input
                  placeholder="New owner address (0x...)"
                  value={newOwnerInput}
                  onChange={(e) => setNewOwnerInput(e.target.value)}
                  className="font-mono"
                />
                <Button
                  variant="destructive"
                  onClick={handleTransferOwnership}
                  disabled={!newOwnerInput}
                  className="w-full"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Transfer Ownership
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Renounce Ownership</h4>
              <p className="text-sm text-muted-foreground">
                Permanently give up ownership. The contract will become ownerless.
              </p>
              <Button
                variant="destructive"
                onClick={handleRenounceOwnership}
                className="w-full"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Renounce Ownership
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}