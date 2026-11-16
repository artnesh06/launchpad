'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface ActionItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ActionPopoverProps {
  actions: ActionItem[];
  triggerClassName?: string;
}

export function ActionPopover({ actions, triggerClassName }: ActionPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const renderLabel = (label: string) => {
    // const boldTerms = ['Collection Page', 'Whitelist Mint', 'Public Mint'];
    
    // for (const term of boldTerms) {
    //   if (label.includes(term)) {
    //     const parts = label.split(term);
    //     return (
    //       <>
    //         {parts[0]}
    //         <span className="font-bold">{term}</span>
    //         {parts[1]}
    //       </>
    //     );
    //   }
    // }
    
    return label;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-2 bg-[#B392F0] rounded-lg text-black font-normal text-[15px] font-mono hover:bg-[#B392F0]/90 transition-colors',
            triggerClassName
          )}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
          <span>Select Actions</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[242px] p-0 bg-transparent border-none shadow-none"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              disabled={action.disabled}
              className={cn(
                'h-[38px] px-[10px] bg-[#B392F0] border-b border-[#2F3336] text-black text-[15px] font-normal font-mono text-center hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                index === 0 && 'rounded-t-lg',
                index === actions.length - 1 && 'rounded-b-lg'
              )}
            >
              {renderLabel(action.label)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
