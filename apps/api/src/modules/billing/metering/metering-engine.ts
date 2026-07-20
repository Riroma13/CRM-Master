import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface MeterRecord {
  tenantId: string;
  metric: string;
  periodStart: Date;
  periodEnd: Date;
  value: number;
  isFinalized: boolean;
}

@Injectable()
export class MeteringEngine {
  private readonly logger = new Logger(MeteringEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordUsage(
    tenantId: string,
    metric: string,
    value: number,
    periodStart: Date,
  ): Promise<void> {
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await this.prisma.admin.usageMeter.upsert({
      where: {
        tenantId_metric_periodStart: { tenantId, metric, periodStart },
      },
      create: {
        tenantId,
        metric,
        periodStart,
        periodEnd,
        value,
        isFinalized: false,
      },
      update: {
        value,
        periodEnd,
      },
    });

    this.logger.debug(
      `Usage recorded: tenant=${tenantId} metric=${metric} value=${value}`,
    );
  }

  async getUsage(
    tenantId: string,
    metric: string,
    periodStart: Date,
    periodEnd?: Date,
  ): Promise<number> {
    const where: any = {
      tenantId,
      metric,
      periodStart: { gte: periodStart },
    };

    if (periodEnd) {
      where.periodStart.lte = periodEnd;
    }

    const agg = await this.prisma.admin.usageMeter.aggregate({
      where,
      _sum: { value: true },
    });

    return agg._sum.value ?? 0;
  }

  async getAllUsage(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MeterRecord[]> {
    const records = await this.prisma.admin.usageMeter.findMany({
      where: {
        tenantId,
        periodStart: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { metric: 'asc' },
    });

    return records.map((r: any) => ({
      tenantId: r.tenantId,
      metric: r.metric,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      value: r.value,
      isFinalized: r.isFinalized,
    }));
  }

  async finalizePeriod(
    tenantId: string,
    periodStart: Date,
  ): Promise<void> {
    this.logger.log(
      `Finalizing period for tenant=${tenantId} periodStart=${periodStart.toISOString()}`,
    );

    const meters = await this.prisma.admin.usageMeter.findMany({
      where: {
        tenantId,
        periodStart,
        isFinalized: false,
      },
    });

    for (const meter of meters) {
      const agg = await this.prisma.admin.usageMeter.aggregate({
        where: {
          tenantId,
          metric: meter.metric,
          periodStart: { gte: periodStart },
          isFinalized: false,
        },
        _sum: { value: true },
      });

      const finalValue = agg._sum.value ?? meter.value;

      await this.prisma.admin.usageMeter.update({
        where: { id: meter.id },
        data: {
          value: finalValue,
          isFinalized: true,
        },
      });
    }

    this.logger.log(
      `Period finalized: tenant=${tenantId} periodStart=${periodStart.toISOString()} meters=${meters.length}`,
    );
  }

  async collectFromDataset(
    tenantId: string,
    metric: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const [datasetName, metricName] = metric.split('.');

    const agg = await this.prisma.admin.analyticsDataset.aggregate({
      where: {
        tenantId,
        datasetName,
        metricName,
        windowStart: { gte: periodStart, lte: periodEnd },
      },
      _sum: { value: true },
    });

    const value = agg._sum.value ?? 0;

    await this.recordUsage(tenantId, metric, value, periodStart);

    return value;
  }
}
