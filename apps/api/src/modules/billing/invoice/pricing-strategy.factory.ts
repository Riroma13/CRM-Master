import { Injectable, Inject } from '@nestjs/common';
import type { PricingStrategy } from '@shared/billing';

const STRATEGY_KEY_MAP: Record<string, string> = {
  FlatWithOverageStrategy: 'flat_with_overage',
  FlatStrategy: 'flat',
  PerUnitStrategy: 'per_unit',
  TieredStrategy: 'tiered',
};

@Injectable()
export class PricingStrategyFactory {
  private readonly strategies = new Map<string, PricingStrategy>();

  constructor(
    @Inject('PRICING_STRATEGIES')
    strategies: PricingStrategy[],
  ) {
    for (const strategy of strategies) {
      const name = strategy.constructor.name;
      const key = STRATEGY_KEY_MAP[name];
      if (key) {
        this.strategies.set(key, strategy);
      }
    }
  }

  getStrategy(pricingModel: string): PricingStrategy {
    const key = pricingModel.toLowerCase().replace(/-/g, '_');
    const strategy = this.strategies.get(key);

    if (!strategy) {
      throw new Error(`No pricing strategy found for model: ${pricingModel}`);
    }

    return strategy;
  }
}
