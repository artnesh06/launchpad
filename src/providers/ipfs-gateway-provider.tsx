'use client';

import { useEffect } from 'react';
import { initializeGatewayCache } from '@/lib/ipfs-utils';

/**
 * Provider to initialize IPFS gateway cache on app start
 * This should be placed high in the component tree
 */
export function IpfsGatewayProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize gateway cache from localStorage
    initializeGatewayCache();
  }, []);

  return <>{children}</>;
}
