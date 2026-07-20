import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { AuditEventLegalHold } from '@prisma/client';

@Injectable()
export class LegalHoldService {
  private readonly logger = new Logger(LegalHoldService.name);

  constructor(private readonly prisma: PrismaService) {}

  async placeHold(
    tenantId: string,
    reason: string,
    dateFrom: Date,
    dateTo?: Date,
  ): Promise<AuditEventLegalHold> {
    const hold = await this.prisma.admin.auditEventLegalHold.create({
      data: { tenantId, reason, dateFrom, dateTo },
    });

    if (dateTo) {
      await this.prisma.admin.$executeRawUnsafe(
        `UPDATE audit_events SET legal_hold = true, legal_hold_until = $3 WHERE tenant_id = $1 AND occurred_at >= $2 AND occurred_at <= $3`,
        tenantId,
        dateFrom,
        dateTo,
      );
    } else {
      await this.prisma.admin.$executeRawUnsafe(
        `UPDATE audit_events SET legal_hold = true, legal_hold_until = NULL WHERE tenant_id = $1 AND occurred_at >= $2`,
        tenantId,
        dateFrom,
      );
    }

    this.logger.log(`Legal hold placed for tenant ${tenantId}: ${reason} (${dateFrom.toISOString()} – ${dateTo?.toISOString() ?? 'ongoing'})`);
    return hold;
  }

  async releaseHold(holdId: string): Promise<AuditEventLegalHold> {
    const hold = await this.prisma.admin.auditEventLegalHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new NotFoundException(`Legal hold ${holdId} not found`);
    }

    await this.prisma.admin.$executeRawUnsafe(
      `UPDATE audit_events SET legal_hold = false, legal_hold_until = NULL WHERE tenant_id = $1 AND legal_hold_until IS NOT NULL AND legal_hold_until <= NOW()`,
      hold.tenantId,
    );

    const updated = await this.prisma.admin.auditEventLegalHold.update({
      where: { id: holdId },
      data: { releasedAt: new Date() },
    });

    this.logger.log(`Legal hold ${holdId} released for tenant ${hold.tenantId}`);
    return updated;
  }

  async getActiveHolds(tenantId: string): Promise<AuditEventLegalHold[]> {
    return this.prisma.admin.auditEventLegalHold.findMany({
      where: { tenantId, releasedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
