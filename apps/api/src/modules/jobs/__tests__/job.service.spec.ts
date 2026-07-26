import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { JobService } from '../job.service';
import { PrismaService } from '../../../common/prisma.service';
import type { JobRunDto, JobStatus } from '@shared/jobs';

// ─── Mocks ────────────────────────────────────────────────────────────

const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
  close: jest.fn(),
};

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
}));

const createMockScopedClient = () => ({
  jobRun: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  jobDefinition: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
});

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: undefined,
    };
    return config[key] ?? defaultValue;
  }),
};

// ─── Test data ─────────────────────────────────────────────────────────

const TENANT_A = 'tenant-a-uuid';
const TENANT_B = 'tenant-b-uuid';
const RUN_ID = 'run-0000-0000-0000-000000000001';
const DEF_ID = 'def-0000-0000-0000-000000000001';

const mockJobRun = {
  id: RUN_ID,
  tenantId: TENANT_A,
  jobDefinitionId: DEF_ID,
  status: 'queued',
  payload: { test: true },
  result: null,
  error: null,
  attempts: 0,
  maxRetries: 3,
  idempotencyKey: null,
  scheduledAt: new Date('2026-07-21T00:00:00Z'),
  startedAt: null,
  completedAt: null,
  queueName: 'test:queue',
  createdAt: new Date('2026-07-21T00:00:00Z'),
};

const mockJobDef = {
  id: DEF_ID,
  tenantId: TENANT_A,
  key: 'test:queue',
  name: 'Test Queue',
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 30000,
  concurrency: 1,
  active: true,
  createdAt: new Date('2026-07-21T00:00:00Z'),
  updatedAt: new Date('2026-07-21T00:00:00Z'),
};

