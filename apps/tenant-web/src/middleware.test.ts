import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAdminSessionCookieName, middleware, resolveRouteByCookie } from './middleware';

describe('resolveRouteByCookie routing contract', () => {
  it.each([
    ['http', 'better-auth.session_token'],
    ['https', '__Secure-better-auth.session_token'],
    [undefined, '__Secure-better-auth.session_token'],
    ['invalid', '__Secure-better-auth.session_token'],
  ])('selects the advisory admin cookie for explicit transport %s without changing authorization', (transport, cookieName) => {
    expect(getAdminSessionCookieName(transport)).toBe(cookieName);
  });

  const originalEnv = { NODE_ENV: process.env.NODE_ENV, AUTH_COOKIE_TRANSPORT: process.env.AUTH_COOKIE_TRANSPORT };

  beforeEach(() => {
    process.env.AUTH_COOKIE_TRANSPORT = 'http';
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    if (originalEnv.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv.NODE_ENV;
    if (originalEnv.AUTH_COOKIE_TRANSPORT === undefined) delete process.env.AUTH_COOKIE_TRANSPORT;
    else process.env.AUTH_COOKIE_TRANSPORT = originalEnv.AUTH_COOKIE_TRANSPORT;
  });

  it.each([
    ['/admin/sistemas', 'admin'],
    ['/admin/tareas', 'admin'],
    ['/portal/clientes/42', 'client'],
  ])('preserves %s for the %s role', (pathname, role) => {
    expect(resolveRouteByCookie({ role, pathname })).toEqual({
      destination: pathname,
      action: 'rewrite',
    });
  });

  it.each([
    ['/some-page', 'admin', '/admin/some-page'],
    ['/clientes/42', 'client', '/portal/clientes/42'],
  ])('rewrites unprefixed %s for the %s role', (pathname, role, destination) => {
    expect(resolveRouteByCookie({ role, pathname })).toEqual({
      destination,
      action: 'rewrite',
    });
  });

  it.each([
    [null, '/admin/dashboard'],
    ['unknown', '/portal/clientes/42'],
  ])('redirects %s role from protected path to login', (role, pathname) => {
    expect(resolveRouteByCookie({ role, pathname })).toEqual({
      destination: '/login',
      action: 'redirect',
    });
  });

  it.each(['/login', '/_next/static/chunk.js', '/api/v1/health'])(
    'preserves public path %s for an unauthenticated request',
    (pathname) => {
      expect(resolveRouteByCookie({ role: null, pathname })).toEqual({
        destination: pathname,
        action: 'rewrite',
      });
    },
  );

  it('does not treat the legacy admin cookie as the selected advisory session', async () => {
    const response = await middleware({
      nextUrl: { pathname: '/dashboard' },
      url: 'https://tenant.crmmaster.com/dashboard',
      cookies: { get: (name: string) => name === '__Secure-session' ? { value: 'legacy' } : undefined },
    } as any);

    expect(response.status).toBe(307);
  });

  it('uses explicit HTTP transport even when NODE_ENV is production', async () => {
    const response = await middleware({
      nextUrl: { pathname: '/dashboard' },
      url: 'http://tenant.crmmaster.com/dashboard',
      cookies: { get: (name: string) => name === 'better-auth.session_token' ? { value: 'selected' } : undefined },
    } as any);

    expect(response.status).toBe(200);
  });

  it('uses explicit HTTPS transport even when NODE_ENV is development', async () => {
    process.env.AUTH_COOKIE_TRANSPORT = 'https';
    process.env.NODE_ENV = 'development';
    const response = await middleware({
      nextUrl: { pathname: '/dashboard' },
      url: 'https://tenant.crmmaster.com/dashboard',
      cookies: { get: (name: string) => name === '__Secure-better-auth.session_token' ? { value: 'selected' } : undefined },
    } as any);

    expect(response.status).toBe(200);
  });
});
