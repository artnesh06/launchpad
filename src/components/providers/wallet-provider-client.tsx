'use client';

import * as React from 'react';
import { ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import type { Theme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Config } from 'wagmi';
import { WagmiAvailableProvider } from './wagmi-ready-guard';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

interface WalletProviderClientProps {
  children: ReactNode;
  config: Config;
}

// Custom theme yang sesuai dengan design aplikasi
const customTheme: Theme = darkTheme({
  accentColor: '#B8A8FF',
  accentColorForeground: '#000000',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Customize lebih lanjut
const theme: Theme = {
  ...customTheme,
  colors: {
    ...customTheme.colors,
    accentColor: '#B8A8FF',
    accentColorForeground: '#000000',
    actionButtonBorder: 'rgba(184, 168, 255, 0.1)',
    actionButtonBorderMobile: 'rgba(184, 168, 255, 0.1)',
    actionButtonSecondaryBackground: 'rgba(184, 168, 255, 0.1)',
    closeButton: 'rgba(255, 255, 255, 0.7)',
    closeButtonBackground: 'rgba(255, 255, 255, 0.08)',
    connectButtonBackground: '#B8A8FF',
    connectButtonBackgroundError: '#FF494A',
    connectButtonInnerBackground: '#000000',
    connectButtonText: '#000000',
    connectButtonTextError: '#FFFFFF',
    connectionIndicator: '#30E000',
    downloadBottomCardBackground: 'linear-gradient(126deg, rgba(0, 0, 0, 0) 9.49%, rgba(120, 120, 120, 0.2) 71.04%), #1A1B1F',
    downloadTopCardBackground: 'linear-gradient(126deg, rgba(120, 120, 120, 0.2) 9.49%, rgba(0, 0, 0, 0) 71.04%), #1A1B1F',
    error: '#FF494A',
    generalBorder: 'rgba(255, 255, 255, 0.08)',
    generalBorderDim: 'rgba(255, 255, 255, 0.04)',
    menuItemBackground: 'rgba(184, 168, 255, 0.08)',
    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
    modalBackground: '#000000',
    modalBorder: 'rgba(255, 255, 255, 0.08)',
    modalText: '#FFFFFF',
    modalTextDim: 'rgba(255, 255, 255, 0.6)',
    modalTextSecondary: 'rgba(255, 255, 255, 0.7)',
    profileAction: 'rgba(255, 255, 255, 0.1)',
    profileActionHover: 'rgba(255, 255, 255, 0.15)',
    profileForeground: '#000000',
    selectedOptionBorder: '#B8A8FF',
    standby: '#FFD641',
  },
  fonts: {
    body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  radii: {
    actionButton: '8px',
    connectButton: '8px',
    menuButton: '8px',
    modal: '12px',
    modalMobile: '12px',
  },
  shadows: {
    connectButton: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    dialog: '0px 8px 32px rgba(0, 0, 0, 0.32)',
    profileDetailsAction: '0px 2px 6px rgba(0, 0, 0, 0.15)',
    selectedOption: '0px 2px 6px rgba(184, 168, 255, 0.2)',
    selectedWallet: '0px 2px 6px rgba(184, 168, 255, 0.2)',
    walletLogo: '0px 2px 16px rgba(0, 0, 0, 0.16)',
  },
};

export function WalletProviderClient({ children, config }: WalletProviderClientProps) {
  // Since this component is dynamically imported with ssr: false,
  // it only runs on client, so we can render RainbowKit directly
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WagmiAvailableProvider>
          <RainbowKitProvider theme={theme} modalSize="compact">
            {children}
          </RainbowKitProvider>
        </WagmiAvailableProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
