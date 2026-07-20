import { ReportingController } from '../reporting.controller';

describe('ReportingController — replay', () => {
  let controller: ReportingController;
  let mockPrisma: any;
  let scopedClient: any;
  let mockReporting: any;

  beforeEach(() => {
    scopedClient = {
      analyticsDataset: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      datasetIngestionLog: {
        findMany: jest.fn(),
      },
    };

    mockReporting = {};
    mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };
    const mockDashboardEngine = {};
    const mockExportService = {};
    const mockScheduling = {};
    controller = new ReportingController(mockReporting, mockPrisma, mockDashboardEngine as any, mockExportService as any, mockScheduling as any);
  });

  it('re-processes events from ingestion log', async () => {
    scopedClient.datasetIngestionLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 1,
        timestamp: new Date('2026-07-20T10:00:00.000Z'),
        windowStart: new Date('2026-07-20'),
        eventId: 'evt-1',
      },
      {
        id: 'log-2',
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 2,
        timestamp: new Date('2026-07-20T12:00:00.000Z'),
        windowStart: new Date('2026-07-20'),
        eventId: 'evt-2',
      },
    ]);

    const result = await controller.replay(
      'workflows',
      '2026-07-20T00:00:00.000Z',
      '2026-07-20T23:59:59.000Z',
      'tenant-1',
    );

    expect(result).toEqual({ replayed: 2, failed: 0 });
    expect(scopedClient.analyticsDataset.upsert).toHaveBeenCalledTimes(2);
  });

  it('handles empty dataset', async () => {
    scopedClient.datasetIngestionLog.findMany.mockResolvedValue([]);

    const result = await controller.replay(
      'workflows',
      '2026-07-20T00:00:00.000Z',
      '2026-07-21T00:00:00.000Z',
      'tenant-1',
    );

    expect(result).toEqual({ replayed: 0, failed: 0 });
    expect(scopedClient.analyticsDataset.upsert).not.toHaveBeenCalled();
  });

  it('counts failures during replay', async () => {
    scopedClient.datasetIngestionLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 1,
        timestamp: new Date('2026-07-20T10:00:00.000Z'),
        windowStart: new Date('2026-07-20'),
        eventId: 'evt-ok',
      },
      {
        id: 'log-2',
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 2,
        timestamp: new Date('2026-07-20T12:00:00.000Z'),
        windowStart: new Date('2026-07-20'),
        eventId: 'evt-fail',
      },
    ]);

    scopedClient.analyticsDataset.upsert
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('DB error'));

    const result = await controller.replay(
      'workflows',
      '2026-07-20T00:00:00.000Z',
      '2026-07-20T23:59:59.000Z',
      'tenant-1',
    );

    expect(result).toEqual({ replayed: 1, failed: 1 });
  });

  it('validates required tenantId', async () => {
    await expect(
      controller.replay('workflows', '2026-07-20T00:00:00.000Z', '2026-07-21T00:00:00.000Z', ''),
    ).rejects.toThrow('tenantId is required in body');
  });
});
