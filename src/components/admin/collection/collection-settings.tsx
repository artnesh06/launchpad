'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
interface CollectionSettingsProps {
  data: {
    royaltyPayeeAddress: string;
    royaltyPercentage: number;
    maxSupply: number;
  };
  onChange: (data: any) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function CollectionSettings({ 
  data, 
  onChange, 
  isExpanded = true, 
  onToggle 
}: CollectionSettingsProps) {
  const handleInputChange = (field: string, value: string | number) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  const handlePercentageChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
      handleInputChange('royaltyPercentage', numValue * 100); // Convert to basis points
    }
  };

  return (
    <Card className="border-2 border-border/50 hover:border-border transition-colors">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
              2
            </div>
            <div>
              <h4 className="text-lg font-semibold">Collection Settings</h4>
              <p className="text-xs text-muted-foreground mt-1">Configure royalties and supply limits</p>
            </div>
          </div>
          {onToggle && (
            <Button variant="ghost" size="sm" onClick={onToggle} className="h-8 w-8 p-0">
              {isExpanded ? <HugeiconsIcon icon={ArrowUp01Icon} size={16} /> : <HugeiconsIcon icon={ArrowDown01Icon} size={16} />}
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Royalty Payee Address
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">Required</Badge>
                </label>
                <Input
                  placeholder="0x..."
                  value={data.royaltyPayeeAddress}
                  onChange={(e) => handleInputChange('royaltyPayeeAddress', e.target.value)}
                  className={`h-11 font-mono text-sm ${data.royaltyPayeeAddress ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                <p className="text-xs text-muted-foreground">
                  Ethereum address that will receive royalty payments from secondary sales
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Royalty Percentage
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">Required</Badge>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="5.0"
                    min="0"
                    max="10"
                    step="0.1"
                    value={data.royaltyPercentage / 100}
                    onChange={(e) => handlePercentageChange(e.target.value)}
                    className={`h-11 ${data.royaltyPercentage > 0 ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                  />
                  <div className="px-3 py-2 bg-muted rounded-lg text-sm font-medium text-muted-foreground">
                    %
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Percentage of sales price (0-10%, recommended: 2.5-7.5%)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                Maximum Supply
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">Required</Badge>
              </label>
              <div className="max-w-md">
                <Input
                  type="number"
                  placeholder="10000"
                  min="1"
                  max="1000000"
                  value={data.maxSupply || ''}
                  onChange={(e) => handleInputChange('maxSupply', parseInt(e.target.value) || 0)}
                  className={`h-11 ${data.maxSupply > 0 ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Total number of NFTs that can ever be minted (1-1,000,000)
                </p>
              </div>
            </div>

            {/* Settings Preview */}
            <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-5 border border-border/50">
              <h5 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground">
                <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                  <span className="text-xs">📊</span>
                </div>
                Settings Preview
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Royalty Rate</span>
                  <p className="text-lg font-bold text-primary">
                    {(data.royaltyPercentage / 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">per secondary sale</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Max Supply</span>
                  <p className="text-lg font-bold text-primary">
                    {data.maxSupply > 0 ? data.maxSupply.toLocaleString() : '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">total NFTs</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Est. Earnings (if 1 ETH sale)</span>
                  <p className="text-lg font-bold text-green-600">
                    {(data.royaltyPercentage / 100 * 1).toFixed(3)} ETH
                  </p>
                  <p className="text-xs text-muted-foreground">per resale</p>
                </div>
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="text-sm font-medium mb-3 text-foreground">Completion Status</h5>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${data.royaltyPayeeAddress ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`text-xs ${data.royaltyPayeeAddress ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}`}>
                    Payee Address
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${data.royaltyPercentage > 0 ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`text-xs ${data.royaltyPercentage > 0 ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}`}>
                    Royalty Rate
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${data.maxSupply > 0 ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`text-xs ${data.maxSupply > 0 ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}`}>
                    Max Supply
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}