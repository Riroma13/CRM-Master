import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma.service';
import { FeatureFlagService } from '../feature-flags/feature-flags.service';
import type { FeatureKey } from '@shared/billing';

const TENANT_A = 'tenant-ff-a-001';
const TENANT_B = 'tenant-ff-b-001';

const BASE_PLAN = {
  id: 'plan-ff-pro',
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

const FREE_PLAN = {
  ...BASE_PLAN,
  id: 'plan-ff-free',
  name: 'Free',
  price: 0,
  features: ['workflows', 'documents', 'api-access', 'basic-analytics'],
  trialDays: 0,
};

function makeSubscriptionRow(
  tenantId: string,
  status: string,
  plan: any = BASE_PLAN,
) {
  return {
    id: `sub-${tenantId}`,
    tenantId,
    planId: plan.id,
    status,
    currentPeriodStart: new Date('2025-01-01'),
    currentPeriodEnd: new Date('2025-02-01'),
    plan,
  };
}

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let mockPrisma: any;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        subscription: {
          findUnique: jest.fn(),
        },
      },
    };

    mockEventEmitter = {
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
    // Clear the internal cache between tests
    (service as any).cache.clear();
  });

  describe('isEnabled', () => {
    it('returns true when feature is in plan', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'active'),
      );

      const result = await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      expect(result).toBe(true);
    });

    it('returns false when feature is not in plan', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'active'),
      );

      const result = await service.isEnabled(
        TENANT_A,
        'dedicated-infrastructure' as FeatureKey,
      );

      expect(result).toBe(false);
    });

    it('returns false for expired subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'expired'),
      );

      const result = await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      expect(result).toBe(false);
    });

    it('returns false for cancelled subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'cancelled'),
      );

      const result = await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      expect(result).toBe(false);
    });

    it('returns false for past_due subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'past_due'),
      );

      const result = await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      expect(result).toBe(false);
    });

    it('returns false for suspended subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'suspended'),
      );

      const result = await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      expect(result).toBe(false);
    });

    it('returns true for trialing subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'trialing'),
      );

      const result = await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      expect(result).toBe(true);
    });

    it('returns true for grace_period subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'grace_period'),
      );

      const result = await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      expect(result).toBe(true);
    });

    it('returns false when no subscription exists', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      const result = await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      expect(result).toBe(false);
    });

    it('returns false for unknown feature key', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'active'),
      );

      const result = await service.isEnabled(
        TENANT_A,
        'unknown-feature' as FeatureKey,
      );

      expect(result).toBe(false);
    });
  });

  describe('getAllEnabled', () => {
    it('returns all features from plan', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'active'),
      );

      const result = await service.getAllEnabled(TENANT_A);

      expect(result).toEqual(
        expect.arrayContaining([
          'workflows',
          'documents',
          'api-access',
          'advanced-analytics',
        ]),
      );
    });

    it('returns empty array for expired subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'expired'),
      );

      const result = await service.getAllEnabled(TENANT_A);

      expect(result).toEqual([]);
    });

    it('returns empty array when no subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getAllEnabled(TENANT_A);

      expect(result).toEqual([]);
    });
  });

  describe('cache behavior', () => {
    it('caches features after first call (cache miss -> DB query)', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'active'),
      );

      // First call — cache miss, queries DB
      await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);
      expect(mockPrisma.admin.subscription.findUnique).toHaveBeenCalledTimes(1);

      // Second call — cache hit, no DB query
      await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);
      expect(mockPrisma.admin.subscription.findUnique).toHaveBeenCalledTimes(1);
    });

    it('re-queries DB after cache invalidation', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'active'),
      );

      // First call populates cache
      await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);
      expect(mockPrisma.admin.subscription.findUnique).toHaveBeenCalledTimes(1);

      // Invalidate
      service.invalidateCache(TENANT_A);

      // Next call re-queries DB
      await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);
      expect(mockPrisma.admin.subscription.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidation on plan.changed event', () => {
    it('invalidates cache when plan.changed event fires', async () => {
      const invalidateSpy = jest.spyOn(service, 'invalidateCache');

      mockPrisma.admin.subscription.findUnique.mockResolvedValue(
        makeSubscriptionRow(TENANT_A, 'active'),
      );

      // Populate cache
      await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);

      // Simulate plan.changed event
      service.handlePlanChanged({ tenantId: TENANT_A });

      expect(invalidateSpy).toHaveBeenCalledWith(TENANT_A);

      // Next call should query DB again
      await service.isEnabled(TENANT_A, 'workflows' as FeatureKey);
      expect(mockPrisma.admin.subscription.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
