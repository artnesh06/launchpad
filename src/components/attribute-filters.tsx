'use client';

import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, ArrowDown01Icon, ArrowUp01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NFTAttributeSummary } from '@/types/alchemy';

export interface AttributeFilters {
  [traitType: string]: string[]; // trait type -> selected values
}

interface AttributeFiltersProps {
  attributes: NFTAttributeSummary | null;
  selectedFilters: AttributeFilters;
  onFilterChange: (filters: AttributeFilters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function AttributeFilters({
  attributes,
  selectedFilters,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: AttributeFiltersProps) {
  const [expandedTraits, setExpandedTraits] = useState<Set<string>>(new Set());

  // Auto-expand traits that have selected values
  useEffect(() => {
    const traitsWithSelections = Object.keys(selectedFilters).filter(
      (trait) => selectedFilters[trait].length > 0
    );
    setExpandedTraits(new Set(traitsWithSelections));
  }, [selectedFilters]);

  // Toggle trait expansion
  const toggleTrait = (traitType: string) => {
    setExpandedTraits((prev) => {
      const next = new Set(prev);
      if (next.has(traitType)) {
        next.delete(traitType);
      } else {
        next.add(traitType);
      }
      return next;
    });
  };

  // Debounced search handler
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        onSearchChange(localSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchQuery, searchQuery, onSearchChange]);

  // Toggle filter value
  const toggleFilterValue = (traitType: string, value: string) => {
    const currentValues = selectedFilters[traitType] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    const newFilters = { ...selectedFilters };
    if (newValues.length === 0) {
      delete newFilters[traitType];
    } else {
      newFilters[traitType] = newValues;
    }

    onFilterChange(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFilterChange({});
    onSearchChange('');
  };

  // Count total active filters
  const activeFilterCount = Object.values(selectedFilters).reduce(
    (sum, values) => sum + values.length,
    0
  );

  // Check if there are any filters or search
  const hasActiveFilters = activeFilterCount > 0 || searchQuery.length > 0;

  if (!attributes || Object.keys(attributes.summary).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <HugeiconsIcon icon={Search01Icon} size={16} hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#99A1AF]" />
        <Input
          type="text"
          placeholder="Search by token ID or name..."
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="pl-10 font-mono bg-[#0D0E11] border-[#2F3336] text-white placeholder:text-[#99A1AF]"
          aria-label="Search NFTs by token ID or name"
        />
      </div>

      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm font-bold text-white">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 text-[#B392F0]">({activeFilterCount})</span>
          )}
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-auto p-0 font-mono text-xs text-[#99A1AF] hover:text-white"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Attribute Filters */}
      <div className="space-y-2">
        {Object.entries(attributes.summary).map(([traitType, values]) => {
          const isExpanded = expandedTraits.has(traitType);
          const selectedCount = selectedFilters[traitType]?.length || 0;

          return (
            <div
              key={traitType}
              className="rounded-lg border border-[#2F3336] bg-[#0D0E11]"
            >
              {/* Trait Header */}
              <button
                onClick={() => toggleTrait(traitType)}
                className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-[#1E1F22]/50 min-h-[44px]"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${traitType} filter options`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-white">
                    {traitType}
                  </span>
                  {selectedCount > 0 && (
                    <span className="rounded-full bg-[#B392F0]/20 px-2 py-0.5 font-mono text-xs text-[#B392F0]" aria-label={`${selectedCount} filters selected`}>
                      {selectedCount}
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <HugeiconsIcon icon={ArrowUp01Icon} size={16} hidden="true" className="text-[#99A1AF]" />
                ) : (
                  <HugeiconsIcon icon={ArrowDown01Icon} size={16} hidden="true" className="text-[#99A1AF]" />
                )}
              </button>

              {/* Trait Values */}
              {isExpanded && (
                <div className="border-t border-[#2F3336] p-2">
                  <div className="max-h-[200px] space-y-1 overflow-y-auto">
                    {values.map((attr) => {
                      const isSelected = selectedFilters[traitType]?.includes(
                        attr.value
                      );

                      return (
                        <button
                          key={attr.value}
                          onClick={() => toggleFilterValue(traitType, attr.value)}
                          className={`flex w-full items-center justify-between rounded p-2 text-left transition-colors min-h-[44px] ${
                            isSelected
                              ? 'bg-[#B392F0]/20 text-[#B392F0]'
                              : 'hover:bg-[#1E1F22]/50 text-[#99A1AF]'
                          }`}
                          aria-pressed={isSelected}
                          aria-label={`Filter by ${traitType}: ${attr.value}, ${attr.count} items, ${(attr.prevalence * 100).toFixed(1)}% prevalence`}
                        >
                          <span className="font-mono text-xs">{attr.value}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs opacity-60" aria-hidden="true">
                              {attr.count}
                            </span>
                            <span className="font-mono text-xs opacity-40" aria-hidden="true">
                              ({(attr.prevalence * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {Object.entries(selectedFilters).map(([traitType, values]) =>
            values.map((value) => (
              <button
                key={`${traitType}-${value}`}
                onClick={() => toggleFilterValue(traitType, value)}
                className="flex items-center gap-1 rounded-full bg-[#B392F0]/20 px-3 py-1 font-mono text-xs text-[#B392F0] transition-colors hover:bg-[#B392F0]/30 min-h-[44px]"
                aria-label={`Remove filter: ${traitType} ${value}`}
              >
                <span>
                  {traitType}: {value}
                </span>
                <HugeiconsIcon icon={Cancel01Icon} size={12} hidden="true" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
