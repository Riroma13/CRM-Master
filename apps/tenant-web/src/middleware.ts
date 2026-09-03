import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESERVED_SLUGS = new Set(['www', 'api', 'admin', 'app', 'mail', 'dev']);
const BETTER_AUTH_SESSION_COOKIE = '__Secure-better-auth.session_token';
const LEGACY_ADMIN_SESSION_COOKIE = '__Secure-session';
const CLIENT_SESSION_COOKIE = '__Secure-client-session';
const LOCAL_CLIENT_SESSION_COOKIE = 'client-session';

export interface RouteDecision {
  destination: string;
  action: 'rewrite' | 'redirect';
}

export function resolveTenantFromHost(host: string): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');
  if (parts.length < 2) return null;
  const slug = parts[0];
  if (RESERVED_SLUGS.has(slug)) return null;
  if (parts.length === 2 && parts[1] !== 'localhost') return null;
  return slug;
}

export async function resolveAdvisoryRole(params: {
  adminCookie?: string;
  clientCookie?: string;
  clientPortalEnabled?: boolean;
}): Promise<string | null> {
  if (params.adminCookie) return 'admin';
  if (!params.clientPortalEnabled) return null;
  return params.clientCookie ? 'client' : null;
}

export function resolveRouteByCookie(params: {
  role: string | null;
  pathname: string;
}): RouteDecision {
  const { role, pathname } = params;

  if (!role || role === 'unknown') {
    if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
      return { destination: pathname, action: 'rewrite' };
    }
    return { destination: '/login', action: 'redirect' };
  }

  const targetPath = role === 'admin' ? '/admin' : '/portal';
  const isRolePath = pathname === targetPath || pathname.startsWith(`${targetPath}/`);
  const destination = isRolePath
    ? pathname
    : pathname && pathname !== '/'
      ? `${targetPath}${pathname}`
      : targetPath;
  return { destination, action: 'rewrite' };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/status')
  ) {
    return NextResponse.next();
  }

  const adminCookie =
    request.cookies.get(BETTER_AUTH_SESSION_COOKIE)?.value ??
    request.cookies.get(LEGACY_ADMIN_SESSION_COOKIE)?.value;
  const clientCookie =
    request.cookies.get(CLIENT_SESSION_COOKIE)?.value ??
    (process.env.NODE_ENV === 'production'
      ? undefined
      : request.cookies.get(LOCAL_CLIENT_SESSION_COOKIE)?.value);

  const clientPortalEnabled = process.env.NEXT_PUBLIC_CLIENT_PORTAL_ENABLED === 'true';
  const role = await resolveAdvisoryRole({
    adminCookie,
    clientCookie,
    clientPortalEnabled,
  });

  const decision = resolveRouteByCookie({ role, pathname });

  if (decision.action === 'redirect') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (decision.destination !== pathname) {
    const url = new URL(decision.destination, request.url);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
