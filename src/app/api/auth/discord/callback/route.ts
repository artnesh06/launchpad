/**
 * GET /api/auth/discord/callback
 * 
 * Handles Discord OAuth callback, exchanges code for user info, and creates a session.
 * Discord redirects here with code and state as query parameters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getDiscordUser } from '@/lib/discord-oauth';
import { validateAndConsumeState } from '@/lib/oauth-state';
import {
  createSession,
  LEGACY_SESSION_DATA_COOKIE,
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
} from '@/lib/verification-session';
import { verificationDb as prisma } from '@/lib/verification-db';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Discord OAuth Callback Started ===');
    console.log('Request URL:', request.url);
    
    // Extract code and state from query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('Received code:', code ? `${code.substring(0, 10)}...` : 'null');
    console.log('Received state:', state ? `${state.substring(0, 20)}...` : 'null');

    // Validate required fields
    if (!code || !state) {
      console.error('Missing required fields - code:', !!code, 'state:', !!state);
      const errorUrl = new URL('/', request.nextUrl.origin);
      errorUrl.searchParams.set('error', 'invalid_request');
      errorUrl.searchParams.set('error_description', 'Missing authorization code or state');
      errorUrl.searchParams.set('openDiscordModal', 'true');
      return NextResponse.redirect(errorUrl);
    }

    // Validate CSRF state token
    console.log('Validating state token...');
    let isValidState = validateAndConsumeState(state);
    console.log('State validation result (from memory):', isValidState);
    
    // Fallback: Check cookie if memory validation fails (for dev hot-reload scenarios)
    if (!isValidState) {
      const cookieState = request.cookies.get('oauth-state')?.value;
      console.log('[OAuth Callback] Checking cookie fallback. Cookie state:', cookieState?.substring(0, 20) + '...');
      
      if (cookieState === state) {
        console.log('[OAuth Callback] State validated via cookie fallback');
        isValidState = true;
      }
    }
    
    if (!isValidState) {
      console.error('State validation failed for state:', state);
      const errorUrl = new URL('/', request.nextUrl.origin);
      errorUrl.searchParams.set('error', 'invalid_state');
      errorUrl.searchParams.set('error_description', 'Invalid or expired state token. Please try logging in again.');
      errorUrl.searchParams.set('openDiscordModal', 'true');
      return NextResponse.redirect(errorUrl);
    }
    
    console.log('State token validated successfully');

    // Clear the state cookie
    const clearCookieResponse = NextResponse.next();
    clearCookieResponse.cookies.delete('oauth-state');

    // Exchange authorization code for access token
    console.log('Exchanging code for access token...');
    const accessToken = await exchangeCodeForToken(code);
    console.log('Access token received');

    // Fetch Discord user information
    console.log('Fetching Discord user info...');
    const discordUser = await getDiscordUser(accessToken);
    console.log('Discord user:', discordUser.username, '#', discordUser.discriminator);

    // Create or update user in database
    console.log('Upserting user in database...');
    const user = await prisma.verificationUser.upsert({
      where: {
        discordId: discordUser.id,
      },
      update: {
        discordUsername: discordUser.username,
        discordDiscriminator: discordUser.discriminator,
        discordAvatar: discordUser.avatar,
        updatedAt: new Date(),
      },
      create: {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordDiscriminator: discordUser.discriminator,
        discordAvatar: discordUser.avatar,
      },
    });

    // Create session
    console.log('Creating session for user:', user.id);
    const sessionToken = createSession(
      user.id, // Database ID (CUID)
      user.discordId,
      user.discordUsername,
      user.discordDiscriminator,
      user.discordAvatar || undefined
    );
    console.log('Session token created:', sessionToken.substring(0, 20) + '...');

    // Redirect to frontend with session token and modal trigger
    const redirectUrl = new URL('/', request.nextUrl.origin);
    // Only a flag for the UI - never put the session token in the URL.
    redirectUrl.searchParams.set('session', '1');
    redirectUrl.searchParams.set('openDiscordModal', 'true');
    
    // Set session cookie with user info embedded (for hot-reload resilience)
    const response = NextResponse.redirect(redirectUrl);
    
    // Main session cookie
    response.cookies.set(USER_SESSION_COOKIE, sessionToken, userSessionCookieOptions());
    
    // Legacy unsigned session-data cookie is no longer used; make sure it is cleared.
    response.cookies.set(LEGACY_SESSION_DATA_COOKIE, '', userSessionCookieOptions(0));
    
    // Clear the oauth-state cookie
    response.cookies.delete('oauth-state');

    console.log('Redirecting to:', redirectUrl.toString());
    console.log('=== Discord OAuth Callback Completed Successfully ===');
    return response;
  } catch (error) {
    console.error('Discord OAuth callback error:', error);

    const errorUrl = new URL('/', request.nextUrl.origin);
    errorUrl.searchParams.set('error', 'oauth_failed');
    errorUrl.searchParams.set('error_description', error instanceof Error ? error.message : 'Failed to complete Discord login');
    errorUrl.searchParams.set('openDiscordModal', 'true');
    return NextResponse.redirect(errorUrl);
  }
}
