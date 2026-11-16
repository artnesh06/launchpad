'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock01Icon, UserMultiple01Icon, Coins01Icon, CheckmarkCircle01Icon, Timer01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface MintPhase {
  id?: number | string;
  phaseIndex?: number;
  name: string;
  phaseType?: string;
  startTime: Date;
  endTime: Date | null;
  price: string;
  isActive: boolean;
  maxPerWallet?: number;
  totalLimit?: number;
  mintedCount?: number;
  merkleRoot?: string;
  requiresWhitelist?: boolean;
}

interface MintPhaseDisplayProps {
  phases: MintPhase[];
  currentPhase?: MintPhase;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const total = target - now;

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeRemaining.total <= 0) {
    return <span className="font-mono text-[11px]">Started</span>;
  }

  return (
    <span className="font-mono text-[11px] font-medium">
      {timeRemaining.days > 0 && `${timeRemaining.days}d `}
      {String(timeRemaining.hours).padStart(2, '0')}:
      {String(timeRemaining.minutes).padStart(2, '0')}:
      {String(timeRemaining.seconds).padStart(2, '0')}
    </span>
  );
}

function PhaseCard({ phase, isActive }: { phase: MintPhase; isActive: boolean }) {
  const now = new Date();
  const startTime = new Date(phase.startTime);
  const endTime = phase.endTime ? new Date(phase.endTime) : null;
  
  const isUpcoming = startTime > now;
  const isEnded = endTime && endTime < now;
  const isCurrentlyActive = isActive && !isEnded && !isUpcoming;

  // Format price (convert from wei to ETH if needed)
  const formatPrice = (price: string) => {
    const priceNum = parseFloat(price);
    if (priceNum === 0) return 'Free';
    
    // If price is very large, assume it's in wei
    if (priceNum > 1000000) {
      return `${(priceNum / 1e18).toFixed(4)} ETH`;
    }
    
    return `${priceNum} ETH`;
  };

  // Format date - very compact
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Get phase type
  const getPhaseType = () => {
    const type = phase.phaseType?.toUpperCase() || 'PUBLIC';
    const requiresWhitelist = phase.requiresWhitelist || phase.merkleRoot;
    
    if (requiresWhitelist || type === 'ALLOWLIST' || type === 'PRESALE') {
      return 'Allowlist';
    }
    
    return 'Public';
  };

  // Get status
  const getStatus = () => {
    if (isEnded) return 'Ended';
    if (isCurrentlyActive) return 'Active';
    if (isUpcoming) return 'Upcoming';
    return null;
  };

  const status = getStatus();

  return (
    <div
      className={cn(
        'rounded-lg border border-[#2F3336] bg-[#16171A] p-2.5 transition-all',
        isCurrentlyActive && 'border-primary/50 bg-primary/5'
      )}
    >
      {/* Single row layout */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Name and badges */}
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-mono text-xs font-semibold text-foreground truncate">
            {phase.name}
          </h3>
          <div className="flex gap-1 flex-shrink-0">
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] px-1.5 py-0">
              {getPhaseType()}
            </Badge>
            {status && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  status === 'Active' && "bg-green-500/10 text-green-400 border-green-500/20",
                  status === 'Ended' && "bg-gray-500/10 text-gray-400 border-gray-500/20",
                  status === 'Upcoming' && "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                )}
              >
                {status === 'Active' && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={8} className="mr-0.5 .5 .5" />}
                {status === 'Upcoming' && <HugeiconsIcon icon={Clock01Icon} size={8} className="mr-0.5 .5 .5" />}
                {status}
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Key info in compact format */}
        <div className="flex items-center gap-3 text-[11px] flex-shrink-0">
          {/* Price */}
          <div className="flex items-center gap-1">
            <HugeiconsIcon icon={Coins01Icon} size={12} className="text-muted-foreground" />
            <span className="font-mono font-semibold text-foreground">
              {formatPrice(phase.price)}
            </span>
          </div>

          {/* Max Per Wallet */}
          {phase.maxPerWallet && (
            <div className="flex items-center gap-1">
              <HugeiconsIcon icon={UserMultiple01Icon} size={12} className="text-muted-foreground" />
              <span className="font-mono text-foreground">
                {phase.maxPerWallet}
              </span>
            </div>
          )}

          {/* Supply with mini progress */}
          {phase.totalLimit && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-muted-foreground">Supply</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-semibold text-foreground">
                  {phase.mintedCount || 0}/{phase.totalLimit}
                </span>
                {/* Mini progress indicator */}
                <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full transition-all',
                      isCurrentlyActive ? 'bg-primary' : 'bg-muted-foreground'
                    )}
                    style={{
                      width: `${Math.min(
                        ((phase.mintedCount || 0) / phase.totalLimit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Time info */}
          <div className="flex items-center gap-1 text-muted-foreground">
            {isUpcoming ? (
              <>
                <HugeiconsIcon icon={Clock01Icon} size={12} />
                <CountdownTimer targetDate={startTime} />
              </>
            ) : (
              <>
                <span className="font-mono">{formatDate(startTime)}</span>
                {endTime && (
                  <>
                    <span>-</span>
                    <span className="font-mono">{formatDate(endTime)}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MintPhaseDisplay({ phases, currentPhase }: MintPhaseDisplayProps) {
  if (!phases || phases.length === 0) {
    return null;
  }

  // Sort phases by start time
  const sortedPhases = [...phases].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="font-mono text-sm font-bold text-foreground">Mint Phases</h2>
        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
          {phases.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {sortedPhases.map((phase, index) => (
          <PhaseCard
            key={phase.id || index}
            phase={phase}
            isActive={phase.isActive || phase.id === currentPhase?.id}
          />
        ))}
      </div>
    </div>
  );
}
