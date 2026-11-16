'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Switch } from '@/components/ui/switch';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  Add01Icon,
  Delete02Icon,
  Calendar01Icon,
  Clock01Icon,
  UserMultiple01Icon,
  Coins01Icon
} from '@hugeicons/core-free-icons';

interface SalePhase {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  price: string;
  maxLimitPerWallet: number;
  isPublic: boolean;
  isEnabled: boolean;
}

interface SalePhasesProps {
  data: {
    phases: SalePhase[];
    enablePublicSale: boolean;
    publicSalePrice: string;
  };
  onChange: (data: any) => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function SalePhases({
  data,
  onChange,
  isExpanded = true,
  onToggle
}: SalePhasesProps) {
  const addPhase = () => {
    const newPhase: SalePhase = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Phase ${data.phases.length + 1}`,
      startTime: '',
      endTime: '',
      price: '0.1',
      maxLimitPerWallet: 1,
      isPublic: data.phases.length === 0, // First phase is public by default
      isEnabled: true
    };

    onChange({
      ...data,
      phases: [...data.phases, newPhase]
    });
  };

  const removePhase = (id: string) => {
    onChange({
      ...data,
      phases: data.phases.filter(phase => phase.id !== id)
    });
  };

  const updatePhase = (id: string, field: keyof SalePhase, value: any) => {
    onChange({
      ...data,
      phases: data.phases.map(phase =>
        phase.id === id ? { ...phase, [field]: value } : phase
      )
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-orange-500 text-white flex items-center justify-center text-sm font-semibold">
            4
          </div>
          <h4 className="text-lg font-semibold">Collection Sale Phase</h4>
        </div>
        {onToggle && (
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Phase Management Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Configure multiple sale phases with different pricing and access controls
              </p>
            </div>
            <Button onClick={addPhase} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Phase
            </Button>
          </div>

          {/* Phases List */}
          <div className="space-y-4">
            {data.phases.length === 0 ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No sale phases configured yet
                </p>
                <Button onClick={addPhase} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Phase
                </Button>
              </div>
            ) : (
              data.phases.map((phase, index) => (
                <Card key={phase.id} className="p-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={phase.isEnabled ? "default" : "secondary"}>
                        Phase {index + 1}
                      </Badge>
                      <Input
                        value={phase.name}
                        onChange={(e) => updatePhase(phase.id, 'name', e.target.value)}
                        className="font-medium bg-transparent border-none px-2 py-1 h-auto"
                        placeholder="Phase Name"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Enabled</span>
                        <Switch
                          checked={phase.isEnabled}
                          onCheckedChange={(checked) => updatePhase(phase.id, 'isEnabled', checked)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePhase(phase.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Start Time *
                      </label>
                      <Input
                        type="datetime-local"
                        value={phase.startTime}
                        onChange={(e) => updatePhase(phase.id, 'startTime', e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        End Time *
                      </label>
                      <Input
                        type="datetime-local"
                        value={phase.endTime}
                        onChange={(e) => updatePhase(phase.id, 'endTime', e.target.value)}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        <Coins className="w-3 h-3 inline mr-1" />
                        Price (ETH) *
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={phase.price}
                        onChange={(e) => updatePhase(phase.id, 'price', e.target.value)}
                        placeholder="e.g. 0.1"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        <Users className="w-3 h-3 inline mr-1" />
                        Max Limit per Wallet *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={phase.maxLimitPerWallet}
                        onChange={(e) => updatePhase(phase.id, 'maxLimitPerWallet', parseInt(e.target.value) || 1)}
                        placeholder="e.g. 1"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={phase.isPublic}
                        onCheckedChange={(checked) => updatePhase(phase.id, 'isPublic', checked)}
                      />
                      <span className="text-sm">Public Sale</span>
                    </div>

                    {!phase.isPublic && (
                      <Badge variant="outline" className="text-xs">
                        Private/Whitelist Only
                      </Badge>
                    )}
                  </div>

                  {/* Phase Preview */}
                  <div className="mt-4 p-3 bg-background rounded-md border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <p className="font-medium">
                          {phase.startTime && phase.endTime
                            ? `${formatDateTime(phase.startTime)} → ${formatDateTime(phase.endTime)}`
                            : 'Not configured'
                          }
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <p className="font-medium">{phase.price} ETH</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Access:</span>
                        <p className="font-medium">
                          {phase.isPublic ? 'Public' : 'Private'} · Max {phase.maxLimitPerWallet} per wallet
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Summary */}
          {data.phases.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="text-sm font-medium mb-2">Sale Phases Summary</h5>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Phases:</span>
                  <p className="font-medium">{data.phases.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Active Phases:</span>
                  <p className="font-medium">{data.phases.filter(p => p.isEnabled).length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Public Phases:</span>
                  <p className="font-medium">{data.phases.filter(p => p.isPublic).length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price Range:</span>
                  <p className="font-medium">
                    {data.phases.length > 0
                      ? `${Math.min(...data.phases.map(p => parseFloat(p.price)))}-${Math.max(...data.phases.map(p => parseFloat(p.price)))} ETH`
                      : '0 ETH'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validation indicators */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={data.phases.length > 0 ? "default" : "secondary"} className="px-2 py-1">
              {data.phases.length > 0 ? "✓" : "○"} Phases Configured
            </Badge>
            <Badge variant={data.phases.some(p => p.isEnabled) ? "default" : "secondary"} className="px-2 py-1">
              {data.phases.some(p => p.isEnabled) ? "✓" : "○"} Active Phases
            </Badge>
            <Badge variant={data.phases.some(p => p.startTime && p.endTime) ? "default" : "secondary"} className="px-2 py-1">
              {data.phases.some(p => p.startTime && p.endTime) ? "✓" : "○"} Time Configured
            </Badge>
          </div>
        </div>
      )}
    </Card>
  );
}