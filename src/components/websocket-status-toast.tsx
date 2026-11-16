'use client';

/**
 * WebSocket Status Toast
 * 
 * Displays toast notifications for WebSocket connection issues
 * Note: Connect/disconnect toasts removed to reduce noise
 */

import { useEffect } from 'react';
import { toast } from 'sonner';

export function WebSocketStatusToast() {
  useEffect(() => {
    // Listen for fallback mode event
    const handleFallback = (event: CustomEvent) => {
      const { message } = event.detail;
      
      toast.warning('Connection Issue', {
        description: message || 'Real-time updates temporarily unavailable. Using fallback mode.',
        duration: 5000,
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      });
    };

    // Listen for connection restored event
    const handleRestored = (event: CustomEvent) => {
      const { message } = event.detail;
      
      toast.success('Connection Restored', {
        description: message || 'Real-time updates are now working.',
        duration: 3000,
      });
    };

    // Add event listeners
    window.addEventListener('websocket:fallback' as any, handleFallback);
    window.addEventListener('websocket:restored' as any, handleRestored);

    // Cleanup
    return () => {
      window.removeEventListener('websocket:fallback' as any, handleFallback);
      window.removeEventListener('websocket:restored' as any, handleRestored);
    };
  }, []);

  return null; // This component doesn't render anything
}

