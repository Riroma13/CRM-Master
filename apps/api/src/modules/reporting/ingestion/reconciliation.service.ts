import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkDatasetHealth(
    tenantId: string,
    datasetName: string,
  ): Promise<{ healthy: boolean; expectedCount: number; actualCount: number; lastEvent: string | null }> {
    const prisma = this.prisma.forTenant(tenantId);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [expectedCount, actualCount, lastLog] = await Promise.all([
      prisma.datasetIngestionLog.count({
        where: {
          tenantId,
          datasetName,
          windowStart: { gte: sevenDaysAgo },
          status: 'processed',
        },
      }),
      prisma.analyticsDataset.count({
        where: {
          tenantId,
          datasetName,
          windowStart: { gte: sevenDaysAgo },
        },
      }),
      prisma.datasetIngestionLog.findFirst({
        where: { tenantId, datasetName, status: 'processed' },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    return {
      healthy: expectedCount === actualCount,
      expectedCount,
      actualCount,
      lastEvent: lastLog?.timestamp.toISOString() ?? null,
    };
  }

  async findGaps(
    tenantId: string,
    datasetName: string,
    from: Date,
    to: Date,
  ): Promise<{ gaps: string[]; totalWindows: number; populatedWindows: number }> {
    const prisma = this.prisma.forTenant(tenantId);

    const windows = await prisma.analyticsDataset.findMany({
      where: {
        tenantId,
        datasetName,
        windowStart: { gte: from, lte: to },
        granularity: 'day',
      },
      select: { windowStart: true },
      orderBy: { windowStart: 'asc' },
    });

    const populatedSet = new Set(windows.map((w: { windowStart: Date }) => w.windowStart.toISOString().slice(0, 10)));

    const gaps: string[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      const dayKey = cursor.toISOString().slice(0, 10);
      if (!populatedSet.has(dayKey)) {
        gaps.push(dayKey);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      gaps,
      totalWindows: Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1,
      populatedWindows: windows.length,
    };
  }
}
