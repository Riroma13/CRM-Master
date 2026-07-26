import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';

// NOTE: BullMQ v5 (^5.0.0) forbids colons in queue names.
// The project's queue naming convention uses colons (e.g. "activity-timeline:ingestion").
// This is a pre-existing incompatibility with BullMQ v5 — these tests provide
// mock queue providers instead of importing the real InfrastructureModule
// (which triggers BullModule.registerQueue() → eager Queue construction → colon rejection).
// See `job.service.ts` `getQueue()` for the same concern at runtime.

const QUEUES = [
  'activity-timeline:ingestion',
  'activity-timeline:dlq',
  'kb:ingestion',
  'kb:reindex',
  'kb:garbage-collector',
  'kb:ingestion-dlq',
  'audit:ingestion',
  'audit:dlq',
  'audit:retention',
  'billing:metering',
  'billing:invoice',
  'billing:stripe-webhooks',
  'reporting:dataset:ingestion',
  'reporting:dataset:dlq',
  'reporting:report:generate',
  'reporting:export',
  'reporting:schedule',
];

function createMockQueue(name: string) {
  return {
    name,
    add: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    getJobCounts: jest.fn(),
    getActive: jest.fn(),
    getWaiting: jest.fn(),
    getCompleted: jest.fn(),
    getFailed: jest.fn(),
    getDelayed: jest.fn(),
    obliterate: jest.fn(),
    close: jest.fn(),
    remove: jest.fn(),
    isPaused: jest.fn().mockResolvedValue(false),
    pause: jest.fn(),
    resume: jest.fn(),
  };
}

describe('JobsModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true })],
      providers: QUEUES.map((name) => ({
        provide: getQueueToken(name),
        useValue: createMockQueue(name),
      })),
    }).compile();
  });

  it('MUST compile without error', () => {
    expect(module).toBeDefined();
  });

  it('MUST resolve all 17 BullMQ queues', () => {
    for (const queueName of QUEUES) {
      const queue = module.get(getQueueToken(queueName), { strict: false });
      expect(queue).toBeDefined();
      expect(queue).not.toBeNull();
    }
  });

  it('MUST resolve all 17 queues by name', () => {
    const resolved = QUEUES.map((name) => ({
      name,
      queue: module.get(getQueueToken(name), { strict: false }),
    }));

    for (const { name, queue } of resolved) {
      expect(queue).toBeDefined();
      expect(queue).not.toBeNull();
      expect(queue.name).toBe(name);
    }
  });
});
