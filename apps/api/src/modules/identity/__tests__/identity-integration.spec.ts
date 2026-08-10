import 'reflect-metadata';
jest.mock('../../../common/auth', () => ({ createAuth: jest.fn() }));
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IdentityController } from '../identity.controller';
import { IdentityOrganizationGuard } from '../identity-organization.guard';
import { BetterAuthProviderSessionAdapter, providerHeaders } from '../../../common/auth-client.provider';
import { BetterAuthGuard } from '../../../common/guards/better-auth.guard';

describe('Identity integration route contract', () => {
  const routes = [
    ['createInvitation', 'POST', 'invitations', 'auth:create'],
    ['cancelInvitation', 'DELETE', 'invitations/:invitationId', 'auth:delete'],
    ['createMembership', 'POST', 'memberships', 'user:assign'],
    ['updateMembershipRole', 'PATCH', 'memberships/:memberId/role', 'role:update'],
    ['removeMembership', 'DELETE', 'memberships/:memberId', 'user:revoke'],
    ['createTeam', 'POST', 'teams', 'configuration:create'],
    ['updateTeam', 'PATCH', 'teams/:teamId', 'configuration:update'],
    ['deleteTeam', 'DELETE', 'teams/:teamId', 'configuration:delete'],
    ['createRole', 'POST', 'roles', 'role:create'],
    ['updateRole', 'PATCH', 'roles/:roleId', 'role:update'],
    ['deleteRole', 'DELETE', 'roles/:roleId', 'role:delete'],
    ['replacePolicy', 'PUT', 'policies/:subjectId', 'permission:update'],
  ] as const;

  it.each(routes)('binds %s to the exact protected route and permission', (methodName, verb, path, permission) => {
    const method = (IdentityController.prototype as any)[methodName];
    expect(Reflect.getMetadata(PATH_METADATA, method)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(
      { POST: RequestMethod.POST, DELETE: RequestMethod.DELETE, PATCH: RequestMethod.PATCH, PUT: RequestMethod.PUT }[verb],
    );
    expect(Reflect.getMetadata('permissions', method)).toEqual({
      resource: permission.split(':')[0],
      action: permission.split(':')[1],
    });
    expect(Reflect.getMetadata('__guards__', method)).toContain(IdentityOrganizationGuard);
  });

  it('does not expose organization authorization on invitation acceptance', () => {
    const method = (IdentityController.prototype as any).acceptInvitation;
    expect(method).toBeDefined();
    expect(Reflect.getMetadata('__guards__', method) ?? []).not.toContain(IdentityOrganizationGuard);
  });
});

describe('Identity organization guard', () => {
  const request = (overrides: Record<string, unknown> = {}) => ({
    headers: { authorization: 'Bearer token', cookie: 'session=value', 'x-forwarded-host': 'evil.example' },
    hostTenantId: 'tenant-a',
    hostTenantSlug: 'acme',
    ...overrides,
  });

  const contextFor = (req: Record<string, unknown>, permission = { resource: 'auth', action: 'create' }) => ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => function handler() {},
    getClass: () => IdentityController,
  }) as any;

  function makeGuard(overrides: Record<string, unknown> = {}) {
    const provider = { getSession: jest.fn().mockResolvedValue({ userId: 'user-1', activeOrganizationId: 'org-a' }) };
    const prisma = { forTenant: jest.fn().mockReturnValue({ tenant: { findFirst: jest.fn().mockResolvedValue({ betterAuthOrganizationId: 'org-a' }) } }) };
    const membership = { findMembership: jest.fn().mockResolvedValue({ organizationId: 'org-a', role: 'owner' }) };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ resource: 'auth', action: 'create' }) };
    const guard = new IdentityOrganizationGuard(provider as any, prisma as any, membership as any, reflector as any);
    Object.assign(provider, overrides.provider);
    Object.assign(membership, overrides.membership);
    return { guard, provider, prisma, membership, reflector };
  }

  it('fails closed for missing Host, session, membership, org mismatch, and permission denial', async () => {
    const missingHost = makeGuard();
    await expect(missingHost.guard.canActivate(contextFor(request({ hostTenantId: undefined })))).rejects.toMatchObject({
      response: { message: 'IDENTITY_TENANT_CONTEXT_REQUIRED' }, status: 403,
    });

    const missingSession = makeGuard({ provider: { getSession: jest.fn().mockResolvedValue(null) } });
    await expect(missingSession.guard.canActivate(contextFor(request()))).rejects.toMatchObject({
      response: { message: 'IDENTITY_SESSION_REQUIRED' },
      status: 401,
    });

    const missingMembership = makeGuard({ membership: { findMembership: jest.fn().mockResolvedValue(null) } });
    await expect(missingMembership.guard.canActivate(contextFor(request()))).rejects.toMatchObject({
      response: { message: 'IDENTITY_ORGANIZATION_MEMBERSHIP_REQUIRED' },
      status: 403,
    });

    const mismatch = makeGuard({ provider: { getSession: jest.fn().mockResolvedValue({ userId: 'user-1', activeOrganizationId: 'org-b' }) } });
    await expect(mismatch.guard.canActivate(contextFor(request()))).rejects.toMatchObject({
      response: { message: 'IDENTITY_ORGANIZATION_MISMATCH' },
      status: 403,
    });

    const denied = makeGuard({ membership: { findMembership: jest.fn().mockResolvedValue({ organizationId: 'org-a', role: 'member' }) } });
    await expect(denied.guard.canActivate(contextFor(request()))).rejects.toMatchObject({
      response: { message: 'IDENTITY_PERMISSION_DENIED' },
      status: 403,
    });
  });

  it('forwards only authorization and cookie and preserves immutable Host authority', async () => {
    const { guard, provider, prisma } = makeGuard();
    await expect(guard.canActivate(contextFor(request()))).resolves.toBe(true);
    const headers = provider.getSession.mock.calls[0][0] as Headers;
    expect(headers.get('authorization')).toBe('Bearer token');
    expect(headers.get('cookie')).toBe('session=value');
    expect(headers.get('x-forwarded-host')).toBeNull();
    expect(prisma.forTenant).toHaveBeenCalledWith('tenant-a');
  });

  it('rejects an invalid opaque session before consulting tenant data', async () => {
    const { guard, prisma } = makeGuard({ provider: { getSession: jest.fn().mockResolvedValue(null) } });

    await expect(guard.canActivate(contextFor(request({ hostTenantId: undefined })))).rejects.toMatchObject({
      response: { message: 'IDENTITY_SESSION_REQUIRED' },
      status: 401,
    });
    expect(prisma.forTenant).not.toHaveBeenCalled();
  });

  it('rejects callback-derived or cross-tenant Host context before tenant data access', async () => {
    const { guard, prisma } = makeGuard();
    const req = request({
      hostTenantId: undefined,
      hostTenantSlug: 'tenant-b',
      oauthCallbackContext: {
        hostTenantId: 'tenant-a',
        hostTenantSlug: 'tenant-a',
        organizationId: 'org-a',
      },
      body: { tenantId: 'tenant-a' },
    });

    await expect(guard.canActivate(contextFor(req))).rejects.toMatchObject({
      response: { message: 'IDENTITY_TENANT_CONTEXT_REQUIRED' },
      status: 403,
    });
    expect(prisma.forTenant).not.toHaveBeenCalled();
  });

  it('uses Host authority even when claims, query, and body select another tenant', async () => {
    const { guard, prisma, membership } = makeGuard();
    const req = request({
      user: { tenantId: 'tenant-b' },
      query: { tenantId: 'tenant-b' },
      body: { tenantId: 'tenant-b' },
    });

    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);

    expect(prisma.forTenant).toHaveBeenCalledWith('tenant-a');
    expect(membership.findMembership).toHaveBeenCalledWith('tenant-a', 'user-1', 'org-a');
  });
});

