import { describe, it, expect } from 'vitest';
import type {
  BillingPeriod,
  LimitType,
  Plan,
  SubscriptionStatus,
  Subscription,
  UsageMeter,
  CheckLimitResult,
  InvoiceStatus,
  Invoice,
  StripeWebhookEvent,
  MeteringCollector,
  PricingStrategy,
} from '../billing.types';

describe('Plan types compile correctly', () => {
  it('BillingPeriod accepts valid values', () => {
    const periods: BillingPeriod[] = ['monthly', 'yearly'];
    expect(periods).toHaveLength(2);
  });

  it('LimitType accepts valid values', () => {
    const types: LimitType[] = ['hard', 'soft'];
    expect(types).toHaveLength(2);
  });

  it('Plan valid shape compiles', () => {
    const plan: Plan = {
      id: 'plan-1',
      name: 'Basic',
      description: 'Basic plan',
      price: 2900,
      currency: 'usd',
      billingPeriod: 'monthly',
      pricingModel: 'flat',
      limits: [{ metric: 'workflows', limit: 100, type: 'hard' }],
      features: ['workflows', 'documents'],
      trialDays: 14,
      active: true,
    };
    expect(plan.name).toBe('Basic');
    expect(plan.price).toBe(2900);
    expect(plan.billingPeriod).toBe('monthly');
  });
});

describe('Subscription types compile correctly', () => {
  it('SubscriptionStatus accepts valid values', () => {
    const statuses: SubscriptionStatus[] = [
      'trialing', 'pending', 'active', 'past_due',
      'grace_period', 'suspended', 'cancelled', 'expired',
    ];
    expect(statuses).toHaveLength(8);
  });

  it('Subscription valid shape compiles', () => {
    const sub: Subscription = {
      id: 'sub-1',
      tenantId: 'tenant-1',
      planId: 'plan-1',
      status: 'active',
      currentPeriodStart: '2026-07-01T00:00:00Z',
      currentPeriodEnd: '2026-08-01T00:00:00Z',
    };
    expect(sub.status).toBe('active');
    expect(sub.currentPeriodStart).toBeDefined();
  });

  it('Subscription with optional trial fields', () => {
    const sub: Subscription = {
      id: 'sub-2',
      tenantId: 'tenant-2',
      planId: 'plan-2',
      status: 'trialing',
      currentPeriodStart: '2026-07-01T00:00:00Z',
      currentPeriodEnd: '2026-08-01T00:00:00Z',
      trialEnd: '2026-07-15T00:00:00Z',
      stripeCustomerId: 'cus_123',
    };
    expect(sub.trialEnd).toBeDefined();
    expect(sub.stripeCustomerId).toBe('cus_123');
  });
});

describe('UsageMeter interface', () => {
  it('valid meter shape compiles', () => {
    const meter: UsageMeter = {
      id: 'meter-1',
      tenantId: 't1',
      metric: 'workflows',
      periodStart: '2026-07-01T00:00:00Z',
      periodEnd: '2026-08-01T00:00:00Z',
      value: 42,
      overage: 0,
      isFinalized: false,
    };
    expect(meter.metric).toBe('workflows');
    expect(meter.value).toBe(42);
  });

  it('overage calculated when above limit', () => {
    const meter: UsageMeter = {
      id: 'meter-2',
      tenantId: 't1',
      metric: 'workflows',
      periodStart: '2026-07-01T00:00:00Z',
      periodEnd: '2026-08-01T00:00:00Z',
      value: 150,
      overage: 50,
      isFinalized: true,
    };
    expect(meter.overage).toBe(50);
    expect(meter.isFinalized).toBe(true);
  });
});

