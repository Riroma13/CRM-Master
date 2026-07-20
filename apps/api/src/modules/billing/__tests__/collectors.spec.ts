import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import {
  WorkflowCollector,
  DocumentCollector,
  ApiCollector,
} from '../metering/collectors';

describe('WorkflowCollector', () => {
  let collector: WorkflowCollector;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        analyticsDataset: {
          aggregate: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowCollector,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    collector = module.get(WorkflowCollector);
  });

  beforeEach(() => jest.clearAllMocks());

  it('queries AnalyticsDataset for workflow.completed', async () => {
    mockPrisma.admin.analyticsDataset.aggregate.mockResolvedValue({
      _sum: { value: 42 },
    });

    const result = await collector.collect(
      'tenant-1',
      new Date('2025-01-01'),
      new Date('2025-02-01'),
    );

    expect(result).toBe(42);
    expect(
      mockPrisma.admin.analyticsDataset.aggregate,
    ).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'completed',
        windowStart: { gte: new Date('2025-01-01'), lte: new Date('2025-02-01') },
      },
      _sum: { value: true },
    });
  });

  it('returns zero when no data', async () => {
    mockPrisma.admin.analyticsDataset.aggregate.mockResolvedValue({
      _sum: { value: null },
    });

    const result = await collector.collect(
      'tenant-1',
      new Date('2025-01-01'),
      new Date('2025-02-01'),
    );

    expect(result).toBe(0);
  });

  it('exposes correct metric name and limit type', () => {
    expect(collector.metric).toBe('total_workflows');
    expect(collector.limitType).toBe('hard');
  });
});

describe('DocumentCollector', () => {
  let collector: DocumentCollector;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        analyticsDataset: {
          aggregate: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentCollector,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    collector = module.get(DocumentCollector);
  });

  beforeEach(() => jest.clearAllMocks());

  it('queries AnalyticsDataset for document.created', async () => {
    mockPrisma.admin.analyticsDataset.aggregate.mockResolvedValue({
      _sum: { value: 15 },
    });

    const result = await collector.collect(
      'tenant-1',
      new Date('2025-01-01'),
      new Date('2025-02-01'),
    );

    expect(result).toBe(15);
    expect(
      mockPrisma.admin.analyticsDataset.aggregate,
    ).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        datasetName: 'documents',
        metricName: 'created',
        windowStart: { gte: new Date('2025-01-01'), lte: new Date('2025-02-01') },
      },
      _sum: { value: true },
    });
  });

  it('returns zero when no data', async () => {
    mockPrisma.admin.analyticsDataset.aggregate.mockResolvedValue({
      _sum: { value: null },
    });

    const result = await collector.collect(
      'tenant-1',
      new Date('2025-01-01'),
      new Date('2025-02-01'),
    );

    expect(result).toBe(0);
  });

  it('exposes correct metric name and limit type', () => {
    expect(collector.metric).toBe('total_documents');
    expect(collector.limitType).toBe('soft');
  });
});

describe('ApiCollector', () => {
  let collector: ApiCollector;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        auditLog: {
          count: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiCollector,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    collector = module.get(ApiCollector);
  });

  beforeEach(() => jest.clearAllMocks());

  it('counts audit log entries for API resources', async () => {
    mockPrisma.admin.auditLog.count.mockResolvedValue(88);

    const result = await collector.collect(
      'tenant-1',
      new Date('2025-01-01'),
      new Date('2025-02-01'),
    );

    expect(result).toBe(88);
    expect(mockPrisma.admin.auditLog.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        resource: { in: ['api', 'api_key'] },
        createdAt: { gte: new Date('2025-01-01'), lte: new Date('2025-02-01') },
      },
    });
  });

  it('returns zero when no API calls', async () => {
    mockPrisma.admin.auditLog.count.mockResolvedValue(0);

    const result = await collector.collect(
      'tenant-1',
      new Date('2025-01-01'),
      new Date('2025-02-01'),
    );

    expect(result).toBe(0);
  });

  it('exposes correct metric name and limit type', () => {
    expect(collector.metric).toBe('total_api_calls');
    expect(collector.limitType).toBe('hard');
  });
});
