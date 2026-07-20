import { computeGenesisHash, computeAuditEventHash } from '../audit-append-only.middleware';

describe('Audit Sequence Fork Prevention', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.AUDIT_CHAIN_SECRET = 'test-chain-secret';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('same prevHash + same sequence produces identical hash (deterministic)', () => {
    const genesisHash = computeGenesisHash('tenant-a');
    const event = {
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'auth',
      resourceId: 'session-1',
      action: 'login',
      outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
      metadata: {},
    };

    const hash1 = computeAuditEventHash(event, genesisHash, 1);
    const hash2 = computeAuditEventHash(event, genesisHash, 1);

    expect(hash1).toEqual(hash2);
  });

  it('different sequences produce different hashes (fork detection)', () => {
    const genesisHash = computeGenesisHash('tenant-a');
    const event = {
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'auth',
      resourceId: 'session-1',
      action: 'login',
      outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
      metadata: {},
    };

    const hashSeq1 = computeAuditEventHash(event, genesisHash, 1);
    const hashSeq2 = computeAuditEventHash(event, genesisHash, 2);

    expect(hashSeq1).not.toEqual(hashSeq2);
  });

  it('sequence increments ensure unique chain positions', () => {
    const genesisHash = computeGenesisHash('tenant-a');
    const event = {
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'auth',
      resourceId: 'session-1',
      action: 'login',
      outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
      metadata: {},
    };

    const hash1 = computeAuditEventHash(event, genesisHash, 1);
    const hash2 = computeAuditEventHash(event, hash1, 2);
    const hash3 = computeAuditEventHash(event, hash2, 3);

    expect(hash1).not.toEqual(hash2);
    expect(hash2).not.toEqual(hash3);
    expect(hash1).not.toEqual(hash3);
  });

  it('fork creates diverging hash chain', () => {
    const genesisHash = computeGenesisHash('tenant-a');
    const event1 = {
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'auth',
      resourceId: 'session-1',
      action: 'login',
      outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
      metadata: {},
    };
    const event2 = {
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-2',
      resourceType: 'doc',
      resourceId: 'doc-1',
      action: 'read',
      outcome: 'success',
      occurredAt: '2026-07-20T11:00:00.000Z',
      metadata: {},
    };

    const hash1A = computeAuditEventHash(event1, genesisHash, 1);
    const hash1B = computeAuditEventHash(event2, genesisHash, 1);

    expect(hash1A).not.toEqual(hash1B);

    const hash2A = computeAuditEventHash(event2, hash1A, 2);
    const hash2B_fork = computeAuditEventHash(event2, hash1B, 1);

    expect(hash2A).not.toEqual(hash2B_fork);
  });

  it('TenantA and TenantB have independent chains (no fork risk)', () => {
    const genesisA = computeGenesisHash('tenant-a');
    const genesisB = computeGenesisHash('tenant-b');

    const eventA = {
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'u-1',
      resourceType: 'auth',
      resourceId: 's-1',
      action: 'login',
      outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
      metadata: {},
    };
    const eventB = {
      tenantId: 'tenant-b',
      actorType: 'user',
      actorId: 'u-2',
      resourceType: 'auth',
      resourceId: 's-2',
      action: 'login',
      outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
      metadata: {},
    };

    const hashA = computeAuditEventHash(eventA, genesisA, 1);
    const hashB = computeAuditEventHash(eventB, genesisB, 1);

    expect(hashA).not.toEqual(hashB);
  });

  it('simulates concurrent fork: same sequence caught by unique constraint', async () => {
    const genesisHash = computeGenesisHash('tenant-a');
    const event = {
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'auth',
      resourceId: 'session-1',
      action: 'login',
      outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
      metadata: {},
    };

    const hash = computeAuditEventHash(event, genesisHash, 1);

    const result1 = { id: 'evt-1', ...event, hash, prevHash: genesisHash, sequence: 1 };
    const duplicateSequence = { ...result1, id: 'evt-2', hash: computeAuditEventHash(event, genesisHash, 1) };

    expect(duplicateSequence.sequence).toEqual(result1.sequence);
    expect(duplicateSequence.id).not.toEqual(result1.id);

    const createResults: Array<{ id: string; sequence: number }> = [];
    const errors: Array<{ code: string; message: string }> = [];

    const simulatedInsert = (data: typeof duplicateSequence) => {
      const existing = createResults.find((r) => r.sequence === data.sequence);
      if (existing) {
        errors.push({ code: 'P2002', message: 'Unique constraint violation on (tenantId, sequence)' });
        throw new Error('P2002: Unique constraint violation');
      }
      createResults.push({ id: data.id, sequence: data.sequence });
    };

    simulatedInsert(result1);
    expect(createResults).toHaveLength(1);

    expect(() => simulatedInsert(duplicateSequence)).toThrow('P2002');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('P2002');
    expect(createResults).toHaveLength(1);
  });
});
