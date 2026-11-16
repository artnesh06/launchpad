/**
 * Admin session + admin API key helpers.
 *
 * Runtime-agnostic: uses only Web Crypto (globalThis.crypto.subtle), TextEncoder
 * and btoa/atob, so it works in the Edge middleware and in Node route handlers.
 *
 * Session cookie format:  base64url(JSON{u,iat,exp}) + "." + base64url(HMAC-SHA256)
 * signed with ADMIN_SESSION_SECRET. If the secret is missing/too short, login is
 * refused and every session is treated as invalid.
 */

export const ADMIN_SESSION_COOKIE = 'admin-session';
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours
export const ADMIN_API_KEY_HEADER = 'x-admin-api-key';

const MIN_SECRET_LENGTH = 32;
const MIN_API_KEY_LENGTH = 16;
const CLOCK_SKEW_SECONDS = 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface AdminSession {
  username: string;
  issuedAt: number;
  expiresAt: number;
}

/** Returns the session secret, or null when it is not (safely) configured. */
export function getAdminSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  return secret;
}

export function isAdminSessionConfigured(): boolean {
  return getAdminSessionSecret() !== null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(input)) return null;
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return new Uint8Array(sig);
}

/** Constant-time comparison of two equal-length byte arrays. */
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Constant-time string comparison that does not leak the length or content of
 * either value: both strings are hashed to fixed-size digests first.
 */
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  // Evaluate both checks without short-circuiting.
  const sameDigest = timingSafeEqualBytes(new Uint8Array(da), new Uint8Array(db));
  const sameLength = a.length === b.length;
  return sameDigest && sameLength;
}

/** Creates a signed session token. Throws if ADMIN_SESSION_SECRET is not configured. */
export async function createAdminSessionToken(username: string): Promise<string> {
  const secret = getAdminSessionSecret();
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  const now = Math.floor(Date.now() / 1000);
  const payload = { u: username, iat: now, exp: now + ADMIN_SESSION_TTL_SECONDS };
  const payloadB64 = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await hmacSha256(secret, payloadB64);
  return `${payloadB64}.${bytesToBase64Url(sig)}`;
}

/** Verifies a session token; returns the session or null (invalid/expired/unconfigured). */
export async function verifyAdminSessionToken(
  token: string | undefined | null
): Promise<AdminSession | null> {
  const secret = getAdminSessionSecret();
  if (!secret || !token || token.length > 2048) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  const providedSig = base64UrlToBytes(sigB64);
  if (!providedSig) return null;
  const expectedSig = await hmacSha256(secret, payloadB64);
  if (!timingSafeEqualBytes(expectedSig, providedSig)) return null;

  const payloadBytes = base64UrlToBytes(payloadB64);
  if (!payloadBytes) return null;
  try {
    const payload = JSON.parse(decoder.decode(payloadBytes));
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload?.u !== 'string' ||
      typeof payload?.iat !== 'number' ||
      typeof payload?.exp !== 'number' ||
      payload.exp <= now ||
      payload.iat > now + CLOCK_SKEW_SECONDS ||
      payload.exp - payload.iat > ADMIN_SESSION_TTL_SECONDS
    ) {
      return null;
    }
    return { username: payload.u, issuedAt: payload.iat, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

/** True when the request carries a valid ADMIN_API_KEY (x-admin-api-key or Bearer). */
export async function hasValidAdminApiKey(headers: Headers): Promise<boolean> {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || expected.length < MIN_API_KEY_LENGTH) return false;

  let provided = headers.get(ADMIN_API_KEY_HEADER);
  if (!provided) {
    const auth = headers.get('authorization');
    if (auth && auth.toLowerCase().startsWith('bearer ')) provided = auth.slice(7).trim();
  }
  if (!provided) return false;
  return timingSafeEqualString(provided, expected);
}

/** Minimal request shape shared by NextRequest (edge + node). */
export interface AdminAuthRequestLike {
  headers: Headers;
  cookies: { get(name: string): { value: string } | undefined };
}

/** Admin if the request has a valid signed session cookie or a valid ADMIN_API_KEY. */
export async function isAdminRequest(req: AdminAuthRequestLike): Promise<boolean> {
  const session = await verifyAdminSessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (session) return true;
  return hasValidAdminApiKey(req.headers);
}

/** Cookie attributes for the admin session. */
export function adminSessionCookieOptions(maxAge: number = ADMIN_SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}
