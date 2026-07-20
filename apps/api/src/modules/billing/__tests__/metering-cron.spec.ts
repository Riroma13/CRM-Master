import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { MeteringEngine } from '../metering/metering-engine';
import { MeteringCronService } from '../metering/metering-cron.service';
import {
  WorkflowCollector,
  DocumentCollector,
  ApiCollector,
} from '../metering/collectors';

describe('MeteringCronService', () => {
  let cron: MeteringCronService;
  let mockPrisma: any;
  let mockEngine: any;
  let mockWfCollector: any;
  let mockDocCollector: any;
  let mockApiCollector: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        subscription: {
          findMany: jest.fn(),
        },
      },
    };

    mockEngine = {
      recordUsage: jest.fn(),
    };

    mockWfCollector = {
      metric: 'total_workflows',
      limitType: 'hard',
      collect: jest.fn(),
    };

    mockDocCollector = {
      metric: 'total_documents',
      limitType: 'soft',
      collect: jest.fn(),
    };

    mockApiCollector = {
      metric: 'total_api_calls',
      limitType: 'hard',
      collect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeteringCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MeteringEngine, useValue: mockEngine },
        { provide: WorkflowCollector, useValue: mockWfCollector },
        { provide: DocumentCollector, useValue: mockDocCollector },
        { provide: ApiCollector, useValue: mockApiCollector },
      ],
    }).compile();

    cron = module.get(MeteringCronService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes all active tenants and collects metrics', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue([
      { tenantId: 'tenant-1', status: 'active' },
      { tenantId: 'tenant-2', status: 'trialing' },
    ]);

    mockWfCollector.collect.mockResolvedValue(100);
    mockDocCollector.collect.mockResolvedValue(50);
    mockApiCollector.collect.mockResolvedValue(200);

    const job = { id: 'cron-1', data: {} } as unknown as Job;
    await cron.process(job);

    expect(mockWfCollector.collect).toHaveBeenCalledTimes(2);
    expect(mockDocCollector.collect).toHaveBeenCalledTimes(2);
    expect(mockApiCollector.collect).toHaveBeenCalledTimes(2);

    expect(mockEngine.recordUsage).toHaveBeenCalledWith(
      'tenant-1',
      'total_workflows',
      100,
      expect.any(Date),
    );
    expect(mockEngine.recordUsage).toHaveBeenCalledWith(
      'tenant-2',
      'total_workflows',
      100,
      expect.any(Date),
    );
  });

  it('skips metrics with zero value (no upsert called)', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue([
      { tenantId: 'tenant-1', status: 'active' },
    ]);

    mockWfCollector.collect.mockResolvedValue(0);
    mockDocCollector.collect.mockResolvedValue(0);
    mockApiCollector.collect.mockResolvedValue(0);

    const job = { id: 'cron-2', data: {} } as unknown as Job;
    await cron.process(job);

    expect(mockEngine.recordUsage).not.toHaveBeenCalled();
  });

  it('handles collector errors gracefully per tenant', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue([
      { tenantId: 'tenant-1', status: 'active' },
      { tenantId: 'tenant-2', status: 'active' },
    ]);

    mockWfCollector.collect
      .mockRejectedValueOnce(new Error('DB timeout'))
      .mockResolvedValueOnce(10);

    mockDocCollector.collect.mockResolvedValue(0);
    mockApiCollector.collect.mockResolvedValue(0);

    const job = { id: 'cron-3', data: {} } as unknown as Job;
    await expect(cron.process(job)).resolves.toBeUndefined();

    // tenant-2 should still be processed
    expect(mockEngine.recordUsage).toHaveBeenCalledWith(
      'tenant-2',
      'total_workflows',
      10,
      expect.any(Date),
    );
  });

  it('uses monthly period bounds from current date', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue([
      { tenantId: 'tenant-1', status: 'active' },
    ]);

    mockWfCollector.collect.mockResolvedValue(5);
    mockDocCollector.collect.mockResolvedValue(0);
    mockApiCollector.collect.mockResolvedValue(0);

    const job = { id: 'cron-4', data: {} } as unknown as Job;
    await cron.process(job);

    const call = mockWfCollector.collect.mock.calls[0];
    const periodStart = call[1];
    const periodEnd = call[2];

    expect(periodStart.getDate()).toBe(1);
    expect(periodStart.getHours()).toBe(0);
    expect(periodStart.getMinutes()).toBe(0);
    expect(periodEnd.getDate()).toBe(1);
  });
});
