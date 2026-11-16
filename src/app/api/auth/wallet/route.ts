/**
 * POST /api/auth/wallet
 * 
 * Authenticate user via wallet signature.
 * If wallet is already linked to a Discord account, auto-create session.
 * This allows users to login without Discord OAuth if they've previously linked their wallet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { signatureVerifier } from '@/lib/verification/signature-verifier';
import {
  createSession,
  LEGACY_SESSION_DATA_COOKIE,
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
} from '@/lib/verification-session';
import { verificationDb as prisma } from '@/lib/verification-db';
import type { WalletAuthRequest, WalletAuthResponse } from '@/types/verification';

export async function POST(request: NextRequest) {
  try {
    console.log('[Wallet Auth] Starting wallet authentication...');
    
    // Parse request body
    const body: WalletAuthRequest = await request.json();
    const { walletAddress, signature, message } = body;
    
    console.log('[Wallet Auth] Request data:', {
      walletAddress,
      hasSignature: !!signature,
      hasMessage: !!message,
    });

    // Validate required fields
    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: walletAddress, signature, and message',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_WALLET_ADDRESS',
            message: 'Invalid wallet address format',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Verify signature
    console.log('[Wallet Auth] Verifying signature...');
    const isValid = await signatureVerifier.verifySignature(
      message,
      signature,
      walletAddress
    );
    console.log('[Wallet Auth] Signature valid:', isValid);

    if (!isValid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Signature verification failed',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Check if wallet is linked to a Discord account
    const wallet = await prisma.verificationWallet.findFirst({
      where: {
        address: walletAddress.toLowerCase(),
      },
      include: {
        user: true,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        {
          error: {
            code: 'WALLET_NOT_LINKED',
            message: 'This wallet is not linked to any Discord account. Please connect Discord first.',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Create session for the linked user
    console.log('[Wallet Auth] Creating session for user:', wallet.user.id);
    const sessionToken = createSession(
      wallet.user.id,
      wallet.user.discordId,
      wallet.user.discordUsername,
      wallet.user.discordDiscriminator,
      wallet.user.discordAvatar || undefined
    );
    console.log('[Wallet Auth] Session created successfully');

    // Set session cookies
    const responseData: WalletAuthResponse = {
      success: true,
      user: {
        id: wallet.user.discordId,
        username: wallet.user.discordUsername,
        discriminator: wallet.user.discordDiscriminator,
        avatar: wallet.user.discordAvatar,
      },
    };

    const response = NextResponse.json(responseData, { status: 200 });

    // Main session cookie
    response.cookies.set(USER_SESSION_COOKIE, sessionToken, userSessionCookieOptions());

    // Legacy unsigned session-data cookie is no longer used; make sure it is cleared.
    response.cookies.set(LEGACY_SESSION_DATA_COOKIE, '', userSessionCookieOptions(0));

    console.log('[Wallet Auth] Session cookies set successfully');

    return response;
  } catch (error) {
    console.error('[Wallet Auth] Error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'WALLET_AUTH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to authenticate with wallet',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
