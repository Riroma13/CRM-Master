import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';
import type { JobPayload, JobRunDto, JobStatus } from '@shared/jobs';

/** Valid JobStatus values for DB-level consistency */
const VALID_STATUSES = [
  'queued',
  'active',
  'completed',
  'failed',
  'cancelled',
  'dead_lettered',
] as const;

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Queue helpers ─────────────────────────────────────────────────

  private getConnection(): {
    host: string;
    port: number;
    password?: string;
  } {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    };
  }

  private getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      this.queues.set(name, new Queue(name, { connection: this.getConnection() }));
    }
    return this.queues.get(name)!;
  }

  // ─── Public API ───────────────────────────────────────────────────

  /**
   * Enqueue a new job.
   * - Finds or auto-creates a JobDefinition for the given tenant+key.
   * - Creates a JobRun with status="queued".
   * - Adds the job to the BullMQ queue.
   * - If `idempotencyKey` is provided and a run already exists for this
   *   (tenantId, idempotencyKey) pair, the existing run is returned.
   */
  async enqueue(
    tenantId: string,
    key: string,
    payload: JobPayload,
    opts?: { idempotencyKey?: string; delay?: number },
  ): Promise<JobRunDto> {
    // ── Idempotency check ──────────────────────────────────────────
    if (opts?.idempotencyKey) {
      const existing = await this.prisma
        .forTenant(tenantId)
        .jobRun.findFirst({
          where: { idempotencyKey: opts.idempotencyKey },
        });
      if (existing) {
        this.logger.debug(
          `Idempotency hit: returning existing JobRun ${existing.id}`,
        );
        return this.toJobRunDto(existing);
      }
    }

    // ── Find or auto-create JobDefinition ──────────────────────────
    let def = await this.prisma
      .forTenant(tenantId)
      .jobDefinition.findUnique({
        where: { tenantId_key: { tenantId, key } },
      });

    if (!def) {
      def = await this.prisma.forTenant(tenantId).jobDefinition.create({
        data: { tenantId, key, name: key },
      });
      this.logger.debug(`Auto-created JobDefinition ${key} for tenant ${tenantId}`);
    }

    // ── Create JobRun ──────────────────────────────────────────────
    const run = await this.prisma.forTenant(tenantId).jobRun.create({
      data: {
        tenantId,
        jobDefinitionId: def.id,
        status: 'queued',
        payload: payload as any,
        idempotencyKey: opts?.idempotencyKey ?? null,
        queueName: key,
        maxRetries: def.maxRetries,
      },
    });

    // ── Add to BullMQ ──────────────────────────────────────────────
    try {
      const queue = this.getQueue(key);
      await queue.add(
        key,
        { tenantId, runId: run.id, payload },
        { jobId: run.id, delay: opts?.delay },
      );
      this.logger.debug(`Enqueued job ${run.id} to queue ${key}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to enqueue job ${run.id} to queue ${key}: ${error.message}`,
        error.stack,
      );
      // Rollback: mark the JobRun as failed since BullMQ couldn't enqueue it
      await this.prisma
        .forTenant(tenantId)
        .jobRun.update({
          where: { id: run.id },
          data: { status: 'failed', error: error.message },
        });
      throw error;
    }

    return this.toJobRunDto(run);
  }

  /**
   * Get the current status of a JobRun.
   * Returns 404 if the run does not exist in the given tenant context.
   */
  async getStatus(
    tenantId: string,
    runId: string,
  ): Promise<{
    status: JobStatus;
    attempts: number;
    maxRetries: number;
    createdAt: Date;
    scheduledAt: Date;
    startedAt?: Date;
    completedAt?: Date;
  }> {
    const run = await this.prisma
      .forTenant(tenantId)
      .jobRun.findFirst({ where: { id: runId } });

    if (!run) {
      throw new NotFoundException(`Job run ${runId} not found`);
    }

    return {
      status: run.status as JobStatus,
      attempts: run.attempts,
      maxRetries: run.maxRetries,
      createdAt: run.createdAt,
      scheduledAt: run.scheduledAt,
      startedAt: run.startedAt ?? undefined,
      completedAt: run.completedAt ?? undefined,
    };
  }

  /**
   * Cancel a pending JobRun.
   * - Sets status to "cancelled".
   * - Removes the BullMQ job if it is still waiting or active.
   * - Throws 409 if the job is already completed or dead_lettered.
   */
  async cancel(tenantId: string, runId: string): Promise<void> {
    const run = await this.prisma
      .forTenant(tenantId)
      .jobRun.findFirst({ where: { id: runId } });

    if (!run) {
      throw new NotFoundException(`Job run ${runId} not found`);
    }

    if (run.status === 'completed' || run.status === 'dead_lettered') {
      throw new ConflictException(
        `Cannot cancel job in status "${run.status}"`,
      );
    }

    // Try to remove from BullMQ if the job is still pending
    try {
      const queue = this.getQueue(run.queueName);
      const bullJob = await queue.getJob(run.id);
      if (bullJob) {
        const state = await bullJob.getState();
        if (state === 'waiting' || state === 'active' || state === 'delayed') {
          await bullJob.remove();
        }
      }
    } catch (error: any) {
      this.logger.warn(
        `Failed to remove BullMQ job ${run.id}: ${error.message}`,
      );
    }

    await this.prisma
      .forTenant(tenantId)
      .jobRun.update({
        where: { id: runId },
        data: { status: 'cancelled' },
      });
  }

  /**
   * Retry a failed or dead_lettered job.
   * Creates a NEW JobRun and re-enqueues to BullMQ.
   * Throws 409 if the job is not in a retryable state.
   */
  async retry(tenantId: string, runId: string): Promise<JobRunDto> {
    const run = await this.prisma
      .forTenant(tenantId)
      .jobRun.findFirst({ where: { id: runId } });

    if (!run) {
      throw new NotFoundException(`Job run ${runId} not found`);
    }

    if (run.status !== 'failed' && run.status !== 'dead_lettered') {
      throw new ConflictException(
        `Cannot retry job in status "${run.status}"`,
      );
    }

    // Create a new JobRun with the same payload and definition
    const newRun = await this.prisma
      .forTenant(tenantId)
      .jobRun.create({
        data: {
          tenantId,
          jobDefinitionId: run.jobDefinitionId,
          status: 'queued',
          payload: run.payload as any,
          maxRetries: run.maxRetries,
          queueName: run.queueName,
        },
      });

    // Enqueue to BullMQ
    const queue = this.getQueue(run.queueName);
    await queue.add(
      run.queueName,
      { tenantId, runId: newRun.id, payload: run.payload },
      { jobId: newRun.id },
    );

    return this.toJobRunDto(newRun);
  }

  /**
   * List JobRuns for a tenant with optional filtering and pagination.
   */
  async list(
    tenantId: string,
    filters?: {
      status?: JobStatus;
      since?: Date;
      until?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: JobRunDto[]; total: number; page: number }> {
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.since || filters?.until) {
      where.createdAt = {};
      if (filters.since) where.createdAt.gte = filters.since;
      if (filters.until) where.createdAt.lte = filters.until;
    }

    const [data, total] = await Promise.all([
      this.prisma
        .forTenant(tenantId)
        .jobRun.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      this.prisma.forTenant(tenantId).jobRun.count({ where }),
    ]);

    return {
      data: data.map((r: any) => this.toJobRunDto(r)),
      total,
      page,
    };
  }

  // ─── DTO mapper ─────────────────────────────────────────────────

  private toJobRunDto(run: any): JobRunDto {
    const dto: JobRunDto = {
      id: run.id,
      tenantId: run.tenantId,
      jobDefinitionId: run.jobDefinitionId,
      status: run.status as JobStatus,
      payload: run.payload as JobPayload,
      attempts: run.attempts,
      maxRetries: run.maxRetries,
      scheduledAt:
        run.scheduledAt?.toISOString?.() ?? (run.scheduledAt as string),
      queueName: run.queueName,
      createdAt:
        run.createdAt?.toISOString?.() ?? (run.createdAt as string),
    };

    if (run.result) dto.result = run.result as JobPayload;
    if (run.error) dto.error = run.error;
    if (run.startedAt) {
      dto.startedAt = run.startedAt?.toISOString?.() ?? (run.startedAt as string);
    }
    if (run.completedAt) {
      dto.completedAt =
        run.completedAt?.toISOString?.() ?? (run.completedAt as string);
    }
    if (run.idempotencyKey) dto.idempotencyKey = run.idempotencyKey;

    return dto;
  }
}
