import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  hasValidAdminApiKey,
  isAdminRequest,
  verifyAdminSessionToken,
} from '@/lib/admin-session';

/**
 * Route-handler auth helpers. These re-check auth even though the middleware
 * already guards /admin and /api/admin, so routes stay safe if the matcher changes.
 */

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = await verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (session) return true;
  return hasValidAdminApiKey(await headers());
}

export async function requireAdminAuth() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    throw new Error('Unauthorized');
  }
}

export async function verifyAdminAuth(
  request: NextRequest
): Promise<{ authenticated: boolean; error?: string }> {
  try {
    if (await isAdminRequest(request)) {
      return { authenticated: true };
    }
    return { authenticated: false, error: 'Unauthorized' };
  } catch {
    return { authenticated: false, error: 'Failed to verify admin authentication' };
  }
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

/**
 * Returns a 401 response when the request is not from an admin, otherwise null.
 * Usage: `const denied = await adminGuard(request); if (denied) return denied;`
 */
export async function adminGuard(request: NextRequest): Promise<NextResponse | null> {
  if (await isAdminRequest(request)) return null;
  return unauthorizedResponse();
}
