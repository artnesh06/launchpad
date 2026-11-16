import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { FileUnknownIcon, ArrowLeft01Icon, Home01Icon } from '@hugeicons/core-free-icons';
import Link from 'next/link';

/**
 * NFT Not Found Page
 * 
 * Displayed when an NFT doesn't exist at the specified address and token ID.
 * 
 * Requirements: 6.4 - Handle non-existent NFTs with "not found" pages
 */
export default function NFTNotFound() {
  return (
    <div className="min-h-screen bg-[#0D0E11] px-4 py-8">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-muted p-4">
                <HugeiconsIcon icon={FileUnknownIcon} size={48} className="text-muted-foreground" />
              </div>
            </div>
            
            <h1 className="mb-3 font-mono text-2xl font-bold text-foreground">
              NFT Not Found
            </h1>
            
            <p className="mb-8 font-mono text-sm leading-relaxed text-muted-foreground">
              We couldn't find this NFT. It may not exist, may have been burned, 
              or may not be indexed yet. Please verify the contract address and token ID.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/">
                <Button variant="default" size="lg" className="w-full gap-2 sm:w-auto">
                  <HugeiconsIcon icon={Home01Icon} size={16} />
                  Go Home
                </Button>
              </Link>
              
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
