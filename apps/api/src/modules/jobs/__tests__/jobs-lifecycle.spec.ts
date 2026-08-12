import { z } from 'zod';
import { JobDefinition, JobsWorkerLifecycle, TrustedJobContext } from '../jobs.contracts';
import {
  getJobWorkerOptions,
  JobsLifecycleService,
  JobsTerminalError,
} from '../jobs-lifecycle.service';
import { JobsTenantAuthorityService } from '../jobs-tenant-authority.service';

describe('JobsLifecycleService', () => {
  const context: TrustedJobContext = { tenantId: 'tenant-a', idempotencyKey: 'request-a' };
  const definition: JobDefinition<{ value: string }> = {
    key: 'lifecycle-job',
    queueName: 'lifecycle-queue',
    schema: z.object({ value: z.string() }),
    attempts: 2,
    backoff: { type: 'exponential', delay: 100 },
    concurrency: 2,
    handle: jest.fn(),
  };
  const authority = {
    assertActiveTenant: jest.fn().mockResolvedValue(undefined),
    forTenant: jest.fn().mockReturnValue({}),
  } as unknown as JobsTenantAuthorityService;

  beforeEach(() => jest.clearAllMocks());

  it('revalidates the tenant before invoking a handler and rejects forged execution data', async () => {
    const lifecycle = new JobsLifecycleService(authority);

    await expect(
      lifecycle.execute(definition, { context, data: { value: 'valid', tenantId: 'tenant-b' } }),
    ).rejects.toThrow('Invalid job envelope');
    expect(authority.assertActiveTenant).not.toHaveBeenCalled();
    expect(definition.handle).not.toHaveBeenCalled();
  });

  it('allows a validated envelope and preserves transient errors for BullMQ retry', async () => {
    const transientError = new Error('temporary dependency failure');
    definition.handle = jest.fn().mockRejectedValue(transientError);
    const lifecycle = new JobsLifecycleService(authority);

    await expect(lifecycle.execute(definition, { context, data: { value: 'valid' } })).rejects.toBe(transientError);
    expect(authority.assertActiveTenant).toHaveBeenCalledWith('tenant-a');
    expect(definition.handle).toHaveBeenCalledWith(context, { value: 'valid' });
  });

  it('marks terminal failures so they are not retried', async () => {
    definition.handle = jest.fn().mockRejectedValue(new JobsTerminalError('invalid authority'));
    const lifecycle = new JobsLifecycleService(authority);

    await expect(lifecycle.execute(definition, { context, data: { value: 'valid' } })).rejects.toMatchObject({
      name: 'UnrecoverableError',
    });
  });

  it('pauses all workers before closing them and exposes bounded worker options', async () => {
    const calls: string[] = [];
    const worker = {
      pause: jest.fn(async () => { calls.push('pause'); }),
      close: jest.fn(async () => { calls.push('close'); }),
    } satisfies JobsWorkerLifecycle;
    const lifecycle = new JobsLifecycleService(authority);
    lifecycle.register(worker);

    await lifecycle.onApplicationShutdown();

    expect(calls).toEqual(['pause', 'close']);
    expect(getJobWorkerOptions(definition)).toEqual({ concurrency: 2 });
    expect(lifecycle.getMetrics()).toEqual({ registeredWorkers: 1, shuttingDown: true });
  });

  it('does not retain workers after unregistering them', async () => {
    const worker = { pause: jest.fn(), close: jest.fn() } satisfies JobsWorkerLifecycle;
    const lifecycle = new JobsLifecycleService(authority);
    const unregister = lifecycle.register(worker);

    unregister();
    await lifecycle.onApplicationShutdown();

    expect(worker.pause).not.toHaveBeenCalled();
    expect(worker.close).not.toHaveBeenCalled();
  });
});
