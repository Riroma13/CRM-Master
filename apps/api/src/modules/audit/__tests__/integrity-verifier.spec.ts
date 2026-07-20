import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { IntegrityVerifier } from '../integrity/integrity-verifier';
import { computeGenesisHash, computeAuditEventHash } from '../audit-append-only.middleware';
import * as crypto from 'node:crypto';

const TENANT_ID = 'tenant-test';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'evt-1',
    tenantId: overrides.tenantId ?? TENANT_ID,
    actorType: 'user',
    actorId: 'user-1',
    actorName: null,
    resourceType: 'document',
    resourceId: 'doc-1',
    resourceName: null,
    action: 'create',
    outcome: 'success',
    ipAddress: null,
    userAgent: null,
    correlationId: null,
    occurredAt: new Date('2024-06-15T10:00:00Z'),
    receivedAt: new Date('2024-06-15T10:00:01Z'),
    metadata: {},
    hash: overrides.hash ?? 'abc',
    prevHash: overrides.prevHash ?? computeGenesisHash(TENANT_ID),
    sequence: overrides.sequence ?? 1,
    legalHold: false,
    legalHoldUntil: null,
  };
}

describe('IntegrityVerifier', () => {
  let verifier: IntegrityVerifier;
  let prisma: any;

  beforeAll(() => {
    process.env.AUDIT_CHAIN_SECRET = 'test-secret';
  });

  beforeEach(async () => {
    prisma = { forTenant: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrityVerifier,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    verifier = module.get<IntegrityVerifier>(IntegrityVerifier);
  });

  it('should verify a valid chain', async () => {
    const genesisHash = computeGenesisHash(TENANT_ID);
    const evt1 = makeEvent({
      id: 'evt-1',
      sequence: 1,
      prevHash: genesisHash,
    });
    evt1.hash = computeAuditEventHash(
      { tenantId: evt1.tenantId, actorType: evt1.actorType, actorId: evt1.actorId, resourceType: evt1.resourceType, resourceId: evt1.resourceId, action: evt1.action, outcome: evt1.outcome, occurredAt: evt1.occurredAt.toISOString(), metadata: {} },
      genesisHash,
      1,
    );

    const evt2 = makeEvent({
      id: 'evt-2',
      sequence: 2,
      prevHash: evt1.hash,
      occurredAt: new Date('2024-06-15T10:05:00Z'),
      action: 'update',
    });
    evt2.hash = computeAuditEventHash(
      { tenantId: evt2.tenantId, actorType: evt2.actorType, actorId: evt2.actorId, resourceType: evt2.resourceType, resourceId: evt2.resourceId, action: evt2.action, outcome: evt2.outcome, occurredAt: evt2.occurredAt.toISOString(), metadata: {} },
      evt1.hash,
      2,
    );

    const mockClient = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([evt1, evt2]),
      },
    };
    prisma.forTenant.mockReturnValue(mockClient);

    const result = await verifier.verifyChain(TENANT_ID);

    expect(result.valid).toBe(true);
    expect(result.totalVerified).toBe(2);
    expect(result.firstBrokenAt).toBeUndefined();
  });

  it('should detect a broken chain (wrong prevHash)', async () => {
    const evt1 = makeEvent({
      id: 'evt-1',
      sequence: 1,
      hash: computeAuditEventHash(
        { tenantId: TENANT_ID, actorType: 'user', actorId: 'user-1', resourceType: 'document', resourceId: 'doc-1', action: 'create', outcome: 'success', occurredAt: '2024-06-15T10:00:00.000Z', metadata: {} },
        computeGenesisHash(TENANT_ID),
        1,
      ),
      prevHash: computeGenesisHash(TENANT_ID),
    });

    const evt2 = makeEvent({
      id: 'evt-2',
      sequence: 2,
      prevHash: 'tampered-prev-hash',
      occurredAt: new Date('2024-06-15T10:05:00Z'),
      action: 'update',
    });
    evt2.hash = computeAuditEventHash(
      { tenantId: evt2.tenantId, actorType: evt2.actorType, actorId: evt2.actorId, resourceType: evt2.resourceType, resourceId: evt2.resourceId, action: 'update', outcome: 'success', occurredAt: evt2.occurredAt.toISOString(), metadata: {} },
      'tampered-prev-hash',
      2,
    );

    const mockClient = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([evt1, evt2]),
      },
    };
    prisma.forTenant.mockReturnValue(mockClient);

    const result = await verifier.verifyChain(TENANT_ID);

    expect(result.valid).toBe(false);
    expect(result.firstBrokenAt).toBe('evt-2');
    expect(result.totalVerified).toBe(1);
  });

  it('should detect a tampered hash', async () => {
    const evt1 = makeEvent({
      id: 'evt-1',
      sequence: 1,
      hash: 'tampered-hash',
      prevHash: computeGenesisHash(TENANT_ID),
    });

    const mockClient = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([evt1]),
      },
    };
    prisma.forTenant.mockReturnValue(mockClient);

    const result = await verifier.verifyChain(TENANT_ID);

    expect(result.valid).toBe(false);
    expect(result.firstBrokenAt).toBe('evt-1');
    expect(result.totalVerified).toBe(0);
  });

  it('should return valid for empty event set', async () => {
    const mockClient = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    prisma.forTenant.mockReturnValue(mockClient);

    const result = await verifier.verifyChain(TENANT_ID);

    expect(result.valid).toBe(true);
    expect(result.totalVerified).toBe(0);
  });

  it('should call forTenant with correct tenantId', async () => {
    const mockClient = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    prisma.forTenant.mockReturnValue(mockClient);

    await verifier.verifyChain('tenant-x');

    expect(prisma.forTenant).toHaveBeenCalledWith('tenant-x');
  });

  it('should verify range with date filters', async () => {
    const mockClient = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    prisma.forTenant.mockReturnValue(mockClient);

    await verifier.verifyRange(TENANT_ID, '2024-06-01T00:00:00.000Z', '2024-06-30T23:59:59.000Z');

    expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          occurredAt: {
            gte: new Date('2024-06-01T00:00:00.000Z'),
            lte: new Date('2024-06-30T23:59:59.000Z'),
          },
        }),
      }),
    );
  });
});
