import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import type { MeteringCollector, LimitType } from '@shared/billing';

@Injectable()
export class WorkflowCollector implements MeteringCollector {
  readonly metric = 'total_workflows';
  readonly limitType: LimitType = 'hard';

  constructor(private readonly prisma: PrismaService) {}

  async collect(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const agg = await this.prisma.admin.analyticsDataset.aggregate({
      where: {
        tenantId,
        datasetName: 'workflows',
        metricName: 'completed',
        windowStart: { gte: periodStart, lte: periodEnd },
      },
      _sum: { value: true },
    });

    return agg._sum.value ?? 0;
  }
}
