/**
 * POST /api/wallets/link
 * 
 * Links a wallet to authenticated Discord user with signature verification.
 * 
 * Requirements: 2.5, 2.6, 2.7, 9.3, 9.4, 9.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { signatureVerifier } from '@/lib/verification/signature-verifier';
import { requireAuth } from '@/lib/verification-session';
import { verificationDb } from '@/lib/verification-db';
import type { WalletLinkRequest, WalletLinkResponse } from '@/types/verification';

export async function POST(request: NextRequest) {
  try {
    console.log('[Wallet Link] Starting wallet link process...');
    
    // Require authentication
    const user = await requireAuth(request);
    console.log('[Wallet Link] User authenticated:', user.userId);

    // Parse request body
    const body: WalletLinkRequest = await request.json();
    const { walletAddress, signature, message } = body;
    
    console.log('[Wallet Link] Request data:', {
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
    console.log('[Wallet Link] Verifying signature...');
    const isValid = await signatureVerifier.verifySignature(
      message,
      signature,
      walletAddress
    );
    console.log('[Wallet Link] Signature valid:', isValid);

    if (!isValid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Signature verification failed. Please try again.',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Check if wallet is already linked to this user
    const existingWallet = await verificationDb.verificationWallet.findUnique({
      where: {
        userId_address: {
          userId: user.userId,
          address: walletAddress.toLowerCase(),
        },
      },
    });

    if (existingWallet) {
      return NextResponse.json(
        {
          error: {
            code: 'WALLET_ALREADY_LINKED',
            message: 'This wallet is already linked to your account',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Check if wallet is linked to another user
    const walletLinkedToOther = await verificationDb.verificationWallet.findFirst({
      where: {
        address: walletAddress.toLowerCase(),
        userId: {
          not: user.userId,
        },
      },
    });

    if (walletLinkedToOther) {
      return NextResponse.json(
        {
          error: {
            code: 'WALLET_LINKED_TO_OTHER_USER',
            message: 'This wallet is already linked to another Discord account',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Store wallet-Discord mapping
    console.log('[Wallet Link] Creating wallet record in database...');
    const wallet = await verificationDb.verificationWallet.create({
      data: {
        userId: user.userId,
        address: walletAddress.toLowerCase(),
        signature,
        verifiedAt: new Date(),
      },
    });
    console.log('[Wallet Link] Wallet linked successfully:', wallet.id);

    // Return response
    const response: WalletLinkResponse = {
      success: true,
      walletId: wallet.id,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Wallet linking error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please authenticate with Discord first',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'WALLET_LINK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to link wallet',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
