import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getQueueToken } from '@nestjs/bullmq';
import {
  ACTIVITY_TIMELINE_DLQ_QUEUE,
  ACTIVITY_TIMELINE_INGESTION_QUEUE,
} from '../activity-timeline-queue.constants';
import { getJobsRedisConnectionOptions } from '../../jobs/jobs-redis.config';

describe('ActivityTimeline queue and Redis configuration', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  const originalRedisHost = process.env.REDIS_HOST;
  const originalRedisPort = process.env.REDIS_PORT;

  afterEach(() => {
    process.env.REDIS_URL = originalRedisUrl;
    process.env.REDIS_HOST = originalRedisHost;
    process.env.REDIS_PORT = originalRedisPort;
  });

  it('uses REDIS_URL as the single BullMQ connection source', () => {
    process.env.REDIS_URL = 'redis://redis.internal:6380';
    process.env.REDIS_HOST = 'wrong-host';
    process.env.REDIS_PORT = '6390';

    expect(getJobsRedisConnectionOptions()).toEqual({
      url: 'redis://redis.internal:6380',
    });
  });

  it('fails closed when REDIS_URL is absent', () => {
    delete process.env.REDIS_URL;
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    expect(() => getJobsRedisConnectionOptions()).toThrow('REDIS_URL is required');
  });

  it('defines colon-free ingestion and DLQ queue identities consistently', () => {
    expect(ACTIVITY_TIMELINE_INGESTION_QUEUE).toBe('activity-timeline-ingestion');
    expect(ACTIVITY_TIMELINE_DLQ_QUEUE).toBe('activity-timeline-dlq');
    expect(getQueueToken(ACTIVITY_TIMELINE_INGESTION_QUEUE)).toContain(ACTIVITY_TIMELINE_INGESTION_QUEUE);
    expect(getQueueToken(ACTIVITY_TIMELINE_DLQ_QUEUE)).toContain(ACTIVITY_TIMELINE_DLQ_QUEUE);
  });

  it('does not own the BullMQ root or Redis configuration', () => {
    const activityTimelineModule = readFileSync(join(__dirname, '../activity-timeline.module.ts'), 'utf8');
    const activityTimelineQueueConstants = readFileSync(
      join(__dirname, '../activity-timeline-queue.constants.ts'),
      'utf8',
    );

    expect(activityTimelineModule).not.toContain('BullModule.forRoot');
    expect(activityTimelineModule).not.toContain('REDIS_URL');
    expect(activityTimelineQueueConstants).not.toContain('REDIS_URL');
  });

  it('requires InfrastructureModule and HealthModule to expose Jobs readiness', () => {
    const infrastructureModule = readFileSync(
      join(__dirname, '../../infrastructure/infrastructure.module.ts'),
      'utf8',
    );
    const healthModule = readFileSync(join(__dirname, '../../health/health.module.ts'), 'utf8');
    const healthController = readFileSync(join(__dirname, '../../health/health.controller.ts'), 'utf8');

    expect(infrastructureModule).toContain("import { JobsModule } from '../jobs/jobs.module';");
    expect(infrastructureModule).toMatch(/imports:\s*\[[\s\S]*JobsModule/);
    expect(healthModule).toContain("import { JobsModule } from '../jobs/jobs.module';");
    expect(healthModule).toMatch(/imports:\s*\[[\s\S]*JobsModule/);
    expect(healthController).toContain('JobsLifecycleService');
    expect(healthController).toContain('getReadiness()');
  });

  it('preserves Activity Timeline queue registrations and default options during root extraction', () => {
    const activityTimelineModule = readFileSync(join(__dirname, '../activity-timeline.module.ts'), 'utf8');

    expect(activityTimelineModule).toContain('BullModule.registerQueue');
    expect(activityTimelineModule).toContain('attempts: 3');
    expect(activityTimelineModule).toContain("delay: 1000");
    expect(activityTimelineModule).toContain('removeOnComplete: true');
    expect(activityTimelineModule).toContain('removeOnFail: 100');
    expect(activityTimelineModule).toContain('attempts: 1');
    expect(activityTimelineModule).toContain('name: ACTIVITY_TIMELINE_INGESTION_QUEUE');
    expect(activityTimelineModule).toContain('name: ACTIVITY_TIMELINE_DLQ_QUEUE');
  });
});
