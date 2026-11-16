'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ComputerIcon } from '@hugeicons/core-free-icons';

const TABLET_BREAKPOINT = 1024;

export function MobileNotSupported({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean | null>(null);

  // Check if current path is /l/[id] route
  const isLaunchpadRoute = pathname?.startsWith('/l/');

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileOrTablet(window.innerWidth < TABLET_BREAKPOINT);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (isMobileOrTablet === null) {
    return null;
  }

  // Allow mobile access for /l/[id] routes
  if (isLaunchpadRoute) {
    return <>{children}</>;
  }

  if (isMobileOrTablet) {
    return (
      <div className="min-h-screen bg-[#0D0E11] flex flex-col">
        {/* Header */}
        <header className="w-full border-b border-[#2F3336] px-6 py-4">
          <div className="flex justify-center">
            <img src="/images/odds-logo.png" alt="Logo" className="h-[28px]" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="inline-flex p-4 rounded-2xl bg-[#B392F0]/10 border border-[#B392F0]/20">
              <HugeiconsIcon icon={ComputerIcon} size={36} className="text-[#B392F0]" />
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-white">
                Desktop Only
              </h1>
              <p className="text-[#9CA3AF] text-sm max-w-[280px]">
                Please visit us on a desktop browser for the best experience.
              </p>
            </div>

            {/* Coming soon */}
            <p className="text-xs text-[#6B7280]">
              Mobile coming soon 🚀
            </p>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
