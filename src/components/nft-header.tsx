'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigation, NavigationItem } from '@/components/ui/navigation';
import { WalletConnectionHeader } from '@/components/wallet-connection-header';
import { useAccount, useWalletClient } from 'wagmi';
import { usePathname } from 'next/navigation';
import { BrowserProvider, formatEther } from 'ethers';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon } from '@hugeicons/core-free-icons';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/animated-counter';
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection';

function NFTHeaderContent() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const pathname = usePathname();
  const [ethBalance, setEthBalance] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const balanceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocketConnection();

  // Track if balance fetch is in progress to prevent race conditions
  const isFetchingRef = useRef(false);

  // Fetch ETH balance
  const fetchBalance = useCallback(async () => {
    if (!isConnected || !address || !walletClient) {
      // Don't reset balance to 0 if wallet is still connected
      // Only reset if wallet is actually disconnected
      if (!isConnected) {
        setEthBalance(0);
      }
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('⏭️ Balance fetch already in progress, skipping...');
      return;
    }

    try {
      isFetchingRef.current = true;
      const provider = new BrowserProvider(walletClient as any);
      const balance = await provider.getBalance(address);
      const balanceInEth = parseFloat(formatEther(balance));
      setEthBalance(balanceInEth);
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Don't reset to 0 on error, keep previous balance
    } finally {
      isFetchingRef.current = false;
    }
  }, [isConnected, address, walletClient]);

  // Initial fetch and periodic polling
  useEffect(() => {
    fetchBalance();
    
    // Poll balance every 30 seconds as fallback
    const interval = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // Listen to WebSocket events and trigger balance update with debouncing
  useEffect(() => {
    if (!lastMessage || !address) return;

    const { event, data } = lastMessage;

    // Trigger balance update on relevant events
    const shouldUpdateBalance = 
      event === 'mint' || 
      event === 'transfer' || 
      event === 'burn' ||
      event === 'wallet-mint' ||
      (event === 'launchpad-update' && data?.minter?.toLowerCase() === address.toLowerCase());

    if (shouldUpdateBalance) {
      console.log('🔄 WebSocket event detected, scheduling balance update...');
      
      // Clear existing timeout to debounce multiple rapid events
      if (balanceUpdateTimeoutRef.current) {
        clearTimeout(balanceUpdateTimeoutRef.current);
      }
      
      // Debounce balance update by 1 second
      balanceUpdateTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Fetching updated balance...');
        fetchBalance();
      }, 1000);
    }
  }, [lastMessage, address, fetchBalance]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (balanceUpdateTimeoutRef.current) {
        clearTimeout(balanceUpdateTimeoutRef.current);
      }
    };
  }, []);

  const isLaunchpadPage = pathname.startsWith('/l');
  
  return (
    <header className={cn(
      "top-0 w-full bg-[#0D0E11]/60 backdrop-blur-[8px] border-b border-[#2F3336] md:px-8 z-50",
      isLaunchpadPage ? "fixed" : "sticky"
    )}>
      <div className="grid grid-cols-3 h-14 items-center px-6 gap-4">
        {/* Logo - Left */}
        <div className="flex justify-start">
          <Link href="/">
            <img src='/images/odds-logo.png' alt="Logo" className='h-[30px]' />
          </Link>
        </div>

        {/* Navigation - Center */}
        <div className="flex justify-center">
          <Navigation className="hidden md:flex gap-6">
            <NavigationItem href="/" active={pathname === '/' || pathname.startsWith('/collection')}>
              Mint
            </NavigationItem>
            <NavigationItem href="/create" active={pathname.startsWith('/create')}>
              Create
            </NavigationItem>
          </Navigation>
        </div>

        {/* Right Section - Desktop: Wallet, Mobile: Hamburger */}
        <div className="flex justify-end items-center space-x-4">
          {/* Balance Display - Desktop Only */}
          {isConnected && ethBalance >= 0 && (
            <div className="hidden md:block text-[#B392F0] font-mono text-sm font-normal">
              <AnimatedCounter 
                value={ethBalance}
                className="text-[#B392F0] font-mono text-sm font-normal"
                formatter={(v) => {
                  const { formatPrice } = require('@/lib/format-utils');
                  return `${formatPrice(v)} ETH`;
                }}
              />
            </div>
          )}
          {/* Wallet Connect Button - Desktop Only */}
          <div className="hidden md:block">
            <WalletConnectionHeader />
          </div>

          {/* Mobile Menu - Hamburger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden text-white p-2 hover:bg-[#2F3336] rounded-lg transition-colors">
                <HugeiconsIcon icon={Menu01Icon} size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-8">
              <div className="flex flex-col items-center gap-6 mt-6">
                {/* Balance Display - Mobile */}
                {isConnected && ethBalance >= 0 && (
                  <div className="text-center text-[#B392F0] font-mono text-lg font-normal pb-4 border-b border-[#2F3336] w-full">
                    <AnimatedCounter 
                      value={ethBalance}
                      className="text-[#B392F0] font-mono text-lg font-normal"
                      formatter={(v) => {
                        const { formatPrice } = require('@/lib/format-utils');
                        return `${formatPrice(v)} ETH`;
                      }}
                    />
                  </div>
                )}

                {/* Menu Items */}
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-center font-semibold text-lg transition-colors ${pathname === '/' || pathname.startsWith('/collection')
                      ? 'text-[#B392F0]'
                      : 'text-white hover:text-[#B392F0]'
                    }`}
                >
                  Mint
                </Link>

                <Link
                  href="/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-center font-semibold text-lg transition-colors ${pathname.startsWith('/create')
                      ? 'text-[#B392F0]'
                      : 'text-white hover:text-[#B392F0]'
                    }`}
                >
                  Create
                </Link>

                {/* Wallet Connect Button */}
                <div className="w-full flex justify-center pt-2">
                  <WalletConnectionHeader />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function NFTHeader() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <header className={cn(
        "top-0 w-full bg-[#0D0E11]/60 backdrop-blur-[8px] border-b border-[#2F3336] md:px-8 z-50",
        pathname.startsWith('/l') ? "fixed" : "sticky"
      )}>
        <div className="grid grid-cols-3 h-14 items-center px-6 gap-4">
          <div className="flex justify-start">
            <Link href="/">
              <img src='/images/odds-logo.png' alt="Logo" className='h-[30px]' />
            </Link>
          </div>
          <div className="flex justify-center">
            <Navigation className="hidden md:flex gap-6">
              <NavigationItem href="/" active={false}>Mint</NavigationItem>
              <NavigationItem href="/create" active={false}>Create</NavigationItem>
            </Navigation>
          </div>
          <div className="flex justify-end items-center space-x-4">
            {/* Placeholder for wallet button */}
            <div className="h-10 w-32 bg-[#1E1F22] rounded-lg animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <WagmiReadyGuard>
      <NFTHeaderContent />
    </WagmiReadyGuard>
  );
}