'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Search01Icon,
  Shield01Icon,
  FlashIcon,
  UserMultiple01Icon,
  DollarCircleIcon,
  Activity01Icon,
  ArrowUpRight01Icon,
  Alert01Icon,
  View01Icon,
  PencilEdit01Icon,
  Wallet01Icon,
  ArrowUpDown01Icon,
  CreditCard01Icon,
  ShieldBlockedIcon,
  Settings01Icon
} from '@hugeicons/core-free-icons';
import { SimpleCollectionCreator, type CollectionData } from './simple-collection-creator';
import { AdminSidebar } from './admin-sidebar';
import { EnhancedMetricsDashboard } from './enhanced-metrics-dashboard';
import { EnhancedAdminControls } from './enhanced-admin-controls';
import CreatorStudio from './creator-studio';

interface LaunchpadInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: number;
  mintedTokens: number;
  creator: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminDashboardProps {
  isConnected?: boolean;
  userAddress?: string;
  isOwner?: boolean;
  factoryInfo?: {
    version: string;
    chainId: number;
    totalLaunchpads: number;
    creationFee: string;
    platformFeePercentage: number;
    freeMintPlatformFee: string;
    treasury: string;
    owner: string;
  };
  launchpads?: LaunchpadInfo[];
  onCreateCollection?: () => void;
}

export default function AdminDashboard({
  isConnected = true,
  userAddress = "0x1234...5678",
  isOwner = false,
  factoryInfo,
  launchpads = [],
  onCreateCollection = () => {}
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'launchpads' | 'analytics' | 'users' | 'admin' | 'settings'>('launchpads');
  const [searchQuery, setSearchQuery] = useState('');


  const handleCollectionSubmit = async (data: CollectionData) => {
    try {
      // Import the new contract service
      const { ContractService } = await import('@/lib/contract-service');
      const contractService = new ContractService();

      console.log('Creating NFT Collection with data:', data);

      // Step 1: Create the collection via LaunchpadFactory
      const createTx = await contractService.createLaunchpad(data.chainId, {
        name: data.name,
        symbol: data.symbol,
        description: data.description,
        baseURI: data.baseURI,
        unrevealedURI: data.unrevealedURI,
        contractURI: data.contractURI,
        externalLink: data.externalLink,
        totalMaxSupply: data.totalMaxSupply,
        treasury: data.treasury,
        royaltyRecipient: data.royaltyRecipient,
        royaltyPercentage: data.royaltyPercentage
      });

      console.log('Collection creation transaction:', createTx);

      // Note: In a real implementation, you would:
      // 1. Wait for the transaction to be mined
      // 2. Parse the transaction receipt to get the deployed collection address
      // 3. Then add mint phases to the deployed collection

      // For now, we'll just show success
      console.log('✅ NFT Collection creation transaction submitted!');
      console.log('🔍 Transaction Hash:', createTx);

      // Call the success callback
      onCreateCollection();

    } catch (error: any) {
      console.error('❌ Error creating NFT Collection:', error);

      // Handle specific error types
      if (error.code === 4001) {
        console.error('Transaction rejected by user');
      } else if (error.code === -32603) {
        console.error('Internal RPC error - check network connection');
      } else {
        console.error('Unexpected error:', error.message || error);
      }

      throw error;
    }
  };

  // Generate mock data for the enhanced components
  const mockMetricsData = {
    totalLaunchpads: factoryInfo?.totalLaunchpads || 12,
    totalCreators: 45,
    totalVolume: "156.7",
    totalFees: "4.2",
    recentActivity: 23,
    networkHealth: 'good' as const,
    growthRate: 15.2,
    avgGasPrice: "0.002",
    successRate: 98.5,
    avgDeployTime: 2.1,
    activeUsers: 128
  };

  const chainName = "XONE Chain";

  // Show Creator Studio as full page when in launchpads tab
  if (activeTab === 'launchpads') {
    return <CreatorStudio onSubmit={handleCollectionSubmit} factoryInfo={factoryInfo} />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
        isOwner={isOwner}
        userAddress={userAddress}
        className="border-r"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'analytics' && 'Analytics & Insights'}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'admin' && 'Admin Controls'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
              <p className="text-muted-foreground">
                {activeTab === 'dashboard' && 'Real-time overview of your NFT launchpad platform'}
                {activeTab === 'analytics' && 'Detailed performance metrics and insights'}
                {activeTab === 'users' && 'Manage creators and user accounts'}
                {activeTab === 'admin' && 'System administration and configuration'}
                {activeTab === 'settings' && 'Platform settings and preferences'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
              </Badge>
              {isOwner && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500">
                  Owner
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <EnhancedMetricsDashboard
              data={mockMetricsData}
              chainName={chainName}
              factoryInfo={factoryInfo}
            />
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <EnhancedMetricsDashboard
              data={mockMetricsData}
              chainName={chainName}
              factoryInfo={factoryInfo}
            />
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <Card>
              <div className="p-6 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">User Management</h3>
                <p className="text-muted-foreground">User management features coming soon.</p>
              </div>
            </Card>
          )}

          {/* ADMIN TAB (Owner Only) */}
          {activeTab === 'admin' && (
            <EnhancedAdminControls
              factoryInfo={factoryInfo}
              isOwner={isOwner}
            />
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <Card>
              <div className="p-6 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Settings</h3>
                <p className="text-muted-foreground">Platform settings and configuration options coming soon.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}