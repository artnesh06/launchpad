'use client';

import { useEffect, useState, createContext, useContext } from 'react';

// Create a context to track if WagmiProvider is available
const WagmiAvailableContext = createContext<boolean>(false);

/**
 * Provider to mark that WagmiProvider is available in the tree
 * This should be placed inside WalletProviderClient after WagmiProvider
 */
export function WagmiAvailableProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiAvailableContext.Provider value={true}>
      {children}
    </WagmiAvailableContext.Provider>
  );
}

/**
 * Hook to check if Wagmi is available
 */
export function useWagmiAvailable() {
  return useContext(WagmiAvailableContext);
}

/**
 * Component that only renders children after Wagmi provider is ready
 * This prevents "useConfig must be used within WagmiProvider" errors
 */
export function WagmiReadyGuard({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const wagmiAvailable = useWagmiAvailable();

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before mount, show fallback
  if (!mounted) {
    return <>{fallback}</>;
  }

  // If Wagmi is not available yet, show fallback
  if (!wagmiAvailable) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
