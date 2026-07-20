import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ActivityTimelineService } from './activity-timeline.service';
import { PrismaService } from '../../common/prisma.service';
import { ActivityEventEnvelope } from '../../../../../packages/shared/src/activity-timeline';

describe('ActivityTimelineService', () => {
  let service: ActivityTimelineService;
  let prisma: any;
  let mockQueue: any;

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
    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTimelineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('activity-timeline:ingestion'), useValue: mockQueue },
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

    it('should enqueue a valid event to BullMQ', async () => {
      await service.publish(validEnvelope);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'ingest',
        expect.objectContaining({
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
        }),
        expect.objectContaining({
          removeOnComplete: true,
          removeOnFail: 100,
        }),
      );
    });

    it('should not throw on queue error', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis down'));

      await expect(service.publish(validEnvelope)).resolves.toBeUndefined();
    });

    it('should reject invalid envelopes without queueing', async () => {
      const invalid = { ...validEnvelope, severity: 'unknown' };

      await service.publish(invalid as any);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should omit optional fields when not present in envelope', async () => {
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

      await service.publish(minimal);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'ingest',
        expect.objectContaining({
          tenantId: 't-1',
          eventType: 'login.realizado',
        }),
        expect.any(Object),
      );
      const callData = (mockQueue.add as jest.Mock).mock.calls[0][1];
      expect(callData.clienteId).toBeUndefined();
      expect(callData.entityId).toBeUndefined();
    });

    it('should pass optional fields when present in envelope', async () => {
      const enriched: ActivityEventEnvelope = {
        ...validEnvelope,
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        correlationId: 'corr-123',
        causationId: 'cause-456',
        visibility: 'public',
        subjectName: 'Cliente Test',
        actorName: 'Admin User',
        occurredAt: '2024-06-15T10:00:00.000Z',
      };

      await service.publish(enriched);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'ingest',
        expect.objectContaining({
          eventId: '550e8400-e29b-41d4-a716-446655440000',
          correlationId: 'corr-123',
          causationId: 'cause-456',
          visibility: 'public',
          subjectName: 'Cliente Test',
          actorName: 'Admin User',
        }),
        expect.any(Object),
      );
    });

    it('should pass envelope without optional fields when they are absent', async () => {
      await service.publish(validEnvelope);

      const callArg = (mockQueue.add as jest.Mock).mock.calls[0][1];
      expect(callArg.eventId).toBeUndefined();
      expect(callArg.correlationId).toBeUndefined();
      expect(callArg.causationId).toBeUndefined();
      expect(callArg.subjectName).toBeUndefined();
      expect(callArg.actorName).toBeUndefined();
      expect(callArg.occurredAt).toBeUndefined();
    });
  });

  describe('getTimeline', () => {
    it('should return paginated results', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([
        { id: 1, tenantId: 't-1', eventType: 'test', createdAt: new Date(), receivedAt: new Date() },
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

    it('should order by createdAt descending then receivedAt descending', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([]);
      prisma.admin.activityEvent.count.mockResolvedValue(0);

      await service.getTimeline({ tenantId: 't-1' });

      expect(prisma.admin.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { receivedAt: 'desc' }],
        }),
      );
    });

    it('should compute hasMore correctly', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue(
        Array(10).fill({ id: 1, tenantId: 't-1', createdAt: new Date(), receivedAt: new Date() }),
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

    it('should filter by correlationId', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([]);
      prisma.admin.activityEvent.count.mockResolvedValue(0);

      await service.getTimeline({ tenantId: 't-1', correlationId: 'corr-123' });

      expect(prisma.admin.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ correlationId: 'corr-123' }),
        }),
      );
    });

    it('should filter by eventId', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([]);
      prisma.admin.activityEvent.count.mockResolvedValue(0);

      await service.getTimeline({ tenantId: 't-1', eventId: '550e8400-e29b-41d4-a716-446655440000' });

      expect(prisma.admin.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventId: '550e8400-e29b-41d4-a716-446655440000' }),
        }),
      );
    });

    it('should filter by visibility', async () => {
      prisma.admin.activityEvent.findMany.mockResolvedValue([]);
      prisma.admin.activityEvent.count.mockResolvedValue(0);

      await service.getTimeline({ tenantId: 't-1', visibility: 'public' });

      expect(prisma.admin.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ visibility: 'public' }),
        }),
      );
    });
  });
});
