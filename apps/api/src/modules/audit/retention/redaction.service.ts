import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { computeAuditEventHash } from '../audit-append-only.middleware';

@Injectable()
export class RedactionService {
  private readonly logger = new Logger(RedactionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async redactEvent(
    tenantId: string,
    eventId: string,
    fieldsToRedact: string[],
  ): Promise<{ redacted: boolean; newHash: string }> {
    const client = this.prisma.forTenant(tenantId);
    const event = await client.auditEvent.findUnique({ where: { id: eventId } });

    if (!event) {
      throw new NotFoundException(`Audit event ${eventId} not found for tenant ${tenantId}`);
    }

    if ((event.metadata as Record<string, unknown>)?._redacted === true) {
      throw new Error(`Event ${eventId} is already redacted`);
    }

    const existingMetadata = (event.metadata ?? {}) as Record<string, unknown>;
    const updatedMetadata: Record<string, unknown> = {
      ...existingMetadata,
      _redacted: true,
      _redactedAt: new Date().toISOString(),
      _redactedFields: fieldsToRedact,
    };

    const rawRows = await (this.prisma.admin.$queryRawUnsafe as any)(
      `SELECT id, tenant_id, actor_type, actor_id, resource_type, resource_id, action, outcome, occurred_at, metadata, hash, prev_hash, sequence FROM audit_events WHERE tenant_id = $1 AND sequence >= $2 ORDER BY sequence ASC`,
      tenantId,
      event.sequence,
    ) as Array<{
      id: string;
      tenant_id: string;
      actor_type: string;
      actor_id: string;
      resource_type: string;
      resource_id: string;
      action: string;
      outcome: string;
      occurred_at: Date;
      metadata: any;
      hash: string;
      prev_hash: string;
      sequence: number;
    }>;

    if (rawRows.length === 0) {
      throw new Error(`Event ${eventId} not found in raw query for tenant ${tenantId}`);
    }

    const evtData = rawRows[0];
    const newHash = computeAuditEventHash(
      {
        tenantId: evtData.tenant_id,
        actorType: evtData.actor_type,
        actorId: evtData.actor_id,
        resourceType: evtData.resource_type,
        resourceId: evtData.resource_id,
        action: evtData.action,
        outcome: evtData.outcome,
        occurredAt:
          evtData.occurred_at instanceof Date
            ? evtData.occurred_at.toISOString()
            : String(evtData.occurred_at),
        metadata: updatedMetadata as Record<string, unknown>,
      },
      evtData.prev_hash,
      evtData.sequence,
    );

    await this.prisma.admin.$transaction(async (tx: any) => {
      let currentPrevHash = newHash;

      await tx.$executeRawUnsafe(
        `UPDATE audit_events SET actor_name = NULL, ip_address = NULL, user_agent = NULL, metadata = $3::jsonb, hash = $4 WHERE id = $1 AND tenant_id = $2`,
        eventId,
        tenantId,
        JSON.stringify(updatedMetadata),
        newHash,
      );

      for (let i = 1; i < rawRows.length; i++) {
        const evt = rawRows[i];
        const content = {
          tenantId: evt.tenant_id,
          actorType: evt.actor_type,
          actorId: evt.actor_id,
          resourceType: evt.resource_type,
          resourceId: evt.resource_id,
          action: evt.action,
          outcome: evt.outcome,
          occurredAt:
            evt.occurred_at instanceof Date
              ? evt.occurred_at.toISOString()
              : String(evt.occurred_at),
          metadata: evt.metadata as Record<string, unknown>,
        };
        const recomputedHash = computeAuditEventHash(content, currentPrevHash, evt.sequence);

        await tx.$executeRawUnsafe(
          `UPDATE audit_events SET prev_hash = $3, hash = $4 WHERE id = $1 AND tenant_id = $2`,
          evt.id,
          tenantId,
          currentPrevHash,
          recomputedHash,
        );

        currentPrevHash = recomputedHash;
      }

      await tx.$executeRawUnsafe(
        `UPDATE tenant_audit_state SET last_hash = $2, last_event_id = $3, last_sequence = $4, last_occurred_at = $5, updated_at = NOW() WHERE tenant_id = $1`,
        tenantId,
        currentPrevHash,
        rawRows[rawRows.length - 1].id,
        rawRows[rawRows.length - 1].sequence,
        rawRows[rawRows.length - 1].occurred_at,
      );
    });

    this.logger.log(`Event ${eventId} redacted for tenant ${tenantId}: fields=[${fieldsToRedact.join(', ')}]`);

    return { redacted: true, newHash };
  }
}
