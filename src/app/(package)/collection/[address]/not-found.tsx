import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { FileUnknownIcon, Home01Icon } from '@hugeicons/core-free-icons';
import Link from 'next/link';

/**
 * Collection Not Found Page
 * 
 * Displayed when a collection doesn't exist at the specified address.
 * 
 * Requirements: 6.3 - Handle invalid contract addresses with user-friendly errors
 */
export default function CollectionNotFound() {
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
              Collection Not Found
            </h1>
            
            <p className="mb-8 font-mono text-sm leading-relaxed text-muted-foreground">
              We couldn't find a collection at this address. It may not exist, 
              may not be an NFT contract, or may not be indexed yet. 
              Please verify the contract address.
            </p>

            <Link href="/">
              <Button variant="default" size="lg" className="gap-2">
                <HugeiconsIcon icon={Home01Icon} size={16} />
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
