'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, Refresh01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'next/navigation';

/**
 * NFT Detail Page Error Component
 * 
 * Next.js error boundary for the NFT detail page.
 * Handles errors that occur during rendering or data fetching.
 * 
 * Requirements: 6.2, 6.3, 6.4 - Error handling with retry and not found pages
 */
export default function NFTDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console
    console.error('NFT detail page error:', error);
  }, [error]);

  // Determine error type and message
  const isInvalidAddress = error.message.includes('Invalid contract address') ||
                          error.message.includes('address format');
  
  const isNotFound = error.message.includes('not found') ||
                     error.message.includes('does not exist') ||
                     error.message.includes('NFT not found');

  const errorTitle = isInvalidAddress
    ? 'Invalid Address'
    : isNotFound
    ? 'NFT Not Found'
    : 'Failed to Load NFT';

  const errorMessage = isInvalidAddress
    ? 'The contract address or token ID you provided is not valid. Please check and try again.'
    : isNotFound
    ? 'We couldn\'t find this NFT. It may not exist, may have been burned, or may not be indexed yet.'
    : error.message || 'An unexpected error occurred while loading the NFT details.';

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
                onClick={() => router.back()}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                Go Back
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
