import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit.service';
import { PrismaService } from '../../../common/prisma.service';

describe('AuditService — API Queries', () => {
  let service: AuditService;
  let prisma: any;

  const mockEvents = [
    {
      id: 'evt-1',
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      actorName: 'Alice',
      resourceType: 'document',
      resourceId: 'doc-1',
      resourceName: null,
      action: 'delete',
      outcome: 'success',
      ipAddress: '127.0.0.1',
      userAgent: null,
      correlationId: 'corr-1',
      occurredAt: new Date('2024-06-15T10:00:00Z'),
      receivedAt: new Date('2024-06-15T10:00:01Z'),
      metadata: {},
      hash: 'abc',
      prevHash: '000',
      sequence: 1,
      legalHold: false,
      legalHoldUntil: null,
    },
    {
      id: 'evt-2',
      tenantId: 'tenant-a',
      actorType: 'system',
      actorId: 'sys-1',
      actorName: null,
      resourceType: 'auth',
      resourceId: 'session-1',
      resourceName: null,
      action: 'login',
      outcome: 'success',
      ipAddress: null,
      userAgent: null,
      correlationId: 'corr-1',
      occurredAt: new Date('2024-06-15T10:05:00Z'),
      receivedAt: new Date('2024-06-15T10:05:01Z'),
      metadata: {},
      hash: 'def',
      prevHash: 'abc',
      sequence: 2,
      legalHold: false,
      legalHoldUntil: null,
    },
    {
      id: 'evt-3',
      tenantId: 'tenant-a',
      actorType: 'user',
      actorId: 'user-1',
      actorName: 'Alice',
      resourceType: 'auth',
      resourceId: 'session-2',
      resourceName: null,
      action: 'authenticate',
      outcome: 'failure',
      ipAddress: '127.0.0.1',
      userAgent: null,
      correlationId: 'corr-2',
      occurredAt: new Date('2024-06-15T11:00:00Z'),
      receivedAt: new Date('2024-06-15T11:00:01Z'),
      metadata: {},
      hash: 'ghi',
      prevHash: 'def',
      sequence: 3,
      legalHold: false,
      legalHoldUntil: null,
    },
  ];

  beforeEach(async () => {
    const mockClient = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue(mockEvents),
        count: jest.fn().mockResolvedValue(mockEvents.length),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          return mockEvents.find(e => e.id === where.id) ?? null;
        }),
      },
    };

    prisma = {
      forTenant: jest.fn().mockReturnValue(mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should return paginated results', async () => {
    const result = await service.getEvents('tenant-a', { tenantId: 'tenant-a' });

    expect(result.data).toHaveLength(3);
    expect(result.meta).toEqual({
      page: 1,
      limit: 50,
      total: 3,
      totalPages: 1,
      hasMore: false,
    });
  });

  it('should pass tenantId to forTenant()', async () => {
    await service.getEvents('tenant-a', { tenantId: 'tenant-a' });

    expect(prisma.forTenant).toHaveBeenCalledWith('tenant-a');
  });

  it('should filter by actorType', async () => {
    const mockClient = prisma.forTenant();
    await service.getEvents('tenant-a', { tenantId: 'tenant-a', actorType: 'user' });

    expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ actorType: 'user' }),
      }),
    );
  });

  it('should filter by action', async () => {
    const mockClient = prisma.forTenant();
    await service.getEvents('tenant-a', { tenantId: 'tenant-a', action: 'login' });

    expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'login' }),
      }),
    );
  });

  it('should filter by outcome', async () => {
    const mockClient = prisma.forTenant();
    await service.getEvents('tenant-a', { tenantId: 'tenant-a', outcome: 'failure' });

    expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ outcome: 'failure' }),
      }),
    );
  });

  it('should filter by correlationId', async () => {
    const mockClient = prisma.forTenant();
    await service.getEvents('tenant-a', { tenantId: 'tenant-a', correlationId: 'corr-1' });

    expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ correlationId: 'corr-1' }),
      }),
    );
  });

  it('should filter by date range', async () => {
    const mockClient = prisma.forTenant();
    await service.getEvents('tenant-a', {
      tenantId: 'tenant-a',
      dateFrom: '2024-06-15T00:00:00.000Z',
      dateTo: '2024-06-15T23:59:59.000Z',
    });

    expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          occurredAt: {
            gte: new Date('2024-06-15T00:00:00.000Z'),
            lte: new Date('2024-06-15T23:59:59.000Z'),
          },
        }),
      }),
    );
  });

  it('should order by occurredAt DESC then sequence DESC', async () => {
    const mockClient = prisma.forTenant();
    await service.getEvents('tenant-a', { tenantId: 'tenant-a' });

    expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ occurredAt: 'desc' }, { sequence: 'desc' }],
      }),
    );
  });

  it('should cap limit at 100', async () => {
    const mockClient = prisma.forTenant();
    mockClient.auditEvent.count.mockResolvedValue(200);

    await service.getEvents('tenant-a', { tenantId: 'tenant-a', limit: 999 });

    expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('should compute pagination correctly', async () => {
    const mockClient = prisma.forTenant();
    mockClient.auditEvent.count.mockResolvedValue(25);
    mockClient.auditEvent.findMany.mockResolvedValue(Array(10).fill(mockEvents[0]));

    const result = await service.getEvents('tenant-a', { tenantId: 'tenant-a', page: 1, limit: 10 });

    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.totalPages).toBe(3);
  });

  it('should return a single event by ID', async () => {
    const event = await service.getEvent('tenant-a', 'evt-1');

    expect(event.id).toBe('evt-1');
    expect(event.tenantId).toBe('tenant-a');
  });

  it('should throw NotFoundException for unknown event', async () => {
    const mockClient = prisma.forTenant();
    mockClient.auditEvent.findUnique.mockResolvedValue(null);

    await expect(service.getEvent('tenant-a', 'nonexistent')).rejects.toThrow();
  });

  it('should handle empty results', async () => {
    const mockClient = prisma.forTenant();
    mockClient.auditEvent.findMany.mockResolvedValue([]);
    mockClient.auditEvent.count.mockResolvedValue(0);

    const result = await service.getEvents('tenant-a', { tenantId: 'tenant-a' });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.hasMore).toBe(false);
  });
});
