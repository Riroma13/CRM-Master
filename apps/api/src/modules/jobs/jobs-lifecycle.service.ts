import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { ZodError } from 'zod';
import { JobDefinition, JobsTerminalError, JobsWorkerLifecycle, TrustedJobContext } from './jobs.contracts';
import { JobsTenantAuthorityService } from './jobs-tenant-authority.service';
import { getJobsRedisConnectionOptions } from './jobs-redis.config';

export { JobsTerminalError } from './jobs.contracts';

export function getJobWorkerOptions<T>(definition: JobDefinition<T>): { concurrency: number } {
  if (!Number.isInteger(definition.concurrency) || definition.concurrency < 1) {
    throw new Error('Job concurrency must be a positive integer');
  }
  return { concurrency: definition.concurrency };
}

interface JobEnvelope {
  context: TrustedJobContext;
  data: unknown;
}

@Injectable()
export class JobsLifecycleService implements OnApplicationShutdown {
  private readonly workers = new Set<JobsWorkerLifecycle>();
  private shuttingDown = false;

  constructor(private readonly tenantAuthority: JobsTenantAuthorityService) {}

  register(worker: JobsWorkerLifecycle): () => void {
    this.workers.add(worker);
    return () => this.workers.delete(worker);
  }

  async execute<T>(definition: JobDefinition<T>, envelope: JobEnvelope): Promise<void> {
    try {
      if (!this.isValidEnvelope(envelope) || this.hasConflictingTenant(envelope.data, envelope.context.tenantId)) {
        throw new JobsTerminalError('Invalid job envelope');
      }

      await this.tenantAuthority.assertActiveTenant(envelope.context.tenantId);
      this.tenantAuthority.forTenant(envelope.context.tenantId);
      const data = definition.schema.parse(envelope.data);
      await definition.handle(envelope.context, data);
    } catch (error) {
      if (error instanceof JobsTerminalError || error instanceof ZodError) {
        throw new UnrecoverableError(error.message);
      }
      throw error;
    }
  }

  getMetrics(): { registeredWorkers: number; shuttingDown: boolean } {
    return { registeredWorkers: this.workers.size, shuttingDown: this.shuttingDown };
  }

  async getReadiness(): Promise<{ redis: 'ok' | 'error'; jobs: 'ok' | 'degraded' }> {
    try {
      getJobsRedisConnectionOptions();
      return { redis: 'ok', jobs: this.shuttingDown ? 'degraded' : 'ok' };
    } catch {
      return { redis: 'error', jobs: 'degraded' };
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.shuttingDown = true;
    const workers = [...this.workers];
    await Promise.all(workers.map((worker) => worker.pause()));
    await Promise.all(workers.map((worker) => worker.close()));
  }

  private hasConflictingTenant(data: unknown, trustedTenantId: string): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'tenantId' in data &&
      typeof (data as { tenantId?: unknown }).tenantId === 'string' &&
      (data as { tenantId: string }).tenantId !== trustedTenantId
    );
  }

  private isValidEnvelope(envelope: JobEnvelope): boolean {
    return Boolean(
      envelope &&
      envelope.context &&
      typeof envelope.context.tenantId === 'string' &&
      envelope.context.tenantId.length > 0 &&
      typeof envelope.context.idempotencyKey === 'string' &&
      envelope.context.idempotencyKey.length > 0,
    );
  }
}
