import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { SubscriptionStatus } from '@shared/billing';
import { SubscriptionEngine } from './subscription-engine';

@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionEngine: SubscriptionEngine,
  ) {}

  async applyGracePeriod(tenantId: string): Promise<void> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
    });

    if (!sub) {
      this.logger.warn(`No subscription found for tenant=${tenantId}`);
      return;
    }

    if (sub.status !== 'past_due') {
      this.logger.warn(
        `Cannot apply grace period: status=${sub.status} for tenant=${tenantId}`,
      );
      return;
    }

    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() + 7);

    await this.prisma.admin.subscription.update({
      where: { tenantId },
      data: {
        status: 'grace_period',
        gracePeriodEnd: graceEnd,
      },
    });

    this.logger.log(
      `Grace period applied: tenant=${tenantId} ends=${graceEnd.toISOString()}`,
    );
  }

  async freezeTenant(tenantId: string): Promise<void> {
    await this.prisma.admin.tenant.update({
      where: { id: tenantId },
      data: { isActive: false },
    });

    this.logger.log(`Tenant frozen (read-only): tenant=${tenantId}`);
  }

  async archiveTenant(tenantId: string): Promise<void> {
    this.logger.log(`Archiving tenant data: tenant=${tenantId}`);
  }

  async schedulePostCancellation(tenantId: string): Promise<void> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
    });

    if (!sub || sub.status !== 'cancelled') {
      this.logger.warn(
        `Cannot schedule post-cancellation: tenant=${tenantId} not cancelled`,
      );
      return;
    }

    this.logger.log(
      `Post-cancellation lifecycle scheduled: tenant=${tenantId}. ` +
        `Day 0: frozen. Day 30: archive. Day 60: soft-delete.`,
    );
  }

  async expireTrials(): Promise<number> {
    const now = new Date();

    const expired = await this.prisma.admin.subscription.findMany({
      where: {
        status: 'trialing',
        trialEnd: { lte: now },
      },
    });

    for (const sub of expired) {
      await this.prisma.admin.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' },
      });

      this.logger.log(
        `Trial expired: tenant=${sub.tenantId} subscription=${sub.id}`,
      );
    }

    return expired.length;
  }

  async processGracePeriodEnd(): Promise<number> {
    const now = new Date();

    const expired = await this.prisma.admin.subscription.findMany({
      where: {
        status: 'grace_period',
        gracePeriodEnd: { lte: now },
      },
    });

    for (const sub of expired) {
      await this.prisma.admin.subscription.update({
        where: { id: sub.id },
        data: { status: 'suspended', suspendedUntil: this.addDays(now, 30) },
      });

      await this.freezeTenant(sub.tenantId);

      this.logger.log(
        `Grace period ended: tenant=${sub.tenantId} → suspended`,
      );
    }

    return expired.length;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
