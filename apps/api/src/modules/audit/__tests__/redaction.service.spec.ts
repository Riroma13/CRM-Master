import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { RedactionService } from '../retention/redaction.service';
import { computeGenesisHash, computeAuditEventHash } from '../audit-append-only.middleware';

const TENANT_ID = 'tenant-test';

function makeEvent(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? 'evt-1',
    tenantId: TENANT_ID,
    actorType: 'user',
    actorId: 'user-1',
    actorName: 'John Doe',
    resourceType: 'document',
    resourceId: 'doc-1',
    resourceName: null,
    action: 'create',
    outcome: 'success',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    correlationId: 'corr-1',
    occurredAt: new Date('2024-06-15T10:00:00Z'),
    receivedAt: new Date('2024-06-15T10:00:01Z'),
    metadata: { foo: 'bar' },
    hash: overrides.hash ?? 'abc',
    prevHash: overrides.prevHash ?? computeGenesisHash(TENANT_ID),
    sequence: overrides.sequence ?? 1,
    legalHold: false,
    legalHoldUntil: null,
    ...overrides,
  };
}

describe('RedactionService', () => {
  let service: RedactionService;
  let prisma: any;

  beforeAll(() => {
    process.env.AUDIT_CHAIN_SECRET = 'test-secret-redact';
  });

  beforeEach(async () => {
    const mockForTenant = jest.fn();

    prisma = {
      forTenant: mockForTenant,
      admin: {
        $queryRawUnsafe: jest.fn(),
        $transaction: jest.fn(),
        $executeRawUnsafe: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedactionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RedactionService>(RedactionService);
  });

  it('should redact specified fields and recompute hash', async () => {
    const genesisHash = computeGenesisHash(TENANT_ID);
    const evt1 = makeEvent({ id: 'evt-1', sequence: 1, prevHash: genesisHash });
    evt1.hash = computeAuditEventHash(
      {
        tenantId: evt1.tenantId,
        actorType: evt1.actorType,
        actorId: evt1.actorId,
        resourceType: evt1.resourceType,
        resourceId: evt1.resourceId,
        action: evt1.action,
        outcome: evt1.outcome,
        occurredAt: evt1.occurredAt.toISOString(),
        metadata: evt1.metadata,
      },
      genesisHash,
      1,
    );

    prisma.forTenant.mockReturnValue({
      auditEvent: {
        findUnique: jest.fn().mockResolvedValue(evt1),
      },
    });

    const rawRows = [
      {
        id: 'evt-1',
        tenant_id: TENANT_ID,
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'document',
        resource_id: 'doc-1',
        action: 'create',
        outcome: 'success',
        occurred_at: evt1.occurredAt,
        metadata: { foo: 'bar' },
        hash: evt1.hash,
        prev_hash: genesisHash,
        sequence: 1,
      },
    ];
    prisma.admin.$queryRawUnsafe.mockResolvedValue(rawRows);
    prisma.admin.$transaction.mockImplementation(async (cb: any) => cb(prisma.admin));

    const result = await service.redactEvent(TENANT_ID, 'evt-1', ['actorName', 'ipAddress']);

    expect(result.redacted).toBe(true);
    expect(result.newHash).toBeDefined();
    expect(result.newHash).not.toBe(evt1.hash);

    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('actor_name = NULL'),
      'evt-1',
      TENANT_ID,
      expect.any(String),
      expect.any(String),
    );
  });

  it('should throw on non-existent event', async () => {
    prisma.forTenant.mockReturnValue({
      auditEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.redactEvent(TENANT_ID, 'nonexistent', ['actorName']),
    ).rejects.toThrow('Audit event nonexistent not found for tenant tenant-test');
  });

  it('should throw on already redacted event', async () => {
    const evt1 = makeEvent({
      metadata: { _redacted: true, _redactedAt: '2024-01-01T00:00:00Z', _redactedFields: ['actorName'] },
    });

    prisma.forTenant.mockReturnValue({
      auditEvent: {
        findUnique: jest.fn().mockResolvedValue(evt1),
      },
    });

    await expect(
      service.redactEvent(TENANT_ID, 'evt-1', ['actorName']),
    ).rejects.toThrow('already redacted');
  });

  it('should cascade hash chain after redaction of middle event', async () => {
    const genesisHash = computeGenesisHash(TENANT_ID);
    const evt1 = makeEvent({ id: 'evt-1', sequence: 1, prevHash: genesisHash });
    evt1.hash = computeAuditEventHash(
      {
        tenantId: evt1.tenantId,
        actorType: 'user',
        actorId: 'user-1',
        resourceType: 'document',
        resourceId: 'doc-1',
        action: 'create',
        outcome: 'success',
        occurredAt: evt1.occurredAt.toISOString(),
        metadata: {},
      },
      genesisHash,
      1,
    );

    const evt2 = makeEvent({
      id: 'evt-2',
      sequence: 2,
      prevHash: evt1.hash,
      action: 'update',
      occurredAt: new Date('2024-06-15T11:00:00Z'),
    });
    evt2.hash = computeAuditEventHash(
      {
        tenantId: evt2.tenantId,
        actorType: 'user',
        actorId: 'user-1',
        resourceType: 'document',
        resourceId: 'doc-1',
        action: 'update',
        outcome: 'success',
        occurredAt: evt2.occurredAt.toISOString(),
        metadata: {},
      },
      evt1.hash,
      2,
    );

    prisma.forTenant.mockReturnValue({
      auditEvent: {
        findUnique: jest.fn().mockResolvedValue(evt1),
      },
    });

    const rawRows = [
      {
        id: 'evt-1',
        tenant_id: TENANT_ID,
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'document',
        resource_id: 'doc-1',
        action: 'create',
        outcome: 'success',
        occurred_at: evt1.occurredAt,
        metadata: {},
        hash: evt1.hash,
        prev_hash: genesisHash,
        sequence: 1,
      },
      {
        id: 'evt-2',
        tenant_id: TENANT_ID,
        actor_type: 'user',
        actor_id: 'user-1',
        resource_type: 'document',
        resource_id: 'doc-1',
        action: 'update',
        outcome: 'success',
        occurred_at: evt2.occurredAt,
        metadata: {},
        hash: evt2.hash,
        prev_hash: evt1.hash,
        sequence: 2,
      },
    ];
    prisma.admin.$queryRawUnsafe.mockResolvedValue(rawRows);
    prisma.admin.$transaction.mockImplementation(async (cb: any) => cb(prisma.admin));

    const result = await service.redactEvent(TENANT_ID, 'evt-1', ['actorName']);

    expect(result.redacted).toBe(true);
    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(3);
    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tenant_audit_state'),
      TENANT_ID,
      expect.any(String),
      expect.any(String),
      expect.any(Number),
      expect.any(Date),
    );
  });
});
