import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
jest.mock('../../../common/auth', () => ({ createAuth: jest.fn() }));
import {
  IDENTITY_CATALOG_MISMATCH,
  evaluateIdentityCatalog,
} from '../identity-catalog-preflight.service';
import {
  evaluateIdentityAuthorization,
  deriveMutationId,
  deriveAuditEventId,
  isValidIdempotencyKey,
  IdentityAuthorizationService,
} from '../identity-authorization.service';
import { IdentityAuthorizationRepository } from '../identity-authorization.repository';
import { IdentityMembershipRepository } from '../identity-membership.repository';
import {
  BetterAuthProviderSessionAdapter,
  providerHeaders,
} from '../../../common/auth-client.provider';
import { BetterAuthGuard } from '../../../common/guards/better-auth.guard';

describe('Identity foundation preflight', () => {
  it('disables routes and workers with a redacted catalog mismatch', () => {
    const result = evaluateIdentityCatalog({
      organizationSlug: { exists: true, nullable: true, unique: true },
      invitationExpiresAt: { exists: false, nullable: true, unique: false },
      invitationInviterForeignKey: { exists: true, nullable: false, unique: false },
      sessionActiveOrganizationId: { exists: false, nullable: true, unique: false },
    });

    expect(result).toEqual({
      enabled: false,
      routesEnabled: false,
      workersEnabled: false,
      code: IDENTITY_CATALOG_MISMATCH,
      diagnostics: [
        {
          table: 'ba_organizations',
          column: 'slug',
          issue: 'must be non-null',
        },
        {
          table: 'ba_invitations',
          column: 'expires_at',
          issue: 'missing',
        },
        {
          table: 'ba_sessions',
          column: 'active_organization_id',
          issue: 'missing',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('accepts the compatible catalog without activating unrelated details', () => {
    const result = evaluateIdentityCatalog({
      organizationSlug: { exists: true, nullable: false, unique: true },
      invitationExpiresAt: { exists: true, nullable: false, unique: false },
      invitationInviterForeignKey: { exists: true, nullable: false, unique: false },
      sessionActiveOrganizationId: { exists: true, nullable: true, unique: false },
    });

    expect(result.enabled).toBe(true);
    expect(result.routesEnabled).toBe(true);
    expect(result.workersEnabled).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects a non-additive or non-rollback-safe Foundation artifact set', () => {
    const migration = readFileSync(
      resolve(__dirname, '../../../../../../packages/database/prisma/migrations/20260728150000_add_identity_platform/migration.sql'),
      'utf8',
    );
    const adr = readFileSync(
      resolve(__dirname, '../../../../../../docs/adr/0025-identity-platform.md'),
      'utf8',
    );

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS');
    expect(migration).toContain('PARTIAL INDEX SAFETY');
    expect(migration).not.toContain('20260720230000_add_identity');
    expect(adr).toContain('ADR 0025: Identity Platform');
    expect(adr).toContain('append-only');
    expect(adr).toContain('Rollback');
  });
});

describe('Identity authorization core engine', () => {
  const operation = (overrides: Record<string, unknown> = {}) => ({
    id: 'operation-1',
    tenantId: 'tenant-a',
    subjectId: 'subject-1',
    mutationId: 'mutation-1',
    status: 'PENDING',
    attempts: 0,
    maxAttempts: 2,
    nextAttemptAt: new Date(0),
    leaseOwner: null,
    leaseExpiresAt: null,
    terminalAt: null,
    terminalReason: null,
    purgeConfirmedAt: null,
    ...overrides,
  });

  it('claims only a tenant-scoped pending or expired lease', async () => {
    const repository = {
      claim: jest.fn().mockResolvedValue(operation({ status: 'PURGING', leaseOwner: 'worker-1' })),
    } as unknown as IdentityAuthorizationRepository;
    const service = new IdentityAuthorizationService(repository);

    await expect(service.claim('tenant-a', 'operation-1', 'worker-1', new Date(1000))).resolves.toMatchObject({
      tenantId: 'tenant-a',
      status: 'PURGING',
    });
    expect(repository.claim).toHaveBeenCalledWith('tenant-a', 'operation-1', 'worker-1', new Date(1000));
  });

  it('requires a live owner for success and makes stale completion a no-op', async () => {
    const repository = {
      complete: jest.fn().mockResolvedValueOnce(operation({ status: 'PURGED' })).mockResolvedValueOnce(null),
    } as unknown as IdentityAuthorizationRepository;
    const service = new IdentityAuthorizationService(repository);

    await expect(service.complete('tenant-a', 'operation-1', 'worker-1', new Date(1000))).resolves.toMatchObject({
      status: 'PURGED',
    });
    await expect(service.complete('tenant-a', 'operation-1', 'stale-worker', new Date(1000))).resolves.toBeNull();
  });

  it('backs off transient failures and transitions exhausted work to FAILED', async () => {
    const repository = {
      fail: jest.fn()
        .mockResolvedValueOnce(operation({ status: 'PENDING', attempts: 1, nextAttemptAt: new Date(6000) }))
        .mockResolvedValueOnce(operation({ status: 'FAILED', attempts: 2, terminalReason: 'PROVIDER_UNAVAILABLE' })),
    } as unknown as IdentityAuthorizationRepository;
    const service = new IdentityAuthorizationService(repository);

    await expect(service.fail('tenant-a', 'operation-1', 'worker-1', 'PROVIDER_UNAVAILABLE', new Date(1000)))
      .resolves.toMatchObject({ status: 'PENDING', nextAttemptAt: new Date(6000) });
    await expect(service.fail('tenant-a', 'operation-1', 'worker-1', 'PROVIDER_UNAVAILABLE', new Date(1000)))
      .resolves.toMatchObject({ status: 'FAILED', terminalReason: 'PROVIDER_UNAVAILABLE' });
  });

  it.each([
    [null, null, null, false, 'IDENTITY_TENANT_CONTEXT_REQUIRED'],
    [{ hostTenantId: 'tenant-a', hostTenantSlug: 'acme' }, null, null, false, 'IDENTITY_SESSION_REQUIRED'],
    [{ hostTenantId: 'tenant-a', hostTenantSlug: 'acme' }, { userId: 'user-1', activeOrganizationId: 'org-a' }, null, false, 'IDENTITY_ORGANIZATION_MEMBERSHIP_REQUIRED'],
    [{ hostTenantId: 'tenant-a', hostTenantSlug: 'acme' }, { userId: 'user-1', activeOrganizationId: 'org-b' }, { organizationId: 'org-b' }, false, 'IDENTITY_PERMISSION_DENIED'],
    [{ hostTenantId: 'tenant-a', hostTenantSlug: 'acme' }, { userId: 'user-1', activeOrganizationId: null }, {}, true, 'IDENTITY_ORGANIZATION_MISMATCH'],
  ])('fails closed with the exact authorization code (%s)', (host, session, membership, permission, code) => {
    expect(evaluateIdentityAuthorization(host as any, session as any, membership, permission as boolean)).toBe(code);
  });

  it('forwards only authorization and cookie headers to the provider adapter', () => {
    const headers = providerHeaders(new Headers({
      authorization: 'Bearer secret-token',
      cookie: 'session=opaque',
      'x-forwarded-host': 'other.crmmaster.com',
    }));

    expect(headers.get('authorization')).toBe('Bearer secret-token');
    expect(headers.get('cookie')).toBe('session=opaque');
    expect(headers.get('x-forwarded-host')).toBeNull();
  });

  it('maps the provider session through the allowlisted adapter port', async () => {
    const getSession = jest.fn().mockResolvedValue({
      user: { id: 'user-1' },
      session: { activeOrganizationId: 'org-a' },
    });
    const adapter = new BetterAuthProviderSessionAdapter({ api: { getSession } } as any);

    await expect(adapter.getSession(new Headers({ authorization: 'Bearer token' }))).resolves.toEqual({
      userId: 'user-1',
      activeOrganizationId: 'org-a',
    });
    expect(getSession).toHaveBeenCalledWith({ headers: expect.any(Headers) });
  });

  it('authenticates through the canonical session provider and never uses direct SQL', async () => {
    const getSession = jest.fn().mockResolvedValue({ userId: 'user-1', activeOrganizationId: 'org-a' });
    const queryRawUnsafe = jest.fn().mockRejectedValue(new Error('direct SQL is prohibited'));
    const prisma = {
      admin: {
        $queryRawUnsafe: queryRawUnsafe,
        legacyUser: {
          findFirst: jest.fn().mockResolvedValue({
            betterAuthUserId: 'user-1',
            email: 'user@example.com',
            name: 'User One',
            role: 'superadmin',
            tenantId: 'tenant-a',
            isActive: true,
          }),
        },
      },
    } as any;
    const guard = new BetterAuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as any,
      prisma,
      { getSession } as any,
    );
    const request = { path: '/api/v1/admin/dashboard', headers: { authorization: 'Bearer token' } } as any;
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getSession).toHaveBeenCalledWith(expect.any(Headers));
    expect(queryRawUnsafe).not.toHaveBeenCalled();
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User One',
      role: 'superadmin',
      tenantId: 'tenant-a',
    });
  });

  it('returns 401 for an invalid admin session without falling back to SQL', async () => {
    const getSession = jest.fn().mockResolvedValue(null);
    const queryRawUnsafe = jest.fn();
    const guard = new BetterAuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as any,
      { admin: { $queryRawUnsafe: queryRawUnsafe } } as any,
      { getSession } as any,
    );
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ path: '/api/v1/admin/dashboard', headers: { authorization: 'Bearer invalid' } }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 401 });
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('returns 401 for missing admin credentials before session resolution', async () => {
    const getSession = jest.fn();
    const guard = new BetterAuthGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as any,
      { admin: { $queryRawUnsafe: jest.fn() } } as any,
      { getSession } as any,
    );
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ path: '/api/v1/admin/dashboard', headers: {} }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 401 });
    expect(getSession).not.toHaveBeenCalled();
  });

  it('keeps repository reads and claims on the requested tenant scope', async () => {
    const client = {
      tenant: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant-a' }) },
      member: { findFirst: jest.fn().mockResolvedValue({ organizationId: 'org-a', userId: 'user-1' }) },
      identityAuthorizationOperation: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn(),
      },
    };
    const prisma = { forTenant: jest.fn().mockReturnValue(client) } as any;

    await new IdentityAuthorizationRepository(prisma).claim('tenant-a', 'operation-1', 'worker-1', new Date(1000));
    await new IdentityMembershipRepository(prisma).findMembership('tenant-a', 'user-1', 'org-a');

    expect(prisma.forTenant).toHaveBeenNthCalledWith(1, 'tenant-a');
    expect(prisma.forTenant).toHaveBeenNthCalledWith(2, 'tenant-a');
    expect(client.identityAuthorizationOperation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'operation-1' }) }),
    );
    expect(client.tenant.findFirst).toHaveBeenCalledWith({
      where: { id: 'tenant-a', betterAuthOrganizationId: 'org-a' },
      select: { id: true },
    });
  });

  it('derives stable UUIDv5 mutation ids and rejects invalid idempotency keys', () => {
    const input = { tenantId: 'tenant-a', operation: 'member.remove', resourceId: 'member-1', key: 'request-1' };

    expect(deriveMutationId(input)).toBe(deriveMutationId(input));
    expect(deriveMutationId(input)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(isValidIdempotencyKey('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidIdempotencyKey('request-1')).toBe(false);
  });

  it('creates one tenant-scoped mutation and outbox intent', async () => {
    const mutation = jest.fn().mockResolvedValue({
      operation: operation({ status: 'PENDING', mutationId: 'mutation-1' }),
      outbox: { eventId: 'event-1', tenantId: 'tenant-a', mutationId: 'mutation-1' },
      duplicate: false,
      denied: false,
    });
    const service = new IdentityAuthorizationService({ mutate: mutation } as unknown as IdentityAuthorizationRepository);
    const request = {
      tenantId: 'tenant-a',
      subjectId: 'subject-1',
      operation: 'member.remove',
      resourceId: 'member-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      eventType: 'identity.member.removed',
      payload: { memberId: 'member-1' },
    };

    await expect(service.mutate(request)).resolves.toMatchObject({ duplicate: false, denied: false });
    expect(mutation).toHaveBeenCalledWith(expect.objectContaining(request));
  });

  it('invalidates RBAC after an accepted mutation intent', async () => {
    const mutation = jest.fn().mockResolvedValue({ operation: operation(), outbox: {}, duplicate: false, denied: false });
    const invalidator = jest.fn().mockResolvedValue(undefined);
    const service = new IdentityAuthorizationService({ mutate: mutation } as unknown as IdentityAuthorizationRepository, invalidator);

    await service.mutate({
      tenantId: 'tenant-a', subjectId: 'subject-1', operation: 'member.remove', resourceId: 'member-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000', eventType: 'removed', payload: {},
    });

    expect(invalidator).toHaveBeenCalledWith('tenant-a', 'subject-1');
  });

  it('preserves pending-deny behavior while allowing a new mutation after terminal history', async () => {
    const mutation = jest
      .fn()
      .mockResolvedValueOnce({ operation: operation({ status: 'PENDING' }), outbox: null, duplicate: false, denied: true })
      .mockResolvedValueOnce({ operation: operation({ status: 'PENDING', mutationId: 'mutation-2' }), outbox: {}, duplicate: false, denied: false });
    const service = new IdentityAuthorizationService({ mutate: mutation } as unknown as IdentityAuthorizationRepository);

    await expect(service.mutate({
      tenantId: 'tenant-a', subjectId: 'subject-1', operation: 'member.remove', resourceId: 'member-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000', eventType: 'removed', payload: {},
    })).resolves.toMatchObject({ denied: true });
    await expect(service.mutate({
      tenantId: 'tenant-a', subjectId: 'subject-1', operation: 'member.remove', resourceId: 'member-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440001', eventType: 'removed', payload: {},
    })).resolves.toMatchObject({ denied: false });
  });

  it('invalidates the tenant-scoped RBAC decision cache', async () => {
    const invalidator = jest.fn().mockResolvedValue(undefined);
    const service = new IdentityAuthorizationService({} as IdentityAuthorizationRepository, invalidator);

    await expect(service.invalidateRbac('tenant-a', 'subject-1')).resolves.toBeUndefined();
    expect(invalidator).toHaveBeenCalledWith('tenant-a', 'subject-1');
  });

  it('derives audit event identity from the mutation without reusing the mutation id', () => {
    const mutationId = deriveMutationId({ tenantId: 'tenant-a', operation: 'member.remove', resourceId: 'member-1', key: 'request-1' });

    expect(deriveAuditEventId('tenant-a', 'member.removed', 'member-1', mutationId)).not.toBe(mutationId);
    expect(deriveAuditEventId('tenant-a', 'member.removed', 'member-1', mutationId)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('writes operation history and outbox intent in one tenant-scoped transaction', async () => {
    const tx = {
      identityAuthorizationOperation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(operation({ mutationId: 'mutation-1' })),
      },
      identityAuditOutbox: {
        create: jest.fn().mockResolvedValue({ eventId: 'event-1', tenantId: 'tenant-a' }),
      },
    };
    const client = { $transaction: jest.fn((callback: (value: typeof tx) => unknown) => callback(tx)) };
    const prisma = { forTenant: jest.fn().mockReturnValue(client) } as any;
    const repository = new IdentityAuthorizationRepository(prisma);

    await repository.mutate({
      tenantId: 'tenant-a', subjectId: 'subject-1', operation: 'member.remove', resourceId: 'member-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000', mutationId: 'mutation-1',
      eventType: 'identity.member.removed', payload: { memberId: 'member-1' },
    });

    expect(prisma.forTenant).toHaveBeenCalledWith('tenant-a');
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.identityAuthorizationOperation.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-a' }) }));
    expect(tx.identityAuditOutbox.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-a' }) }));
  });
});
