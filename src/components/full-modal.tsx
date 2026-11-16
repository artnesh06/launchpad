'use client';

import * as React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface FullModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export function FullModal({
  open,
  onClose,
  children,
  className,
  showCloseButton = true
}: FullModalProps) {
  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={cn(
          'relative w-full h-full bg-[#0D0E11] overflow-auto',
          className
        )}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="fixed top-6 right-6 z-10 p-2 rounded-lg hover:bg-[#2E2F32] text-white transition-colors"
            aria-label="Close modal"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={24} />
          </button>
        )}

        {/* Children Content */}
        {children}
      </div>
    </div>
  );
}
