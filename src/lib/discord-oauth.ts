/**
 * Discord OAuth Utilities
 * 
 * Handles Discord OAuth 2.0 authentication flow for NFT holder verification.
 */

import { randomBytes } from 'crypto';

// Discord OAuth configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/discord/callback`;

// Discord API endpoints
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_OAUTH_AUTHORIZE = 'https://discord.com/oauth2/authorize';
const DISCORD_OAUTH_TOKEN = `${DISCORD_API_BASE}/oauth2/token`;
const DISCORD_USER_ENDPOINT = `${DISCORD_API_BASE}/users/@me`;

/**
 * Validates Discord OAuth configuration
 */
export function validateDiscordConfig(): void {
  if (!DISCORD_CLIENT_ID) {
    throw new Error('DISCORD_CLIENT_ID environment variable is not configured');
  }
  if (!DISCORD_CLIENT_SECRET) {
    throw new Error('DISCORD_CLIENT_SECRET environment variable is not configured');
  }
}

/**
 * Generates a secure random state token for CSRF protection
 */
export function generateStateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generates Discord OAuth authorization URL
 */
export function getDiscordAuthUrl(state: string): string {
  validateDiscordConfig();
  
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID!,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
    state,
  });

  return `${DISCORD_OAUTH_AUTHORIZE}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  validateDiscordConfig();

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID!,
    client_secret: DISCORD_CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: DISCORD_REDIRECT_URI,
  });

  const response = await fetch(DISCORD_OAUTH_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetches Discord user information using access token
 */
export async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}> {
  const response = await fetch(DISCORD_USER_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Discord user: ${error}`);
  }

  const user = await response.json();
  
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator || '0',
    avatar: user.avatar,
  };
}