describe('CheckLimitResult interface', () => {
  it('allowed result with remaining count', () => {
    const result: CheckLimitResult = {
      allowed: true,
      metric: 'workflows',
      current: 25,
      limit: 100,
      remaining: 75,
      type: 'hard',
    };
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(75);
  });

  it('denied result when limit exceeded', () => {
    const result: CheckLimitResult = {
      allowed: false,
      metric: 'workflows',
      current: 100,
      limit: 100,
      remaining: 0,
      type: 'hard',
    };
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('soft limit allows operation', () => {
    const result: CheckLimitResult = {
      allowed: true,
      metric: 'documents',
      current: 500,
      limit: 500,
      remaining: 0,
      type: 'soft',
    };
    expect(result.allowed).toBe(true);
    expect(result.type).toBe('soft');
  });
});

describe('Invoice types compile correctly', () => {
  it('InvoiceStatus accepts valid values', () => {
    const statuses: InvoiceStatus[] = ['draft', 'unpaid', 'finalized', 'paid', 'failed', 'void'];
    expect(statuses).toHaveLength(6);
  });

  it('Invoice valid shape compiles', () => {
    const invoice: Invoice = {
      id: 'inv-1',
      subscriptionId: 'sub-1',
      tenantId: 't1',
      status: 'draft',
      periodStart: '2026-07-01T00:00:00Z',
      periodEnd: '2026-08-01T00:00:00Z',
      lines: [{ description: 'Base plan', amount: 2900 }],
      subtotal: 2900,
      total: 2900,
      dueDate: '2026-08-15T00:00:00Z',
    };
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.total).toBe(2900);
  });

  it('Invoice with optional stripe fields', () => {
    const invoice: Invoice = {
      id: 'inv-2',
      subscriptionId: 'sub-1',
      tenantId: 't1',
      status: 'paid',
      periodStart: '2026-06-01T00:00:00Z',
      periodEnd: '2026-07-01T00:00:00Z',
      lines: [{ description: 'Base plan', amount: 2900 }],
      subtotal: 2900,
      total: 2900,
      stripeInvoiceId: 'in_123',
      paidAt: '2026-07-01T12:00:00Z',
      dueDate: '2026-07-15T00:00:00Z',
    };
    expect(invoice.stripeInvoiceId).toBe('in_123');
    expect(invoice.paidAt).toBeDefined();
  });

  it('InvoiceLine with optional quantity', () => {
    const line = { description: 'Overage - API calls', amount: 500, quantity: 5 };
    expect(line.quantity).toBe(5);
  });
});

describe('StripeWebhookEvent interface', () => {
  it('valid webhook event compiles', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_123',
      type: 'invoice.paid',
      data: { object: { id: 'in_123' } },
      status: 'processed',
      processedAt: '2026-07-20T12:00:00Z',
      createdAt: '2026-07-20T12:00:00Z',
    };
    expect(event.type).toBe('invoice.paid');
    expect(event.status).toBe('processed');
  });

  it('WebhookEventStatus accepts valid values', () => {
    const statuses: StripeWebhookEvent['status'][] = ['pending', 'processed', 'failed', 'ignored'];
    expect(statuses).toHaveLength(4);
  });

  it('event with failure reason', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_456',
      type: 'payment_intent.payment_failed',
      data: { error: { message: 'card_declined' } },
      status: 'failed',
      failureReason: 'Card declined',
      createdAt: '2026-07-20T12:00:00Z',
    };
    expect(event.failureReason).toBe('Card declined');
  });
});

describe('MeteringCollector interface', () => {
  it('contract compiles', () => {
    const collector: MeteringCollector = {
      metric: 'workflows',
      limitType: 'hard',
      async collect(_tenantId, _start, _end) {
        return 42;
      },
    };
    expect(collector.metric).toBe('workflows');
    expect(typeof collector.collect).toBe('function');
  });

  it('collect returns a number', async () => {
    const collector: MeteringCollector = {
      metric: 'api_calls',
      limitType: 'soft',
      async collect(_tenantId, _start, _end) {
        return 100;
      },
    };
    const result = await collector.collect('t1', new Date(), new Date());
    expect(typeof result).toBe('number');
    expect(result).toBe(100);
  });
});

describe('PricingStrategy interface', () => {
  it('contract compiles', () => {
    const strategy: PricingStrategy = {
      async calculate(_plan, _usage) {
        return [{ description: 'Base charge', amount: 2900 }];
      },
    };
    expect(typeof strategy.calculate).toBe('function');
  });

  it('calculate returns InvoiceLine[]', async () => {
    const strategy: PricingStrategy = {
      async calculate(plan, usage) {
        const lines = [{ description: `${plan.name} base`, amount: plan.price }];
        for (const meter of usage) {
          if (meter.overage > 0) {
            lines.push({ description: `${meter.metric} overage`, amount: meter.overage * 10 });
          }
        }
        return lines;
      },
    };

    const result = await strategy.calculate(
      { id: 'p1', name: 'Pro', price: 9900 } as Plan,
      [{ metric: 'workflows', value: 120, overage: 20 } as UsageMeter],
    );
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].description).toContain('Pro');
  });
});
