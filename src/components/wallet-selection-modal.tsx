'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon, Download01Icon, TickDouble02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { WalletProvider } from '@/types/wallet';
import { getAllWallets } from '@/utils/wallet-providers';

interface WalletSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWalletSelect: (provider: WalletProvider) => Promise<void>;
  isConnecting: boolean;
}

export function WalletSelectionModal({ 
  open, 
  onOpenChange, 
  onWalletSelect, 
  isConnecting 
}: WalletSelectionModalProps) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const wallets = getAllWallets();

  const handleWalletClick = async (provider: WalletProvider) => {
    if (isConnecting) return;
    
    setSelectedWallet(provider.id);
    
    try {
      if (!provider.isInstalled()) {
        // Open download link in new tab
        window.open(provider.downloadUrl, '_blank');
        return;
      }
      
      await onWalletSelect(provider);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setSelectedWallet(null);
    }
  };

  const getWalletStatus = (provider: WalletProvider) => {
    if (selectedWallet === provider.id && isConnecting) {
      return 'connecting';
    }
    if (provider.isInstalled()) {
      return 'installed';
    }
    return 'not-installed';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connecting':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'installed':
        return <HugeiconsIcon icon={TickDouble02Icon} size={16} className="text-green-500" />;
      case 'not-installed':
        return <HugeiconsIcon icon={Download01Icon} size={16} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'installed':
        return 'Installed';
      case 'not-installed':
        return 'Install';
      default:
        return '';
    }
  };

  return (
    <Modal 
      isOpen={open} 
      onClose={() => onOpenChange(false)}
      title="Connect a Wallet"
      description="Choose your preferred wallet to connect to the application"
      className="max-w-md"
    >
      <div className="space-y-3">
          {wallets.map((provider) => {
            const status = getWalletStatus(provider);
            const isInstalled = provider.isInstalled();
            const isConnecting = selectedWallet === provider.id && status === 'connecting';
            
            return (
              <Card
                key={provider.id}
                className={`cursor-pointer transition-all duration-200 border-gray-700 hover:border-blue-500 bg-gray-800 hover:bg-gray-750 ${
                  isConnecting ? 'border-blue-500 bg-blue-900/20' : ''
                }`}
                onClick={() => handleWalletClick(provider)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Wallet Icon */}
                      <div className="text-2xl">
                        {provider.icon}
                      </div>
                      
                      {/* Wallet Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-white">
                            {provider.name}
                          </h3>
                          {provider.id === 'walletconnect' && (
                            <Badge variant="secondary" className="text-xs">
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {provider.description}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(status)}
                      <span className={`text-sm ${
                        status === 'installed' ? 'text-green-500' : 
                        status === 'connecting' ? 'text-blue-400' : 'text-gray-400'
                      }`}>
                        {getStatusText(status)}
                      </span>
                      {!isInstalled && (
                        <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} className="text-gray-400 ml-1" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-6 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-start space-x-2">
            <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="font-medium">New to Ethereum?</p>
              <p className="text-gray-400 mt-1">
                Learn more about wallets and how to get started with cryptocurrency.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    );
}