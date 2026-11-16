'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon } from '@hugeicons/core-free-icons';
interface WalletConnectionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WalletConnectionGuard({ 
  children, 
  fallback 
}: WalletConnectionGuardProps) {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state during SSR and initial mount
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-muted rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[400px] lg:min-h-[500px] space-y-6 px-4 py-8">
        <div className="flex flex-col items-center space-y-4 sm:space-y-6 text-center max-w-md w-full">
          <div className="p-3 sm:p-4 bg-[#B8A8FF]/10 rounded-full">
            <HugeiconsIcon icon={Wallet01Icon} size={40} className="sm: sm: text-[#B8A8FF]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground font-mono">
              Connect Your Wallet
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-mono">
              Please connect your wallet to view your collections
            </p>
          </div>
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button
                onClick={openConnectModal}
                className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 bg-[#B8A8FF] rounded-lg text-black font-bold font-mono hover:bg-white/90 hover:text-black transition-colors text-sm sm:text-base"
              >
                Connect Wallet
              </Button>
            )}
          </ConnectButton.Custom>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
