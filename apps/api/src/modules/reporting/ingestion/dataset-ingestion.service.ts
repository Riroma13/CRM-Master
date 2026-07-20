import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { z } from 'zod';
import { PrismaService } from '../../../common/prisma.service';

const DatasetEventSchema = z.object({
  tenantId: z.string().min(1),
  datasetName: z.string().min(1),
  metricName: z.string().min(1),
  value: z.number().finite(),
  timestamp: z.string().datetime({ offset: true }).or(z.string().datetime()),
  dimensions: z.record(z.string()).optional(),
  eventId: z.string().optional(),
  aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']).optional().default('sum'),
  granularity: z.enum(['hour', 'day']).optional().default('day'),
});

type DatasetEvent = z.infer<typeof DatasetEventSchema>;

function startOfWindow(date: Date, granularity: 'hour' | 'day'): Date {
  const d = new Date(date);
  if (granularity === 'hour') {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()));
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

@Processor('reporting:dataset:ingestion')
@Injectable()
export class DatasetIngestionService extends WorkerHost {
  private readonly logger = new Logger(DatasetIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reporting:dataset:dlq') private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<DatasetEvent, any, string>): Promise<{ processed: boolean; windowStart: string }> {
    const parsed = DatasetEventSchema.safeParse(job.data);
    if (!parsed.success) {
      this.logger.warn(`Invalid dataset event for job ${job.id}: ${parsed.error.message}`);
      await this.dlqQueue.add('invalid-event', {
        jobId: job.id,
        data: job.data,
        error: parsed.error.message,
        failedAt: new Date().toISOString(),
      });
      return { processed: false, windowStart: '' };
    }

    const event = parsed.data;
    const { tenantId } = event;
    const prisma = this.prisma.forTenant(tenantId);
    const eventDate = new Date(event.timestamp);
    const windowStart = startOfWindow(eventDate, event.granularity);

    if (event.eventId) {
      const existing = await prisma.datasetIngestionLog.findFirst({
        where: { eventId: event.eventId, tenantId },
      });
      if (existing) {
        this.logger.debug(`Duplicate eventId: ${event.eventId}, skipping`);
        return { processed: true, windowStart: existing.windowStart.toISOString() };
      }
    }

    try {
      const compositeId = {
        tenantId_datasetName_metricName_granularity_windowStart: {
          tenantId,
          datasetName: event.datasetName,
          metricName: event.metricName,
          granularity: event.granularity,
          windowStart,
        },
      };

      const baseCreate = {
        tenantId,
        datasetName: event.datasetName,
        metricName: event.metricName,
        granularity: event.granularity,
        windowStart,
        dimensions: (event.dimensions ?? {}) as any,
      };

      if (event.aggregation === 'count') {
        await prisma.analyticsDataset.upsert({
          where: compositeId,
          create: { ...baseCreate, value: 1 },
          update: { value: { increment: 1 } },
        });
      } else if (event.aggregation === 'sum') {
        await prisma.analyticsDataset.upsert({
          where: compositeId,
          create: { ...baseCreate, value: event.value },
          update: { value: { increment: event.value } },
        });
      } else if (event.aggregation === 'min') {
        const existing = await prisma.analyticsDataset.findUnique({ where: compositeId });
        if (!existing || event.value < existing.value) {
          await prisma.analyticsDataset.upsert({
            where: compositeId,
            create: { ...baseCreate, value: event.value },
            update: { value: event.value },
          });
        }
      } else if (event.aggregation === 'max') {
        const existing = await prisma.analyticsDataset.findUnique({ where: compositeId });
        if (!existing || event.value > existing.value) {
          await prisma.analyticsDataset.upsert({
            where: compositeId,
            create: { ...baseCreate, value: event.value },
            update: { value: event.value },
          });
        }
      } else if (event.aggregation === 'avg') {
        const existing = await prisma.analyticsDataset.findUnique({ where: compositeId });
        if (!existing) {
          await prisma.analyticsDataset.create({
            data: {
              ...baseCreate,
              value: event.value,
              dimensions: {
                ...event.dimensions,
                _avg_sum: String(event.value),
                _avg_count: '1',
              } as any,
            },
          });
        } else {
          const dims = (existing.dimensions ?? {}) as Record<string, string>;
          const currentSum = dims._avg_sum ? Number(dims._avg_sum) : existing.value;
          const currentCount = dims._avg_count ? Number(dims._avg_count) : 1;
          const newSum = currentSum + event.value;
          const newCount = currentCount + 1;
          await prisma.analyticsDataset.update({
            where: { id: existing.id },
            data: {
              value: newSum / newCount,
              dimensions: {
                ...dims,
                _avg_sum: String(newSum),
                _avg_count: String(newCount),
              } as any,
            },
          });
        }
      }

      await prisma.datasetIngestionLog.create({
        data: {
          tenantId,
          datasetName: event.datasetName,
          metricName: event.metricName,
          value: event.value,
          windowStart,
          status: 'processed',
          eventId: event.eventId ?? null,
          timestamp: eventDate,
        },
      });

      return { processed: true, windowStart: windowStart.toISOString() };
    } catch (error: any) {
      this.logger.error(`Failed to ingest event: ${error.message}`, error.stack);

      await prisma.datasetIngestionLog.create({
        data: {
          tenantId,
          datasetName: event.datasetName,
          metricName: event.metricName,
          value: event.value,
          windowStart,
          status: 'failed',
          eventId: event.eventId ?? null,
          error: error.message,
          timestamp: eventDate,
        },
      });

      await this.dlqQueue.add('failed-event', {
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
