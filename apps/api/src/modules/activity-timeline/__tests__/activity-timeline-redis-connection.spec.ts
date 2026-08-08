import { getQueueToken } from '@nestjs/bullmq';
import {
  ACTIVITY_TIMELINE_DLQ_QUEUE,
  ACTIVITY_TIMELINE_INGESTION_QUEUE,
  getActivityTimelineRedisConnectionOptions,
} from '../activity-timeline-queue.constants';

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

    expect(getActivityTimelineRedisConnectionOptions()).toEqual({
      url: 'redis://redis.internal:6380',
    });
  });

  it('fails closed when REDIS_URL is absent', () => {
    delete process.env.REDIS_URL;
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    expect(() => getActivityTimelineRedisConnectionOptions()).toThrow('REDIS_URL is required');
  });

  it('defines colon-free ingestion and DLQ queue identities consistently', () => {
    expect(ACTIVITY_TIMELINE_INGESTION_QUEUE).toBe('activity-timeline-ingestion');
    expect(ACTIVITY_TIMELINE_DLQ_QUEUE).toBe('activity-timeline-dlq');
    expect(getQueueToken(ACTIVITY_TIMELINE_INGESTION_QUEUE)).toContain(ACTIVITY_TIMELINE_INGESTION_QUEUE);
    expect(getQueueToken(ACTIVITY_TIMELINE_DLQ_QUEUE)).toContain(ACTIVITY_TIMELINE_DLQ_QUEUE);
  });
});
