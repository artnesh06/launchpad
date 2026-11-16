/**
 * Access policy for admin-namespaced routes (Edge-safe, no Node imports).
 *
 * Default for /admin/** pages and /api/admin/** routes is ADMIN-ONLY.
 * Exceptions are listed explicitly (method + path) below:
 *
 *  - 'public':  used by the public site and safe without auth because the route
 *               is read-only or only re-syncs data from the blockchain (the chain
 *               is the source of truth, request bodies are not trusted).
 *  - 'creator': used by wallet-connected creators; the middleware lets the request
 *               through and the route handler itself requires either an admin
 *               session or a wallet signature from the collection's creator/owner
 *               (see src/lib/creator-auth.ts).
 */

export type RouteAccess = 'public' | 'creator' | 'admin';

interface RouteRule {
  methods: string[]; // '*' = any method
  pattern: RegExp;
  access: Exclude<RouteAccess, 'admin'>;
  reason: string;
}

const ADDR = '[^/]+';

const RULES: RouteRule[] = [
  // Auth endpoints: login (POST), logout (DELETE), session status (GET /auth, GET /auth/check).
  // These handlers verify the signed session themselves.
  { methods: ['*'], pattern: /^\/api\/admin\/auth\/?$/, access: 'public', reason: 'login/logout' },
  { methods: ['GET'], pattern: /^\/api\/admin\/auth\/check\/?$/, access: 'public', reason: 'session status (self-checking)' },

  // Read-only data used by the public site (home, search, launchpad and /create pages)
  { methods: ['GET'], pattern: /^\/api\/admin\/launchpads\/?$/, access: 'public', reason: 'collection listing' },
  { methods: ['GET'], pattern: /^\/api\/admin\/stats\/?$/, access: 'public', reason: 'creator dashboard stats' },
  { methods: ['GET'], pattern: new RegExp(`^/api/admin/launchpads/${ADDR}/latest-mints/?$`), access: 'public', reason: 'latest mints' },

  // Chain-sourced syncs triggered by the public site after on-chain transactions
  { methods: ['POST'], pattern: /^\/api\/admin\/launchpads\/sync-mint-tx-async\/?$/, access: 'public', reason: 'verifies tx receipt on-chain' },
  { methods: ['POST'], pattern: /^\/api\/admin\/launchpads\/sync-phases\/?$/, access: 'public', reason: 'reads phases from contract' },
  { methods: ['POST'], pattern: /^\/api\/admin\/launchpads\/sync-single\/?$/, access: 'public', reason: 'reads collection from contract' },
  { methods: ['POST'], pattern: /^\/api\/admin\/snapshot\/?$/, access: 'public', reason: 'read-only holder snapshot' },

  // Creator write actions: enforced in the route handler (admin session OR creator wallet signature)
  { methods: ['PATCH'], pattern: new RegExp(`^/api/admin/launchpads/${ADDR}/status/?$`), access: 'creator', reason: 'creator status toggle' },
  { methods: ['POST'], pattern: /^\/api\/admin\/launchpads\/save\/?$/, access: 'creator', reason: 'creator saves new collection' },
];

const ADMIN_PAGE_PUBLIC = new Set(['/admin/login', '/admin/login/']);

export function isAdminNamespace(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/admin' ||
    pathname.startsWith('/api/admin/') ||
    /^\/api\/promo-requests\/[^/]+\/(approve|reject)\/?$/.test(pathname)
  );
}

export function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

/** Access level for a request in the admin namespace. Anything not listed is admin-only. */
export function getRouteAccess(method: string, pathname: string): RouteAccess {
  if (ADMIN_PAGE_PUBLIC.has(pathname)) return 'public';
  const m = method.toUpperCase();
  for (const rule of RULES) {
    if (rule.pattern.test(pathname) && (rule.methods.includes('*') || rule.methods.includes(m))) {
      return rule.access;
    }
  }
  return 'admin';
}
