import { DashboardHydrator } from '../dashboard/dashboard-hydrator';
import { KpiEngine } from '../kpi/kpi-engine';

describe('DashboardHydrator', () => {
  let hydrator: DashboardHydrator;
  let mockPrisma: any;
  let scopedClient: any;
  let mockKpiEngine: any;

  beforeEach(() => {
    scopedClient = {
      analyticsDataset: {
        findMany: jest.fn(),
      },
    };

    mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };
    mockKpiEngine = { getKpi: jest.fn() };
    hydrator = new DashboardHydrator(mockPrisma, mockKpiEngine);
  });

  it('resolves KPI widget data via KpiEngine', async () => {
    mockKpiEngine.getKpi.mockResolvedValue({ name: 'revenue', value: 50000, status: 'on_target' });

    const dashboard = {
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Test',
      description: null,
      shared: false,
      widgets: [
        { id: 'w-1', type: 'kpi-card', title: 'Revenue', config: {}, position: { x: 0, y: 0, w: 3, h: 2 }, kpiName: 'revenue', datasetName: null },
      ],
    };

    const result = await hydrator.hydrate(dashboard, 'tenant-1');

    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].data).toEqual({ name: 'revenue', value: 50000, status: 'on_target' });
    expect(mockKpiEngine.getKpi).toHaveBeenCalledWith('tenant-1', 'revenue');
  });

  it('resolves chart widget data from AnalyticsDataset', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'views', value: 100, windowStart: new Date('2026-07-20'), dimensions: {} },
      { metricName: 'views', value: 200, windowStart: new Date('2026-07-21'), dimensions: {} },
    ]);

    const dashboard = {
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Chart Test',
      description: null,
      shared: false,
      widgets: [
        { id: 'w-1', type: 'line-chart', title: 'Views', config: { metrics: ['views'], granularity: 'day' }, position: { x: 0, y: 0, w: 6, h: 4 }, kpiName: null, datasetName: 'pageviews' },
      ],
    };

    const result = await hydrator.hydrate(dashboard, 'tenant-1');

    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].data).toHaveLength(2);
    expect(scopedClient.analyticsDataset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ datasetName: 'pageviews', metricName: { in: ['views'] } }),
      }),
    );
  });

  it('resolves table widget data with limit', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'sales', value: 500, windowStart: new Date('2026-07-20'), dimensions: {} },
    ]);

    const dashboard = {
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Table Test',
      description: null,
      shared: false,
      widgets: [
        { id: 'w-1', type: 'table', title: 'Sales Table', config: { metrics: ['sales'], limit: 10 }, position: { x: 0, y: 0, w: 6, h: 4 }, kpiName: null, datasetName: 'analytics' },
      ],
    };

    const result = await hydrator.hydrate(dashboard, 'tenant-1');

    expect(result.widgets).toHaveLength(1);
    expect(scopedClient.analyticsDataset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });

  it('resolves trend widget data', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'users', value: 100, windowStart: new Date('2026-07-01') },
      { metricName: 'users', value: 150, windowStart: new Date('2026-07-02') },
    ]);

    const dashboard = {
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Trend Test',
      description: null,
      shared: false,
      widgets: [
        { id: 'w-1', type: 'trend', title: 'User Trend', config: { metricName: 'users', days: 7 }, position: { x: 0, y: 0, w: 6, h: 4 }, kpiName: null, datasetName: 'analytics' },
      ],
    };

    const result = await hydrator.hydrate(dashboard, 'tenant-1');

    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].data).toHaveLength(2);
    expect(scopedClient.analyticsDataset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ granularity: 'day', metricName: 'users' }) }),
    );
  });

  it('handles unknown widget type gracefully', async () => {
    const dashboard = {
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Unknown Widget',
      description: null,
      shared: false,
      widgets: [
        { id: 'w-1', type: 'unknown-type', title: 'Weird', config: {}, position: { x: 0, y: 0, w: 3, h: 2 }, kpiName: null, datasetName: null },
      ],
    };

    const result = await hydrator.hydrate(dashboard, 'tenant-1');

    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].data).toBeUndefined();
  });

  it('handles KPI error gracefully', async () => {
    mockKpiEngine.getKpi.mockRejectedValue(new Error('KPI failed'));

    const dashboard = {
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Error Widget',
      description: null,
      shared: false,
      widgets: [
        { id: 'w-1', type: 'kpi-card', title: 'Broken KPI', config: {}, position: { x: 0, y: 0, w: 3, h: 2 }, kpiName: 'broken', datasetName: null },
      ],
    };

    const result = await hydrator.hydrate(dashboard, 'tenant-1');

    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].data).toEqual({ error: 'KPI failed' });
  });

  it('resolves all widgets in parallel (Promise.all)', async () => {
    mockKpiEngine.getKpi
      .mockResolvedValueOnce({ name: 'kpi1', value: 1, status: 'on_target' })
      .mockResolvedValueOnce({ name: 'kpi2', value: 2, status: 'on_target' });

    const dashboard = {
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Parallel Test',
      description: null,
      shared: false,
      widgets: [
        { id: 'w-1', type: 'kpi-card', title: 'KPI 1', config: {}, position: { x: 0, y: 0, w: 3, h: 2 }, kpiName: 'kpi1', datasetName: null },
        { id: 'w-2', type: 'kpi-card', title: 'KPI 2', config: {}, position: { x: 0, y: 0, w: 3, h: 2 }, kpiName: 'kpi2', datasetName: null },
      ],
    };

    const result = await hydrator.hydrate(dashboard, 'tenant-1');

    expect(result.widgets).toHaveLength(2);
    expect(result.widgets[0].data).toEqual({ name: 'kpi1', value: 1, status: 'on_target' });
    expect(result.widgets[1].data).toEqual({ name: 'kpi2', value: 2, status: 'on_target' });
    expect(mockKpiEngine.getKpi).toHaveBeenCalledTimes(2);
  });
});
