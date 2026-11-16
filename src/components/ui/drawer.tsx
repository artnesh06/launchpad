'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  width?: string;
  height?: string;
  position?: 'bottom' | 'right' | 'left';
  showOverlay?: boolean;
}

export function Drawer({
  open,
  onClose,
  children,
  title,
  subtitle,
  width = 'md:max-w-[1000px]',
  height = 'auto',
  position = 'bottom',
  showOverlay = false,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  // Mount state for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-0 left-0 right-0 rounded-t-lg';
      case 'right':
        return 'top-0 right-0 bottom-0 rounded-l-lg';
      case 'left':
        return 'top-0 left-0 bottom-0 rounded-r-lg';
      default:
        return 'bottom-0 left-0 right-0 rounded-t-lg';
    }
  };

  const getTransformClasses = () => {
    switch (position) {
      case 'bottom':
        return open ? 'translateY(0)' : 'translateY(100%)';
      case 'right':
        return open ? 'translateX(0)' : 'translateX(100%)';
      case 'left':
        return open ? 'translateX(0)' : 'translateX(-100%)';
      default:
        return open ? 'translateY(0)' : 'translateY(100%)';
    }
  };

  if (!mounted) return null;
  if (!open && !showOverlay) return null;

  const drawerContent = (
    <>
      {/* Overlay */}
      {showOverlay && (
        <div
          className={`fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed ${getPositionClasses()} z-[9999] transition-transform duration-300 ease-out`}
        style={{
          transform: getTransformClasses(),
          height: position === 'bottom' ? height : '100vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-full ${width} mx-auto bg-[#0D0E11]/90 backdrop-blur-[8px] border-x border-t border-[#2F3336] overflow-visible shadow-2xl ${
            position === 'bottom' ? 'rounded-t-lg' : ''
          }`}
        >
          {/* Header */}
          {(title || subtitle) && (
            <div className="relative h-[35px] border-b border-[#2F3336] flex items-center justify-between px-6">
              <div className="flex items-center gap-3 text-[#6A7282] text-[13px] font-mono">
                {title && <span className="text-[#0BFF75]">{title}</span>}
                {title && subtitle && <span className="font-extralight">|</span>}
                {subtitle && <span>{subtitle}</span>}
              </div>
              <button
                onClick={onClose}
                className="w-5 h-5 rounded bg-[#1E192B] flex items-center justify-center text-white text-[15px] font-light hover:bg-[#2D253E] transition-colors"
              >
                ×
              </button>
            </div>
          )}

          {/* Content */}
          <div className="overflow-visible">{children}</div>
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
