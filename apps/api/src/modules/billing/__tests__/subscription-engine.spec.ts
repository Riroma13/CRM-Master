import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { SubscriptionEngine } from '../subscription/subscription-engine';

const mockPlan = {
  id: 'plan-pro-001',
  name: 'Pro',
  description: 'Pro plan',
  price: 2999,
  currency: 'usd',
  billingPeriod: 'monthly',
  pricingModel: 'flat',
  limits: [{ metric: 'workflows', limit: 100, type: 'hard' }],
  features: ['basic-workflows'],
  trialDays: 14,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFreePlan = {
  ...mockPlan,
  id: 'plan-free-001',
  name: 'Free',
  price: 0,
  trialDays: 0,
};

const mockEnterprisePlan = {
  ...mockPlan,
  id: 'plan-enterprise-001',
  name: 'Enterprise',
  price: 9999,
  trialDays: 0,
};

const mockSubscriptionRow = {
  id: 'sub-001',
  tenantId: 'tenant-001',
  planId: 'plan-pro-001',
  pendingPlanId: null,
  status: 'active',
  currentPeriodStart: new Date('2025-01-01'),
  currentPeriodEnd: new Date('2025-02-01'),
  trialEnd: null,
  cancelledAt: null,
  gracePeriodEnd: null,
  suspendedUntil: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  plan: mockPlan,
};

describe('SubscriptionEngine', () => {
  let engine: SubscriptionEngine;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        plan: {
          findUnique: jest.fn(),
        },
        subscription: {
          create: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          findMany: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionEngine,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    engine = module.get(SubscriptionEngine);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('creates a trialing subscription for plans with trial days', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.admin.subscription.create.mockResolvedValue({
        ...mockSubscriptionRow,
        status: 'trialing',
        trialEnd: new Date('2025-01-15'),
      });

      const result = await engine.createSubscription({
        tenantId: 'tenant-001',
        planId: 'plan-pro-001',
      });

      expect(result.status).toBe('trialing');
      expect(result.tenantId).toBe('tenant-001');
      expect(mockPrisma.admin.subscription.create).toHaveBeenCalled();
    });

    it('creates an active subscription for plans without trial', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(mockFreePlan);
      mockPrisma.admin.subscription.create.mockResolvedValue({
        ...mockSubscriptionRow,
        id: 'sub-002',
        tenantId: 'tenant-002',
        planId: 'plan-free-001',
        status: 'active',
        trialEnd: null,
      });

      const result = await engine.createSubscription({
        tenantId: 'tenant-002',
        planId: 'plan-free-001',
      });

      expect(result.status).toBe('active');
      expect(result.trialEnd).toBeUndefined();
    });

    it('accepts optional stripeCustomerId', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(mockFreePlan);
      mockPrisma.admin.subscription.create.mockResolvedValue({
        ...mockSubscriptionRow,
        id: 'sub-003',
        tenantId: 'tenant-003',
        stripeCustomerId: 'cus_123',
      });

      const result = await engine.createSubscription({
        tenantId: 'tenant-003',
        planId: 'plan-free-001',
        stripeCustomerId: 'cus_123',
      });

      expect(result.stripeCustomerId).toBe('cus_123');
    });

    it('throws when plan not found', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(null);

      await expect(
        engine.createSubscription({
          tenantId: 'tenant-001',
          planId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSubscription', () => {
    it('returns subscription for tenant', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscriptionRow);

      const result = await engine.getSubscription('tenant-001');

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('tenant-001');
      expect(result!.status).toBe('active');
    });

    it('returns null when no subscription exists', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      const result = await engine.getSubscription('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('changePlan', () => {
    it('upgrades immediately with proration', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscriptionRow);
      mockPrisma.admin.plan.findUnique
        .mockResolvedValueOnce(mockEnterprisePlan);
      mockPrisma.admin.subscription.update.mockResolvedValue({
        ...mockSubscriptionRow,
        planId: 'plan-enterprise-001',
        pendingPlanId: null,
      });

      const result = await engine.changePlan('tenant-001', 'plan-enterprise-001');

      expect(result.planId).toBe('plan-enterprise-001');
      expect(result.pendingPlanId).toBeUndefined();
      expect(mockPrisma.admin.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-001' },
          data: expect.objectContaining({
            planId: 'plan-enterprise-001',
            pendingPlanId: null,
          }),
        }),
      );
    });

    it('downgrades by setting pendingPlanId', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscriptionRow);
      mockPrisma.admin.plan.findUnique.mockResolvedValue(mockFreePlan);
      mockPrisma.admin.subscription.update.mockResolvedValue({
        ...mockSubscriptionRow,
        pendingPlanId: 'plan-free-001',
      });

      const result = await engine.changePlan('tenant-001', 'plan-free-001');

      expect(result.pendingPlanId).toBe('plan-free-001');
    });

    it('throws when subscription not found', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      await expect(
        engine.changePlan('nonexistent', 'plan-pro-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when new plan not found', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscriptionRow);
      mockPrisma.admin.plan.findUnique.mockResolvedValue(null);

      await expect(
        engine.changePlan('tenant-001', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when subscription is cancelled (terminal)', async () => {
      const cancelledSub = {
        ...mockSubscriptionRow,
        status: 'cancelled',
      };
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(cancelledSub);

      await expect(
        engine.changePlan('tenant-001', 'plan-enterprise-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSubscription', () => {
    it('cancels an active subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscriptionRow);
      mockPrisma.admin.subscription.update.mockResolvedValue({
        ...mockSubscriptionRow,
        status: 'cancelled',
        cancelledAt: new Date(),
      });

      const result = await engine.cancelSubscription('tenant-001');

      expect(result.status).toBe('cancelled');
      expect(mockPrisma.admin.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-001' },
          data: expect.objectContaining({
            status: 'cancelled',
          }),
        }),
      );
    });

    it('throws when subscription not found', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      await expect(
        engine.cancelSubscription('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when trying to cancel an already cancelled subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue({
        ...mockSubscriptionRow,
        status: 'cancelled',
      });

      await expect(
        engine.cancelSubscription('tenant-001'),
      ).rejects.toThrow(Error);
    });
  });

  describe('reactivateSubscription', () => {
    it('reactivates a cancelled subscription', async () => {
      const cancelledSub = {
        ...mockSubscriptionRow,
        status: 'cancelled',
        cancelledAt: new Date(),
      };
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(cancelledSub);
      mockPrisma.admin.subscription.update.mockResolvedValue({
        ...cancelledSub,
        status: 'active',
        cancelledAt: null,
      });

      const result = await engine.reactivateSubscription('tenant-001');

      expect(result.status).toBe('active');
      expect(result.cancelledAt).toBeUndefined();
    });

    it('throws when subscription not found', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      await expect(
        engine.reactivateSubscription('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when subscription is not cancelled', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscriptionRow);

      await expect(
        engine.reactivateSubscription('tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('updates to a valid status', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscriptionRow);
      mockPrisma.admin.subscription.update.mockResolvedValue({
        ...mockSubscriptionRow,
        status: 'past_due',
      });

      const result = await engine.updateStatus('tenant-001', 'past_due');

      expect(result.status).toBe('past_due');
    });

    it('sets gracePeriodEnd when transitioning to grace_period', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue({
        ...mockSubscriptionRow,
        status: 'past_due',
      });
      mockPrisma.admin.subscription.update.mockResolvedValue({
        ...mockSubscriptionRow,
        status: 'grace_period',
        gracePeriodEnd: new Date(),
      });

      const result = await engine.updateStatus('tenant-001', 'grace_period');

      expect(result.status).toBe('grace_period');
      expect(mockPrisma.admin.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'grace_period',
            gracePeriodEnd: expect.any(Date),
          }),
        }),
      );
    });

    it('throws for invalid transition', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue({
        ...mockSubscriptionRow,
        status: 'cancelled',
      });

      await expect(
        engine.updateStatus('tenant-001', 'active'),
      ).rejects.toThrow(Error);
    });
  });

  describe('applyPendingPlan', () => {
    it('applies pending plan and resets period', async () => {
      const pendingSub = {
        ...mockSubscriptionRow,
        pendingPlanId: 'plan-free-001',
      };
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(pendingSub);
      mockPrisma.admin.subscription.update.mockResolvedValue({
        ...pendingSub,
        planId: 'plan-free-001',
        pendingPlanId: null,
      });

      const result = await engine.applyPendingPlan('tenant-001');

      expect(result.planId).toBe('plan-free-001');
      expect(result.pendingPlanId).toBeUndefined();
    });

    it('throws when no pending plan', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscriptionRow);

      await expect(
        engine.applyPendingPlan('tenant-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
