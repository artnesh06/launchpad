'use client';

import { Button } from '@/components/ui/button';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';
import { useEffect, useState } from 'react';

// Import ConnectButton directly - RainbowKit handles SSR properly
import { ConnectButton } from '@rainbow-me/rainbowkit';

function WalletConnectButtonContent() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Extra delay to ensure wagmi context is ready
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return <div className="h-9 w-20 bg-[#1E1F22] rounded-lg animate-pulse"></div>;
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button 
                    onClick={openConnectModal} 
                    variant="ghost" 
                    className='bg-[#B8A8FF] text-black hover:!bg-white/90 hover:text-black rounded-lg h-9 px-3 font-semibold text-[13px]'
                  >
                    Login
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button 
                    onClick={openChainModal} 
                    variant="ghost" 
                    className='bg-red-500 text-white hover:!bg-red-600 rounded-lg h-9 px-3 font-semibold text-[13px]'
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  {/* <Button
                    onClick={openChainModal}
                    variant="ghost"
                    className='bg-[#B8A8FF]/20 text-black hover:!bg-[#B8A8FF]/30 rounded-lg h-9 px-3 font-semibold text-[13px]'
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </Button> */}

                  <Button 
                    onClick={openAccountModal} 
                    variant="ghost" 
                    className='bg-[#B8A8FF] text-black hover:!bg-white/90 hover:text-black rounded-lg h-9 px-3 font-semibold text-[13px]'
                  >
                    {account.displayName}
                    {/* {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''} */}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function WalletConnectButton() {
  return (
    <WagmiReadyGuard
      fallback={
        <div className="h-9 w-20 bg-[#1E1F22] rounded-lg animate-pulse"></div>
      }
    >
      <WalletConnectButtonContent />
    </WagmiReadyGuard>
  );
}