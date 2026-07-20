import type { Plan, UsageMeter, PricingStrategy, PlanLimit } from '@shared/billing';
import { FlatWithOverageStrategy } from '../invoice/strategies/flat-with-overage.strategy';
import { PerUnitStrategy } from '../invoice/strategies/per-unit.strategy';
import { FlatStrategy } from '../invoice/strategies/flat.strategy';
import { TieredStrategy } from '../invoice/strategies/tiered.strategy';

const basePlan: Plan = {
  id: 'plan-test-001',
  name: 'Test Plan',
  description: 'A test plan',
  price: 2999,
  currency: 'usd',
  billingPeriod: 'monthly',
  pricingModel: 'flat_with_overage',
  limits: [],
  features: ['basic'],
  trialDays: 14,
  active: true,
};

function makeMeter(metric: string, value: number, overage = 0): UsageMeter {
  return {
    id: `meter-${metric}`,
    tenantId: 'tenant-001',
    metric,
    periodStart: '2025-01-01T00:00:00.000Z',
    periodEnd: '2025-02-01T00:00:00.000Z',
    value,
    overage,
    isFinalized: true,
  };
}

function makeLimit(
  metric: string,
  limit: number,
  overagePrice?: number,
  type: 'hard' | 'soft' = 'soft',
): PlanLimit {
  return { metric, limit, overagePrice, type };
}

describe('FlatStrategy', () => {
  const strategy: PricingStrategy = new FlatStrategy();

  it('returns base price as single line', async () => {
    const lines = await strategy.calculate(basePlan, []);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(2999);
    expect(lines[0].description).toContain('flat');
  });

  it('ignores usage meters entirely', async () => {
    const usage = [makeMeter('workflows', 500)];
    const lines = await strategy.calculate(basePlan, usage);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(2999);
  });

  it('handles zero price plan', async () => {
    const freePlan = { ...basePlan, price: 0 };
    const lines = await strategy.calculate(freePlan, []);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(0);
  });
});

describe('FlatWithOverageStrategy', () => {
  const strategy: PricingStrategy = new FlatWithOverageStrategy();

  it('charges base price when usage is within limits', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('workflows', 100, 50)],
    };
    const usage = [makeMeter('workflows', 50)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(2999);
  });

  it('charges overage when usage exceeds limit', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('workflows', 100, 50)],
    };
    const usage = [makeMeter('workflows', 150)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(2);
    expect(lines[0].amount).toBe(2999);
    expect(lines[1].amount).toBe(50 * 50);
    expect(lines[1].description).toContain('workflows overage');
  });

  it('calculates overage correctly: max(0, usage - limit) × overagePrice', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('documents', 1000, 10)],
    };
    const usage = [makeMeter('documents', 1200)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(2);
    expect(lines[1].amount).toBe(200 * 10);
  });

  it('does not charge negative overage', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('api_calls', 5000, 2)],
    };
    const usage = [makeMeter('api_calls', 3000)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(1);
  });

  it('handles multiple metrics with overage', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [
        makeLimit('workflows', 100, 50),
        makeLimit('documents', 1000, 10),
      ],
    };
    const usage = [
      makeMeter('workflows', 200),
      makeMeter('documents', 1500),
    ];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(3);
    expect(lines[0].amount).toBe(2999);
    expect(lines[1].amount).toBe(100 * 50);
    expect(lines[2].amount).toBe(500 * 10);
  });

  it('skips limits without overagePrice', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('workflows', 100)],
    };
    const usage = [makeMeter('workflows', 200)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(1);
  });

  it('skips limits with limit 0 (unlimited)', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('workflows', 0, 50)],
    };
    const usage = [makeMeter('workflows', 9999)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(1);
  });

  it('returns zero overage when no meter matches the metric', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('unknown_metric', 100, 50)],
    };
    const lines = await strategy.calculate(plan, []);
    expect(lines).toHaveLength(1);
  });
});

describe('PerUnitStrategy', () => {
  const strategy: PricingStrategy = new PerUnitStrategy();

  it('charges base price plus per-unit amounts', async () => {
    const plan: Plan = {
      ...basePlan,
      price: 999,
      limits: [makeLimit('api_calls', 0, 1)],
    };
    const usage = [makeMeter('api_calls', 5000)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(2);
    expect(lines[0].amount).toBe(999);
    expect(lines[1].amount).toBe(5000);
  });

  it('works without base price', async () => {
    const plan: Plan = {
      ...basePlan,
      price: 0,
      limits: [makeLimit('messages', 0, 5)],
    };
    const usage = [makeMeter('messages', 100)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(500);
  });

  it('skips metrics with no usage', async () => {
    const plan: Plan = {
      ...basePlan,
      price: 0,
      limits: [makeLimit('messages', 0, 5)],
    };
    const lines = await strategy.calculate(plan, []);
    expect(lines).toHaveLength(0);
  });

  it('skips limits without overagePrice', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('api_calls', 1000)],
    };
    const usage = [makeMeter('api_calls', 500)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(basePlan.price);
  });
});

describe('TieredStrategy', () => {
  const strategy: PricingStrategy = new TieredStrategy();

  it('charges base price and tiered usage as single line', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('workflows', 0, 30)],
    };
    const usage = [makeMeter('workflows', 10)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(2);
    expect(lines[0].amount).toBe(2999);
    expect(lines[1].amount).toBe(10 * 30);
  });

  it('handles only base price when no usage', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('workflows', 0, 30)],
    };
    const lines = await strategy.calculate(plan, []);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(2999);
  });

  it('handles zero usage gracefully', async () => {
    const plan: Plan = {
      ...basePlan,
      limits: [makeLimit('workflows', 0, 30)],
    };
    const usage = [makeMeter('workflows', 0)];
    const lines = await strategy.calculate(plan, usage);
    expect(lines).toHaveLength(1);
  });
});
