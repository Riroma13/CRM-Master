import { describe, expect, it } from 'vitest';
import { resolveRouteByCookie } from './middleware';

describe('resolveRouteByCookie routing contract', () => {
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
});
