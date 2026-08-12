import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { ZodError } from 'zod';
import { JobDefinition, JobsClient, TrustedJobContext } from './jobs.contracts';

export class JobsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobsValidationError';
  }
}

export class JobsInfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobsInfrastructureError';
  }
}

interface JobEnvelope<T> {
  context: TrustedJobContext;
  data: T;
}

@Injectable()
export class JobsClientService implements JobsClient {
  constructor(private readonly moduleRef: ModuleRef) {}

  async enqueue<T>(
    definition: JobDefinition<T>,
    context: TrustedJobContext,
    data: unknown,
    options: { delay?: number } = {},
  ): Promise<{ id: string }> {
    const parsedData = this.parseData(definition, data);
    const jobId = this.getJobId(definition, context);
    const queue = this.getQueue(definition.queueName);

    try {
      const job = await queue.add(
        definition.key,
        { context, data: parsedData } satisfies JobEnvelope<T>,
        {
          jobId,
          attempts: definition.attempts,
          backoff: definition.backoff,
          ...(options.delay === undefined ? {} : { delay: options.delay }),
        },
      );
      return { id: String(job.id ?? jobId) };
    } catch {
      throw new JobsInfrastructureError('Jobs enqueue failed');
    }
  }

  async schedule<T>(
    definition: JobDefinition<T>,
    schedulerId: string,
    pattern: string,
    context: TrustedJobContext,
    data: unknown,
  ): Promise<void> {
    const parsedData = this.parseData(definition, data);
    const queue = this.getQueue(definition.queueName);

    try {
      await queue.upsertJobScheduler(
        schedulerId,
        { pattern },
        {
          name: definition.key,
          data: { context, data: parsedData } satisfies JobEnvelope<T>,
          opts: { attempts: definition.attempts, backoff: definition.backoff },
        },
      );
    } catch {
      throw new JobsInfrastructureError('Jobs schedule failed');
    }
  }

  async cancel(queueName: string, id: string): Promise<'cancelled' | 'active' | 'missing'> {
    const queue = this.getQueue(queueName);
    let job: Job | undefined;

    try {
      job = await queue.getJob(id);
    } catch {
      throw new JobsInfrastructureError('Jobs cancellation failed');
    }

    if (!job) return 'missing';
    if (await job.isActive()) return 'active';

    try {
      await job.remove();
      return 'cancelled';
    } catch {
      throw new JobsInfrastructureError('Jobs cancellation failed');
    }
  }

  private parseData<T>(definition: JobDefinition<T>, data: unknown): T {
    try {
      return definition.schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) throw new JobsValidationError('Invalid job data');
      throw error;
    }
  }

  private getQueue(queueName: string): Queue {
    return this.moduleRef.get<Queue>(getQueueToken(queueName), { strict: false });
  }

  private getJobId<T>(definition: JobDefinition<T>, context: TrustedJobContext): string {
    return `${definition.key}:${context.idempotencyKey}`;
  }
}
