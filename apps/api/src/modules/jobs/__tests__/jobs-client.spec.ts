import { ModuleRef } from '@nestjs/core';
import { z } from 'zod';
import { JobDefinition, TrustedJobContext } from '../jobs.contracts';
import { JobsClientService } from '../jobs-client.service';

describe('JobsClientService', () => {
  const context: TrustedJobContext = {
    tenantId: 'tenant-a',
    correlationId: 'correlation-a',
    idempotencyKey: 'request-a',
  };
  const definition: JobDefinition<{ value: string; tenantId?: string }> = {
    key: 'example-job',
    queueName: 'example-queue',
    schema: z.object({ value: z.string(), tenantId: z.string().optional() }),
    attempts: 4,
    backoff: { type: 'exponential', delay: 250 },
    concurrency: 3,
    handle: jest.fn(),
  };
  const queue = {
    add: jest.fn(),
    upsertJobScheduler: jest.fn(),
    getJob: jest.fn(),
  };
  const moduleRef = { get: jest.fn().mockReturnValue(queue) } as unknown as ModuleRef;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects schema-invalid data before touching Redis', async () => {
    const client = new JobsClientService(moduleRef);

    await expect(client.enqueue(definition, context, { value: 42 })).rejects.toThrow('Invalid job data');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('uses trusted context and definition policy instead of forged payload fields', async () => {
    queue.add.mockResolvedValue({ id: 'example-job:request-a' });
    const client = new JobsClientService(moduleRef);

    await expect(
      client.enqueue(definition, context, { value: 'safe', tenantId: 'tenant-forged' }, { delay: 500 }),
    ).resolves.toEqual({ id: 'example-job:request-a' });

    expect(moduleRef.get).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      'example-job',
      {
        context,
        data: { value: 'safe', tenantId: 'tenant-forged' },
      },
      {
        jobId: 'example-job:request-a',
        attempts: 4,
        backoff: { type: 'exponential', delay: 250 },
        delay: 500,
      },
    );
  });

  it('uses a deterministic job id and supports scheduler creation', async () => {
    queue.add.mockResolvedValue({ id: 'example-job:request-a' });
    queue.upsertJobScheduler.mockResolvedValue(undefined);
    const client = new JobsClientService(moduleRef);

    await client.enqueue(definition, context, { value: 'same' });
    await client.enqueue(definition, context, { value: 'same' });
    await client.schedule(definition, 'scheduler-a', '*/5 * * * *', context, { value: 'scheduled' });

    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      'example-job',
      expect.any(Object),
      expect.objectContaining({ jobId: 'example-job:request-a' }),
    );
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduler-a',
      { pattern: '*/5 * * * *' },
      expect.objectContaining({
        name: 'example-job',
        data: { context, data: { value: 'scheduled' } },
        opts: expect.objectContaining({ attempts: 4, backoff: { type: 'exponential', delay: 250 } }),
      }),
    );
  });

  it('maps pending, active, and missing jobs to exact cancellation statuses', async () => {
    const client = new JobsClientService(moduleRef);
    const pending = { isActive: jest.fn().mockResolvedValue(false), remove: jest.fn().mockResolvedValue(undefined) };
    queue.getJob.mockResolvedValueOnce(pending).mockResolvedValueOnce({ isActive: jest.fn().mockResolvedValue(true) }).mockResolvedValueOnce(null);

    await expect(client.cancel('example-queue', 'pending-id')).resolves.toBe('cancelled');
    await expect(client.cancel('example-queue', 'active-id')).resolves.toBe('active');
    await expect(client.cancel('example-queue', 'missing-id')).resolves.toBe('missing');
    expect(pending.remove).toHaveBeenCalledTimes(1);
  });

  it('surfaces Redis outages without exposing the original error', async () => {
    queue.add.mockRejectedValue(new Error('redis://secret.internal:6379 password=hidden'));
    const client = new JobsClientService(moduleRef);

    await expect(client.enqueue(definition, context, { value: 'safe' })).rejects.toThrow('Jobs enqueue failed');
    await expect(client.enqueue(definition, context, { value: 'safe' })).rejects.not.toThrow('secret.internal');
  });
});
