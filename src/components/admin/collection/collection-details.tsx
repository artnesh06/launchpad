'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
interface CollectionDetailsProps {
  data: {
    collectionName: string;
    collectionSymbol: string;
    description: string;
  };
  onChange: (data: any) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function CollectionDetails({ 
  data, 
  onChange, 
  isExpanded = true, 
  onToggle 
}: CollectionDetailsProps) {
  const handleInputChange = (field: string, value: string) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <Card className="border-2 border-border/50 hover:border-border transition-colors">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-lg">
              1
            </div>
            <div>
              <h4 className="text-lg font-semibold">Collection Details</h4>
              <p className="text-xs text-muted-foreground mt-1">Basic information about your NFT collection</p>
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
                  Collection Name
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">Required</Badge>
                </label>
                <Input
                  placeholder="Enter your collection name"
                  value={data.collectionName}
                  onChange={(e) => handleInputChange('collectionName', e.target.value)}
                  className={`h-11 ${data.collectionName ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                <p className="text-xs text-muted-foreground">This will be the public name of your NFT collection</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Collection Symbol
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">Required</Badge>
                </label>
                <Input
                  placeholder="e.g. MYNFT"
                  value={data.collectionSymbol}
                  onChange={(e) => handleInputChange('collectionSymbol', e.target.value.toUpperCase())}
                  className={`h-11 ${data.collectionSymbol ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">Short identifier for your collection (max 10 characters)</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                Description
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Optional</Badge>
              </label>
              <div className="relative">
                <textarea
                  placeholder="Tell your community about your collection..."
                  value={data.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={`min-h-[100px] w-full rounded-lg border-2 border-input bg-background px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors ${data.description ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                  rows={4}
                  maxLength={500}
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {data.description.length}/500
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Describe what makes your collection unique and special</p>
            </div>

            {/* Progress Indicators */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h5 className="text-sm font-medium mb-3 text-foreground">Completion Status</h5>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${data.collectionName ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`text-xs ${data.collectionName ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}`}>
                    Collection Name
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${data.collectionSymbol ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`text-xs ${data.collectionSymbol ? 'text-green-700 dark:text-green-300 font-medium' : 'text-muted-foreground'}`}>
                    Symbol
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${data.description ? 'bg-blue-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`text-xs ${data.description ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-muted-foreground'}`}>
                    Description
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