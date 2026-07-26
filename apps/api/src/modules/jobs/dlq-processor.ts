import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job, Queue } from 'bullmq';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.service';
import { MetricsRegistry } from '../observability/metrics/metrics-registry';

// ─── Constants ─────────────────────────────────────────────────────────

const DEFAULT_DLQ_PAIRS =
  'activity-timeline:dlq:activity-timeline:ingestion,' +
  'audit:dlq:audit:ingestion,' +
  'kb:ingestion-dlq:kb:ingestion,' +
  'reporting:dataset:dlq:reporting:dataset:ingestion';

const DEFAULT_RETRY_DELAY = 5000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_CONCURRENCY = 5;

// ─── Zod schema for DLQ job data validation ───────────────────────────

export const DlqJobDataSchema = z.object({
  tenantId: z.string(),
  runId: z.string(),
  payload: z.record(z.unknown()).optional().default({}),
});

export type DlqJobData = z.infer<typeof DlqJobDataSchema>;

// ─── DlqPair type ─────────────────────────────────────────────────────

export interface DlqPair {
  dlqName: string;
  sourceQueue: string;
}

// ─── Pure backoff calculator ───────────────────────────────────────────

/**
 * Calculate exponential backoff.
 * backoff = retryDelay * 2^attempt
 *
 * With retryDelay=5000: 5000 → 10000 → 20000 → 40000
 */
export function calculateBackoff(
  retryDelay: number,
  attempt: number,
): number {
  return retryDelay * Math.pow(2, attempt);
}

/**
 * Parse JOBS_DLQ_QUEUES env var into an array of DlqPair.
 * Format: "dlq-name:source-queue,dlq-name:source-queue"
 * Both queue names must have the same number of colon-separated segments.
 */
export function parseDlqConfig(config: string): DlqPair[] {
  if (!config || config.trim().length === 0) return [];

  return config
    .split(',')
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const parts = pair.split(':');
      if (parts.length < 2 || parts.length % 2 !== 0) {
        throw new Error(
          `Invalid DLQ pair format: "${pair}". Expected "dlq-name:source-queue" with matching segment counts.`,
        );
      }
      const mid = parts.length / 2;
      return {
        dlqName: parts.slice(0, mid).join(':'),
        sourceQueue: parts.slice(mid).join(':'),
      };
    });
}

// ─── DlqProcessor ─────────────────────────────────────────────────────

@Injectable()
export class DlqProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DlqProcessor.name);
  private readonly workers: Worker[] = [];
  private readonly retryDelay: number;
  private readonly maxRetries: number;
  private readonly concurrency: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly metricsRegistry: MetricsRegistry,
  ) {
    this.retryDelay =
      this.configService.get<number>('JOBS_DLQ_RETRY_DELAY') ??
      DEFAULT_RETRY_DELAY;
    this.maxRetries =
      this.configService.get<number>('JOBS_DLQ_MAX_RETRIES') ??
      DEFAULT_MAX_RETRIES;
    this.concurrency =
      this.configService.get<number>('JOBS_DLQ_CONCURRENCY') ??
      DEFAULT_CONCURRENCY;
  }

  onModuleInit(): void {
    const config = this.configService.get<string>(
      'JOBS_DLQ_QUEUES',
      DEFAULT_DLQ_PAIRS,
    );
    const pairs = parseDlqConfig(config);

    if (pairs.length === 0) {
      this.logger.warn('No DLQ pairs configured — DlqProcessor is idle');
      return;
    }

    const connection = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    };

    for (const { dlqName, sourceQueue } of pairs) {
      this.logger.log(
        `Starting DlqProcessor worker for ${dlqName} → ${sourceQueue}` +
          ` (concurrency=${this.concurrency}, maxRetries=${this.maxRetries})`,
      );

      const worker = new Worker(
        dlqName,
        async (job: Job) => this.processJob(job, sourceQueue),
        {
          connection,
          concurrency: this.concurrency,
          lockDuration: 30_000,
          stalledInterval: 15_000,
          maxStalledCount: 3,
        },
      );

      worker.on('failed', (job: Job | undefined, error: Error) => {
        this.logger.error(
          `DLQ worker ${dlqName} failed processing job ${job?.id}: ${error.message}`,
          error.stack,
        );
      });

      worker.on('error', (error: Error) => {
        this.logger.error(
          `DLQ worker ${dlqName} encountered error: ${error.message}`,
          error.stack,
        );
      });

      this.workers.push(worker);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log(`Closing ${this.workers.length} DLQ worker(s)...`);
    await Promise.all(this.workers.map((w) => w.close()));
    this.workers.length = 0;
  }

  private async processJob(job: Job, sourceQueue: string): Promise<void> {
    // ── Zod validation ──────────────────────────────────────────────
    const parseResult = DlqJobDataSchema.safeParse(job.data);
    if (!parseResult.success) {
      this.logger.error(
        `Invalid job data for job ${job.id}: ${parseResult.error.message}`,
      );
      throw new Error(`Invalid job data: ${parseResult.error.message}`);
    }

    const { tenantId, runId } = parseResult.data;

    // ── Find JobRun ─────────────────────────────────────────────────
    const run = await this.prisma
      .forTenant(tenantId)
      .jobRun.findFirst({ where: { id: runId } });

    if (!run) {
      this.logger.warn(
        `JobRun ${runId} not found in DB — skipping DLQ recovery`,
      );
      return;
    }

    // ── Current attempt count ───────────────────────────────────────
    const currentAttempt = run.attempts;

    // ── Backoff calculation ─────────────────────────────────────────
    const backoff = calculateBackoff(this.retryDelay, currentAttempt);

    // ── Retry or dead_letter ────────────────────────────────────────
    if (currentAttempt < this.maxRetries) {
      // Increment attempts and re-enqueue after backoff
      await this.prisma
        .forTenant(tenantId)
        .jobRun.update({
          where: { id: runId },
          data: { attempts: { increment: 1 } },
        });

      this.logger.debug(
        `Waiting ${backoff}ms before re-enqueuing job ${runId} ` +
          `(attempt ${currentAttempt + 1}/${this.maxRetries})`,
      );

      await this.delay(backoff);

      // Re-enqueue to source queue
      const sourceWorker = new Queue(sourceQueue, {
        connection: {
          host: this.configService.get<string>('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get<string>('REDIS_PASSWORD'),
        },
      });

      try {
        await sourceWorker.add(
          sourceQueue,
          { tenantId, runId, payload: run.payload },
          { jobId: `${runId}:retry-${currentAttempt + 1}` },
        );
        this.logger.debug(
          `Re-enqueued job ${runId} to ${sourceQueue} (attempt ${currentAttempt + 1})`,
        );
      } finally {
        await sourceWorker.close();
      }
    } else {
      // Max retries exceeded — dead_letter
      await this.prisma
        .forTenant(tenantId)
        .jobRun.update({
          where: { id: runId },
          data: {
            status: 'dead_lettered',
            error: `Max retries (${this.maxRetries}) exceeded`,
          },
        });

      this.metricsRegistry.bullmqDlqCount?.inc({ queue: sourceQueue });

      this.logger.warn(
        `Job ${runId} dead_lettered after ${currentAttempt} attempts (max ${this.maxRetries})`,
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
