'use client';

import { useEffect, ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  description, 
  className = '' 
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg shadow-xl transform transition-all ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 py-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                {title && (
                  <h2 className="text-xl font-bold text-white">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-gray-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </Button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;