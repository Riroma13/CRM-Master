import { SnapshotService } from '../snapshot/snapshot.service';

describe('SnapshotService', () => {
  let service: SnapshotService;
  let mockPrisma: any;
  let scopedClient: any;

  beforeEach(() => {
    scopedClient = {
      analyticsDataset: {
        findMany: jest.fn(),
      },
      analyticsSnapshot: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };
    service = new SnapshotService(mockPrisma);
  });

  it('generates a snapshot from AnalyticsDataset', async () => {
    const records = [
      { metricName: 'views', value: 100, windowStart: new Date('2026-07-20') },
      { metricName: 'clicks', value: 10, windowStart: new Date('2026-07-20') },
    ];

    scopedClient.analyticsDataset.findMany.mockResolvedValue(records);
    scopedClient.analyticsSnapshot.upsert.mockResolvedValue({
      id: 'snap-1',
      tenantId: 'tenant-1',
      name: 'daily-summary',
      datasetName: 'analytics',
      granularity: 'day',
      data: records,
      ttl: 300,
      expiresAt: new Date(Date.now() + 300000),
    });

    const result = await service.generateSnapshot(
      'tenant-1',
      'daily-summary',
      'analytics',
      'day',
      new Date('2026-07-20'),
      new Date('2026-07-20'),
      300,
    );

    expect(scopedClient.analyticsDataset.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        datasetName: 'analytics',
        granularity: 'day',
        windowStart: { gte: expect.any(Date), lte: expect.any(Date) },
      },
      orderBy: { windowStart: 'asc' },
    });

    expect(result.id).toBe('snap-1');
    expect(result.data).toEqual(records);
  });

  it('returns null for non-existent snapshot', async () => {
    scopedClient.analyticsSnapshot.findUnique.mockResolvedValue(null);

    const result = await service.getSnapshot('tenant-1', 'nonexistent');

    expect(result).toBeNull();
  });

  it('returns valid snapshot data when TTL is not expired', async () => {
    const futureExpires = new Date(Date.now() + 300000);

    scopedClient.analyticsSnapshot.findUnique.mockResolvedValue({
      id: 'snap-1',
      tenantId: 'tenant-1',
      name: 'valid',
      data: { value: 42 },
      expiresAt: futureExpires,
      ttl: 300,
    });

    const result = await service.getSnapshot('tenant-1', 'valid');

    expect(result).not.toBeNull();
    expect(result!.stale).toBe(false);
    expect(result!.data).toEqual({ value: 42 });
  });

  it('returns stale data with stale=true when TTL expired (stale-while-revalidate)', async () => {
    const pastExpires = new Date(Date.now() - 1000);

    scopedClient.analyticsSnapshot.findUnique.mockResolvedValue({
      id: 'snap-1',
      tenantId: 'tenant-1',
      name: 'stale-snap',
      datasetName: 'analytics',
      granularity: 'day',
      windowStart: new Date('2026-07-20'),
      windowEnd: new Date('2026-07-20'),
      data: { value: 42 },
      expiresAt: pastExpires,
      ttl: 300,
    });

    scopedClient.analyticsDataset.findMany.mockResolvedValue([]);
    scopedClient.analyticsSnapshot.update.mockResolvedValue({});

    const result = await service.getSnapshot('tenant-1', 'stale-snap');

    expect(result).not.toBeNull();
    expect(result!.stale).toBe(true);
    expect(result!.data).toEqual({ value: 42 });

    expect(scopedClient.analyticsDataset.findMany).toHaveBeenCalled();
  });

  it('does not trigger duplicate background refresh for same snapshot', async () => {
    const pastExpires = new Date(Date.now() - 1000);

    scopedClient.analyticsSnapshot.findUnique.mockResolvedValue({
      id: 'snap-1',
      tenantId: 'tenant-1',
      name: 'stale-snap',
      datasetName: 'analytics',
      granularity: 'day',
      windowStart: new Date('2026-07-20'),
      windowEnd: new Date('2026-07-20'),
      data: { value: 42 },
      expiresAt: pastExpires,
      ttl: 300,
    });

    scopedClient.analyticsDataset.findMany.mockResolvedValue([]);
    scopedClient.analyticsSnapshot.update.mockResolvedValue({});

    await service.getSnapshot('tenant-1', 'stale-snap');
    await service.getSnapshot('tenant-1', 'stale-snap');

    expect(scopedClient.analyticsDataset.findMany).toHaveBeenCalledTimes(1);
  });

  it('generates cache snapshot for a dataset', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([
      { metricName: 'views', value: 100, windowStart: new Date('2026-07-20'), granularity: 'day' },
    ]);
    scopedClient.analyticsSnapshot.upsert.mockResolvedValue({
      id: 'cache-snap',
      name: 'cache:analytics',
      data: [{ metricName: 'views', value: 100 }],
    });

    const result = await service.generateCache('tenant-1', 'analytics');

    expect(result).not.toBeNull();
    expect(scopedClient.analyticsSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_name: { tenantId: 'tenant-1', name: 'cache:analytics' } },
      }),
    );
  });

  it('returns null for generateCache on empty dataset', async () => {
    scopedClient.analyticsDataset.findMany.mockResolvedValue([]);

    const result = await service.generateCache('tenant-1', 'empty');

    expect(result).toBeNull();
  });
});
