import { z } from 'zod';

export interface TrustedJobContext {
  tenantId: string;
  correlationId?: string;
  idempotencyKey: string;
}

export interface JobDefinition<T> {
  key: string;
  queueName: string;
  schema: z.ZodType<T>;
  attempts: number;
  backoff: { type: 'exponential'; delay: number };
  concurrency: number;
  handle(context: TrustedJobContext, data: T): Promise<void>;
}

export interface JobsClient {
  enqueue<T>(
    definition: JobDefinition<T>,
    context: TrustedJobContext,
    data: unknown,
    options?: { delay?: number },
  ): Promise<{ id: string }>;
  schedule<T>(
    definition: JobDefinition<T>,
    schedulerId: string,
    pattern: string,
    context: TrustedJobContext,
    data: unknown,
  ): Promise<void>;
  cancel(queueName: string, id: string): Promise<'cancelled' | 'active' | 'missing'>;
}

export interface JobsWorkerLifecycle {
  pause(): Promise<void>;
  close(): Promise<void>;
}

export class JobsTerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobsTerminalError';
  }
}
