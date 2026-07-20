import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ActivityTimelineService } from '../activity-timeline.service';
import { PrismaService } from '../../../common/prisma.service';

describe('ActivityTimeline Cross-Tenant Isolation (Doorbell)', () => {
  let service: ActivityTimelineService;
  let prisma: any;

  const tenantAevents = [
    {
      id: 1,
      tenantId: 'tenant-a',
      clienteId: null,
      entityType: 'cliente',
      entityId: 'c-1',
      eventType: 'cliente.creado',
      actor: 'admin@a.com',
      sourceModule: 'clientes',
      severity: 'info',
      category: 'crm',
      payload: {},
      createdAt: new Date('2024-01-01'),
      eventId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1',
      correlationId: null,
      causationId: null,
      visibility: 'tenant-only',
      subjectName: null,
      actorName: null,
      searchVector: null,
      enriched: false,
      enrichedAt: null,
      occurredAt: new Date('2024-01-01'),
      receivedAt: new Date('2024-01-01'),
    },
    {
      id: 2,
      tenantId: 'tenant-a',
      clienteId: null,
      entityType: 'cliente',
      entityId: 'c-2',
      eventType: 'cliente.actualizado',
      actor: 'admin@a.com',
      sourceModule: 'clientes',
      severity: 'info',
      category: 'crm',
      payload: {},
      createdAt: new Date('2024-01-02'),
      eventId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa2',
      correlationId: null,
      causationId: null,
      visibility: 'tenant-only',
      subjectName: null,
      actorName: null,
      searchVector: null,
      enriched: false,
      enrichedAt: null,
      occurredAt: new Date('2024-01-02'),
      receivedAt: new Date('2024-01-02'),
    },
  ];

  const tenantBevents: any[] = [];

  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = { add: jest.fn().mockResolvedValue(undefined) };

    prisma = {
      admin: {
        activityEvent: {
          create: jest.fn(),
          findMany: jest.fn().mockImplementation(({ where }: any) => {
            if (where.tenantId === 'tenant-a') return tenantAevents;
            if (where.tenantId === 'tenant-b') return tenantBevents;
            if (where.eventId === 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1' && where.tenantId === 'tenant-b') return [];
            return [];
          }),
          count: jest.fn().mockImplementation(({ where }: any) => {
            if (where.tenantId === 'tenant-a') return tenantAevents.length;
            if (where.tenantId === 'tenant-b') return tenantBevents.length;
            return 0;
          }),
        },
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTimelineService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('activity-timeline:ingestion'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ActivityTimelineService>(ActivityTimelineService);
  });

  it('Tenant A can see its own events via /timeline', async () => {
    const result = await service.getTimeline({ tenantId: 'tenant-a' });

    expect(result.data).toHaveLength(2);
    expect(result.data.every((e: any) => e.tenantId === 'tenant-a')).toBe(true);
  });

  it('Tenant B cannot see Tenant A events via /timeline', async () => {
    const result = await service.getTimeline({ tenantId: 'tenant-b' });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('Tenant B cannot see Tenant A events via /timeline/search', async () => {
    prisma.admin.$queryRawUnsafe.mockResolvedValue([]);

    const result = await service.search({ tenantId: 'tenant-b', q: 'cliente' });

    expect(result.data).toHaveLength(0);
  });

  it('Tenant B cannot access Tenant A event by eventId', async () => {
    prisma.admin.activityEvent.findMany.mockImplementation(({ where }: any) => {
      if (where.tenantId === 'tenant-b' && where.eventId === 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1') return [];
      if (where.tenantId === 'tenant-a' && where.eventId === 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1') return [tenantAevents[0]];
      return [];
    });

    const result = await service.getTimeline({ tenantId: 'tenant-b', eventId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1' });

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});
