/**
 * Admin proxy to the listener service.
 *
 * The admin pages run in the browser, where the listener's admin key must
 * never be exposed. They call /api/admin/listener/<listener path> instead;
 * this route (guarded by the admin middleware and re-checked here) forwards
 * the request to the listener with LISTENER_ADMIN_API_KEY attached.
 *
 * Env:
 *   LISTENER_URL            listener base URL (defaults to NEXT_PUBLIC_BACKEND_URL)
 *   LISTENER_ADMIN_API_KEY  the listener's ADMIN_API_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Listener paths an admin may reach through this proxy. */
const ALLOWED_PREFIXES = ['api/', 'health', 'sync-missing'];

function listenerBaseUrl(): string | null {
  const url = process.env.LISTENER_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  return url ? url.replace(/\/+$/, '') : null;
}

async function forward(request: NextRequest, params: Promise<{ path: string[] }>) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();

  const base = listenerBaseUrl();
  const apiKey = process.env.LISTENER_ADMIN_API_KEY;
  if (!base || !apiKey) {
    return NextResponse.json(
      { success: false, error: 'Listener is not configured (LISTENER_URL / LISTENER_ADMIN_API_KEY)' },
      { status: 503 }
    );
  }

  const { path } = await params;
  const subPath = (path || []).map(encodeURIComponent).join('/');
  if (!ALLOWED_PREFIXES.some((p) => subPath.startsWith(p)) || subPath.includes('..')) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const target = `${base}/${subPath}${request.nextUrl.search}`;
  const headers: Record<string, string> = { 'x-admin-api-key': apiKey };
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(290_000),
    });

    const responseHeaders = new Headers();
    for (const name of ['content-type', 'content-disposition']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error('[listener-proxy] upstream error:', error);
    return NextResponse.json({ success: false, error: 'Listener service unreachable' }, { status: 502 });
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx.params);
}
export async function POST(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx.params);
}
export async function PUT(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx.params);
}
export async function PATCH(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx.params);
}
export async function DELETE(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx.params);
}
