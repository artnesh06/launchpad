import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  isAdminSessionConfigured,
  timingSafeEqualString,
  verifyAdminSessionToken,
} from '@/lib/admin-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const username = typeof body?.username === 'string' ? body.username : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    // Validate credentials against environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword || !isAdminSessionConfigured()) {
      console.error(
        'Admin login refused: ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET (>= 32 chars) must be set'
      );
      return NextResponse.json(
        { error: 'Admin credentials not configured' },
        { status: 500 }
      );
    }

    // Constant-time comparison; evaluate both before branching.
    const [userOk, passOk] = await Promise.all([
      timingSafeEqualString(username, adminUsername),
      timingSafeEqualString(password, adminPassword),
    ]);

    if (userOk && passOk) {
      const token = await createAdminSessionToken(adminUsername);
      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: token,
        ...adminSessionCookieOptions(),
      });
      return response;
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    ...adminSessionCookieOptions(0),
  });
  return response;
}

export async function GET(request: NextRequest) {
  const session = await verifyAdminSessionToken(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (session) {
    return NextResponse.json({
      authenticated: true,
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
