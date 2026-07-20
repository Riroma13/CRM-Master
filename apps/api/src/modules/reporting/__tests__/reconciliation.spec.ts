import { ReconciliationService } from '../ingestion/reconciliation.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let mockPrisma: any;
  let scopedClient: any;

  beforeEach(() => {
    scopedClient = {
      analyticsDataset: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      datasetIngestionLog: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };

    mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };
    service = new ReconciliationService(mockPrisma);
  });

  describe('checkDatasetHealth', () => {
    it('returns healthy when counts match', async () => {
      scopedClient.datasetIngestionLog.count.mockResolvedValue(42);
      scopedClient.analyticsDataset.count.mockResolvedValue(42);
      scopedClient.datasetIngestionLog.findFirst.mockResolvedValue({
        timestamp: new Date('2026-07-20T10:00:00.000Z'),
      });

      const result = await service.checkDatasetHealth('tenant-1', 'workflows');

      expect(result.healthy).toBe(true);
      expect(result.expectedCount).toBe(42);
      expect(result.actualCount).toBe(42);
      expect(result.lastEvent).toBe('2026-07-20T10:00:00.000Z');
    });

    it('returns unhealthy when counts differ', async () => {
      scopedClient.datasetIngestionLog.count.mockResolvedValue(50);
      scopedClient.analyticsDataset.count.mockResolvedValue(42);
      scopedClient.datasetIngestionLog.findFirst.mockResolvedValue(null);

      const result = await service.checkDatasetHealth('tenant-1', 'workflows');

      expect(result.healthy).toBe(false);
      expect(result.expectedCount).toBe(50);
      expect(result.actualCount).toBe(42);
      expect(result.lastEvent).toBeNull();
    });
  });

  describe('findGaps', () => {
    it('detects missing windows between from and to', async () => {
      scopedClient.analyticsDataset.findMany.mockResolvedValue([
        { windowStart: new Date('2026-07-20') },
        { windowStart: new Date('2026-07-22') },
      ]);

      const result = await service.findGaps(
        'tenant-1',
        'workflows',
        new Date('2026-07-20'),
        new Date('2026-07-22'),
      );

      expect(result.gaps).toEqual(['2026-07-21']);
      expect(result.totalWindows).toBe(3);
      expect(result.populatedWindows).toBe(2);
    });

    it('returns no gaps when all windows are present', async () => {
      scopedClient.analyticsDataset.findMany.mockResolvedValue([
        { windowStart: new Date('2026-07-20') },
        { windowStart: new Date('2026-07-21') },
        { windowStart: new Date('2026-07-22') },
      ]);

      const result = await service.findGaps(
        'tenant-1',
        'workflows',
        new Date('2026-07-20'),
        new Date('2026-07-22'),
      );

      expect(result.gaps).toEqual([]);
      expect(result.totalWindows).toBe(3);
      expect(result.populatedWindows).toBe(3);
    });

    it('handles empty range', async () => {
      scopedClient.analyticsDataset.findMany.mockResolvedValue([]);

      const result = await service.findGaps(
        'tenant-1',
        'workflows',
        new Date('2026-07-20'),
        new Date('2026-07-22'),
      );

      expect(result.gaps).toEqual(['2026-07-20', '2026-07-21', '2026-07-22']);
      expect(result.populatedWindows).toBe(0);
    });
  });
});
