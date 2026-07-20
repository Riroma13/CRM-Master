import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { Plan, PlanLimit } from '@shared/billing';

interface CreatePlanData {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billingPeriod?: string;
  pricingModel: string;
  limits: PlanLimit[];
  features: string[];
  trialDays?: number;
}

interface UpdatePlanData {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  billingPeriod?: string;
  pricingModel?: string;
  limits?: PlanLimit[];
  features?: string[];
  trialDays?: number;
}

@Injectable()
export class PlanCatalogService {
  private readonly logger = new Logger(PlanCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPlans(activeOnly = false): Promise<Plan[]> {
    const where = activeOnly ? { active: true } : {};
    const plans = await this.prisma.admin.plan.findMany({
      where,
      orderBy: { price: 'asc' },
    });
    return plans.map(this.toPlan);
  }

  async getPlan(planId: string): Promise<Plan> {
    const plan = await this.prisma.admin.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return this.toPlan(plan);
  }

  async createPlan(data: CreatePlanData): Promise<Plan> {
    const plan = await this.prisma.admin.plan.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency ?? 'usd',
        billingPeriod: data.billingPeriod ?? 'monthly',
        pricingModel: data.pricingModel,
        limits: data.limits,
        features: data.features,
        trialDays: data.trialDays ?? 14,
      },
    });
    this.logger.log(`Plan created: ${plan.id} (${plan.name})`);
    return this.toPlan(plan);
  }

  async updatePlan(planId: string, data: UpdatePlanData): Promise<Plan> {
    const existing = await this.prisma.admin.plan.findUnique({
      where: { id: planId },
    });
    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    const plan = await this.prisma.admin.plan.update({
      where: { id: planId },
      data,
    });
    this.logger.log(`Plan updated: ${planId}`);
    return this.toPlan(plan);
  }

  async activatePlan(planId: string): Promise<Plan> {
    const existing = await this.prisma.admin.plan.findUnique({
      where: { id: planId },
    });
    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    const plan = await this.prisma.admin.plan.update({
      where: { id: planId },
      data: { active: true },
    });
    this.logger.log(`Plan activated: ${planId}`);
    return this.toPlan(plan);
  }

  async deactivatePlan(planId: string): Promise<Plan> {
    const existing = await this.prisma.admin.plan.findUnique({
      where: { id: planId },
    });
    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    const plan = await this.prisma.admin.plan.update({
      where: { id: planId },
      data: { active: false },
    });
    this.logger.log(`Plan deactivated: ${planId}`);
    return this.toPlan(plan);
  }

  private toPlan(row: any): Plan {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      currency: row.currency,
      billingPeriod: row.billingPeriod as 'monthly' | 'yearly',
      pricingModel: row.pricingModel,
      limits: row.limits as PlanLimit[],
      features: row.features,
      trialDays: row.trialDays,
      active: row.active,
    };
  }
}
