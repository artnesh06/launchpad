'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ChainSelector } from '@/components/admin/chain-selector';
import { useWallet } from '@/hooks/use-wallet';
import { useNotifications } from '@/hooks/use-notifications';
import { ContractService } from '@/lib/contract-service';
import AdminService from '@/lib/api/admin-service';
import { getChainConfig } from '@/config/chains';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Add01Icon, 
  Settings01Icon, 
  View01Icon, 
  Shield01Icon, 
  Alert01Icon,
  Wallet01Icon,
  FactoryIcon,
  UserMultiple01Icon,
  Coins01Icon,
  Refresh01Icon,
  Search01Icon,
  ArrowUpRight01Icon,
  Crown01Icon,
  AlertCircleIcon
} from '@hugeicons/core-free-icons';

interface FactoryInfo {
  version: string;
  chainId: number;
  deployedChainId: number;
  totalCollections: number;
  creationFeeAmount: string;
  treasury: string;
  owner: string;
  platformFeeInfo: {
    percentage: number;
    freeMintFee: string;
    treasury: string;
  };
}

export default function SimpleAdminDashboard() {
  const { address, isConnected, chainId } = useWallet();
  const { notify } = useNotifications();
  
  const [currentChain, setCurrentChain] = useState(getChainConfig(chainId || 1));
  const [factoryInfo, setFactoryInfo] = useState<FactoryInfo | null>(null);
  const [launchpads, setLaunchpads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLaunchpad, setSelectedLaunchpad] = useState<string>('');
  const [launchpadDetails, setLaunchpadDetails] = useState<any>(null);

  // Simple Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    symbol: '',
    description: '',
    maxSupply: 10000,
    royaltyPercentage: 500, // 5%
    treasury: address || ''
  });

  // Admin Settings State
  const [adminSettings, setAdminSettings] = useState({
    newCreationFee: '',
    newPlatformFee: '',
    newFreeMintFee: '',
    newTreasury: '',
    newOwner: ''
  });

  useEffect(() => {
    if (chainId) {
      setCurrentChain(getChainConfig(chainId));
    }
  }, [chainId]);

  useEffect(() => {
    if (isConnected && currentChain?.launchpadFactoryAddress) {
      loadAllData();
    }
  }, [isConnected, currentChain, address]);

  const loadAllData = async () => {
    if (!currentChain?.launchpadFactoryAddress) return;
    
    setLoading(true);
    try {
      const contractService = new ContractService();
      
      // Load factory info (comprehensive)
      const factoryData = await contractService.getFactoryInfo(currentChain.id);
      setFactoryInfo({
        version: factoryData.version,
        chainId: factoryData.chainId,
        deployedChainId: factoryData.chainId,
        totalCollections: factoryData.totalCollections || 0,
        creationFeeAmount: factoryData.creationFeeAmount,
        treasury: factoryData.treasury,
        owner: address || '',
        platformFeeInfo: { percentage: 250, freeMintFee: '0', treasury: '' }
      });

      // Load all launchpads
      const launchpadData = await contractService.getAllLaunchpads(currentChain.id);
      setLaunchpads(launchpadData.slice(0, 20)); // Show latest 20

      notify.success('Data Loaded', 'All factory data loaded successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      notify.error('Load Failed', 'Failed to load factory data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLaunchpad = async () => {
    if (!createForm.name || !createForm.symbol) {
      notify.error('Validation Error', 'Name and symbol are required');
      return;
    }

    if (!isConnected || !address) {
      notify.error('Wallet Error', 'Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      const contractService = new ContractService();
      const txHash = await contractService.createLaunchpad(currentChain!.id, {
        name: createForm.name,
        symbol: createForm.symbol,
        description: createForm.description,
        baseURI: '',
        unrevealedURI: '',
        contractURI: '',
        externalLink: '',
        totalMaxSupply: createForm.maxSupply,
        treasury: createForm.treasury || address,
        royaltyRecipient: createForm.treasury || address,
        royaltyPercentage: createForm.royaltyPercentage
      });

      notify.success('Collection Created!', 'Your NFT collection is being deployed', {
        action: {
          label: 'View Transaction',
          onClick: () => window.open(`${currentChain?.blockExplorer}/tx/${txHash}`, '_blank')
        }
      });

      // Reset form
      setCreateForm({
        name: '',
        symbol: '',
        description: '',
        maxSupply: 10000,
        royaltyPercentage: 500,
        treasury: address || ''
      });

      // Refresh data
      setTimeout(() => loadAllData(), 5000);
    } catch (error) {
      notify.error('Creation Failed', 'Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (action: string, value: string) => {
    if (!isConnected || !currentChain) return;

    setLoading(true);
    try {
      const contractService = new ContractService();
      let txHash = '';

      switch (action) {
        case 'setCreationFee':
          txHash = await contractService.setCreationFee(currentChain.id, value);
          break;
        case 'setPlatformFee':
          const [percentage, freeMintFee] = value.split(',');
          txHash = await contractService.setPlatformFee(currentChain.id, parseInt(percentage), freeMintFee);
          break;
        case 'setPlatformTreasury':
          txHash = await contractService.setPlatformTreasury(currentChain.id, value);
          break;
        case 'transferOwnership':
          txHash = await contractService.transferOwnership(currentChain.id, value);
          break;
        case 'emergencyWithdraw':
          txHash = await contractService.emergencyWithdraw(currentChain.id);
          break;
      }

      notify.success('Transaction Sent', `${action} transaction submitted`, {
        action: {
          label: 'View on Explorer',
          onClick: () => window.open(`${currentChain?.blockExplorer}/tx/${txHash}`, '_blank')
        }
      });

      // Refresh data
      setTimeout(() => loadAllData(), 3000);
    } catch (error) {
      notify.error('Transaction Failed', `Failed to execute ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLaunchpadDetails = async (address: string) => {
    if (!currentChain) return;

    try {
      const contractService = new ContractService();
      const details = await contractService.getLaunchpadInfo(currentChain.id, address);
      setLaunchpadDetails(details);
    } catch (error) {
      notify.error('Error', 'Failed to get launchpad details');
    }
  };

  const isOwner = factoryInfo?.owner.toLowerCase() === address?.toLowerCase();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <Wallet className="w-16 h-16 mx-auto text-primary mb-4" />
            <Heading title="Admin Panel" description="Connect your wallet to access the launchpad factory admin panel" />
          </div>
          <Alert>
            <Crown className="h-4 w-4" />
            <AlertTitle>Owner Access Required</AlertTitle>
            <AlertDescription>
              Only the contract owner can access admin functions
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Simple Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Factory className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <Heading title="Launchpad Factory" description={`${factoryInfo?.version || '0'} • Chain ${currentChain?.name}`} />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ChainSelector
              currentChainId={chainId || 1}
              onChainChange={(newChainId) => setCurrentChain(getChainConfig(newChainId))}
            />
            <Button onClick={loadAllData} disabled={loading} size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Owner Status */}
        {factoryInfo && (
          <Alert variant={isOwner ? "default" : "destructive"}>
            <Crown className="h-4 w-4" />
            <AlertTitle>
              {isOwner ? "Contract Owner" : "Not Owner"}
            </AlertTitle>
            <AlertDescription>
              {isOwner 
                ? "You have full admin access to all factory functions"
                : `Contract owner: ${factoryInfo.owner.slice(0, 10)}...`
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        {factoryInfo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Factory className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{factoryInfo.totalCollections}</p>
                  <p className="text-sm text-muted-foreground">Collections</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Coins className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{factoryInfo.creationFeeAmount}</p>
                  <p className="text-sm text-muted-foreground">Creation Fee (ETH)</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{(factoryInfo.platformFeeInfo.percentage / 100).toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Platform Fee</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-lg font-bold">{factoryInfo.platformFeeInfo.freeMintFee}</p>
                  <p className="text-sm text-muted-foreground">Free Mint Fee (ETH)</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2" disabled={!isOwner}>
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2" disabled={!isOwner}>
              <Shield className="w-4 h-4" />
              Admin
            </TabsTrigger>
          </TabsList>

          {/* Create Tab - Simplified */}
          <TabsContent value="create">
            <Card className="p-6">
              <div className="mb-6">
                <Heading title="Create New Collection" description="Deploy a new NFT collection contract" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Collection Name *</label>
                    <Input
                      placeholder="My NFT Collection"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Symbol *</label>
                    <Input
                      placeholder="MNC"
                      value={createForm.symbol}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Input
                      placeholder="Collection description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Supply</label>
                    <Input
                      type="number"
                      min="1"
                      value={createForm.maxSupply}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, maxSupply: parseInt(e.target.value) || 10000 }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Royalty %</label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={createForm.royaltyPercentage / 100}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, royaltyPercentage: (parseFloat(e.target.value) || 0) * 100 }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Treasury Address</label>
                    <Input
                      placeholder={address || ''}
                      value={createForm.treasury}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, treasury: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleCreateLaunchpad}
                  disabled={!createForm.name || !createForm.symbol || loading}
                  size="lg"
                >
                  {loading ? 'Creating...' : `Create Collection (${factoryInfo?.creationFeeAmount || '0'} ETH)`}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Browse Tab */}
          <TabsContent value="browse">
            <div className="space-y-4">
              {/* Search */}
              <Card className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search launchpad address..."
                      value={selectedLaunchpad}
                      onChange={(e) => setSelectedLaunchpad(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button onClick={() => handleGetLaunchpadDetails(selectedLaunchpad)} disabled={!selectedLaunchpad}>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </Card>

              {/* Launchpad Details */}
              {launchpadDetails && (
                <Card className="p-6">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold">Launchpad Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{launchpadDetails.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Symbol:</span>
                      <p className="font-medium">{launchpadDetails.symbol}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Creator:</span>
                      <p className="font-mono text-xs">{launchpadDetails.creator}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Supply:</span>
                      <p className="font-medium">{launchpadDetails.totalSupply?.toString()}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Recent Launchpads */}
              <Card className="p-6">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold">Recent Collections ({launchpads.length})</h4>
                </div>
                <div className="space-y-3">
                  {launchpads.slice(0, 10).map((launchpad, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{launchpad.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground font-mono">{launchpad.contractAddress?.slice(0, 20)}...</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleGetLaunchpadDetails(launchpad.contractAddress)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold">Fee Management</h4>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Creation Fee (ETH)</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          placeholder={factoryInfo?.creationFeeAmount}
                          value={adminSettings.newCreationFee}
                          onChange={(e) => setAdminSettings(prev => ({ ...prev, newCreationFee: e.target.value }))}
                        />
                        <Button 
                          onClick={() => handleAdminAction('setCreationFee', adminSettings.newCreationFee)}
                          disabled={!adminSettings.newCreationFee || loading}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Platform Fee (%)</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder={(factoryInfo?.platformFeeInfo.percentage || 0 / 100).toString()}
                          value={adminSettings.newPlatformFee}
                          onChange={(e) => setAdminSettings(prev => ({ ...prev, newPlatformFee: e.target.value }))}
                        />
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder={factoryInfo?.platformFeeInfo.freeMintFee}
                          value={adminSettings.newFreeMintFee}
                          onChange={(e) => setAdminSettings(prev => ({ ...prev, newFreeMintFee: e.target.value }))}
                        />
                        <Button 
                          onClick={() => handleAdminAction('setPlatformFee', `${adminSettings.newPlatformFee},${adminSettings.newFreeMintFee}`)}
                          disabled={!adminSettings.newPlatformFee || !adminSettings.newFreeMintFee || loading}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Platform Treasury</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={factoryInfo?.platformFeeInfo.treasury}
                        value={adminSettings.newTreasury}
                        onChange={(e) => setAdminSettings(prev => ({ ...prev, newTreasury: e.target.value }))}
                        className="font-mono text-sm"
                      />
                      <Button 
                        onClick={() => handleAdminAction('setPlatformTreasury', adminSettings.newTreasury)}
                        disabled={!adminSettings.newTreasury || loading}
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin">
            <div className="space-y-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Danger Zone</AlertTitle>
                <AlertDescription>
                  These operations are irreversible and can affect the entire platform.
                </AlertDescription>
              </Alert>
              
              <Card className="p-6">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold">Ownership Management</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Transfer Ownership</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="New owner address"
                        value={adminSettings.newOwner}
                        onChange={(e) => setAdminSettings(prev => ({ ...prev, newOwner: e.target.value }))}
                        className="font-mono text-sm"
                      />
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" disabled={!adminSettings.newOwner}>
                            Transfer
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>⚠️ Transfer Ownership</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                This will permanently transfer contract ownership to {adminSettings.newOwner}. 
                                You will lose all admin access. This cannot be undone!
                              </AlertDescription>
                            </Alert>
                          </div>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleAdminAction('transferOwnership', adminSettings.newOwner)}
                            >
                              Confirm Transfer
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold">Emergency Functions</h4>
                </div>
                <div className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        Emergency Withdraw
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>⚠️ Emergency Withdraw</DialogTitle>
                      </DialogHeader>
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This will withdraw all contract funds. Use only in emergency situations.
                        </AlertDescription>
                      </Alert>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleAdminAction('emergencyWithdraw', '')}
                        >
                          Confirm Withdraw
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}