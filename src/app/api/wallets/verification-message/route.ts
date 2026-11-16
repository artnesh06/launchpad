/**
 * POST /api/wallets/verification-message
 * 
 * Generates a verification message for wallet signature.
 */

import { NextRequest, NextResponse } from 'next/server';
import { signatureVerifier } from '@/lib/verification/signature-verifier';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { walletAddress } = body;

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing wallet address',
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

    // Generate verification message with nonce
    console.log('[Verification Message] Generating for wallet:', walletAddress);
    const verificationMessage = await signatureVerifier.generateVerificationMessage(walletAddress);
    console.log('[Verification Message] Generated with nonce:', verificationMessage.nonce);

    return NextResponse.json(
      {
        message: verificationMessage.message,
        nonce: verificationMessage.nonce,
        expiresAt: verificationMessage.expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification message generation error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'MESSAGE_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate verification message',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
