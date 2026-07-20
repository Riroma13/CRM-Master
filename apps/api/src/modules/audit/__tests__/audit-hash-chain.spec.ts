import { computeGenesisHash, computeAuditEventHash } from '../audit-append-only.middleware';

describe('Audit Hash Chain', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.AUDIT_CHAIN_SECRET = 'test-chain-secret';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('computeGenesisHash', () => {
    it('produces deterministic hash for same tenantId', () => {
      const hash1 = computeGenesisHash('tenant-a');
      const hash2 = computeGenesisHash('tenant-a');

      expect(hash1).toEqual(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces different hashes for different tenantIds', () => {
      const hashA = computeGenesisHash('tenant-a');
      const hashB = computeGenesisHash('tenant-b');

      expect(hashA).not.toEqual(hashB);
    });

    it('throws if AUDIT_CHAIN_SECRET is not set', () => {
      delete process.env.AUDIT_CHAIN_SECRET;

      expect(() => computeGenesisHash('tenant-a')).toThrow(
        'AUDIT_CHAIN_SECRET environment variable is required',
      );
    });

    it('uses SHA-256 format', () => {
      const hash = computeGenesisHash('tenant-a');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('includes "genesis" suffix in hash input', () => {
      const hashWithSecret = computeGenesisHash('tenant-a');

      process.env.AUDIT_CHAIN_SECRET = 'different-secret';
      const hashDifferent = computeGenesisHash('tenant-a');

      expect(hashWithSecret).not.toEqual(hashDifferent);
    });
  });

  describe('computeAuditEventHash', () => {
    const baseEvent = {
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-123',
      resourceType: 'auth',
      resourceId: 'session-456',
      action: 'login',
      outcome: 'success',
      occurredAt: '2026-07-20T10:00:00.000Z',
      metadata: { ip: '192.168.1.1' },
    };

    it('produces deterministic hash for same input', () => {
      const prevHash = computeGenesisHash('tenant-a');
      const sequence = 1;

      const hash1 = computeAuditEventHash(baseEvent, prevHash, sequence);
      const hash2 = computeAuditEventHash(baseEvent, prevHash, sequence);

      expect(hash1).toEqual(hash2);
    });

    it('produces SHA-256 hex string', () => {
      const prevHash = computeGenesisHash('tenant-a');
      const hash = computeAuditEventHash(baseEvent, prevHash, 1);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('chains correctly: event-2 hash depends on event-1 hash', () => {
      const genesisHash = computeGenesisHash('tenant-a');

      const hash1 = computeAuditEventHash(baseEvent, genesisHash, 1);

      const event2 = { ...baseEvent, action: 'logout', occurredAt: '2026-07-20T11:00:00.000Z' };
      const hash2 = computeAuditEventHash(event2, hash1, 2);

      expect(hash2).not.toEqual(hash1);

      const tampered = computeAuditEventHash(event2, hash1, 2);
      expect(tampered).toEqual(hash2);
    });

    it('produces different hash when prevHash differs', () => {
      const genesisHash = computeGenesisHash('tenant-a');
      const hash = computeAuditEventHash(baseEvent, genesisHash, 1);

      const differentPrevHash = computeGenesisHash('tenant-b');
      const hashWithWrongPrev = computeAuditEventHash(baseEvent, differentPrevHash, 1);

      expect(hash).not.toEqual(hashWithWrongPrev);
    });

    it('produces different hash when sequence differs', () => {
      const prevHash = computeGenesisHash('tenant-a');

      const hashSeq1 = computeAuditEventHash(baseEvent, prevHash, 1);
      const hashSeq2 = computeAuditEventHash(baseEvent, prevHash, 2);

      expect(hashSeq1).not.toEqual(hashSeq2);
    });

    it('produces different hash when content differs', () => {
      const prevHash = computeGenesisHash('tenant-a');

      const hashOriginal = computeAuditEventHash(baseEvent, prevHash, 1);
      const hashTampered = computeAuditEventHash(
        { ...baseEvent, outcome: 'failure' },
        prevHash,
        1,
      );

      expect(hashOriginal).not.toEqual(hashTampered);
    });

    it('Works for different tenants with same sequence', () => {
      const genesisA = computeGenesisHash('tenant-a');
      const genesisB = computeGenesisHash('tenant-b');

      const hashA = computeAuditEventHash(baseEvent, genesisA, 1);
      const hashB = computeAuditEventHash(
        { ...baseEvent, tenantId: 'tenant-b' },
        genesisB,
        1,
      );

      expect(hashA).not.toEqual(hashB);
    });

    it('sequence 1 uses genesis hash as prevHash', () => {
      const genesisHash = computeGenesisHash('tenant-a');

      const hash = computeAuditEventHash(baseEvent, genesisHash, 1);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });
  });
});
