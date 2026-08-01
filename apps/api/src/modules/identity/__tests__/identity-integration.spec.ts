import 'reflect-metadata';
jest.mock('../../../common/auth', () => ({ createAuth: jest.fn() }));
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IdentityController } from '../identity.controller';
import { IdentityOrganizationGuard } from '../identity-organization.guard';

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
});
