import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class RetentionEngine {
  private readonly logger = new Logger(RetentionEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async applyRetention(tenantId: string): Promise<{ deletedCount: number; purgedCount: number }> {
    const policy = await this.prisma.admin.auditRetentionPolicy.findUnique({
      where: { tenantId },
    });

    if (!policy) return { deletedCount: 0, purgedCount: 0 };
    if (policy.legalHold) {
      this.logger.log(`Tenant ${tenantId} has active legal hold — skipping retention`);
      return { deletedCount: 0, purgedCount: 0 };
    }

    const now = new Date();
    let deletedCount = 0;
    let purgedCount = 0;

    const cutoff = new Date(now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000);
    const deleteResult = await this.prisma.admin.$executeRawUnsafe(
      `DELETE FROM audit_events WHERE tenant_id = $1 AND occurred_at < $2 AND legal_hold = false`,
      tenantId,
      cutoff,
    );
    deletedCount = deleteResult;

    if (policy.purgeAfterDays) {
      const purgeCutoff = new Date(now.getTime() - policy.purgeAfterDays * 24 * 60 * 60 * 1000);
      const purgeResult = await this.prisma.admin.$executeRawUnsafe(
        `DELETE FROM audit_events WHERE tenant_id = $1 AND occurred_at < $2 AND legal_hold = false`,
        tenantId,
        purgeCutoff,
      );
      purgedCount = purgeResult;
    }

    this.logger.log(`Retention applied for tenant ${tenantId}: deleted ${deletedCount}, purged ${purgedCount}`);

    return { deletedCount, purgedCount };
  }

  async applyForAllTenants(): Promise<{ tenantsProcessed: number; totalDeleted: number; totalPurged: number }> {
    const policies = await this.prisma.admin.auditRetentionPolicy.findMany();
    let totalDeleted = 0;
    let totalPurged = 0;

    for (const policy of policies) {
      const result = await this.applyRetention(policy.tenantId);
      totalDeleted += result.deletedCount;
      totalPurged += result.purgedCount;
    }

    this.logger.log(`Retention applied for ${policies.length} tenants: ${totalDeleted} deleted, ${totalPurged} purged`);
    return { tenantsProcessed: policies.length, totalDeleted, totalPurged };
  }
}
