import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { LegalHoldService } from '../retention/legal-hold.service';

describe('LegalHoldService', () => {
  let service: LegalHoldService;
  let prisma: any;

  const mockHold = {
    id: 'hold-1',
    tenantId: 'tenant-test',
    reason: 'GDPR request',
    dateFrom: new Date('2024-01-01'),
    dateTo: new Date('2024-12-31'),
    createdAt: new Date(),
    releasedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      admin: {
        auditEventLegalHold: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
        },
        $executeRawUnsafe: jest.fn().mockResolvedValue(3),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalHoldService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LegalHoldService>(LegalHoldService);
  });

  it('should place hold with date range and update events', async () => {
    prisma.admin.auditEventLegalHold.create.mockResolvedValue(mockHold);

    const result = await service.placeHold(
      'tenant-test',
      'GDPR request',
      new Date('2024-01-01'),
      new Date('2024-12-31'),
    );

    expect(result).toEqual(mockHold);
    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE audit_events'),
      'tenant-test',
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('should place hold without end date', async () => {
    prisma.admin.auditEventLegalHold.create.mockResolvedValue({
      ...mockHold,
      dateTo: null,
    });

    await service.placeHold('tenant-test', 'Litigation', new Date('2024-01-01'));

    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('legal_hold_until = NULL'),
      'tenant-test',
      expect.any(Date),
    );
  });

  it('should release hold and clear event flags', async () => {
    prisma.admin.auditEventLegalHold.findUnique.mockResolvedValue(mockHold);
    prisma.admin.auditEventLegalHold.update.mockResolvedValue({
      ...mockHold,
      releasedAt: new Date(),
    });

    const result = await service.releaseHold('hold-1');

    expect(result.releasedAt).toBeDefined();
    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('legal_hold = false'),
      'tenant-test',
    );
  });

  it('should throw on releasing non-existent hold', async () => {
    prisma.admin.auditEventLegalHold.findUnique.mockResolvedValue(null);

    await expect(service.releaseHold('nonexistent')).rejects.toThrow(
      'Legal hold nonexistent not found',
    );
  });

  it('should get active holds for a tenant', async () => {
    prisma.admin.auditEventLegalHold.findMany.mockResolvedValue([mockHold]);

    const result = await service.getActiveHolds('tenant-test');

    expect(result).toHaveLength(1);
    expect(prisma.admin.auditEventLegalHold.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-test', releasedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should set legal_hold = true in raw SQL on place', async () => {
    prisma.admin.auditEventLegalHold.create.mockResolvedValue(mockHold);

    await service.placeHold('tenant-test', 'test', new Date('2024-01-01'));

    expect(prisma.admin.$executeRawUnsafe.mock.calls[0][0]).toContain('legal_hold = true');
  });
});
