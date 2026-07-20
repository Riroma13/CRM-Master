import { Injectable } from '@nestjs/common';
import type { Plan, UsageMeter, InvoiceLine, PricingStrategy } from '@shared/billing';

@Injectable()
export class PerUnitStrategy implements PricingStrategy {
  async calculate(plan: Plan, usage: UsageMeter[]): Promise<InvoiceLine[]> {
    const lines: InvoiceLine[] = [];

    if (plan.price > 0) {
      lines.push({
        description: `${plan.name} (base)`,
        amount: plan.price,
        quantity: 1,
      });
    }

    for (const limit of plan.limits) {
      if (limit.overagePrice === undefined || limit.overagePrice === null) continue;

      const meter = usage.find((u) => u.metric === limit.metric);
      const used = meter?.value ?? 0;
      if (used <= 0) continue;

      const amount = used * limit.overagePrice;
      lines.push({
        description: `${limit.metric} (${used} × ${limit.overagePrice}¢)`,
        amount,
        quantity: used,
      });
    }

    return lines;
  }
}
