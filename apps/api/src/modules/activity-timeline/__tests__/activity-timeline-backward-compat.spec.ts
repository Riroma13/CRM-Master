import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ActivityTimelineService } from '../activity-timeline.service';
import { PrismaService } from '../../../common/prisma.service';

describe('ActivityTimeline Backward Compat', () => {
  let service: ActivityTimelineService;
  let mockQueue: any;
  let prisma: any;

  const oldEnvelope = {
    eventType: 'cliente.creado',
    tenantId: 'tenant-1',
    clienteId: 'cliente-1',
    entityType: 'cliente',
    entityId: 'cliente-1',
    actor: 'admin@test.com',
    sourceModule: 'clientes',
    severity: 'info' as const,
    category: 'crm' as const,
    payload: { nombre: 'Test' },
  };

  beforeEach(async () => {
    mockQueue = { add: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      admin: {
        activityEvent: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockResolvedValue({ id: 1 }),
        },
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      },
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTimelineService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('activity-timeline:ingestion'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ActivityTimelineService>(ActivityTimelineService);
  });

  it('old envelope shape (without new fields) still accepted by publish()', async () => {
    await service.publish(oldEnvelope);

    expect(mockQueue.add).toHaveBeenCalledWith(
      'ingest',
      expect.objectContaining({
        eventType: 'cliente.creado',
        tenantId: 'tenant-1',
      }),
      expect.any(Object),
    );
  });

  it('old envelope still persisted correctly (enqueues without new fields)', async () => {
    await service.publish(oldEnvelope);

    const callData = (mockQueue.add as jest.Mock).mock.calls[0][1];
    expect(callData.eventId).toBeUndefined();
    expect(callData.correlationId).toBeUndefined();
    expect(callData.causationId).toBeUndefined();
    expect(callData.visibility).toBeUndefined();
    expect(callData.subjectName).toBeUndefined();
    expect(callData.actorName).toBeUndefined();
    expect(callData.occurredAt).toBeUndefined();
  });

  it('GET /api/v1/timeline?page=1 still returns valid results', async () => {
    const mockEvents = [
      {
        id: 1,
        tenantId: 'tenant-1',
        clienteId: null,
        entityType: 'cliente',
        entityId: null,
        eventType: 'test.event',
        actor: 'user',
        sourceModule: 'test',
        severity: 'info',
        category: 'crm',
        payload: {},
        createdAt: new Date(),
        eventId: null,
        correlationId: null,
        causationId: null,
        visibility: 'tenant-only',
        subjectName: null,
        actorName: null,
        searchVector: null,
        enriched: false,
        enrichedAt: null,
        occurredAt: new Date(),
        receivedAt: new Date(),
      },
    ];

    prisma.admin.activityEvent.findMany.mockResolvedValue(mockEvents);
    prisma.admin.activityEvent.count.mockResolvedValue(1);

    const result = await service.getTimeline({ tenantId: 'tenant-1', page: 1 });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
      hasMore: false,
    });
  });

  it('publishAsync() requires eventId in envelope', async () => {
    await expect(service.publishAsync(oldEnvelope)).rejects.toThrow('eventId is required');
  });

  it('publishAsync() succeeds when eventId is provided', async () => {
    const envelopeWithEventId = {
      ...oldEnvelope,
      eventId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = await service.publishAsync(envelopeWithEventId);

    expect(result.eventId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'ingest',
      expect.objectContaining({ eventId: '550e8400-e29b-41d4-a716-446655440000' }),
      expect.any(Object),
    );
  });
});
