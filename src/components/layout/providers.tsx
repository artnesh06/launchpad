'use client';
import React from 'react';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { IpfsGatewayProvider } from '@/providers/ipfs-gateway-provider';
import { WebSocketStatusToast } from '@/components/websocket-status-toast';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <IpfsGatewayProvider>
      <WalletProvider>
        <WebSocketStatusToast />
        <div data-theme={activeThemeValue}>
          {children}
        </div>
      </WalletProvider>
    </IpfsGatewayProvider>
  );
}
