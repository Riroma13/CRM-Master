import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

interface SnapshotResult {
  data: unknown;
  stale: boolean;
  expiresAt: Date;
}

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);
  private readonly refreshInProgress = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  async generateSnapshot(
    tenantId: string,
    name: string,
    datasetName: string,
    granularity: string,
    windowStart: Date,
    windowEnd: Date,
    ttlSeconds: number = 300,
  ) {
    const prisma = this.prisma.forTenant(tenantId);

    const records = await prisma.analyticsDataset.findMany({
      where: {
        tenantId,
        datasetName,
        granularity,
        windowStart: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { windowStart: 'asc' },
    });

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const snapshot = await prisma.analyticsSnapshot.upsert({
      where: {
        tenantId_name: { tenantId, name },
      },
      create: {
        tenantId,
        name,
        datasetName,
        granularity,
        windowStart,
        windowEnd,
        data: records,
        ttl: ttlSeconds,
        expiresAt,
        refreshedAt: new Date(),
      },
      update: {
        data: records,
        windowStart,
        windowEnd,
        ttl: ttlSeconds,
        expiresAt,
        refreshedAt: new Date(),
      },
    });

    return snapshot;
  }

  async getSnapshot(
    tenantId: string,
    name: string,
  ): Promise<SnapshotResult | null> {
    const prisma = this.prisma.forTenant(tenantId);

    const snapshot = await prisma.analyticsSnapshot.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });

    if (!snapshot) {
      return null;
    }

    const now = new Date();
    const isExpired = snapshot.expiresAt <= now;

    if (!isExpired) {
      return {
        data: snapshot.data,
        stale: false,
        expiresAt: snapshot.expiresAt,
      };
    }

    const refreshKey = `${tenantId}:${name}`;

    if (!this.refreshInProgress.has(refreshKey)) {
      this.refreshInProgress.add(refreshKey);
      this.triggerRefresh(tenantId, name, snapshot).finally(() => {
        this.refreshInProgress.delete(refreshKey);
      });
    }

    return {
      data: snapshot.data,
      stale: true,
      expiresAt: snapshot.expiresAt,
    };
  }

  async generateCache(tenantId: string, datasetName: string) {
    const prisma = this.prisma.forTenant(tenantId);

    const records = await prisma.analyticsDataset.findMany({
      where: { tenantId, datasetName },
      orderBy: { windowStart: 'asc' },
    });

    if (records.length === 0) return null;

    const windowStart = records[0].windowStart;
    const windowEnd = records[records.length - 1].windowStart;
    const granularity = records[0].granularity;

    return this.generateSnapshot(
      tenantId,
      `cache:${datasetName}`,
      datasetName,
      granularity,
      windowStart,
      windowEnd,
      600,
    );
  }

  private async triggerRefresh(
    tenantId: string,
    name: string,
    snapshot: any,
  ) {
    try {
      const prisma = this.prisma.forTenant(tenantId);

      const records = await prisma.analyticsDataset.findMany({
        where: {
          tenantId,
          datasetName: snapshot.datasetName,
          granularity: snapshot.granularity,
          windowStart: { gte: snapshot.windowStart, lte: snapshot.windowEnd },
        },
        orderBy: { windowStart: 'asc' },
      });

      const expiresAt = new Date(Date.now() + snapshot.ttl * 1000);

      await prisma.analyticsSnapshot.update({
        where: { id: snapshot.id },
        data: {
          data: records,
          expiresAt,
          refreshedAt: new Date(),
        },
      });

      this.logger.log(`Background refresh complete for snapshot ${name}`);
    } catch (error: any) {
      this.logger.error(
        `Background refresh failed for snapshot ${name}: ${error.message}`,
      );
    }
  }
}
