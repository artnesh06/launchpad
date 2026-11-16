'use client';

import { ReactNode, useMemo } from 'react';
import { getConfig } from '@/lib/rainbowkit-config';
import dynamic from 'next/dynamic';

interface WalletProviderProps {
  children: ReactNode;
}

// Dynamic import untuk WalletProviderClient agar tidak di-render di server
const WalletProviderClient = dynamic(
  () => import('./wallet-provider-client').then((mod) => mod.WalletProviderClient),
  { 
    ssr: false,
    // Render children while loading to prevent blank screen
    loading: ({ children }) => <>{children}</>
  }
);

export function WalletProvider({ children }: WalletProviderProps) {
  // Initialize config with useMemo to avoid re-creating on every render
  const config = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      return getConfig();
    } catch (error) {
      console.error('Failed to initialize wallet config:', error);
      return null;
    }
  }, []);

  // Always render children, wrap with provider when config is ready
  // This prevents the blank screen flash
  if (!config) {
    return <>{children}</>;
  }

  return (
    <WalletProviderClient config={config}>
      {children}
    </WalletProviderClient>
  );
}