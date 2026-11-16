'use client';

import React, { useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CustomSelectProps {
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options?: Array<{
    value: string;
    label: string;
    icon?: string;
    isActive?: boolean;
  }>;
  placeholder?: string;
  containerClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onValueChange,
  options = [],
  placeholder,
  containerClassName,
  labelClassName,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dropdownPosition, setDropdownPosition] = React.useState<'bottom' | 'top'>('bottom');
  const selectRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.value === value);

  // Determine dropdown position based on available space
  useEffect(() => {
    if (isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = Math.min(options.length * 48 + 8, 192); // max-h-48 = 192px
      
      // If not enough space below but enough space above, show dropdown above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen, options.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn("space-y-2", containerClassName)} ref={selectRef}>
      {label && (
        <label className={cn(
          "block text-[#B392F0] font-mono font-bold text-[15px]",
          labelClassName
        )}>
          {label}
        </label>
      )}
      <div className="relative">
        <div
          className={cn(
            "h-[42px] bg-[#0D0E11] p-3 flex items-center gap-3 cursor-pointer w-full",
            disabled && "opacity-50 cursor-not-allowed",
            containerClassName?.includes('border') ? '' : 'border border-[#2F3336] rounded-lg'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {selectedOption?.icon && (
            <Image
              src={selectedOption.icon}
              alt={selectedOption.label}
              width={16}
              height={16}
              className=""
            />
          )}
          <span className="text-[#857F94] font-mono text-[15px] flex-1 flex items-center gap-2">
            {selectedOption?.isActive && (
              <span className="flex items-center gap-1 text-[#0BFF75] text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-[#0BFF75] rounded-full animate-pulse"></span>
              </span>
            )}
            {selectedOption?.label || placeholder}
          </span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={24} className={cn(
            "text-white transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>

        {isOpen && (
          <div 
            className={`absolute left-0 right-0 bg-[#0D0E11] border border-[#2F3336] rounded-lg shadow-lg z-[100] max-h-48 overflow-y-auto ${
              dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            {options.map((option) => (
              <div
                key={option.value}
                className="p-3 flex items-center gap-3 hover:bg-[#1E1F22] cursor-pointer"
                onClick={() => handleSelect(option.value)}
              >
                {option.icon && (
                  <Image
                    src={option.icon}
                    alt={option.label}
                    width={16}
                    height={16}
                    className=""
                  />
                )}
                <span className="text-[#857F94] font-mono text-[15px] flex items-center gap-2 flex-1">
                  {option.isActive && (
                    <span className="flex items-center gap-1 text-[#0BFF75] text-xs font-bold">
                      <span className="w-1.5 h-1.5 bg-[#0BFF75] rounded-full animate-pulse"></span>
                    </span>
                  )}
                  {option.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};