describe('Better Auth session transport', () => {
  it('forwards opaque cookies and bearer credentials to Better Auth getSession', async () => {
    const getSession = jest.fn().mockResolvedValue({
      user: { id: 'ba-user-1' },
      session: { activeOrganizationId: 'org-a' },
    });
    const adapter = new BetterAuthProviderSessionAdapter({ api: { getSession } } as any);

    await expect(
      adapter.getSession(
        providerHeaders(
          new Headers({
            cookie: '__Secure-better-auth.session_token=opaque.signed.value',
            authorization: 'Bearer legacy-bearer-token',
            'x-tenant-id': 'tenant-b',
          }),
        ),
      ),
    ).resolves.toEqual({ userId: 'ba-user-1', activeOrganizationId: 'org-a' });

    const forwarded = getSession.mock.calls[0][0].headers as Headers;
    expect(forwarded.get('cookie')).toBe('__Secure-better-auth.session_token=opaque.signed.value');
    expect(forwarded.get('authorization')).toBe('Bearer legacy-bearer-token');
    expect(forwarded.get('x-tenant-id')).toBeNull();
  });

  it('rejects invalid Better Auth cookies with the same generic unauthorized response', async () => {
    const provider = { getSession: jest.fn().mockResolvedValue(null) };
    const prisma = { admin: { legacyUser: { findFirst: jest.fn() } } };
    const guard = new BetterAuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as any,
      prisma as any,
      provider as any,
    );
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/api/v1/admin/teams',
          headers: { cookie: '__Secure-better-auth.session_token=invalid.opaque.cookie' },
        }),
      }),
      getHandler: () => function handler() {},
      getClass: () => IdentityController,
    } as any;

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { message: 'Token inválido o expirado' },
      status: 401,
    });
    expect(provider.getSession).toHaveBeenCalledWith(
      expect.objectContaining({
        get: expect.any(Function),
      }),
    );
    expect(prisma.admin.legacyUser.findFirst).not.toHaveBeenCalled();
  });

  it('resolves the Better Auth session before consulting legacy identity state', async () => {
    const provider = {
      getSession: jest.fn().mockResolvedValue({ userId: 'legacy-user', activeOrganizationId: 'org-a' }),
    };
    const prisma = {
      admin: {
        legacyUser: {
          findFirst: jest.fn().mockResolvedValue({
            email: 'admin@example.com',
            name: 'Admin',
            role: 'superadmin',
            tenantId: 'tenant-a',
            isActive: true,
          }),
        },
      },
    };
    const guard = new BetterAuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as any,
      prisma as any,
      provider as any,
    );
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: '/api/v1/admin/teams',
          headers: { cookie: '__Secure-better-auth.session_token=opaque.not-a-jwt' },
        }),
      }),
      getHandler: () => function handler() {},
      getClass: () => IdentityController,
    } as any;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(provider.getSession.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.admin.legacyUser.findFirst.mock.invocationCallOrder[0],
    );
  });

  it('normalizes Better Auth cookie parsing failures to an absent session', async () => {
    const adapter = new BetterAuthProviderSessionAdapter({
      api: { getSession: jest.fn().mockRejectedValue(new Error('invalid signed cookie')) },
    } as any);

    await expect(
      adapter.getSession(new Headers({ cookie: '__Secure-better-auth.session_token=invalid' })),
    ).resolves.toBeNull();
  });

  it('preserves legacy bearer sessions while accepting a Better Auth cookie', async () => {
    const provider = { getSession: jest.fn().mockResolvedValue({ userId: 'legacy-user', activeOrganizationId: 'org-a' }) };
    const prisma = {
      admin: {
        legacyUser: {
          findFirst: jest.fn().mockResolvedValue({
            email: 'admin@example.com',
            name: 'Admin',
            role: 'superadmin',
            tenantId: 'tenant-a',
            isActive: true,
          }),
        },
      },
    };
    const guard = new BetterAuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as any,
      prisma as any,
      provider as any,
    );
    const requestWithBoth = {
      path: '/api/v1/admin/teams',
      headers: {
        authorization: 'Bearer legacy-bearer-token',
        cookie: '__Secure-better-auth.session_token=opaque.signed.value',
      },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => requestWithBoth }),
      getHandler: () => function handler() {},
      getClass: () => IdentityController,
    } as any;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    const forwarded = provider.getSession.mock.calls[0][0] as Headers;
    expect(forwarded.get('authorization')).toBe('Bearer legacy-bearer-token');
    expect(forwarded.get('cookie')).toBe('__Secure-better-auth.session_token=opaque.signed.value');
  });
});
