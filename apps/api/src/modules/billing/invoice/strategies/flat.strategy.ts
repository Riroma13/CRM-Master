import { Injectable } from '@nestjs/common';
import type { Plan, UsageMeter, InvoiceLine, PricingStrategy } from '@shared/billing';

@Injectable()
export class FlatStrategy implements PricingStrategy {
  async calculate(plan: Plan, _usage: UsageMeter[]): Promise<InvoiceLine[]> {
    return [
      {
        description: `${plan.name} (flat)`,
        amount: plan.price,
        quantity: 1,
      },
    ];
  }
}
