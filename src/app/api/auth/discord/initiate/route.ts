/**
 * POST /api/auth/discord/initiate
 * 
 * Initiates Discord OAuth flow by generating an authorization URL with CSRF protection.
 */

import { NextResponse } from 'next/server';
import { generateStateToken, getDiscordAuthUrl, validateDiscordConfig } from '@/lib/discord-oauth';
import { storeState } from '@/lib/oauth-state';
import type { DiscordOAuthInitiateResponse } from '@/types/verification';

export async function POST() {
  try {
    // Validate Discord configuration
    validateDiscordConfig();

    // Generate CSRF state token
    const state = generateStateToken();
    
    // Store state for validation in callback
    storeState(state);

    // Generate Discord authorization URL
    const authUrl = getDiscordAuthUrl(state);

    const responseData: DiscordOAuthInitiateResponse = {
      authUrl,
      state,
    };

    // Also store state in cookie as backup (for dev hot-reload scenarios)
    const response = NextResponse.json(responseData, { status: 200 });
    response.cookies.set('oauth-state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes (same as state expiry)
      path: '/',
    });

    console.log('[OAuth Initiate] State token generated and stored:', state.substring(0, 20) + '...');
    return response;
  } catch (error) {
    console.error('Discord OAuth initiate error:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'OAUTH_INITIATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to initiate Discord OAuth',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
