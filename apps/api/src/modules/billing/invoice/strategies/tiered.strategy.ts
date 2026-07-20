import { Injectable } from '@nestjs/common';
import type { Plan, UsageMeter, InvoiceLine, PricingStrategy, PlanLimit } from '@shared/billing';

interface TierConfig {
  from: number;
  to?: number;
  unitPrice: number;
}

@Injectable()
export class TieredStrategy implements PricingStrategy {
  async calculate(plan: Plan, usage: UsageMeter[]): Promise<InvoiceLine[]> {
    const lines: InvoiceLine[] = [];

    lines.push({
      description: `${plan.name} (base)`,
      amount: plan.price,
      quantity: 1,
    });

    for (const limit of plan.limits) {
      if (!limit.overagePrice) continue;

      const meter = usage.find((u) => u.metric === limit.metric);
      const used = meter?.value ?? 0;
      if (used <= 0) continue;

      const tiers = this.parseTiers(limit);
      let remaining = used;
      let tierIndex = 0;
      let lineAmount = 0;

      for (const tier of tiers) {
        if (remaining <= 0) break;
        const tierUnits = tier.to !== undefined
          ? Math.min(remaining, tier.to - tier.from + 1)
          : remaining;
        lineAmount += tierUnits * tier.unitPrice;
        remaining -= tierUnits;
        tierIndex++;
      }

      lines.push({
        description: `${limit.metric} (tiered, ${used} units)`,
        amount: lineAmount,
        quantity: used,
      });
    }

    return lines;
  }

  private parseTiers(limit: PlanLimit): TierConfig[] {
    if (typeof limit.overagePrice === 'number') {
      return [{ from: 0, unitPrice: limit.overagePrice }];
    }

    return [{ from: 0, unitPrice: 0 }];
  }
}
