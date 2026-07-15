import { describe, it, expect } from 'vitest';
import { resolveRouteByCookie, resolveTenantFromHost } from '../middleware';

describe('resolveTenantFromHost', () => {
  it('extracts slug from subdomain host', () => {
    expect(resolveTenantFromHost('acme.crmmaster.com')).toBe('acme');
  });

  it('extracts slug from host with port', () => {
    expect(resolveTenantFromHost('test.localhost:3001')).toBe('test');
  });

  it('returns null for root domain', () => {
    expect(resolveTenantFromHost('crmmaster.com')).toBeNull();
  });

  it('returns null for www subdomain', () => {
    expect(resolveTenantFromHost('www.crmmaster.com')).toBeNull();
  });

  it('returns null for unknown host', () => {
    expect(resolveTenantFromHost('')).toBeNull();
  });
});

describe('resolveRouteByCookie', () => {
  it('routes admin role to /admin path', () => {
    const result = resolveRouteByCookie({
      role: 'admin',
      pathname: '/some-page',
    });
    expect(result).toEqual({ destination: '/admin/some-page', action: 'rewrite' });
  });

  it('routes client role to /portal path', () => {
    const result = resolveRouteByCookie({
      role: 'client',
      pathname: '/some-page',
    });
    expect(result).toEqual({ destination: '/portal/some-page', action: 'rewrite' });
  });

  it('routes admin role to /admin without double slash on root', () => {
    const result = resolveRouteByCookie({
      role: 'admin',
      pathname: '',
    });
    expect(result).toEqual({ destination: '/admin', action: 'rewrite' });
  });

  it('routes client role to /portal without double slash on root', () => {
    const result = resolveRouteByCookie({
      role: 'client',
      pathname: '',
    });
    expect(result).toEqual({ destination: '/portal', action: 'rewrite' });
  });

  it('redirects missing cookie to /login', () => {
    const result = resolveRouteByCookie({
      role: null,
      pathname: '/admin/dashboard',
    });
    expect(result).toEqual({ destination: '/login', action: 'redirect' });
  });

  it('redirects missing cookie even on root path', () => {
    const result = resolveRouteByCookie({
      role: null,
      pathname: '/',
    });
    expect(result).toEqual({ destination: '/login', action: 'redirect' });
  });

  it('redirects unknown role to /login', () => {
    const result = resolveRouteByCookie({
      role: 'unknown',
      pathname: '/admin',
    });
    expect(result).toEqual({ destination: '/login', action: 'redirect' });
  });
});
