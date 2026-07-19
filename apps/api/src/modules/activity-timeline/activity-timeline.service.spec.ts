import { Test, TestingModule } from '@nestjs/testing';
import { ActivityTimelineService } from './activity-timeline.service';
import { PrismaService } from '../../common/prisma.service';
import { ActivityEventEnvelope } from '../../../../../packages/shared/src/activity-timeline';

describe('ActivityTimelineService', () => {
  let service: ActivityTimelineService;
  let prisma: any;

  const mockPrisma = {
    admin: {
      activityEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTimelineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivityTimelineService>(ActivityTimelineService);
    prisma = mockPrisma;
  });

  describe('publish', () => {
    const validEnvelope: ActivityEventEnvelope = {
      eventType: 'cliente.creado',
      tenantId: 'tenant-1',
      clienteId: 'cliente-1',
      entityType: 'cliente',
      entityId: 'cliente-1',
      actor: 'admin@test.com',
      sourceModule: 'clientes',
      severity: 'info',
      category: 'crm',
      payload: { nombre: 'Test' },
    };

    it('should create an activity event', async () => {
      prisma.admin.activityEvent.create.mockResolvedValue({ id: 1 });

      await service.publish(validEnvelope);

      expect(prisma.admin.activityEvent.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          clienteId: 'cliente-1',
          entityType: 'cliente',
          entityId: 'cliente-1',
          eventType: 'cliente.creado',
          actor: 'admin@test.com',
          sourceModule: 'clientes',
          severity: 'info',
          category: 'crm',
          payload: { nombre: 'Test' },
        },
      });
    });

    it('should not throw on Prisma error', async () => {
      prisma.admin.activityEvent.create.mockRejectedValue(new Error('DB down'));

      await expect(service.publish(validEnvelope)).resolves.toBeUndefined();
    });

    it('should reject invalid envelopes silently', async () => {
      const invalid = { ...validEnvelope, severity: 'unknown' };

      await service.publish(invalid as any);

      expect(prisma.admin.activityEvent.create).not.toHaveBeenCalled();
    });

    it('should set null for missing optional fields', async () => {
      const minimal: ActivityEventEnvelope = {
        eventType: 'login.realizado',
        tenantId: 't-1',
        entityType: 'auth',
        actor: 'user@test.com',
        sourceModule: 'auth',
        severity: 'info',
        category: 'auth',
        payload: {},
      };

      prisma.admin.activityEvent.create.mockResolvedValue({ id: 2 });

      await service.publish(minimal);

      expect(prisma.admin.activityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clienteId: null,
          entityId: null,
        }),
      });
    });
  });

  describe('getTimeline', () => {
    it('should return paginated results', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([
        { id: 1, tenantId: 't-1', eventType: 'test', createdAt: new Date() },
      ]);
      prisma.admin.activityEvent.count.mockResolvedValue(1);

      const result = await service.getTimeline({ tenantId: 't-1' });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasMore: false,
      });
    });

    it('should build where clause from filters', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([]);
      prisma.admin.activityEvent.count.mockResolvedValue(0);

      await service.getTimeline({
        tenantId: 't-1',
        clienteId: 'c-1',
        entityType: 'cliente',
        severity: 'error',
        sourceModule: 'clientes',
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.000Z',
      });

      expect(prisma.admin.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 't-1',
            clienteId: 'c-1',
            entityType: 'cliente',
            severity: 'error',
            sourceModule: 'clientes',
            createdAt: {
              gte: new Date('2024-01-01T00:00:00.000Z'),
              lte: new Date('2024-12-31T23:59:59.000Z'),
            },
          },
        }),
      );
    });

    it('should cap limit at 100', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([]);
      prisma.admin.activityEvent.count.mockResolvedValue(0);

      await service.getTimeline({ tenantId: 't-1', limit: 999 });

      expect(prisma.admin.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should order by createdAt descending', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([]);
      prisma.admin.activityEvent.count.mockResolvedValue(0);

      await service.getTimeline({ tenantId: 't-1' });

      expect(prisma.admin.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should compute hasMore correctly', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue(
        Array(10).fill({ id: 1, tenantId: 't-1', createdAt: new Date() }),
      );
      prisma.admin.activityEvent.count.mockResolvedValue(25);

      const result = await service.getTimeline({ tenantId: 't-1', page: 1, limit: 10 });

      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should handle empty results', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([]);
      prisma.admin.activityEvent.count.mockResolvedValue(0);

      const result = await service.getTimeline({ tenantId: 't-1' });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasMore).toBe(false);
    });
  });
});
