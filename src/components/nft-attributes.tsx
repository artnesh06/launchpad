'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface NFTAttribute {
  trait_type: string;
  value: string | number;
  prevalence?: number;
}

interface NFTAttributesProps {
  attributes: NFTAttribute[];
  className?: string;
}

export function NFTAttributes({ attributes, className }: NFTAttributesProps) {
  if (!attributes || attributes.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="font-mono text-lg font-bold text-white">Attributes</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attributes.map((attribute, index) => (
          <div
            key={`${attribute.trait_type}-${index}`}
            className="rounded-lg border border-[#2F3336] bg-[#0D0E11] p-4 transition-colors hover:border-[#B392F0]/50"
          >
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-wide text-[#B392F0]">
                {attribute.trait_type}
              </p>
              <p className="font-mono text-sm font-semibold text-white">
                {attribute.value}
              </p>
              {attribute.prevalence !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1E1F22]">
                    <div
                      className="h-full bg-[#B392F0] transition-all"
                      style={{ width: `${attribute.prevalence * 100}%` }}
                    />
                  </div>
                  <p className="font-mono text-xs text-[#99A1AF]">
                    {(attribute.prevalence * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
