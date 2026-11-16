'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * React Query Provider for data caching and state management
 * 
 * Configuration:
 * - staleTime: 5 minutes - data is considered fresh for 5 minutes
 * - cacheTime: 10 minutes - unused data is garbage collected after 10 minutes
 * - refetchOnWindowFocus: false - don't refetch when window regains focus
 * - retry: 1 - retry failed requests once
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
