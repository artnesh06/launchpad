'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, Refresh01Icon, Home01Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'next/navigation';

/**
 * Collection Page Error Component
 * 
 * Next.js error boundary for the collection page.
 * Handles errors that occur during rendering or data fetching.
 * 
 * Requirements: 6.2, 6.3 - Error handling with retry and user-friendly messages
 */
export default function CollectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console
    console.error('Collection page error:', error);
  }, [error]);

  // Determine error type and message
  const isInvalidAddress = error.message.includes('Invalid contract address') ||
                          error.message.includes('address format');
  
  const isNotFound = error.message.includes('not found') ||
                     error.message.includes('does not exist');

  const errorTitle = isInvalidAddress
    ? 'Invalid Contract Address'
    : isNotFound
    ? 'Collection Not Found'
    : 'Failed to Load Collection';

  const errorMessage = isInvalidAddress
    ? 'The contract address you provided is not valid. Please check the address and try again.'
    : isNotFound
    ? 'We couldn\'t find a collection at this address. It may not exist or may not be indexed yet.'
    : error.message || 'An unexpected error occurred while loading the collection.';

  const showRetry = !isInvalidAddress && !isNotFound;

  return (
    <div className="min-h-screen bg-[#0D0E11] px-4 py-8">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <HugeiconsIcon icon={AlertCircleIcon} size={48} className="text-destructive" />
              </div>
            </div>
            
            <h1 className="mb-3 font-mono text-2xl font-bold text-foreground">
              {errorTitle}
            </h1>
            
            <p className="mb-8 font-mono text-sm leading-relaxed text-muted-foreground">
              {errorMessage}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {showRetry && (
                <Button
                  onClick={reset}
                  variant="default"
                  size="lg"
                  className="gap-2"
                >
                  <HugeiconsIcon icon={Refresh01Icon} size={16} />
                  Try Again
                </Button>
              )}
              
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <HugeiconsIcon icon={Home01Icon} size={16} />
                Go Home
              </Button>
            </div>

            {error.digest && (
              <p className="mt-6 font-mono text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
