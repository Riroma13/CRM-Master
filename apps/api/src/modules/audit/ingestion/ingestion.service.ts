import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../common/prisma.service';
import { createAuditAppendOnlyMiddleware, computeGenesisHash, computeAuditEventHash } from '../audit-append-only.middleware';
import { z } from 'zod';

export const AuditIngestionEventSchema = z.object({
  eventId: z.string().uuid().optional(),
  tenantId: z.string().min(1),
  actorType: z.enum(['user', 'system', 'integration', 'workflow', 'admin', 'api']),
  actorId: z.string().min(1),
  actorName: z.string().optional(),
  resourceType: z.enum(['user', 'role', 'permission', 'tenant', 'configuration', 'workflow', 'notification', 'document', 'integration', 'automation', 'communication', 'auth', 'api']),
  resourceId: z.string().min(1),
  resourceName: z.string().optional(),
  action: z.enum(['create', 'read', 'update', 'delete', 'login', 'logout', 'authenticate', 'authorize', 'deny', 'assign', 'revoke', 'start', 'complete', 'fail', 'export', 'import', 'purge']),
  outcome: z.enum(['success', 'failure', 'denied', 'error']),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  correlationId: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AuditIngestionEvent = z.infer<typeof AuditIngestionEventSchema>;

@Processor('audit:ingestion')
@Injectable()
export class IngestionService extends WorkerHost {
  private readonly logger = new Logger(IngestionService.name);
  private readonly MAX_RETRIES = 3;
  private readonly middleware = createAuditAppendOnlyMiddleware();

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('audit:dlq') private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<AuditIngestionEvent, any, string>): Promise<{ eventId: string; deduplicated?: boolean }> {
    const parsed = AuditIngestionEventSchema.safeParse(job.data);
    if (!parsed.success) {
      this.logger.warn(`Invalid audit event for job ${job.id}: ${parsed.error.message}`);
      await this.dlqQueue.add('invalid-event', {
        jobId: job.id,
        data: job.data,
        error: parsed.error.message,
        failedAt: new Date().toISOString(),
      });
      return { eventId: 'invalid' };
    }

    const event = parsed.data;
    const eventId = event.eventId ?? randomUUID();
    const { tenantId } = event;
    const occurredAt = event.occurredAt ?? new Date().toISOString();

    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const result = await this.insertWithHashChain(eventId, tenantId, event, occurredAt);
        this.logger.debug(`Persisted audit event ${eventId} for tenant ${tenantId} (seq=${result.sequence})`);
        return { eventId };
      } catch (error: any) {
        if (error?.code === 'P2002') {
          const target = error?.meta?.target as string[] | undefined;
          if (target?.includes('id')) {
            this.logger.warn(`Duplicate eventId: ${eventId}, skipping (deduplicated)`);
            return { eventId, deduplicated: true };
          }
          if (target?.includes('sequence')) {
            retries++;
            if (retries >= this.MAX_RETRIES) {
              this.logger.error(`Sequence fork persists after ${this.MAX_RETRIES} retries for tenant ${tenantId}, event ${eventId}`);
              throw error;
            }
            this.logger.warn(`Sequence conflict for tenant ${tenantId}, retry ${retries}/${this.MAX_RETRIES}`);
            continue;
          }
        }
        this.logger.error(`Failed to persist audit event ${eventId}: ${error.message}`, error.stack);
        throw error;
      }
    }

    throw new Error(`Exhausted retries for event ${eventId}`);
  }

  private async insertWithHashChain(
    eventId: string,
    tenantId: string,
    event: AuditIngestionEvent,
    occurredAt: string,
  ): Promise<{ sequence: number }> {
    return this.prisma.admin.$transaction(async (tx: any) => {
      const state = await tx.tenantAuditState.findUnique({ where: { tenantId } });

      let prevHash: string;
      let sequence: number;

      if (!state) {
        prevHash = computeGenesisHash(tenantId);
        sequence = 1;
      } else {
        prevHash = state.lastHash;
        sequence = state.lastSequence + 1;
      }

      const hash = computeAuditEventHash(
        {
          tenantId,
          actorType: event.actorType,
          actorId: event.actorId,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          action: event.action,
          outcome: event.outcome,
          occurredAt,
          metadata: event.metadata ?? {},
        },
        prevHash,
        sequence,
      );

      await tx.auditEvent.create({
        data: {
          id: eventId,
          tenantId,
          actorType: event.actorType,
          actorId: event.actorId,
          actorName: event.actorName ?? null,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          resourceName: event.resourceName ?? null,
          action: event.action,
          outcome: event.outcome,
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent ?? null,
          correlationId: event.correlationId ?? null,
          occurredAt: new Date(occurredAt),
          metadata: (event.metadata ?? {}) as any,
          hash,
          prevHash,
          sequence,
        },
      });

      await tx.tenantAuditState.upsert({
        where: { tenantId },
        create: {
          tenantId,
          lastEventId: eventId,
          lastHash: hash,
          lastSequence: sequence,
          lastOccurredAt: new Date(occurredAt),
        },
        update: {
          lastEventId: eventId,
          lastHash: hash,
          lastSequence: sequence,
          lastOccurredAt: new Date(occurredAt),
        },
      });

      return { sequence };
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (job) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
    }
  }
}
