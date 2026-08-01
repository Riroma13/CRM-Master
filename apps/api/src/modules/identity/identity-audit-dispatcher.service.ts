import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';
import {
  IDENTITY_AUDIT_DLQ_QUEUE,
  IDENTITY_AUDIT_INGESTION_QUEUE,
} from '../audit/audit-queue.constants';
import { OutboxEvent } from './identity.contracts';

export const IDENTITY_AUDIT_ALERT = 'IDENTITY_AUDIT_ALERT';

export interface IdentityAuditAlert {
  emit(payload: Record<string, unknown>): Promise<void> | void;
}

@Injectable()
export class IdentityAuditDispatcherService {
  private readonly logger = new Logger(IdentityAuditDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(IDENTITY_AUDIT_INGESTION_QUEUE) private readonly ingestionQueue: Queue,
    @InjectQueue(IDENTITY_AUDIT_DLQ_QUEUE) private readonly dlqQueue: Queue,
    @Optional() @Inject(IDENTITY_AUDIT_ALERT) private readonly alert?: IdentityAuditAlert,
  ) {}

  async dispatch(event: OutboxEvent, owner: string, now = new Date()) {
    const client = this.prisma.forTenant(event.tenantId) as any;
    const leaseExpiresAt = new Date(now.getTime() + 60_000);
    const claimed = await client.identityAuditOutbox.updateMany({
      where: {
        tenantId: event.tenantId,
        eventId: event.eventId,
        OR: [{ status: 'PENDING' }, { status: 'LEASED', leaseExpiresAt: { lte: now } }],
      },
      data: { status: 'LEASED', leaseOwner: owner, leaseExpiresAt, attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) return null;

    try {
      await this.ingestionQueue.add('identity-audit', event, { jobId: event.eventId });
    } catch (error: any) {
      if (!this.isExistingJob(error)) throw error;
    }

    const delivered = await client.identityAuditOutbox.updateMany({
      where: { tenantId: event.tenantId, eventId: event.eventId, status: 'LEASED', leaseOwner: owner },
      data: { status: 'DELIVERED', deliveredAt: now, leaseOwner: null, leaseExpiresAt: null },
    });
    return delivered.count === 1 ? event : null;
  }

  async handleDeliveryFailure(job: Job, error: Error): Promise<void> {
    const data = (job.data ?? {}) as Partial<OutboxEvent> & { leaseOwner?: string };
    if (!data.eventId || !data.tenantId || !data.mutationId || !data.eventType) return;
    const owner = data.leaseOwner ?? 'audit-ingestion';
    const client = this.prisma.forTenant(data.tenantId) as any;
    const failedAt = new Date().toISOString();
    const disposition = {
      eventId: data.eventId,
      tenantId: data.tenantId,
      mutationId: data.mutationId,
      eventType: data.eventType,
      jobId: String(job.id ?? data.eventId),
      errorCode: error.name || 'IDENTITY_AUDIT_DELIVERY_FAILED',
      failedAt,
    };
    const updated = await client.identityAuditOutbox.updateMany({
      where: { tenantId: data.tenantId, eventId: data.eventId, status: 'LEASED', leaseOwner: owner },
      data: { status: 'FAILED', terminalAt: new Date(failedAt), errorCode: disposition.errorCode, leaseOwner: null, leaseExpiresAt: null },
    });
    if (updated.count !== 1) return;
    await this.dlqQueue.add('identity-audit-failed', disposition, { jobId: `${data.eventId}:dlq` });
    await this.alert?.emit({ eventId: data.eventId, tenantId: data.tenantId, errorCode: disposition.errorCode });
  }

  async handleInvalidPayload(job: Job, errorCode: string): Promise<void> {
    await this.dlqQueue.add('identity-audit-invalid', {
      eventId: String(job.id ?? 'invalid'),
      jobId: String(job.id ?? 'invalid'),
      errorCode,
      failedAt: new Date().toISOString(),
    });
  }

  private isExistingJob(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /already exists|duplicate|jobId/i.test(message);
  }
}
