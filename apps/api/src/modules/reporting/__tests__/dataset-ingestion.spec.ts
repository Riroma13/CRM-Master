import { DatasetIngestionService } from '../ingestion/dataset-ingestion.service';
import { Job } from 'bullmq';

function mockJob(data: any, overrides: Partial<Job> = {}): Job {
  return { id: 'test-job-1', data, ...overrides } as unknown as Job;
}

describe('DatasetIngestionService', () => {
  let service: DatasetIngestionService;
  let mockPrisma: any;
  let mockDlqQueue: any;
  let scopedClient: any;

  beforeEach(() => {
    scopedClient = {
      analyticsDataset: {
        upsert: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      datasetIngestionLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };
    mockDlqQueue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new DatasetIngestionService(mockPrisma, mockDlqQueue);
  });

  describe('valid event', () => {
    it('upserts dataset and creates log entry', async () => {
      const result = await service.process(mockJob({
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 1,
        timestamp: '2026-07-20T10:00:00.000Z',
      }));

      expect(scopedClient.analyticsDataset.upsert).toHaveBeenCalled();
      expect(scopedClient.datasetIngestionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          datasetName: 'workflows',
          metricName: 'workflows_created',
          status: 'processed',
        }),
      });
      expect(result).toEqual({ processed: true, windowStart: expect.any(String) });
    });
  });

  describe('duplicate eventId', () => {
    it('skips processing when eventId already exists', async () => {
      scopedClient.datasetIngestionLog.findFirst = jest.fn().mockResolvedValue({
        id: 'existing-log',
        tenantId: 'tenant-1',
        windowStart: new Date('2026-07-20'),
      });

      const result = await service.process(mockJob({
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 1,
        timestamp: '2026-07-20T10:00:00.000Z',
        eventId: 'dup-event-1',
      }));

      expect(scopedClient.analyticsDataset.upsert).not.toHaveBeenCalled();
      expect(result.processed).toBe(true);
    });
  });

  describe('invalid event', () => {
    it('sends to DLQ when validation fails', async () => {
      const result = await service.process(mockJob({
        tenantId: '',
        datasetName: '',
        metricName: '',
        value: 'not-a-number',
        timestamp: 'invalid-date',
      }));

      expect(mockDlqQueue.add).toHaveBeenCalledWith(
        'invalid-event',
        expect.objectContaining({ jobId: 'test-job-1' }),
      );
      expect(result).toEqual({ processed: false, windowStart: '' });
    });
  });

  describe('count metric', () => {
    it('increments by 1', async () => {
      await service.process(mockJob({
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflow_runs',
        value: 1,
        timestamp: '2026-07-20T10:00:00.000Z',
        aggregation: 'count',
      }));

      expect(scopedClient.analyticsDataset.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { value: { increment: 1 } },
        }),
      );
    });
  });

  describe('sum metric', () => {
    it('adds the event value', async () => {
      await service.process(mockJob({
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'total_duration',
        value: 3600,
        timestamp: '2026-07-20T10:00:00.000Z',
        aggregation: 'sum',
      }));

      expect(scopedClient.analyticsDataset.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { value: { increment: 3600 } },
        }),
      );
    });
  });

  describe('window computation', () => {
    it('computes daily window by default', async () => {
      await service.process(mockJob({
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 1,
        timestamp: '2026-07-20T14:30:00.000Z',
      }));

      const call = scopedClient.analyticsDataset.upsert.mock.calls[0][0];
      const windowStart = call.create?.windowStart ?? call.where?.tenantId_datasetName_metricName_granularity_windowStart?.windowStart;
      expect(windowStart.toISOString()).toBe('2026-07-20T00:00:00.000Z');
    });

    it('computes hourly window when specified', async () => {
      await service.process(mockJob({
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 1,
        timestamp: '2026-07-20T14:30:00.000Z',
        granularity: 'hour',
      }));

      const call = scopedClient.analyticsDataset.upsert.mock.calls[0][0];
      const windowStart = call.create?.windowStart ?? call.where?.tenantId_datasetName_metricName_granularity_windowStart?.windowStart;
      expect(windowStart.toISOString()).toBe('2026-07-20T14:00:00.000Z');
    });
  });

  describe('failure handling', () => {
    it('logs failure and sends to DLQ on error', async () => {
      scopedClient.analyticsDataset.upsert = jest.fn().mockRejectedValue(new Error('DB error'));

      await expect(service.process(mockJob({
        tenantId: 'tenant-1',
        datasetName: 'workflows',
        metricName: 'workflows_created',
        value: 1,
        timestamp: '2026-07-20T10:00:00.000Z',
      }))).rejects.toThrow('DB error');

      expect(scopedClient.datasetIngestionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'failed', error: 'DB error' }),
      });
      expect(mockDlqQueue.add).toHaveBeenCalledWith(
        'failed-event',
        expect.objectContaining({ error: 'DB error' }),
      );
    });
  });
});
