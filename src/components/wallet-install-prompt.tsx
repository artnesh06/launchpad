'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon, SmartPhone01Icon, ComputerIcon } from '@hugeicons/core-free-icons';
import { WalletProvider } from '@/types/wallet';

interface WalletInstallPromptProps {
  provider: WalletProvider;
  onClose: () => void;
}

export function WalletInstallPrompt({ provider, onClose }: WalletInstallPromptProps) {
  const handleInstallClick = () => {
    if (provider.downloadUrl) {
      window.open(provider.downloadUrl, '_blank');
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <div className="text-center">
          {/* Wallet Icon */}
          <div className="text-4xl mb-4">
            {provider.icon}
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-semibold text-white mb-2">
            Install {provider.name}
          </h3>
          
          {/* Description */}
          <p className="text-gray-400 mb-6 text-sm">
            You need to install {provider.name} to continue. It's a secure wallet for storing your cryptocurrencies and NFTs.
          </p>

          {/* Install Options */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
              <HugeiconsIcon icon={ComputerIcon} size={16} />
              <span>Browser Extension</span>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
              <HugeiconsIcon icon={SmartPhone01Icon} size={16} />
              <span>Mobile App Available</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={handleInstallClick}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} className="mr-2" />
              Install {provider.name}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>

          {/* Security Note */}
          <div className="mt-4 p-3 bg-gray-900 rounded-lg">
            <Badge variant="secondary" className="mb-2">
              Security Tip
            </Badge>
            <p className="text-xs text-gray-400">
              Always download wallets from official websites. Never share your seed phrase or private keys.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}