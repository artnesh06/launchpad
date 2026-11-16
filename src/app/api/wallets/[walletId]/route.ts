/**
 * DELETE /api/wallets/:walletId
 * 
 * Unlinks a wallet from authenticated user.
 * 
 * Requirements: 2.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/verification-session';
import { verificationDb } from '@/lib/verification-db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Get wallet ID from params
    const { walletId } = await params;

    // Validate wallet ID
    if (!walletId) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing wallet ID',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Check if wallet exists and belongs to the authenticated user
    const wallet = await verificationDb.verificationWallet.findUnique({
      where: {
        id: walletId,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        {
          error: {
            code: 'WALLET_NOT_FOUND',
            message: 'Wallet not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    if (wallet.userId !== user.userId) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to unlink this wallet',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Delete the wallet
    await verificationDb.verificationWallet.delete({
      where: {
        id: walletId,
      },
    });

    // Return response
    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Wallet unlink error:', error);

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
          code: 'WALLET_UNLINK_FAILED',
          message: error instanceof Error ? error.message : 'Failed to unlink wallet',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
