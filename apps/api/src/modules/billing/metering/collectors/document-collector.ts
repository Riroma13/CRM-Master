import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import type { MeteringCollector, LimitType } from '@shared/billing';

@Injectable()
export class DocumentCollector implements MeteringCollector {
  readonly metric = 'total_documents';
  readonly limitType: LimitType = 'soft';

  constructor(private readonly prisma: PrismaService) {}

  async collect(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const agg = await this.prisma.admin.analyticsDataset.aggregate({
      where: {
        tenantId,
        datasetName: 'documents',
        metricName: 'created',
        windowStart: { gte: periodStart, lte: periodEnd },
      },
      _sum: { value: true },
    });

    return agg._sum.value ?? 0;
  }
}
