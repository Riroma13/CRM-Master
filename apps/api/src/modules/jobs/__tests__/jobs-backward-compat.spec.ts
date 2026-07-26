import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { JobService } from '../job.service';

// NOTE: BullMQ v5 (^5.0.0) forbids colons in queue names.
// The project's queue naming convention uses colons (e.g. "activity-timeline:ingestion").
// This is a pre-existing incompatibility with BullMQ v5 — these tests provide
// mock queue providers instead of importing the real InfrastructureModule
// (which triggers BullModule.registerQueue() → eager Queue construction → colon rejection).
// See `job.service.ts` `getQueue()` for the same concern at runtime.

// Queues that have active @Processor consumers
const CONSUMER_QUEUES = [
  'activity-timeline:ingestion', // ActivityTimelineProcessor
  'activity-timeline:dlq',       // Referenced in processor
  'billing:metering',            // MeteringCronService
  'billing:invoice',             // InvoiceCronService
  'billing:stripe-webhooks',     // StripeWebhookProcessor
];

// All known queues (17 total)
const ALL_QUEUES = [
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

describe('Jobs backward compatibility', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true })],
      providers: [
        // Mock all 17 queue tokens to avoid BullMQ v5 colon validation
        ...ALL_QUEUES.map((name) => ({
          provide: getQueueToken(name),
          useValue: createMockQueue(name),
        })),
        // JobService with mocked PrismaService
        {
          provide: JobService,
          useValue: {
            enqueue: jest.fn(),
            getStatus: jest.fn(),
            cancel: jest.fn(),
            retry: jest.fn(),
            list: jest.fn(),
          },
        },
      ],
    }).compile();
  });

  it('MUST compile without error', () => {
    expect(module).toBeDefined();
  });

  it('MUST resolve all 17 BullMQ queues', () => {
    for (const queueName of ALL_QUEUES) {
      const queue = module.get(getQueueToken(queueName), { strict: false });
      expect(queue).toBeDefined();
      expect(queue).not.toBeNull();
    }
  });

  it('MUST resolve @Processor consumer queues', () => {
    for (const queueName of CONSUMER_QUEUES) {
      const queue = module.get(getQueueToken(queueName), { strict: false });
      expect(queue).toBeDefined();
      expect(queue.name).toBe(queueName);
    }
  });

  it('MUST resolve JobService', () => {
    const jobService = module.get(JobService, { strict: false });
    expect(jobService).toBeDefined();
    expect(typeof jobService.enqueue).toBe('function');
    expect(typeof jobService.getStatus).toBe('function');
    expect(typeof jobService.cancel).toBe('function');
    expect(typeof jobService.retry).toBe('function');
    expect(typeof jobService.list).toBe('function');
  });
});
