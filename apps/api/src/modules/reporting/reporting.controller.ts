import { Controller, Post, Param, Query, Body } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Logger } from '@nestjs/common';

@Controller('api/v1/reporting')
export class ReportingController {
  private readonly logger = new Logger(ReportingController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('datasets/:name/replay')
  async replay(
    @Param('name') datasetName: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Body('tenantId') tenantId: string,
  ): Promise<{ replayed: number; failed: number }> {
    if (!from || !to) {
      throw new Error('from and to query params are required');
    }
    if (!tenantId) {
      throw new Error('tenantId is required in body');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const prisma = this.prisma.forTenant(tenantId);

    const events = await prisma.datasetIngestionLog.findMany({
      where: {
        tenantId,
        datasetName,
        timestamp: { gte: fromDate, lte: toDate },
        status: 'processed',
        eventId: { not: null },
      },
      orderBy: { timestamp: 'asc' },
    });

    let replayed = 0;
    let failed = 0;

    for (const event of events) {
      try {
        const eventDate = event.timestamp;
        const windowStart =
          event.windowStart ??
          new Date(Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()));

        const compositeId = {
          tenantId_datasetName_metricName_granularity_windowStart: {
            tenantId,
            datasetName: event.datasetName,
            metricName: event.metricName,
            granularity: 'day',
            windowStart,
          },
        };

        await prisma.analyticsDataset.upsert({
          where: compositeId,
          create: {
            tenantId,
            datasetName: event.datasetName,
            metricName: event.metricName,
            granularity: 'day',
            windowStart,
            value: event.value,
            dimensions: {},
          },
          update: {
            value: { increment: event.value },
          },
        });

        replayed++;
      } catch (error: any) {
        this.logger.error(`Replay failed for event ${event.id}: ${error.message}`);
        failed++;
      }
    }

    return { replayed, failed };
  }
}
