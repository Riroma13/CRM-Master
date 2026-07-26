import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { JobService } from '../job.service';
import { PrismaService } from '../../../common/prisma.service';

// ─── Mocks ────────────────────────────────────────────────────────────

const mockQueue = {
  add: jest.fn(),
  getJob: jest.fn(),
  close: jest.fn(),
};

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
}));

const createScopedClient = () => ({
  jobRun: {
    findFirst: jest.fn(),
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

const createMockRun = (id: string, tenantId: string, status = 'queued') => ({
  id,
  tenantId,
  jobDefinitionId: 'def-1',
  status,
  payload: {},
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
});

describe('Jobs isolation (doorbell)', () => {
  let service: JobService;
  let scopedClientA: ReturnType<typeof createScopedClient>;
  let scopedClientB: ReturnType<typeof createScopedClient>;
  let mockPrisma: any;

  beforeEach(async () => {
    scopedClientA = createScopedClient();
    scopedClientB = createScopedClient();
    jest.clearAllMocks();

    mockPrisma = {
      forTenant: jest.fn((tenantId: string) => {
        if (tenantId === TENANT_A) return scopedClientA;
        if (tenantId === TENANT_B) return scopedClientB;
        return createScopedClient();
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  it('MUST scope getStatus by tenant — Tenant B cannot see Tenant A runs', async () => {
    // Tenant A has a run
    const runA = createMockRun('run-a', TENANT_A);
    scopedClientA.jobRun.findFirst.mockResolvedValue(runA);
    // Tenant B sees nothing
    scopedClientB.jobRun.findFirst.mockResolvedValue(null);

    // Tenant A can see it
    const statusA = await service.getStatus(TENANT_A, 'run-a');
    expect(statusA.status).toBe('queued');

    // Tenant B cannot see it
    await expect(
      service.getStatus(TENANT_B, 'run-a'),
    ).rejects.toThrow(NotFoundException);
  });

  it('MUST scope enqueue by tenant — Tenant A enqueue does not affect Tenant B', async () => {
    // Tenant A has a JobDefinition
    scopedClientA.jobDefinition.findUnique.mockResolvedValue({
      id: 'def-1',
      tenantId: TENANT_A,
      key: 'test:queue',
      name: 'Test',
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 30000,
      concurrency: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    scopedClientA.jobRun.create.mockResolvedValue(
      createMockRun('run-a', TENANT_A),
    );
    mockQueue.add.mockResolvedValue({ id: 'bull-job-1' });

    // Tenant A enqueues
    await service.enqueue(TENANT_A, 'test:queue', { data: 'a' });

    // Only Tenant A's scoped client was called for jobRun
    expect(scopedClientA.jobRun.create).toHaveBeenCalled();
    // Tenant B's client should NOT have been called
    expect(scopedClientB.jobRun.create).not.toHaveBeenCalled();
  });

  it('MUST allow same idempotencyKey across tenants to create separate runs', async () => {
    // Both tenants have no existing run with that idempotency key
    scopedClientA.jobRun.findFirst.mockResolvedValue(null);
    scopedClientB.jobRun.findFirst.mockResolvedValue(null);

    // Both tenants have a JobDefinition
    scopedClientA.jobDefinition.findUnique.mockResolvedValue({
      id: 'def-a',
      tenantId: TENANT_A,
      key: 'test:queue',
      name: 'Test',
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 30000,
      concurrency: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    scopedClientB.jobDefinition.findUnique.mockResolvedValue({
      id: 'def-b',
      tenantId: TENANT_B,
      key: 'test:queue',
      name: 'Test',
      maxRetries: 3,
      retryDelay: 5000,
      timeout: 30000,
      concurrency: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    scopedClientA.jobRun.create.mockResolvedValue(
      createMockRun('run-a', TENANT_A),
    );
    scopedClientB.jobRun.create.mockResolvedValue(
      createMockRun('run-b', TENANT_B),
    );

    mockQueue.add.mockResolvedValue({ id: 'bull-job' });

    // Both tenants enqueue with the same idempotencyKey
    const resultA = await service.enqueue(
      TENANT_A,
      'test:queue',
      { data: 'a' },
      { idempotencyKey: 'same-key' },
    );
    const resultB = await service.enqueue(
      TENANT_B,
      'test:queue',
      { data: 'b' },
      { idempotencyKey: 'same-key' },
    );

    // Each tenant got their own run
    expect(resultA.tenantId).toBe(TENANT_A);
    expect(resultB.tenantId).toBe(TENANT_B);

    // Two separate JobRuns were created (one per tenant)
    expect(scopedClientA.jobRun.create).toHaveBeenCalledTimes(1);
    expect(scopedClientB.jobRun.create).toHaveBeenCalledTimes(1);
  });
});
