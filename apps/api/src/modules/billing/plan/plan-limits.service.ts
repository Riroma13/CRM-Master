import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { CheckLimitResult, PlanLimit, LimitType } from '@shared/billing';

@Injectable()
export class PlanLimitsService {
  private readonly logger = new Logger(PlanLimitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkLimit(
    tenantId: string,
    metric: string,
  ): Promise<CheckLimitResult> {
    const subscription = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return {
        allowed: true,
        metric,
        current: 0,
        limit: 0,
        remaining: Infinity,
        type: 'soft',
      };
    }

    const limits = subscription.plan.limits as PlanLimit[];
    const limitDef = limits.find((l) => l.metric === metric);

    if (!limitDef) {
      return {
        allowed: true,
        metric,
        current: 0,
        limit: 0,
        remaining: Infinity,
        type: 'soft',
      };
    }

    if (limitDef.limit === 0) {
      return {
        allowed: true,
        metric,
        current: 0,
        limit: 0,
        remaining: Infinity,
        type: limitDef.type,
      };
    }

    const currentPeriodStart = subscription.currentPeriodStart;

    const agg = await this.prisma.admin.usageMeter.aggregate({
      where: {
        tenantId,
        metric,
        periodStart: { gte: currentPeriodStart },
        isFinalized: false,
      },
      _sum: { value: true },
    });

    const current = agg._sum.value ?? 0;
    const limit = limitDef.limit;
    const remaining = Math.max(0, limit - current);
    const type = limitDef.type;

    if (current >= limit) {
      return {
        allowed: false,
        metric,
        current,
        limit,
        remaining: 0,
        type,
      };
    }

    return {
      allowed: true,
      metric,
      current,
      limit,
      remaining,
      type,
    };
  }

  async getRemaining(tenantId: string, metric: string): Promise<number> {
    const result = await this.checkLimit(tenantId, metric);
    return result.remaining;
  }

  async getAllLimits(tenantId: string): Promise<CheckLimitResult[]> {
    const subscription = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return [];
    }

    const limits = subscription.plan.limits as PlanLimit[];
    const currentPeriodStart = subscription.currentPeriodStart;

    const results: CheckLimitResult[] = [];

    for (const limitDef of limits) {
      if (limitDef.limit === 0) {
        results.push({
          allowed: true,
          metric: limitDef.metric,
          current: 0,
          limit: 0,
          remaining: Infinity,
          type: limitDef.type,
        });
        continue;
      }

      const agg = await this.prisma.admin.usageMeter.aggregate({
        where: {
          tenantId,
          metric: limitDef.metric,
          periodStart: { gte: currentPeriodStart },
          isFinalized: false,
        },
        _sum: { value: true },
      });

      const current = agg._sum.value ?? 0;
      const limit = limitDef.limit;
      const remaining = Math.max(0, limit - current);
      const allowed = current < limit;

      results.push({
        allowed,
        metric: limitDef.metric,
        current,
        limit,
        remaining,
        type: limitDef.type,
      });
    }

    return results;
  }
}
