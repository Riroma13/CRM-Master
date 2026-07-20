import { ReportEngine, ReportDefinitionInput } from '../report/report-engine';

describe('ReportEngine', () => {
  let engine: ReportEngine;
  let mockPrisma: any;
  let scopedClient: any;
  let mockQueue: any;

  beforeEach(() => {
    scopedClient = {
      analyticsDataset: {
        findMany: jest.fn(),
      },
    };

    mockPrisma = {
      forTenant: jest.fn().mockReturnValue(scopedClient),
      admin: {
        reportExecution: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      },
    };

    mockQueue = { add: jest.fn() };
    engine = new ReportEngine(mockPrisma, mockQueue);
  });

  it('generates tabular report with aggregation', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'views', value: 100, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
      { metricName: 'views', value: 200, windowStart: new Date('2026-07-21'), dimensions: {}, granularity: 'day' },
      { metricName: 'clicks', value: 10, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
    ]);

    const definition: ReportDefinitionInput = {
      name: 'Test Report',
      datasetName: 'analytics',
      dimensions: [],
      metrics: [
        { name: 'views', aggregation: 'sum' },
        { name: 'clicks', aggregation: 'sum' },
      ],
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.columns).toHaveLength(3);
    expect(result.rows).toHaveLength(2);
    expect(result.totalRows).toBe(2);
  });

  it('sum aggregates correctly', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'views', value: 100, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
      { metricName: 'views', value: 200, windowStart: new Date('2026-07-21'), dimensions: {}, granularity: 'day' },
    ]);

    const definition: ReportDefinitionInput = {
      name: 'Sum Report',
      datasetName: 'pageviews',
      dimensions: [],
      metrics: [{ name: 'views', aggregation: 'sum' }],
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.rows[0].views).toBe(100);
    expect(result.rows[1].views).toBe(200);
  });

  it('count aggregates correctly', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'visits', value: 1, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
      { metricName: 'visits', value: 1, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
    ]);

    const definition: ReportDefinitionInput = {
      name: 'Count Report',
      datasetName: 'visits',
      dimensions: [],
      metrics: [{ name: 'visits', aggregation: 'count' }],
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].visits).toBe(2);
  });

  it('avg aggregates correctly', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'score', value: 80, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
      { metricName: 'score', value: 90, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
    ]);

    const definition: ReportDefinitionInput = {
      name: 'Avg Report',
      datasetName: 'scores',
      dimensions: [],
      metrics: [{ name: 'score', aggregation: 'avg' }],
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].score).toBe(85);
  });

  it('min and max aggregate correctly', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'response_time', value: 100, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
      { metricName: 'response_time', value: 500, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
      { metricName: 'response_time', value: 200, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
    ]);

    const definition: ReportDefinitionInput = {
      name: 'MinMax Report',
      datasetName: 'performance',
      dimensions: [],
      metrics: [
        { name: 'response_time', aggregation: 'min' },
        { name: 'response_time', aggregation: 'max' },
      ],
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].response_time_min).toBe(100);
    expect(result.rows[0].response_time_max).toBe(500);
  });

  it('filters by metric name', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'pageviews', value: 300, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
    ]);

    const definition: ReportDefinitionInput = {
      name: 'Filtered Report',
      datasetName: 'analytics',
      dimensions: [],
      metrics: [{ name: 'pageviews', aggregation: 'sum' }],
      filters: [{ field: 'metricName', operator: 'eq', value: 'pageviews' }],
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].pageviews).toBe(300);
  });

  it('handles empty dataset', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([]);

    const definition: ReportDefinitionInput = {
      name: 'Empty Report',
      datasetName: 'empty',
      dimensions: [],
      metrics: [{ name: 'nonexistent', aggregation: 'count' }],
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.rows).toHaveLength(0);
    expect(result.totalRows).toBe(0);
  });

  it('orders results by time-series', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'events', value: 10, windowStart: new Date('2026-07-18'), dimensions: {}, granularity: 'day' },
      { metricName: 'events', value: 20, windowStart: new Date('2026-07-19'), dimensions: {}, granularity: 'day' },
      { metricName: 'events', value: 30, windowStart: new Date('2026-07-20'), dimensions: {}, granularity: 'day' },
    ]);

    const definition: ReportDefinitionInput = {
      name: 'Time Series Report',
      datasetName: 'events',
      dimensions: [],
      metrics: [{ name: 'events', aggregation: 'sum' }],
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].windowStart).toContain('2026-07-18');
    expect(result.rows[1].windowStart).toContain('2026-07-19');
    expect(result.rows[2].windowStart).toContain('2026-07-20');
  });

  it('filters by date range', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'sales', value: 500, windowStart: new Date('2026-07-15'), dimensions: {}, granularity: 'day' },
    ]);

    const definition: ReportDefinitionInput = {
      name: 'Date Range Report',
      datasetName: 'sales',
      dimensions: [],
      metrics: [{ name: 'sales', aggregation: 'sum' }],
      dateRange: { from: '2026-07-01', to: '2026-07-31' },
    };

    const result = await engine.generateReport('tenant-1', definition);

    expect(result.totalRows).toBe(1);
    expect(scopedClient.analyticsDataset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          windowStart: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });
});
