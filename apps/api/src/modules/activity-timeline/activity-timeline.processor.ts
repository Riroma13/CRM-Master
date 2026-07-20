import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma.service';
import { ActivityEventEnvelope, ActivityEventEnvelopeSchema } from '../../../../../packages/shared/src/activity-timeline';
import { Prisma } from '@prisma/client';

@Processor('activity-timeline:ingestion')
export class ActivityTimelineProcessor extends WorkerHost {
  private readonly logger = new Logger(ActivityTimelineProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('activity-timeline:dlq') private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ActivityEventEnvelope, any, string>): Promise<{ eventId: string }> {
    const parsed = ActivityEventEnvelopeSchema.safeParse(job.data);
    if (!parsed.success) {
      this.logger.warn(`Invalid event envelope for job ${job.id}: ${parsed.error.message}`);
      await this.dlqQueue.add('invalid-envelope', {
        jobId: job.id,
        data: job.data,
        error: parsed.error.message,
        failedAt: new Date().toISOString(),
      });
      return { eventId: 'invalid' };
    }

    const eventId = parsed.data.eventId ?? randomUUID();
    const { tenantId } = parsed.data;

    try {
      await this.prisma.forTenant(tenantId).activityEvent.create({
        data: {
          tenantId: parsed.data.tenantId,
          clienteId: parsed.data.clienteId ?? null,
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId ?? null,
          eventType: parsed.data.eventType,
          actor: parsed.data.actor,
          sourceModule: parsed.data.sourceModule,
          severity: parsed.data.severity,
          category: parsed.data.category,
          payload: parsed.data.payload as Prisma.InputJsonValue,
          eventId,
          correlationId: parsed.data.correlationId ?? undefined,
          causationId: parsed.data.causationId ?? undefined,
          visibility: parsed.data.visibility,
          subjectName: parsed.data.subjectName ?? undefined,
          actorName: parsed.data.actorName ?? undefined,
          occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        this.logger.warn(`Duplicate eventId: ${eventId}, skipping`);
        return { eventId };
      }
      this.logger.error(`Failed to persist event ${eventId} for tenant ${tenantId}: ${error.message}`, error.stack);
      throw error;
    }

    this.logger.debug(`Persisted activity event ${eventId} for tenant ${tenantId}`);
    return { eventId };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (job) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
    }
  }
}
