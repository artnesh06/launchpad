'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick01Icon, ArrowUpRight01Icon, Alert01Icon } from '@hugeicons/core-free-icons';
import { SUPPORTED_CHAINS, getChainConfig, type ChainConfig } from '@/config/chains';


interface ChainSelectorProps {
  currentChainId: number;
  onChainChange: (chainId: number) => void;
  className?: string;
}

export function ChainSelector({ currentChainId, onChainChange, className }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentChain = getChainConfig(currentChainId);
  const supportedChains = Object.values(SUPPORTED_CHAINS);

  const handleChainSelect = async (chainId: number) => {
    try {
      // Request chain switch via wallet
      if (window.ethereum) {
        await (window.ethereum as any).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      }
      onChainChange(chainId);
      setIsOpen(false);
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to wallet, attempt to add it
        const chain = getChainConfig(chainId);
        if (chain && window.ethereum) {
          try {
            await (window.ethereum as any).request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${chainId.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrl],
                blockExplorerUrls: [chain.blockExplorer],
              }],
            });
            onChainChange(chainId);
            setIsOpen(false);
          } catch (addError) {
            console.error('Failed to add chain:', addError);
          }
        }
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-auto p-3"
      >
        <div className="flex items-center gap-3">
          {currentChain && (
            <img 
              src={currentChain.icon} 
              alt={currentChain.name}
              className="w-6 h-6 rounded-full"
            />
          )}
          <div className="text-left">
            <div className="font-medium">
              {currentChain?.name || 'Unknown Chain'}
            </div>
            <div className="text-xs text-muted-foreground">
              Chain ID: {currentChainId}
            </div>
          </div>
          {currentChain?.isTestnet && (
            <Badge variant="secondary" className="text-xs">
              Testnet
            </Badge>
          )}
          {!currentChain && (
            <Badge variant="destructive" className="text-xs">
              <HugeiconsIcon icon={Alert01Icon} size={12} className="mr-1" />
              Unsupported
            </Badge>
          )}
        </div>
        <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 p-2 max-h-80 overflow-auto">
          <div className="space-y-1">
            {supportedChains.map((chain) => (
              <Button
                key={chain.id}
                variant="ghost"
                onClick={() => handleChainSelect(chain.id)}
                className="w-full justify-start p-3 h-auto"
              >
                <div className="flex items-center gap-3 flex-1">
                  <img 
                    src={chain.icon} 
                    alt={chain.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="text-left flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {chain.name}
                      {chain.isTestnet && (
                        <Badge variant="secondary" className="text-xs">
                          Testnet
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Chain ID: {chain.id} • {chain.nativeCurrency.symbol}
                    </div>
                  </div>
                  {currentChainId === chain.id && (
                    <HugeiconsIcon icon={Tick01Icon} size={16} className="text-green-500" />
                  )}
                </div>
              </Button>
            ))}
          </div>
          
          <div className="mt-4 pt-2 border-t">
            <div className="text-xs text-muted-foreground text-center">
              {supportedChains.length} supported networks
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}