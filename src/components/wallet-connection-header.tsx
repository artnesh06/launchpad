'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDisconnect, useAccount, useSignMessage, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WagmiReadyGuard } from '@/components/providers/wagmi-ready-guard';
import { IpfsImage } from '@/components/ui/ipfs-image';
import { toast } from 'sonner';
import { BrowserProvider, formatEther } from 'ethers';
import type { DiscordUser, LinkedWalletsResponse } from '@/types/verification';

interface WalletConnectionHeaderProps {
  // No props needed anymore
}

function WalletConnectionHeaderContent() {
  const { disconnect } = useDisconnect();
  const { address: currentWallet } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: walletClient } = useWalletClient();

  // Balance states
  const [ethBalance, setEthBalance] = useState<number>(0);
  const [usdBalance, setUsdBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Discord modal states
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [linkedWallets, setLinkedWallets] = useState<Array<{ id: string; address: string }>>([]);
  const [isLoadingDiscord, setIsLoadingDiscord] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [isRemovingWallet, setIsRemovingWallet] = useState<string | null>(null);
  
  // Track if wallet auth has been attempted for current wallet
  const walletAuthAttemptedRef = useRef<string | null>(null);
  
  // Track if session check has been done
  const sessionCheckDoneRef = useRef(false);
  
  // Track if user is already authenticated (to prevent unnecessary auth attempts)
  const isAuthenticatedRef = useRef(false);
  
  // Track if session check is in progress
  const isCheckingSessionRef = useRef(false);

  console.log('[Wallet Header] Component rendered, currentWallet:', currentWallet);

  /**
   * Fetch wallet balance
   */
  const fetchBalance = async () => {
    if (!currentWallet || !walletClient) return;
    
    try {
      setIsLoadingBalance(true);
      const provider = new BrowserProvider(walletClient as any);
      const balance = await provider.getBalance(currentWallet);
      const balanceInEth = parseFloat(formatEther(balance));
      setEthBalance(balanceInEth);
      
      // Fetch ETH price for USD conversion (you can replace with your preferred API)
      try {
        const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const priceData = await priceResponse.json();
        const ethPrice = priceData.ethereum.usd;
        setUsdBalance(balanceInEth * ethPrice);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  /**
   * Check Discord session on mount
   */
  const checkDiscordSession = async () => {
    // Prevent multiple simultaneous checks
    if (sessionCheckDoneRef.current || isCheckingSessionRef.current) {
      console.log('[Wallet Header] Session check already done or in progress, skipping...');
      return;
    }
    
    sessionCheckDoneRef.current = true;
    isCheckingSessionRef.current = true;
    
    try {
      console.log('[Wallet Header] Checking Discord session...');
      const walletsResponse = await fetch('/api/wallets/linked');
      console.log('[Wallet Header] Wallets response status:', walletsResponse.status);
      
      if (walletsResponse.ok) {
        const walletsData: LinkedWalletsResponse = await walletsResponse.json();
        console.log('[Wallet Header] Found linked wallets:', walletsData.wallets.length);
        setLinkedWallets(walletsData.wallets.map(w => ({ id: w.id, address: w.address })));
        
        // Fetch Discord user info
        try {
          console.log('[Wallet Header] Fetching Discord user from /api/auth/me...');
          const userResponse = await fetch('/api/auth/me');
          console.log('[Wallet Header] User response status:', userResponse.status);
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('[Wallet Header] Discord user data:', userData.user);
            setDiscordUser({
              id: userData.user.id,
              username: userData.user.username,
              discriminator: userData.user.discriminator,
              avatar: userData.user.avatar,
            });
            // Mark as authenticated to prevent wallet auth attempts
            isAuthenticatedRef.current = true;
            console.log('[Wallet Header] User already authenticated, skipping wallet auth');
          } else {
            console.log('[Wallet Header] No Discord user found');
            isAuthenticatedRef.current = false;
          }
        } catch (error) {
          console.error('[Wallet Header] Failed to fetch Discord user:', error);
          isAuthenticatedRef.current = false;
        }
      } else {
        console.log('[Wallet Header] No linked wallets found');
        isAuthenticatedRef.current = false;
      }
    } catch (error) {
      console.log('[Wallet Header] No Discord session:', error);
      isAuthenticatedRef.current = false;
    } finally {
      isCheckingSessionRef.current = false;
    }
  };

  /**
   * Load all linked wallets for the authenticated user
   */
  const loadLinkedWallets = useCallback(async () => {
    try {
      setIsLoadingWallets(true);

      const response = await fetch('/api/wallets/linked');

      if (!response.ok) {
        throw new Error('Failed to load linked wallets');
      }

      const data: LinkedWalletsResponse = await response.json();
      setLinkedWallets(data.wallets.map(w => ({ id: w.id, address: w.address })));
    } catch (error) {
      console.error('Load wallets error:', error);
      toast.error('Failed to load linked wallets');
    } finally {
      setIsLoadingWallets(false);
    }
  }, []);

  /**
   * Try to authenticate via wallet signature if wallet is already linked
   */
  const tryWalletAuth = useCallback(async () => {
    console.log('[Wallet Auth] tryWalletAuth called', {
      currentWallet,
      hasDiscordUser: !!discordUser,
      isAuthenticatedRef: isAuthenticatedRef.current,
      isCheckingSession: isCheckingSessionRef.current,
      hasSignMessageAsync: !!signMessageAsync,
      alreadyAttempted: walletAuthAttemptedRef.current === currentWallet,
    });

    if (!currentWallet) {
      console.log('[Wallet Auth] No wallet connected, skipping');
      return;
    }

    // Wait if session check is still in progress
    if (isCheckingSessionRef.current) {
      console.log('[Wallet Auth] Session check in progress, waiting...');
      // Wait a bit and check again
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check again after waiting
      if (isCheckingSessionRef.current) {
        console.log('[Wallet Auth] Session check still in progress, skipping wallet auth');
        return;
      }
    }

    // Check if already authenticated via session check
    if (isAuthenticatedRef.current) {
      console.log('[Wallet Auth] Already authenticated via session, skipping wallet auth');
      walletAuthAttemptedRef.current = currentWallet; // Mark as attempted to prevent future attempts
      return;
    }

    if (discordUser) {
      console.log('[Wallet Auth] Already authenticated, skipping');
      walletAuthAttemptedRef.current = currentWallet; // Mark as attempted to prevent future attempts
      isAuthenticatedRef.current = true;
      return;
    }

    if (!signMessageAsync) {
      console.log('[Wallet Auth] signMessageAsync not ready yet, skipping (will be retried by useEffect)');
      // Don't retry here - let the useEffect handle it
      walletAuthAttemptedRef.current = null; // Reset so it can be tried again
      return;
    }

    // Prevent duplicate attempts for the same wallet
    if (walletAuthAttemptedRef.current === currentWallet) {
      console.log('[Wallet Auth] Already attempted for this wallet, skipping...');
      return;
    }

    walletAuthAttemptedRef.current = currentWallet;

    try {
      console.log('[Wallet Auth] Attempting wallet-based authentication...');
      
      // Step 1: Get verification message
      const messageResponse = await fetch('/api/wallets/verification-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: currentWallet }),
      });

      if (!messageResponse.ok) {
        console.log('[Wallet Auth] Failed to get verification message');
        return;
      }

      const { message } = await messageResponse.json();

      // Step 2: Request signature from wallet (silently)
      try {
        console.log('[Wallet Auth] Requesting signature from wallet...');
        const signature = await signMessageAsync({ message });
        console.log('[Wallet Auth] Signature received');

        // Step 3: Try to authenticate with wallet
        const authResponse = await fetch('/api/auth/wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: currentWallet,
            signature,
            message,
          }),
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('[Wallet Auth] Authentication successful!', authData.user);
          
          // Update Discord user state
          setDiscordUser({
            id: authData.user.id,
            username: authData.user.username,
            discriminator: authData.user.discriminator,
            avatar: authData.user.avatar,
          });
          
          // Mark as authenticated
          isAuthenticatedRef.current = true;
          
          // Reload linked wallets
          await loadLinkedWallets();
          
          toast.success(`Welcome back, ${authData.user.username}!`);
        } else {
          const errorData = await authResponse.json();
          if (errorData.error?.code === 'WALLET_NOT_LINKED') {
            console.log('[Wallet Auth] Wallet not linked yet, user needs to connect Discord first');
          } else {
            console.error('[Wallet Auth] Authentication failed:', errorData.error);
          }
        }
      } catch (signError) {
        // User rejected signature - this is fine, don't show error
        console.log('[Wallet Auth] User rejected signature or signature failed:', signError);
      }
    } catch (error) {
      console.error('[Wallet Auth] Wallet authentication error:', error);
      // Don't show error toast - this is a silent attempt
    }
  }, [currentWallet, signMessageAsync, loadLinkedWallets, discordUser]); // Added discordUser back

  // Check Discord session on component mount (run once)
  useEffect(() => {
    const initSession = async () => {
      console.log('[Wallet Header] Component mounted, calling checkDiscordSession...');
      await checkDiscordSession(); // Wait for session check to complete
      
      // Check if OAuth just completed successfully
      const oauthSuccess = localStorage.getItem('discord-oauth-success');
      if (oauthSuccess === 'true') {
        // Remove flag
        localStorage.removeItem('discord-oauth-success');
        
        // Auto-open dropdown after a short delay to let data load
        setTimeout(() => {
          // Trigger click on the wallet button to open dropdown
          const walletButton = document.querySelector('[data-wallet-button]') as HTMLButtonElement;
          if (walletButton) {
            walletButton.click();
          }
        }, 1000);
      }
    };
    
    initSession();
  }, []); // Empty dependency array - run only once on mount

  // Re-check Discord session when wallet changes
  useEffect(() => {
    if (currentWallet) {
      console.log('[Wallet Header] Wallet changed to:', currentWallet);
      
      // Reset auth attempt ref when wallet changes
      if (walletAuthAttemptedRef.current !== currentWallet) {
        walletAuthAttemptedRef.current = null;
      }
      
      // Only try wallet auth if not already authenticated and not already attempted
      if (!isAuthenticatedRef.current && !discordUser && walletAuthAttemptedRef.current !== currentWallet) {
        // Delay wallet auth attempt to ensure wagmi is ready and session check is complete
        const timer = setTimeout(() => {
          console.log('[Wallet Header] Triggering tryWalletAuth after delay...');
          tryWalletAuth();
        }, 2000); // Increased delay to 2s to ensure session check completes first
        
        return () => clearTimeout(timer);
      }
    } else {
      // Reset when wallet disconnects
      walletAuthAttemptedRef.current = null;
      isAuthenticatedRef.current = false;
    }
  }, [currentWallet, discordUser]); // Removed tryWalletAuth from dependencies

  // Fetch balance when wallet is connected
  useEffect(() => {
    if (currentWallet && walletClient) {
      fetchBalance();
    }
  }, [currentWallet, walletClient]);

  /**
   * Initiate Discord OAuth flow
   */
  const connectDiscord = async () => {
    try {
      setIsLoadingDiscord(true);

      // Call initiate endpoint
      const response = await fetch('/api/auth/discord/initiate', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Discord OAuth');
      }

      const data = await response.json();
      
      // Redirect to Discord OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Discord OAuth error:', error);
      toast.error('Failed to connect to Discord. Please try again.');
      setIsLoadingDiscord(false);
    }
  };

  /**
   * Add the current wallet to the linked wallets
   */
  const addCurrentWallet = async () => {
    if (!currentWallet) {
      toast.error('No wallet connected');
      return;
    }

    if (linkedWallets.some(w => w.address.toLowerCase() === currentWallet.toLowerCase())) {
      toast.error('This wallet is already linked');
      return;
    }

    try {
      setIsAddingWallet(true);

      // Step 1: Get verification message
      const messageResponse = await fetch('/api/wallets/verification-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: currentWallet }),
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to generate verification message');
      }

      const { message } = await messageResponse.json();

      // Step 2: Request signature from wallet
      const signature = await signMessageAsync({ message });

      // Step 3: Link wallet with signature
      const linkResponse = await fetch('/api/wallets/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: currentWallet,
          signature,
          message,
        }),
      });

      if (!linkResponse.ok) {
        const errorData = await linkResponse.json();
        throw new Error(errorData.error?.message || 'Failed to link wallet');
      }

      // Success - reload wallets
      toast.success('Wallet linked successfully!');
      await loadLinkedWallets();
    } catch (error) {
      console.error('Add wallet error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          toast.error('Signature request was rejected');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to link wallet');
      }
    } finally {
      setIsAddingWallet(false);
    }
  };

  /**
   * Remove a wallet from linked wallets
   */
  const removeWallet = async (walletId: string, address: string) => {
    try {
      setIsRemovingWallet(walletId);

      const response = await fetch(`/api/wallets/${walletId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove wallet');
      }

      toast.success('Wallet removed successfully');
      await loadLinkedWallets();
    } catch (error) {
      console.error('Remove wallet error:', error);
      toast.error('Failed to remove wallet');
    } finally {
      setIsRemovingWallet(null);
    }
  };

  /**
   * Format wallet address for display
   */
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  /**
   * Get Discord avatar URL
   */
  const getDiscordAvatarUrl = (user: DiscordUser) => {
    if (!user.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  };

  return (
    <>
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === 'authenticated');

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
                // Not connected - show connect button
                if (!connected) {
                  return (
                    <Button
                      onClick={openConnectModal}
                      variant="default"
                      className="bg-[#B8A8FF] text-black hover:!bg-white hover:text-black rounded-lg h-9 px-4 font-semibold text-[13px] transition-colors"
                    >
                      Connect Wallet
                    </Button>
                  );
                }

                // Wrong network
                if (chain.unsupported) {
                  return (
                    <Button
                      onClick={openChainModal}
                      variant="destructive"
                      className="bg-red-500 text-white hover:bg-red-600 rounded-lg h-9 px-4 font-semibold text-[13px]"
                    >
                      Wrong Network
                    </Button>
                  );
                }

                // Connected - show wallet address with dropdown
                // Get chain icon - use All Chain if no active chain or unsupported
                const chainIcon = "/images/Chain/MegaETH.webp";
                  // chain?.id && getChainById(chain.id) 
                  // ? getChainIconById(chain.id) 
                  // : '/images/Chain/AllChain.png';
                
                return (
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          data-wallet-button
                          variant="ghost"
                          className="bg-[#B8A8FF] text-black hover:!bg-white hover:text-black data-[state=open]:bg-white data-[state=open]:text-black rounded-lg h-9 px-4 font-semibold text-[13px] transition-colors font-mono"
                        >
                          {account.displayName}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#0E0E10] border border-[#2F3336] text-white w-[300px] p-0 rounded-[10px] overflow-visible z-[200]"
                      >
                        {/* Purple header */}
                        <div className="bg-[#B392F0] border border-[#2F3336] h-[67px] rounded-t-[10px] relative overflow-visible" />

                        {/* Content wrapper with padding */}
                        <div className="px-[14px] pb-[14px] relative">
                          {/* Avatar - positioned to overlap header */}
                          <div className="absolute left-[14px] -top-[54px] z-10">
                            <div className="w-[81px] h-[81px] rounded-full border-[6px] border-[#0E0E10] bg-[#B392F0] relative overflow-visible">
                              <div className="w-full h-full rounded-full overflow-hidden">
                                {/* Use Discord avatar if connected, otherwise use ENS avatar or default */}
                                {discordUser && getDiscordAvatarUrl(discordUser) ? (
                                  <img 
                                    src={getDiscordAvatarUrl(discordUser)!} 
                                    alt="Discord Avatar" 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <IpfsImage 
                                    src={account.ensAvatar || "ipfs://bafkreihtxjlhbd3up7yxclts4k3zkwq3s55kwyu3jlu2j5agejv3ugune4"} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover" 
                                  />
                                )}
                              </div>
                              {/* Chain Badge */}
                              <div className="absolute -bottom-1 -right-1 w-[26x] h-[26px] rounded-full border-2 border-[#0E0E10] bg-[#0E0E10] flex items-center justify-center overflow-hidden">
                                <img 
                                  src={chainIcon} 
                                  alt="Chain" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Spacer for avatar */}
                          <div className="h-[35px]" />

                          {/* Balance ETH */}
                          <div className="mb-[16px]">
                            {isLoadingBalance ? (
                              <div className="animate-pulse">
                                <div className="h-10 bg-[#2F3336] rounded w-32 mb-2"></div>
                                <div className="h-4 bg-[#2F3336] rounded w-24"></div>
                              </div>
                            ) : (
                              <>
                                <p className="font-mono font-bold text-[35px] text-white leading-[1.2]">
                                  {ethBalance.toFixed(4)} ETH
                                </p>
                                <p className="font-mono text-[14px] text-white mt-1">
                                  ${usdBalance.toFixed(2)}
                                </p>
                              </>
                            )}
                          </div>

                          {/* Discord Info or Add Discord button */}
                          {discordUser ? (
                            <div className="mb-[13px] bg-[#0E0E10] border border-[#2F3336] rounded-[10px] h-[45px] px-[11px] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z" fill="#5865F2"/>
                                </svg>
                                <span className="font-mono text-[14px] text-white">{discordUser.username}</span>
                              </div>
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/auth/logout', { method: 'POST' });
                                    if (response.ok) {
                                      setDiscordUser(null);
                                      setLinkedWallets([]);
                                      // Reset authentication flags
                                      isAuthenticatedRef.current = false;
                                      walletAuthAttemptedRef.current = null;
                                      sessionCheckDoneRef.current = false;
                                      toast.success('Discord disconnected');
                                    }
                                  } catch (error) {
                                    toast.error('Failed to disconnect Discord');
                                  }
                                }}
                                className="font-mono text-[12px] text-[#F77170] hover:text-[#FF8A89] transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={connectDiscord}
                              disabled={isLoadingDiscord}
                              className="w-full bg-[#0E0E10] border border-[#2F3336] rounded-[10px] h-[45px] font-mono text-[14px] text-white hover:bg-[#232426] transition-colors mb-[13px] flex items-center justify-center disabled:opacity-50"
                            >
                              {isLoadingDiscord ? 'Connecting...' : '+ Add Discord'}
                            </button>
                          )}

                          {/* Add Twitter button - TODO: Implement Twitter OAuth integration similar to Discord */}
                          <button
                            className="w-full bg-[#0E0E10] border border-[#2F3336] rounded-[10px] h-[45px] font-mono text-[14px] text-white hover:bg-[#232426] transition-colors mb-[13px] flex items-center justify-center opacity-50 cursor-not-allowed"
                            disabled
                          >
                            + Add Twitter (Coming Soon)
                          </button>

                          {/* Wallet section with nested structure */}
                          <div className="bg-[#232426] border border-[#2F3336] rounded-[10px] mb-[13px] overflow-hidden">
                            {/* Show all linked wallets */}
                            {linkedWallets.length > 0 ? (
                              <div className="border-b border-[#2F3336]">
                                {linkedWallets.slice(0, 3).map((wallet) => (
                                  <div 
                                    key={wallet.id}
                                    className="h-[45px] px-[11px] flex items-center justify-between bg-[#0E0E10] border-b border-[#2F3336] last:border-b-0"
                                  >
                                    <span className="font-mono text-[14px] text-white">
                                      {formatAddress(wallet.address)}
                                    </span>
                                    <button
                                      onClick={() => removeWallet(wallet.id, wallet.address)}
                                      disabled={isRemovingWallet === wallet.id}
                                      className="font-mono text-[12px] text-[#F77170] hover:text-[#FF8A89] transition-colors"
                                    >
                                      {isRemovingWallet === wallet.id ? '...' : 'Remove'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-[45px] px-[11px] flex items-center justify-center bg-[#0E0E10] border-b border-[#2F3336]">
                                <span className="font-mono text-[12px] text-gray-400">No wallets linked yet</span>
                              </div>
                            )}
                            
                            {/* Add Wallet button - always show */}
                            <button
                              onClick={() => {
                                if (currentWallet && linkedWallets.some(w => w.address.toLowerCase() === currentWallet.toLowerCase())) {
                                  toast.info('Switch to another wallet in your wallet provider to add more wallets');
                                } else {
                                  addCurrentWallet();
                                }
                              }}
                              disabled={isAddingWallet || !currentWallet}
                              className="w-full px-[11px] py-[8px] font-mono text-[14px] text-white text-center hover:bg-[#2F3336] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isAddingWallet ? 'Adding...' : '+ Add Wallet'}
                            </button>
                          </div>

                          {/* Log Out button */}
                          <button
                            onClick={() => {
                              // Reset refs before disconnect
                              walletAuthAttemptedRef.current = null;
                              sessionCheckDoneRef.current = false;
                              isAuthenticatedRef.current = false;
                              disconnect();
                            }}
                            className="w-full bg-[#0E0E10] border border-[#2F3336] rounded-[10px] h-[32px] font-mono text-[14px] text-[#F77170] hover:bg-[#232426] transition-colors flex items-center justify-center gap-2"
                          >
                            <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 11.5H2.5C2.23478 11.5 1.98043 11.3946 1.79289 11.2071C1.60536 11.0196 1.5 10.7652 1.5 10.5V2.5C1.5 2.23478 1.60536 1.98043 1.79289 1.79289C1.98043 1.60536 2.23478 1.5 2.5 1.5H5M9.5 9.5L12.5 6.5M12.5 6.5L9.5 3.5M12.5 6.5H5" stroke="#F77170" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Log Out
                          </button>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </>
  );
}

export function WalletConnectionHeader() {
  return (
    <WagmiReadyGuard
      fallback={
        <div className="h-9 w-32 bg-[#1E1F22] rounded-lg animate-pulse"></div>
      }
    >
      <WalletConnectionHeaderContent />
    </WagmiReadyGuard>
  );
}
