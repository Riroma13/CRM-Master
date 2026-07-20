import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { RetentionEngine } from '../retention/retention-engine';

describe('RetentionEngine', () => {
  let engine: RetentionEngine;
  let prisma: any;

  const mockPolicy = {
    id: 'pol-1',
    tenantId: 'tenant-test',
    retentionDays: 90,
    archiveAfterDays: null,
    purgeAfterDays: 365,
    legalHold: false,
    legalHoldReason: null,
    legalHoldUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      admin: {
        auditRetentionPolicy: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
        $executeRawUnsafe: jest.fn().mockResolvedValue(5),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionEngine,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    engine = module.get<RetentionEngine>(RetentionEngine);
  });

  it('should delete events past retention window when no legal hold', async () => {
    prisma.admin.auditRetentionPolicy.findUnique.mockResolvedValue(mockPolicy);

    const result = await engine.applyRetention('tenant-test');

    expect(result.deletedCount).toBe(5);
    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM audit_events'),
      'tenant-test',
      expect.any(Date),
    );
  });

  it('should skip tenant with legal hold active', async () => {
    prisma.admin.auditRetentionPolicy.findUnique.mockResolvedValue({
      ...mockPolicy,
      legalHold: true,
    });

    const result = await engine.applyRetention('tenant-test');

    expect(result.deletedCount).toBe(0);
    expect(result.purgedCount).toBe(0);
    expect(prisma.admin.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('should skip tenant with no retention policy', async () => {
    prisma.admin.auditRetentionPolicy.findUnique.mockResolvedValue(null);

    const result = await engine.applyRetention('tenant-test');

    expect(result.deletedCount).toBe(0);
    expect(result.purgedCount).toBe(0);
  });

  it('should apply retention for purge after days when set', async () => {
    prisma.admin.auditRetentionPolicy.findUnique.mockResolvedValue(mockPolicy);

    await engine.applyRetention('tenant-test');

    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(2);
  });

  it('should skip purge when purgeAfterDays is not set', async () => {
    prisma.admin.auditRetentionPolicy.findUnique.mockResolvedValue({
      ...mockPolicy,
      purgeAfterDays: null,
    });

    await engine.applyRetention('tenant-test');

    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('should iterate all tenants with applyForAllTenants', async () => {
    prisma.admin.auditRetentionPolicy.findMany.mockResolvedValue([
      { ...mockPolicy, tenantId: 't-1' },
      { ...mockPolicy, tenantId: 't-2' },
    ]);
    prisma.admin.auditRetentionPolicy.findUnique.mockResolvedValue(mockPolicy);

    const result = await engine.applyForAllTenants();

    expect(result.tenantsProcessed).toBe(2);
    expect(result.totalDeleted).toBe(10);
  });

  it('should guard with legal_hold = false in raw SQL', async () => {
    prisma.admin.auditRetentionPolicy.findUnique.mockResolvedValue(mockPolicy);

    await engine.applyRetention('tenant-test');

    const calls = prisma.admin.$executeRawUnsafe.mock.calls;
    for (const call of calls) {
      expect(call[0]).toContain('legal_hold = false');
    }
  });
});
