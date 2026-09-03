jest.mock('../auth-client.provider', () => ({ AUTH_CLIENT: 'AUTH_CLIENT' }));
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { BetterAuthGuard } from './better-auth.guard';
import { TenantScopeGuard } from './tenant-scope.guard';
import {
  AUTH_BOUNDARY_KEY,
  AuthBoundaryKind,
  ExternalAuth,
  IS_PUBLIC_KEY,
  Public,
} from '../decorators/public.decorator';
import { ClientAuthController } from '../../modules/client-auth/client-auth.controller';
import { ExportController } from '../../modules/export/export.controller';
import { V1WorkflowsController } from '../../modules/public-api/v1/v1-workflows.controller';
import { V1DocumentsController } from '../../modules/public-api/v1/v1-documents.controller';

describe('tenant auth boundary metadata', () => {
  it('classifies only the existing client me route as a client-session hand-off', () => {
    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, ClientAuthController.prototype.me)).toBe(
      'client-session',
    );
    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, ClientAuthController.prototype.login)).toBeUndefined();
    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, ClientAuthController.prototype.register)).toBeUndefined();
    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, ClientAuthController.prototype.logout)).toBeUndefined();
  });

  it('classifies export identity admission without making it anonymous', () => {
    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, ExportController)).toBe('identity-session');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, ExportController)).toBeUndefined();
  });

  it.each([V1WorkflowsController, V1DocumentsController])(
    'classifies the existing public API controller as deferred token admission',
    (controller) => {
    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, controller)).toBe('api-token-deferred');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller)).toBeUndefined();
    },
  );

  it('keeps anonymous access explicit and distinct from classified hand-offs', () => {
    @Public()
    class PublicController {}

    @ExternalAuth('client-session')
    class ClientController {}

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicController)).toBe(true);
    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, PublicController)).toBeUndefined();
    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, ClientController)).toBe('client-session');
  });

  it.each<AuthBoundaryKind>([
    'identity-session',
    'client-session',
    'api-token-deferred',
  ])('records the named post-global authority for %s', (kind) => {
    class Controller {}
    ExternalAuth(kind)(Controller);

    expect(Reflect.getMetadata(AUTH_BOUNDARY_KEY, Controller)).toBe(kind);
  });

  it('supports handler-over-class lookup through Nest Reflector', () => {
    class Controller {
      @ExternalAuth('identity-session')
      handler() {}
    }

    const reflector = new Reflector();

    expect(
      reflector.getAllAndOverride<AuthBoundaryKind>(AUTH_BOUNDARY_KEY, [
        Controller.prototype.handler,
        Controller,
      ]),
    ).toBe('identity-session');
  });
});

describe('tenant auth boundary core contracts', () => {
  it('denies an unclassified tenant request without a credential', async () => {
    const reflector = new Reflector();
    const provider = { getSession: jest.fn() };
    const prisma = {};
    const guard = new BetterAuthGuard(reflector, prisma as any, provider as any);
    const request = { path: '/api/v1/tenant/clients', headers: {}, hostTenantId: 'tenant-a' };
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(provider.getSession).not.toHaveBeenCalled();
  });

  it('hands classified routes to their named guard without anonymous admission', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) =>
      key === AUTH_BOUNDARY_KEY ? 'client-session' : undefined,
    );
    const provider = { getSession: jest.fn() };
    const guard = new BetterAuthGuard(reflector, {} as any, provider as any);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ headers: {}, path: '/api/v1/client/me' }) }),
    } as any;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(provider.getSession).not.toHaveBeenCalled();
  });

  it('does not treat Host scope as actor authority', () => {
    const reflector = new Reflector();
    const guard = new TenantScopeGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ hostTenantId: 'tenant-a', tenantId: 'tenant-a' }) }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('keeps public metadata distinct from tenant scope for authenticated principals', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );
    const guard = new TenantScopeGuard(reflector);
    const request = {
      hostTenantId: 'tenant-a',
      user: { tenantId: 'tenant-b' },
    };
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(/discrepancia/i);
  });

  it('rejects bearer credentials on tenant routes even when the provider accepts them', async () => {
    const reflector = new Reflector();
    const provider = { getSession: jest.fn().mockResolvedValue({ userId: 'user-a' }) };
    const prisma = {
      admin: { legacyUser: { findFirst: jest.fn().mockResolvedValue({
        id: 'legacy-a', email: 'a@example.test', name: 'A', role: 'user', tenantId: 'tenant-a', isActive: true,
      }) } },
    };
    const guard = new BetterAuthGuard(reflector, prisma as any, provider as any);
    const request = {
      path: '/api/v1/tenant/clientes',
      headers: { authorization: 'Bearer reusable-token' },
      hostTenantId: 'tenant-a',
    };
    const context = {
      getHandler: () => ({}), getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(provider.getSession).not.toHaveBeenCalled();
  });

  it('requires authenticated identity tenant equality with the immutable Host tenant', () => {
    const reflector = new Reflector();
    const guard = new TenantScopeGuard(reflector);
    const context = {
      getHandler: () => ({}), getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({
        hostTenantId: 'tenant-a', user: { id: 'user-b', tenantId: 'tenant-b' },
      }) }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(/discrepancia/i);
  });

  it('denies an expired provider session before resolving an identity', async () => {
    const provider = { getSession: jest.fn().mockResolvedValue(null) };
    const guard = new BetterAuthGuard(new Reflector(), {} as any, provider as any);
    const context = {
      getHandler: () => ({}), getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({
        path: '/api/v1/tenant/clientes',
        headers: { cookie: '__Secure-better-auth.session_token=expired' },
      }) }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('denies a session whose identity is not mapped to a tenant-admin user', async () => {
    const provider = { getSession: jest.fn().mockResolvedValue({ userId: 'unknown' }) };
    const prisma = { admin: { legacyUser: { findFirst: jest.fn().mockResolvedValue(null) } } };
    const guard = new BetterAuthGuard(new Reflector(), prisma as any, provider as any);
    const context = {
      getHandler: () => ({}), getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({
        path: '/api/v1/tenant/clientes',
        headers: { cookie: '__Secure-better-auth.session_token=opaque' },
      }) }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow(/no encontrado/i);
  });
});
