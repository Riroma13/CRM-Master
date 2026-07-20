import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { IntegrityVerificationResult } from '../dto';
import { computeGenesisHash, computeAuditEventHash } from '../audit-append-only.middleware';

@Injectable()
export class IntegrityVerifier {
  private readonly logger = new Logger(IntegrityVerifier.name);

  constructor(private readonly prisma: PrismaService) {}

  async verifyChain(tenantId: string): Promise<IntegrityVerificationResult> {
    const client = this.prisma.forTenant(tenantId);

    const events = await client.auditEvent.findMany({
      where: { tenantId },
      orderBy: [{ sequence: 'asc' }],
    });

    return this.verifyEvents(events as any[], tenantId);
  }

  async verifyRange(tenantId: string, fromDate?: string, toDate?: string): Promise<IntegrityVerificationResult> {
    const client = this.prisma.forTenant(tenantId);

    const where: any = { tenantId };
    if (fromDate || toDate) {
      where.occurredAt = {};
      if (fromDate) where.occurredAt.gte = new Date(fromDate);
      if (toDate) where.occurredAt.lte = new Date(toDate);
    }

    const events = await client.auditEvent.findMany({
      where,
      orderBy: [{ sequence: 'asc' }],
    });

    return this.verifyEvents(events as any[], tenantId);
  }

  private verifyEvents(events: any[], tenantId: string): IntegrityVerificationResult {
    let expectedPrevHash = computeGenesisHash(tenantId);

    for (const event of events) {
      if (event.prevHash !== expectedPrevHash) {
        return {
          valid: false,
          firstBrokenAt: event.id,
          totalVerified: events.indexOf(event),
        };
      }

      const recomputedHash = computeAuditEventHash(
        {
          tenantId: event.tenantId,
          actorType: event.actorType,
          actorId: event.actorId,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          action: event.action,
          outcome: event.outcome,
          occurredAt: event.occurredAt instanceof Date
            ? event.occurredAt.toISOString()
            : event.occurredAt,
          metadata: event.metadata ?? {},
        },
        event.prevHash,
        event.sequence,
      );

      if (recomputedHash !== event.hash) {
        return {
          valid: false,
          firstBrokenAt: event.id,
          totalVerified: events.indexOf(event),
        };
      }

      expectedPrevHash = event.hash;
    }

    return {
      valid: true,
      totalVerified: events.length,
    };
  }
}
