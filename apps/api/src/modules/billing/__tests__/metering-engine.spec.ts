import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { MeteringEngine } from '../metering/metering-engine';

describe('MeteringEngine', () => {
  let engine: MeteringEngine;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        usageMeter: {
          upsert: jest.fn(),
          aggregate: jest.fn(),
          findMany: jest.fn(),
          update: jest.fn(),
        },
        analyticsDataset: {
          aggregate: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeteringEngine,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    engine = module.get(MeteringEngine);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordUsage', () => {
    it('upserts usage meter record', async () => {
      mockPrisma.admin.usageMeter.upsert.mockResolvedValue({});

      const periodStart = new Date('2025-01-01');

      await engine.recordUsage('tenant-1', 'total_workflows', 42, periodStart);

      expect(mockPrisma.admin.usageMeter.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_metric_periodStart: {
            tenantId: 'tenant-1',
            metric: 'total_workflows',
            periodStart,
          },
        },
        create: {
          tenantId: 'tenant-1',
          metric: 'total_workflows',
          periodStart,
          periodEnd: expect.any(Date),
          value: 42,
          isFinalized: false,
        },
        update: {
          value: 42,
          periodEnd: expect.any(Date),
        },
      });
    });

    it('overwrites value on conflict (self-correcting)', async () => {
      mockPrisma.admin.usageMeter.upsert.mockResolvedValue({});

      const periodStart = new Date('2025-01-01');

      await engine.recordUsage('tenant-1', 'total_workflows', 50, periodStart);

      expect(
        mockPrisma.admin.usageMeter.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId_metric_periodStart: expect.objectContaining({
              metric: 'total_workflows',
            }),
          }),
          update: expect.objectContaining({ value: 50 }),
        }),
      );
    });

    it('sets periodEnd one month after periodStart', async () => {
      mockPrisma.admin.usageMeter.upsert.mockResolvedValue({});

      const periodStart = new Date('2025-01-15T10:00:00Z');

      await engine.recordUsage('tenant-1', 'total_workflows', 10, periodStart);

      const call = mockPrisma.admin.usageMeter.upsert.mock.calls[0][0];
      const periodEnd = call.create.periodEnd;
      expect(periodEnd.getMonth()).toBe(1); // February
      expect(periodEnd.getFullYear()).toBe(2025);
    });
  });

  describe('getUsage', () => {
    it('returns cumulative sum for a metric in a period', async () => {
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 100 },
      });

      const periodStart = new Date('2025-01-01');
      const result = await engine.getUsage(
        'tenant-1',
        'total_workflows',
        periodStart,
      );

      expect(result).toBe(100);
      expect(mockPrisma.admin.usageMeter.aggregate).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          metric: 'total_workflows',
          periodStart: { gte: periodStart },
        },
        _sum: { value: true },
      });
    });

    it('returns zero when no records exist', async () => {
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: null },
      });

      const result = await engine.getUsage(
        'tenant-1',
        'total_workflows',
        new Date('2025-01-01'),
      );

      expect(result).toBe(0);
    });

    it('filters by periodEnd when provided', async () => {
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 50 },
      });

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-02-01');

      await engine.getUsage('tenant-1', 'total_workflows', periodStart, periodEnd);

      expect(mockPrisma.admin.usageMeter.aggregate).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          metric: 'total_workflows',
          periodStart: { gte: periodStart, lte: periodEnd },
        },
        _sum: { value: true },
      });
    });
  });

  describe('getAllUsage', () => {
    it('returns all metrics for tenant in period range', async () => {
      const mockRecords = [
        {
          id: '1',
          tenantId: 'tenant-1',
          metric: 'total_workflows',
          periodStart: new Date('2025-01-01'),
          periodEnd: new Date('2025-02-01'),
          value: 100,
          isFinalized: false,
        },
        {
          id: '2',
          tenantId: 'tenant-1',
          metric: 'total_documents',
          periodStart: new Date('2025-01-01'),
          periodEnd: new Date('2025-02-01'),
          value: 50,
          isFinalized: false,
        },
      ];

      mockPrisma.admin.usageMeter.findMany.mockResolvedValue(mockRecords);

      const result = await engine.getAllUsage(
        'tenant-1',
        new Date('2025-01-01'),
        new Date('2025-02-01'),
      );

      expect(result).toHaveLength(2);
      expect(result[0].metric).toBe('total_workflows');
      expect(result[1].value).toBe(50);
    });

    it('returns empty array when no usage', async () => {
      mockPrisma.admin.usageMeter.findMany.mockResolvedValue([]);

      const result = await engine.getAllUsage(
        'tenant-1',
        new Date('2025-01-01'),
        new Date('2025-02-01'),
      );

      expect(result).toEqual([]);
    });
  });

  describe('finalizePeriod', () => {
    it('locks and finalizes unfinalized meters', async () => {
      const mockMeters = [
        {
          id: 'meter-1',
          tenantId: 'tenant-1',
          metric: 'total_workflows',
          periodStart: new Date('2025-01-01'),
          periodEnd: new Date('2025-02-01'),
          value: 100,
          isFinalized: false,
        },
      ];

      mockPrisma.admin.usageMeter.findMany.mockResolvedValue(mockMeters);
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 100 },
      });
      mockPrisma.admin.usageMeter.update.mockResolvedValue({});

      await engine.finalizePeriod('tenant-1', new Date('2025-01-01'));

      expect(mockPrisma.admin.usageMeter.update).toHaveBeenCalledWith({
        where: { id: 'meter-1' },
        data: { value: 100, isFinalized: true },
      });
    });

    it('computes final value via aggregate sum', async () => {
      const mockMeters = [
        {
          id: 'meter-1',
          tenantId: 'tenant-1',
          metric: 'total_workflows',
          periodStart: new Date('2025-01-01'),
          periodEnd: new Date('2025-02-01'),
          value: 80,
          isFinalized: false,
        },
      ];

      mockPrisma.admin.usageMeter.findMany.mockResolvedValue(mockMeters);
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 95 },
      });
      mockPrisma.admin.usageMeter.update.mockResolvedValue({});

      await engine.finalizePeriod('tenant-1', new Date('2025-01-01'));

      expect(mockPrisma.admin.usageMeter.update).toHaveBeenCalledWith({
        where: { id: 'meter-1' },
        data: { value: 95, isFinalized: true },
      });
    });
  });

  describe('collectFromDataset', () => {
    it('queries AnalyticsDataset and records usage', async () => {
      mockPrisma.admin.analyticsDataset.aggregate.mockResolvedValue({
        _sum: { value: 75 },
      });
      mockPrisma.admin.usageMeter.upsert.mockResolvedValue({});

      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-02-01');
      const result = await engine.collectFromDataset(
        'tenant-1',
        'workflows.completed',
        periodStart,
        periodEnd,
      );

      expect(result).toBe(75);
      expect(
        mockPrisma.admin.analyticsDataset.aggregate,
      ).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          datasetName: 'workflows',
          metricName: 'completed',
          windowStart: { gte: periodStart, lte: periodEnd },
        },
        _sum: { value: true },
      });
      expect(mockPrisma.admin.usageMeter.upsert).toHaveBeenCalled();
    });

    it('returns zero when dataset has no records', async () => {
      mockPrisma.admin.analyticsDataset.aggregate.mockResolvedValue({
        _sum: { value: null },
      });
      mockPrisma.admin.usageMeter.upsert.mockResolvedValue({});

      const result = await engine.collectFromDataset(
        'tenant-1',
        'workflows.completed',
        new Date('2025-01-01'),
        new Date('2025-02-01'),
      );

      expect(result).toBe(0);
    });
  });
});
