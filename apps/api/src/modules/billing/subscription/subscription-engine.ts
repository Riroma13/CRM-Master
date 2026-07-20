import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type {
  Subscription,
  SubscriptionStatus,
} from '@shared/billing';
import {
  canTransition,
  assertValidTransition,
  isTerminal,
} from './state-machine';

interface CreateSubscriptionInput {
  tenantId: string;
  planId: string;
  stripeCustomerId?: string;
}

interface ProrationResult {
  proratedAmount: number;
  remainingDays: number;
  totalDays: number;
}

@Injectable()
export class SubscriptionEngine {
  private readonly logger = new Logger(SubscriptionEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<Subscription> {
    const plan = await this.prisma.admin.plan.findUnique({
      where: { id: input.planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, plan.billingPeriod);
    const hasTrial = plan.trialDays > 0;

    const status: SubscriptionStatus = hasTrial ? 'trialing' : 'active';
    const trialEnd = hasTrial
      ? this.addDays(now, plan.trialDays)
      : undefined;

    const subscription = await this.prisma.admin.subscription.create({
      data: {
        tenantId: input.tenantId,
        planId: input.planId,
        status,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd,
        stripeCustomerId: input.stripeCustomerId,
      },
    });

    this.logger.log(
      `Subscription created: tenant=${input.tenantId} plan=${input.planId} status=${status}`,
    );

    return this.toSubscription(subscription);
  }

  async getSubscription(
    tenantId: string,
  ): Promise<Subscription | null> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    return sub ? this.toSubscription(sub) : null;
  }

  async changePlan(
    tenantId: string,
    newPlanId: string,
  ): Promise<Subscription> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    const currentStatus = sub.status as SubscriptionStatus;

    if (isTerminal(currentStatus)) {
      throw new BadRequestException(
        'Cannot change plan on a terminal subscription',
      );
    }

    assertValidTransition(currentStatus, 'active');

    const newPlan = await this.prisma.admin.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException('New plan not found');
    }

    const currentPrice = sub.plan.price;
    const newPrice = newPlan.price;
    const isUpgrade = newPrice > currentPrice;

    if (isUpgrade) {
      const proration = this.calculateProration(
        sub.currentPeriodStart,
        sub.currentPeriodEnd,
        currentPrice,
        newPrice,
      );

      this.logger.log(
        `Upgrade: tenant=${tenantId} from=$${currentPrice} to=$${newPrice} proration=${proration.proratedAmount}`,
      );

      const updated = await this.prisma.admin.subscription.update({
        where: { tenantId },
        data: {
          planId: newPlanId,
          pendingPlanId: null,
        },
      });

      return this.toSubscription(updated);
    }

    const updated = await this.prisma.admin.subscription.update({
      where: { tenantId },
      data: { pendingPlanId: newPlanId },
    });

    this.logger.log(
      `Downgrade scheduled: tenant=${tenantId} from=$${currentPrice} to=$${newPrice} (next period)`,
    );

    return this.toSubscription(updated);
  }

  async applyPendingPlan(tenantId: string): Promise<Subscription> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
    });

    if (!sub || !sub.pendingPlanId) {
      throw new BadRequestException(
        'No pending plan change found',
      );
    }

    const updated = await this.prisma.admin.subscription.update({
      where: { tenantId },
      data: {
        planId: sub.pendingPlanId,
        pendingPlanId: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(
          new Date(),
          'monthly',
        ),
      },
    });

    this.logger.log(
      `Pending plan applied: tenant=${tenantId} plan=${sub.pendingPlanId}`,
    );

    return this.toSubscription(updated);
  }

  async cancelSubscription(tenantId: string): Promise<Subscription> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    const currentStatus = sub.status as SubscriptionStatus;

    assertValidTransition(currentStatus, 'cancelled');

    const updated = await this.prisma.admin.subscription.update({
      where: { tenantId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    this.logger.log(`Subscription cancelled: tenant=${tenantId}`);

    return this.toSubscription(updated);
  }

  async reactivateSubscription(
    tenantId: string,
  ): Promise<Subscription> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    if (sub.status !== 'cancelled') {
      throw new BadRequestException(
        'Only cancelled subscriptions can be reactivated',
      );
    }

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, 'monthly');

    const updated = await this.prisma.admin.subscription.update({
      where: { tenantId },
      data: {
        status: 'active',
        cancelledAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    this.logger.log(
      `Subscription reactivated: tenant=${tenantId}`,
    );

    return this.toSubscription(updated);
  }

  async updateStatus(
    tenantId: string,
    newStatus: SubscriptionStatus,
  ): Promise<Subscription> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    const currentStatus = sub.status as SubscriptionStatus;
    assertValidTransition(currentStatus, newStatus);

    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (newStatus === 'grace_period') {
      updateData.gracePeriodEnd = this.addDays(new Date(), 7);
    }

    if (newStatus === 'suspended') {
      updateData.suspendedUntil = this.addDays(new Date(), 30);
    }

    const updated = await this.prisma.admin.subscription.update({
      where: { tenantId },
      data: updateData as any,
    });

    this.logger.log(
      `Subscription status updated: tenant=${tenantId} ${currentStatus} → ${newStatus}`,
    );

    return this.toSubscription(updated);
  }

  async updateSubscriptionWithStripeIds(
    tenantId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
  ): Promise<Subscription> {
    const sub = await this.prisma.admin.subscription.findUnique({
      where: { tenantId },
    });

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    assertValidTransition(sub.status as SubscriptionStatus, 'active');

    const updated = await this.prisma.admin.subscription.update({
      where: { tenantId },
      data: {
        status: 'active',
        stripeCustomerId,
        stripeSubscriptionId,
      },
    });

    this.logger.log(
      `Subscription activated with Stripe IDs: tenant=${tenantId}`,
    );

    return this.toSubscription(updated);
  }

  async getPlanPrice(planId: string): Promise<number> {
    const plan = await this.prisma.admin.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan.price;
  }

  private calculateProration(
    periodStart: Date,
    periodEnd: Date,
    oldPrice: number,
    newPrice: number,
  ): ProrationResult {
    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const remainingMs = periodEnd.getTime() - Date.now();

    if (totalMs <= 0) {
      return { proratedAmount: 0, remainingDays: 0, totalDays: 0 };
    }

    const totalDays = Math.max(1, Math.ceil(totalMs / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    const priceDiff = newPrice - oldPrice;

    const proratedAmount = Math.round(
      (remainingDays / totalDays) * priceDiff,
    );

    return { proratedAmount, remainingDays, totalDays };
  }

  private calculatePeriodEnd(
    from: Date,
    billingPeriod: string,
  ): Date {
    const end = new Date(from);

    if (billingPeriod === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }

    return end;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private toSubscription(row: any): Subscription {
    return {
      id: row.id,
      tenantId: row.tenantId,
      planId: row.planId,
      pendingPlanId: row.pendingPlanId ?? undefined,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: row.currentPeriodStart.toISOString(),
      currentPeriodEnd: row.currentPeriodEnd.toISOString(),
      trialEnd: row.trialEnd?.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString(),
      gracePeriodEnd: row.gracePeriodEnd?.toISOString(),
      suspendedUntil: row.suspendedUntil?.toISOString(),
      stripeCustomerId: row.stripeCustomerId ?? undefined,
      stripeSubscriptionId: row.stripeSubscriptionId ?? undefined,
    };
  }
}
