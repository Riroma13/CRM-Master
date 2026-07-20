import { DashboardEngine } from '../dashboard/dashboard-engine';
import { DashboardHydrator } from '../dashboard/dashboard-hydrator';
import { KpiEngine } from '../kpi/kpi-engine';

describe('DashboardEngine', () => {
  let engine: DashboardEngine;
  let mockPrisma: any;
  let scopedClient: any;
  let mockHydrator: any;
  let mockKpiEngine: any;

  beforeEach(() => {
    scopedClient = {
      dashboard: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      dashboardWidget: {
        createMany: jest.fn(),
      },
    };

    mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };
    mockKpiEngine = { getKpi: jest.fn() };
    mockHydrator = new DashboardHydrator(mockPrisma, mockKpiEngine);
    engine = new DashboardEngine(mockPrisma, mockHydrator);
  });

  it('creates a dashboard with widgets', async () => {
    const createdDashboard = { id: 'dash-1', tenantId: 'tenant-1', name: 'Test Dashboard', description: null, layout: { columns: 12, gap: 16 }, shared: false, createdAt: new Date(), updatedAt: new Date() };
    const dashboardWithWidgets = {
      ...createdDashboard,
      widgets: [
        { id: 'w-1', dashboardId: 'dash-1', type: 'kpi-card', title: 'KPI 1', config: {}, position: { x: 0, y: 0, w: 3, h: 2 }, kpiName: 'test_kpi', datasetName: null },
        { id: 'w-2', dashboardId: 'dash-1', type: 'table', title: 'Table 1', config: {}, position: { x: 3, y: 0, w: 6, h: 4 }, kpiName: null, datasetName: 'analytics' },
      ],
    };

    scopedClient.dashboard.create.mockResolvedValue(createdDashboard);
    scopedClient.dashboardWidget.createMany.mockResolvedValue({ count: 2 });
    scopedClient.dashboard.findUnique.mockResolvedValue(dashboardWithWidgets);

    const result = await engine.createDashboard('tenant-1', {
      name: 'Test Dashboard',
      widgets: [
        { type: 'kpi-card', title: 'KPI 1', kpiName: 'test_kpi' },
        { type: 'table', title: 'Table 1', datasetName: 'analytics' },
      ],
    });

    expect(scopedClient.dashboard.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'Test Dashboard',
        description: undefined,
        layout: { columns: 12, gap: 16 },
      },
    });

    expect(scopedClient.dashboardWidget.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ dashboardId: 'dash-1', type: 'kpi-card', kpiName: 'test_kpi' }),
        expect.objectContaining({ dashboardId: 'dash-1', type: 'table', datasetName: 'analytics' }),
      ]),
    });

    expect(result).toBeDefined();
    expect(result.widgets).toHaveLength(2);
  });

  it('gets a dashboard by id', async () => {
    scopedClient.dashboard.findUnique.mockResolvedValue({
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Test',
      widgets: [{ id: 'w-1', title: 'KPI 1', type: 'kpi-card' }],
    });

    const result = await engine.getDashboard('tenant-1', 'dash-1');

    expect(result.name).toBe('Test');
    expect(result.widgets).toHaveLength(1);
    expect(scopedClient.dashboard.findUnique).toHaveBeenCalledWith({
      where: { id: 'dash-1' },
      include: { widgets: true },
    });
  });

  it('throws on get non-existent dashboard', async () => {
    scopedClient.dashboard.findUnique.mockResolvedValue(null);

    await expect(
      engine.getDashboard('tenant-1', 'nonexistent'),
    ).rejects.toThrow('not found');
  });

  it('updates a dashboard layout', async () => {
    scopedClient.dashboard.findUnique.mockResolvedValue({
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Test',
    });
    scopedClient.dashboard.update.mockResolvedValue({
      id: 'dash-1',
      name: 'Test',
      layout: { columns: 8, gap: 12 },
      widgets: [],
    });

    const result = await engine.updateDashboard('tenant-1', 'dash-1', {
      layout: { columns: 8, gap: 12 },
    });

    expect(scopedClient.dashboard.update).toHaveBeenCalledWith({
      where: { id: 'dash-1' },
      data: { layout: { columns: 8, gap: 12 } },
      include: { widgets: true },
    });
    expect(result.layout).toEqual({ columns: 8, gap: 12 });
  });

  it('deletes a dashboard', async () => {
    scopedClient.dashboard.findUnique.mockResolvedValue({
      id: 'dash-1',
      tenantId: 'tenant-1',
    });
    scopedClient.dashboard.delete.mockResolvedValue({ id: 'dash-1' });

    await engine.deleteDashboard('tenant-1', 'dash-1');

    expect(scopedClient.dashboard.delete).toHaveBeenCalledWith({
      where: { id: 'dash-1' },
    });
  });

  it('lists dashboards for a tenant', async () => {
    scopedClient.dashboard.findMany.mockResolvedValue([
      { id: 'dash-1', name: 'A', widgets: [] },
      { id: 'dash-2', name: 'B', widgets: [] },
    ]);

    const result = await engine.listDashboards('tenant-1');

    expect(result).toHaveLength(2);
    expect(scopedClient.dashboard.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      include: { widgets: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns hydrated dashboard data via getDashboardData', async () => {
    const dashboard = {
      id: 'dash-1',
      tenantId: 'tenant-1',
      name: 'Test',
      description: null,
      layout: { columns: 12, gap: 16 },
      shared: false,
      widgets: [
        { id: 'w-1', dashboardId: 'dash-1', type: 'kpi-card', title: 'KPI', config: {}, position: { x: 0, y: 0, w: 3, h: 2 }, kpiName: 'test_kpi', datasetName: null },
      ],
    };

    scopedClient.dashboard.findUnique.mockResolvedValue(dashboard);
    mockKpiEngine.getKpi.mockResolvedValue({ name: 'test_kpi', value: 42, status: 'on_target' });

    const result = await engine.getDashboardData('tenant-1', 'dash-1');

    expect(result.id).toBe('dash-1');
    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].data).toEqual({ name: 'test_kpi', value: 42, status: 'on_target' });
  });
});