describe('JobService', () => {
  let service: JobService;
  let scopedClient: ReturnType<typeof createMockScopedClient>;

  beforeEach(async () => {
    scopedClient = createMockScopedClient();
    jest.clearAllMocks();

    const mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  // ─── enqueue ──────────────────────────────────────────────────────

  describe('enqueue', () => {
    it('MUST create a JobRun and add to BullMQ', async () => {
      scopedClient.jobDefinition.findUnique.mockResolvedValue(mockJobDef);
      scopedClient.jobRun.create.mockResolvedValue(mockJobRun);
      mockQueue.add.mockResolvedValue({ id: RUN_ID });

      const result = await service.enqueue(TENANT_A, 'test:queue', {
        test: true,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(RUN_ID);
      expect(result.status).toBe('queued');
      expect(scopedClient.jobRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A,
            status: 'queued',
            queueName: 'test:queue',
          }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'test:queue',
        expect.objectContaining({ tenantId: TENANT_A, runId: RUN_ID }),
        expect.objectContaining({ jobId: RUN_ID }),
      );
    });

    it('MUST auto-create JobDefinition when it does not exist', async () => {
      scopedClient.jobDefinition.findUnique.mockResolvedValue(null);
      scopedClient.jobDefinition.create.mockResolvedValue(mockJobDef);
      scopedClient.jobRun.create.mockResolvedValue(mockJobRun);
      mockQueue.add.mockResolvedValue({ id: RUN_ID });

      await service.enqueue(TENANT_A, 'test:queue', { test: true });

      expect(scopedClient.jobDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A,
            key: 'test:queue',
          }),
        }),
      );
    });

    it('MUST return existing JobRun on idempotencyKey collision', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue(mockJobRun);

      const result = await service.enqueue(TENANT_A, 'test:queue', { test: true }, {
        idempotencyKey: 'idem-001',
      });

      expect(result.id).toBe(RUN_ID);
      // Should NOT create a new JobRun or add to queue
      expect(scopedClient.jobRun.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  // ─── getStatus ────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('MUST return status, attempts and timestamps for a queued job', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue(mockJobRun);

      const result = await service.getStatus(TENANT_A, RUN_ID);

      expect(result.status).toBe('queued');
      expect(result.attempts).toBe(0);
      expect(result.createdAt).toBeDefined();
    });

    it('MUST return correct status for each JobState', async () => {
      const statuses: JobStatus[] = [
        'queued',
        'active',
        'completed',
        'failed',
        'cancelled',
        'dead_lettered',
      ];
      for (const status of statuses) {
        scopedClient.jobRun.findFirst.mockResolvedValue({
          ...mockJobRun,
          status,
        });

        const result = await service.getStatus(TENANT_A, RUN_ID);
        expect(result.status).toBe(status);
      }
    });

    it('MUST throw NotFoundException for unknown runId', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue(null);

      await expect(
        service.getStatus(TENANT_A, 'unknown-run-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── cancel ───────────────────────────────────────────────────────

  describe('cancel', () => {
    it('MUST set status to cancelled', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue({
        ...mockJobRun,
        status: 'queued',
      });
      mockQueue.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue('waiting'),
        remove: jest.fn().mockResolvedValue(undefined),
      });
      scopedClient.jobRun.update.mockResolvedValue({
        ...mockJobRun,
        status: 'cancelled',
      });

      await service.cancel(TENANT_A, RUN_ID);

      expect(scopedClient.jobRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: RUN_ID },
          data: { status: 'cancelled' },
        }),
      );
    });

    it('MUST remove BullMQ job when pending', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue({
        ...mockJobRun,
        status: 'queued',
      });
      const mockRemove = jest.fn().mockResolvedValue(undefined);
      mockQueue.getJob.mockResolvedValue({
        getState: jest.fn().mockResolvedValue('waiting'),
        remove: mockRemove,
      });

      await service.cancel(TENANT_A, RUN_ID);

      expect(mockRemove).toHaveBeenCalled();
    });

    it('MUST throw ConflictException for completed job', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue({
        ...mockJobRun,
        status: 'completed',
      });

      await expect(
        service.cancel(TENANT_A, RUN_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('MUST throw ConflictException for dead_lettered job', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue({
        ...mockJobRun,
        status: 'dead_lettered',
      });

      await expect(
        service.cancel(TENANT_A, RUN_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('MUST throw NotFoundException for missing run', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue(null);

      await expect(
        service.cancel(TENANT_A, 'unknown-run'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── retry ─────────────────────────────────────────────────────────

  describe('retry', () => {
    const failedRun = {
      ...mockJobRun,
      id: 'failed-run-id',
      status: 'failed',
      attempts: 2,
    };
    const newRun = {
      ...mockJobRun,
      id: 'new-run-id',
      status: 'queued',
      attempts: 0,
    };

    it('MUST create new JobRun and re-enqueue for failed job', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue(failedRun);
      scopedClient.jobRun.create.mockResolvedValue(newRun);
      mockQueue.add.mockResolvedValue({ id: 'new-run-id' });

      const result = await service.retry(TENANT_A, 'failed-run-id');

      expect(result.id).toBe('new-run-id');
      expect(result.status).toBe('queued');
      expect(scopedClient.jobRun.create).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('MUST re-enqueue for dead_lettered job', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue({
        ...failedRun,
        status: 'dead_lettered',
      });
      scopedClient.jobRun.create.mockResolvedValue(newRun);
      mockQueue.add.mockResolvedValue({ id: 'new-run-id' });

      const result = await service.retry(TENANT_A, 'failed-run-id');

      expect(result.status).toBe('queued');
    });

    it('MUST throw ConflictException for non-failed job', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue({
        ...mockJobRun,
        status: 'queued',
      });

      await expect(
        service.retry(TENANT_A, RUN_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('MUST throw ConflictException for completed job', async () => {
      scopedClient.jobRun.findFirst.mockResolvedValue({
        ...mockJobRun,
        status: 'completed',
      });

      await expect(
        service.retry(TENANT_A, RUN_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── list ─────────────────────────────────────────────────────────

  describe('list', () => {
    const runs = [
      { ...mockJobRun, id: 'run-1', status: 'queued' },
      { ...mockJobRun, id: 'run-2', status: 'completed' },
      { ...mockJobRun, id: 'run-3', status: 'failed' },
    ];

    it('MUST paginate results correctly', async () => {
      scopedClient.jobRun.findMany.mockResolvedValue(runs);
      scopedClient.jobRun.count.mockResolvedValue(3);

      const result = await service.list(TENANT_A, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(scopedClient.jobRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('MUST filter by status', async () => {
      scopedClient.jobRun.findMany.mockResolvedValue([runs[0]]);
      scopedClient.jobRun.count.mockResolvedValue(1);

      const result = await service.list(TENANT_A, { status: 'queued' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('queued');
      expect(scopedClient.jobRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'queued' }),
        }),
      );
    });

    it('MUST filter by date range', async () => {
      const since = new Date('2026-07-20');
      const until = new Date('2026-07-22');
      scopedClient.jobRun.findMany.mockResolvedValue(runs);
      scopedClient.jobRun.count.mockResolvedValue(3);

      const result = await service.list(TENANT_A, { since, until });

      expect(result.data).toHaveLength(3);
      expect(scopedClient.jobRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: since, lte: until },
          }),
        }),
      );
    });
  });
});
