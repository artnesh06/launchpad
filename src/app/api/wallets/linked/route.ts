/**
 * GET /api/wallets/linked
 * 
 * Retrieves all wallets linked to authenticated user.
 * 
 * Requirements: 2.8, 2.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/verification-session';
import { verificationDb } from '@/lib/verification-db';
import type { LinkedWalletsResponse } from '@/types/verification';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    // Fetch all wallets linked to this user
    const wallets = await verificationDb.verificationWallet.findMany({
      where: {
        userId: user.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Return response
    const response: LinkedWalletsResponse = {
      wallets: wallets.map((wallet) => ({
        id: wallet.id,
        address: wallet.address,
        linkedAt: wallet.verifiedAt.toISOString(),
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Fetch linked wallets error:', error);

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
          code: 'FETCH_WALLETS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch linked wallets',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
