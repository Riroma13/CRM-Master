import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import type { MeteringCollector, LimitType } from '@shared/billing';

@Injectable()
export class ApiCollector implements MeteringCollector {
  readonly metric = 'total_api_calls';
  readonly limitType: LimitType = 'hard';

  constructor(private readonly prisma: PrismaService) {}

  async collect(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const count = await this.prisma.admin.auditLog.count({
      where: {
        tenantId,
        resource: { in: ['api', 'api_key'] },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    return count;
  }
}
