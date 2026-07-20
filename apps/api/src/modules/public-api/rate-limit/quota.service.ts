import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { QuotaResult } from '@shared/public-api';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);
  private readonly DEFAULT_MONTHLY_LIMIT = 10_000;

  constructor(private readonly prisma: PrismaService) {}

  async checkQuota(tenantId: string): Promise<QuotaResult> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let quota = await this.prisma.admin.apiQuota.findUnique({
      where: { tenantId },
    });

    if (!quota) {
      quota = await this.prisma.admin.apiQuota.create({
        data: {
          tenantId,
          month: currentMonth,
          usedThisMonth: 0,
          monthlyLimit: this.DEFAULT_MONTHLY_LIMIT,
        },
      });
    }

    if (quota.month !== currentMonth) {
      quota = await this.prisma.admin.apiQuota.update({
        where: { id: quota.id },
        data: { month: currentMonth, usedThisMonth: 0 },
      });
    }

    const allowed = quota.usedThisMonth < quota.monthlyLimit;
    return {
      allowed,
      used: quota.usedThisMonth,
      limit: quota.monthlyLimit,
      resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    };
  }

  async incrementUsage(tenantId: string): Promise<void> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await this.prisma.admin.apiQuota.upsert({
      where: { tenantId },
      create: {
        tenantId,
        month: currentMonth,
        usedThisMonth: 1,
        monthlyLimit: this.DEFAULT_MONTHLY_LIMIT,
      },
      update: {
        usedThisMonth: { increment: 1 },
        month: currentMonth,
      },
    }).catch((err: Error) => {
      this.logger.warn(`Failed to increment quota for tenant ${tenantId}: ${err.message}`);
    });
  }
}
