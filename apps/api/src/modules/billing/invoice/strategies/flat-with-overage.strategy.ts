import { Injectable } from '@nestjs/common';
import type { Plan, UsageMeter, InvoiceLine, PricingStrategy } from '@shared/billing';

@Injectable()
export class FlatWithOverageStrategy implements PricingStrategy {
  async calculate(plan: Plan, usage: UsageMeter[]): Promise<InvoiceLine[]> {
    const lines: InvoiceLine[] = [];

    lines.push({
      description: `${plan.name} (base)`,
      amount: plan.price,
      quantity: 1,
    });

    for (const limit of plan.limits) {
      if (limit.overagePrice === undefined || limit.overagePrice === null) continue;
      if (limit.limit === 0) continue;

      const meter = usage.find((u) => u.metric === limit.metric);
      const used = meter?.value ?? 0;
      const overage = Math.max(0, used - limit.limit);
      if (overage <= 0) continue;

      const overageAmount = overage * limit.overagePrice;
      lines.push({
        description: `${limit.metric} overage (${overage} × ${limit.overagePrice}¢)`,
        amount: overageAmount,
        quantity: overage,
      });
    }

    return lines;
  }
}
