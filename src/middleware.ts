import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-session';
import { getRouteAccess, isAdminNamespace, isApiPath } from '@/lib/admin-route-policy';

/**
 * Guards every /admin page and /api/admin/** route (plus admin-only routes that
 * live elsewhere, see admin-route-policy.ts). Admin = valid signed session cookie
 * or valid ADMIN_API_KEY header. Pages redirect to /admin/login, APIs get 401 JSON.
 * Route handlers re-check auth as defence in depth.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isAdminNamespace(pathname)) {
    return NextResponse.next();
  }

  // CORS preflight carries no credentials; let the route answer it.
  if (req.method === 'OPTIONS') {
    return NextResponse.next();
  }

  const access = getRouteAccess(req.method, pathname);
  if (access !== 'admin') {
    return NextResponse.next();
  }

  if (await isAdminRequest(req)) {
    return NextResponse.next();
  }

  if (isApiPath(pathname)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/promo-requests/:id/approve',
    '/api/promo-requests/:id/reject',
  ],
};
