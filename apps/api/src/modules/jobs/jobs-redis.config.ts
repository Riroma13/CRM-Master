export interface JobsRedisConnectionOptions {
  url: string;
}

export function getJobsRedisConnectionOptions(): JobsRedisConnectionOptions {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is required for Jobs BullMQ');
  }

  return { url: redisUrl };
}
