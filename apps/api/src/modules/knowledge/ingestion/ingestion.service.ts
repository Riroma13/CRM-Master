import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { z } from 'zod';
import { PrismaService } from '../../../common/prisma.service';
import { KnowledgeService } from '../knowledge.service';
import type { SourceType } from '@shared/knowledge';

const IngestionJobSchema = z.object({
  tenantId: z.string().min(1),
  sourceType: z.string().min(1),
  sourceId: z.string().min(1),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

const ReindexJobSchema = z.object({
  tenantId: z.string().min(1),
  sourceType: z.string().min(1),
  sourceId: z.string().min(1),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

type IngestionJob = z.infer<typeof IngestionJobSchema>;
type ReindexJob = z.infer<typeof ReindexJobSchema>;

@Processor('kb:ingestion')
@Injectable()
export class IngestionService extends WorkerHost {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly prisma: PrismaService,
    @InjectQueue('kb:ingestion-dlq') private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<IngestionJob, any, string>): Promise<{ indexed: boolean }> {
    const parsed = IngestionJobSchema.safeParse(job.data);
    if (!parsed.success) {
      this.logger.warn(`Invalid ingestion job ${job.id}: ${parsed.error.message}`);
      await this.dlqQueue.add('invalid-job', {
        jobId: job.id,
        data: job.data,
        error: parsed.error.message,
        failedAt: new Date().toISOString(),
      });
      return { indexed: false };
    }

    const { tenantId, sourceType, sourceId, content, metadata } = parsed.data;

    try {
      const result = await this.knowledgeService.indexContent(
        tenantId,
        sourceType as SourceType,
        sourceId,
        content,
        metadata,
      );

      this.logger.log(`Ingested ${result.chunksCreated} chunks for ${sourceType}:${sourceId}`);
      return { indexed: true };
    } catch (error: any) {
      this.logger.error(`Failed to ingest ${sourceType}:${sourceId}: ${error.message}`, error.stack);

      await this.prisma.admin.kbSourceIndex.upsert({
        where: {
          tenantId_sourceType_sourceId: { tenantId, sourceType, sourceId },
        },
        create: {
          tenantId,
          sourceType,
          sourceId,
          status: 'failed',
          error: error.message,
        },
        update: {
          status: 'failed',
          error: error.message,
        },
      });

      await this.dlqQueue.add('failed-ingestion', {
        jobId: job.id,
        data: job.data,
        error: error.message,
        failedAt: new Date().toISOString(),
      });

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (job) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
    }
  }
}

@Processor('kb:reindex', { concurrency: 1 })
@Injectable()
export class ReindexService extends WorkerHost {
  private readonly logger = new Logger(ReindexService.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    @InjectQueue('kb:ingestion-dlq') private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ReindexJob, any, string>): Promise<{ reindexed: boolean }> {
    const parsed = ReindexJobSchema.safeParse(job.data);
    if (!parsed.success) {
      this.logger.warn(`Invalid reindex job ${job.id}: ${parsed.error.message}`);
      await this.dlqQueue.add('invalid-reindex-job', {
        jobId: job.id,
        data: job.data,
        error: parsed.error.message,
        failedAt: new Date().toISOString(),
      });
      return { reindexed: false };
    }

    const { tenantId, sourceType, sourceId, content, metadata } = parsed.data;

    try {
      const result = await this.knowledgeService.reindexSource(
        tenantId,
        sourceType as SourceType,
        sourceId,
        content,
        metadata,
      );

      this.logger.log(`Reindexed ${result.chunksCreated} chunks for ${sourceType}:${sourceId}`);
      return { reindexed: true };
    } catch (error: any) {
      this.logger.error(`Failed to reindex ${sourceType}:${sourceId}: ${error.message}`, error.stack);

      await this.dlqQueue.add('failed-reindex', {
        jobId: job.id,
        data: job.data,
        error: error.message,
        failedAt: new Date().toISOString(),
      });

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (job) {
      this.logger.error(`Reindex job ${job.id} failed: ${error.message}`, error.stack);
    }
  }
}
