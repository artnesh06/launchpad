/**
 * GET /api/auth/me
 * 
 * Returns current authenticated user information from session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/verification-session';
import { verificationDb as prisma } from '@/lib/verification-db';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const { userId } = await requireAuth(request);

    // Fetch user from database
    const user = await prisma.verificationUser.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        discordId: true,
        discordUsername: true,
        discordDiscriminator: true,
        discordAvatar: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.discordId,
          username: user.discordUsername,
          discriminator: user.discordDiscriminator,
          avatar: user.discordAvatar,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);

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
          code: 'GET_USER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get user information',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
