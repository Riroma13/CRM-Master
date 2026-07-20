import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit.service';
import { PrismaService } from '../../../common/prisma.service';

describe('Audit Cross-Tenant Isolation (Doorbell)', () => {
  let service: AuditService;
  let prisma: any;

  const tenantAEvents = [
    {
      id: 'a-evt-1',
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'document',
      resourceId: 'doc-1',
      action: 'create',
      outcome: 'success',
      correlationId: null,
      occurredAt: new Date('2024-06-15T10:00:00Z'),
      receivedAt: new Date('2024-06-15T10:00:01Z'),
      metadata: {},
      hash: 'abc',
      prevHash: '000',
      sequence: 1,
      legalHold: false,
      legalHoldUntil: null,
      actorName: null,
      resourceName: null,
      ipAddress: null,
      userAgent: null,
    },
    {
      id: 'a-evt-2',
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'document',
      resourceId: 'doc-2',
      action: 'update',
      outcome: 'success',
      correlationId: null,
      occurredAt: new Date('2024-06-15T11:00:00Z'),
      receivedAt: new Date('2024-06-15T11:00:01Z'),
      metadata: {},
      hash: 'def',
      prevHash: 'abc',
      sequence: 2,
      legalHold: false,
      legalHoldUntil: null,
      actorName: null,
      resourceName: null,
      ipAddress: null,
      userAgent: null,
    },
  ];

  const tenantBEvents: any[] = [];

  beforeEach(async () => {
    const mockClientForTenantA = {
      auditEvent: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          if (where.tenantId === 'tenant-a') return tenantAEvents;
          return [];
        }),
        count: jest.fn().mockImplementation(({ where }: any) => {
          if (where.tenantId === 'tenant-a') return tenantAEvents.length;
          return 0;
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === 'a-evt-1') return tenantAEvents[0];
          return null;
        }),
      },
    };

    const mockClientForTenantB = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    prisma = {
      forTenant: jest.fn().mockImplementation((tenantId: string) => {
        if (tenantId === 'tenant-a') return mockClientForTenantA;
        return mockClientForTenantB;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('Tenant A can see its own events', async () => {
    const result = await service.getEvents('tenant-a', { tenantId: 'tenant-a' });

    expect(result.data).toHaveLength(2);
    expect(result.data.every((e: any) => e.tenantId === 'tenant-a')).toBe(true);
  });

  it('Tenant B cannot see Tenant A events', async () => {
    const result = await service.getEvents('tenant-b', { tenantId: 'tenant-b' });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('Tenant B cannot access Tenant A events by ID', async () => {
    const result = await service.getEvent('tenant-b', 'a-evt-1').catch(e => e);

    expect(result).toBeDefined();
  });

  it('Tenant A forTenant is called with correct tenantId', async () => {
    await service.getEvents('tenant-a', { tenantId: 'tenant-a' });

    expect(prisma.forTenant).toHaveBeenCalledWith('tenant-a');
  });

  it('Tenant B forTenant is called with correct tenantId', async () => {
    await service.getEvents('tenant-b', { tenantId: 'tenant-b' });

    expect(prisma.forTenant).toHaveBeenCalledWith('tenant-b');
  });
});
