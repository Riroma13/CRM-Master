export const ACTIVITY_TIMELINE_INGESTION_QUEUE = 'activity-timeline-ingestion';
export const ACTIVITY_TIMELINE_DLQ_QUEUE = 'activity-timeline-dlq';

export function getActivityTimelineRedisConnectionOptions(): { url: string } {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is required for Activity Timeline BullMQ');
  }

  return { url: redisUrl };
}
