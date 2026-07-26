import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma.service';
import { FeatureFlagService } from '../feature-flags/feature-flags.service';
import type { FeatureKey } from '@shared/billing';

const TENANT_A = 'ff-doorbell-tenant-a';
const TENANT_B = 'ff-doorbell-tenant-b';

const FREE_PLAN = {
  id: 'plan-doorbell-free',
  name: 'Free',
  description: 'Free plan',
  price: 0,
  currency: 'usd',
  billingPeriod: 'monthly' as const,
  pricingModel: 'flat',
  limits: [],
  features: ['workflows', 'documents', 'api-access', 'basic-analytics'],
  trialDays: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PRO_PLAN = {
  id: 'plan-doorbell-pro',
  name: 'Pro',
  description: 'Pro plan',
  price: 9900,
  currency: 'usd',
  billingPeriod: 'monthly' as const,
  pricingModel: 'flat',
  limits: [],
  features: [
    'workflows',
    'documents',
    'api-access',
    'advanced-analytics',
    'email-notifications',
    'custom-branding',
    'priority-support',
    'audit-logs',
    'automation-hub',
  ],
  trialDays: 14,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeSubscriptionRow(tenantId: string, plan: any) {
  return {
    id: `sub-${tenantId}`,
    tenantId,
    planId: plan.id,
    status: 'active',
    currentPeriodStart: new Date('2025-01-01'),
    currentPeriodEnd: new Date('2025-02-01'),
    plan,
  };
}

describe('Feature Flags Cross-Tenant Isolation (Doorbell)', () => {
  let service: FeatureFlagService;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        subscription: {
          findUnique: jest.fn(),
        },
      },
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      rawListeners: jest.fn(),
      listeners: jest.fn(),
      listenerCount: jest.fn(),
      eventNames: jest.fn(),
      emitAsync: jest.fn(),
      waitFor: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(FeatureFlagService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (service as any).cache.clear();
  });

  it('Tenant A (Free) does not resolve features exclusive to Tenant B (Pro)', async () => {
    mockPrisma.admin.subscription.findUnique.mockImplementation(
      (args: { where: { tenantId: string } }) => {
        if (args.where.tenantId === TENANT_A) {
          return Promise.resolve(makeSubscriptionRow(TENANT_A, FREE_PLAN));
        }
        if (args.where.tenantId === TENANT_B) {
          return Promise.resolve(makeSubscriptionRow(TENANT_B, PRO_PLAN));
        }
        return Promise.resolve(null);
      },
    );

    // Tenant A has Free plan — should NOT have advanced-analytics
    const resultA = await service.isEnabled(
      TENANT_A,
      'advanced-analytics' as FeatureKey,
    );
    expect(resultA).toBe(false);

    // Tenant B has Pro plan — SHOULD have advanced-analytics
    const resultB = await service.isEnabled(
      TENANT_B,
      'advanced-analytics' as FeatureKey,
    );
    expect(resultB).toBe(true);
  });

  it('Cache of Tenant A is not affected by queries of Tenant B', async () => {
    mockPrisma.admin.subscription.findUnique.mockImplementation(
      (args: { where: { tenantId: string } }) => {
        if (args.where.tenantId === TENANT_A) {
          return Promise.resolve(makeSubscriptionRow(TENANT_A, FREE_PLAN));
        }
        if (args.where.tenantId === TENANT_B) {
          return Promise.resolve(makeSubscriptionRow(TENANT_B, PRO_PLAN));
        }
        return Promise.resolve(null);
      },
    );

    // Query Tenant B to populate their cache
    await service.isEnabled(TENANT_B, 'advanced-analytics' as FeatureKey);
    const dbCallsAfterB = mockPrisma.admin.subscription.findUnique.mock.calls.length;

    // Query Tenant A — should NOT use Tenant B's cached result
    const resultA = await service.isEnabled(
      TENANT_A,
      'advanced-analytics' as FeatureKey,
    );
    expect(resultA).toBe(false);

    // Tenant A's query should trigger a DB lookup (different tenant key)
    const dbCallsAfterA = mockPrisma.admin.subscription.findUnique.mock.calls.length;
    expect(dbCallsAfterA).toBe(dbCallsAfterB + 1);

    // Now query Tenant B again — should use cache, no DB call
    const resultB2 = await service.isEnabled(
      TENANT_B,
      'advanced-analytics' as FeatureKey,
    );
    expect(resultB2).toBe(true);

    const dbCallsAfterB2 = mockPrisma.admin.subscription.findUnique.mock.calls.length;
    expect(dbCallsAfterB2).toBe(dbCallsAfterA); // No additional DB call
  });
});
