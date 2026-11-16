/**
 * Verification (Discord / linked-wallet) user sessions.
 *
 * Sessions are stateless, HMAC-SHA256 signed tokens stored in the httpOnly
 * `discord-session` cookie:
 *   base64url(JSON{uid, did, dun, ddi, dav, iat, exp}) + "." + base64url(signature)
 * signed with USER_SESSION_SECRET (>= 32 chars). Nothing is trusted from any other
 * cookie; if the secret is not configured no session can be created or validated.
 *
 * (Previously sessions lived in process memory and could be "reconstructed" from an
 * unsigned `discord-session-data` cookie, which allowed forging any user's session.)
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/** Random opaque token (kept for callers/tests that need a random id). */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export const USER_SESSION_COOKIE = 'discord-session';
/** Legacy cookie that is no longer read; routes clear it on login. */
export const LEGACY_SESSION_DATA_COOKIE = 'discord-session-data';

const SESSION_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours
const MIN_SECRET_LENGTH = 32;
const CLOCK_SKEW_SECONDS = 60;

interface SessionPayload {
  uid: string; // Database ID (CUID)
  did: string; // Discord ID
  dun: string;
  ddi: string;
  dav?: string;
  iat: number;
  exp: number;
}

export interface SessionValidationResult {
  valid: boolean;
  userId?: string;
  discordId?: string;
  discordUsername?: string;
  discordDiscriminator?: string;
  discordAvatar?: string;
}

function getSecret(): string | null {
  const secret = process.env.USER_SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  return secret;
}

export function isUserSessionConfigured(): boolean {
  return getSecret() !== null;
}

function sign(secret: string, data: string): Buffer {
  return createHmac('sha256', secret).update(data).digest();
}

/** Cookie attributes for the user session cookie. */
export function userSessionCookieOptions(maxAge: number = SESSION_EXPIRY_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}

/**
 * Create a new signed session token.
 * Throws if USER_SESSION_SECRET is not configured.
 */
export function createSession(
  userId: string, // Database ID (CUID)
  discordId: string,
  discordUsername?: string,
  discordDiscriminator?: string,
  discordAvatar?: string
): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error('USER_SESSION_SECRET is not configured (>= 32 characters required)');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: userId,
    did: discordId,
    dun: discordUsername || 'Unknown',
    ddi: discordDiscriminator || '0000',
    ...(discordAvatar ? { dav: discordAvatar } : {}),
    iat: now,
    exp: now + SESSION_EXPIRY_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(secret, body).toString('base64url')}`;
}

/** Validate a signed session token. */
export function validateSession(token: string | undefined | null): SessionValidationResult {
  const secret = getSecret();
  if (!secret || !token || token.length > 4096) return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [body, sig] = parts;

  let provided: Buffer;
  try {
    provided = Buffer.from(sig, 'base64url');
  } catch {
    return { valid: false };
  }
  const expected = sign(secret, body);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { valid: false };
  }

  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof p.uid !== 'string' ||
      typeof p.did !== 'string' ||
      typeof p.exp !== 'number' ||
      typeof p.iat !== 'number' ||
      p.exp <= now ||
      p.iat > now + CLOCK_SKEW_SECONDS
    ) {
      return { valid: false };
    }
    return {
      valid: true,
      userId: p.uid,
      discordId: p.did,
      discordUsername: p.dun,
      discordDiscriminator: p.ddi,
      discordAvatar: p.dav,
    };
  } catch {
    return { valid: false };
  }
}

/** Stateless sessions cannot be revoked server-side; logout clears the cookie. */
export function deleteSession(_token: string): void {
  // no-op
}

function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

/**
 * Require an authenticated (Discord / linked wallet) user for API routes.
 * Only the signed `discord-session` cookie is accepted.
 */
export async function requireAuth(request?: Request): Promise<{ userId: string; discordId: string }> {
  const sessionToken = request ? readCookie(request.headers.get('cookie'), USER_SESSION_COOKIE) : undefined;

  if (!sessionToken) {
    throw new Error('Unauthorized - Please authenticate with Discord');
  }

  const session = validateSession(sessionToken);
  if (!session.valid || !session.userId || !session.discordId) {
    throw new Error('Unauthorized - Invalid or expired session');
  }

  return { userId: session.userId, discordId: session.discordId };
}
