'use client';

import * as React from 'react';
import { Drawer } from '@/components/ui/drawer';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface ActionItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ActionDrawerProps {
  actions: ActionItem[];
  triggerClassName?: string;
}

export function ActionDrawer({ actions, triggerClassName }: ActionDrawerProps) {
  const [open, setOpen] = React.useState(false);

  const renderLabel = (label: string) => {
    const boldTerms = ['Collection Page', 'Whitelist Mint', 'Public Mint'];
    
    for (const term of boldTerms) {
      if (label.includes(term)) {
        const parts = label.split(term);
        return (
          <>
            {parts[0]}
            <span className="font-bold">{term}</span>
            {parts[1]}
          </>
        );
      }
    }
    
    return label;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 bg-[#B392F0] rounded-lg text-black font-normal text-[15px] font-mono hover:bg-[#B392F0]/90 transition-colors',
          triggerClassName
        )}
      >
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
        <span>Select Actions</span>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Select Actions"
        position="bottom"
        height="auto"
        showOverlay={true}
      >
        <div className="p-6">
          <div className="flex flex-col gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                disabled={action.disabled}
                className={cn(
                  'h-[48px] px-4 bg-[#B392F0] rounded-lg text-black text-[15px] font-normal font-mono text-center hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {renderLabel(action.label)}
              </button>
            ))}
          </div>
        </div>
      </Drawer>
    </>
  );
}
