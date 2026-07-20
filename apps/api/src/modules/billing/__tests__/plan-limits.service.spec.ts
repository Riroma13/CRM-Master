import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { PlanLimitsService } from '../plan/plan-limits.service';

const mockSubscription = {
  id: 'sub-001',
  tenantId: 'tenant-001',
  planId: 'plan-pro-001',
  status: 'active',
  currentPeriodStart: new Date('2025-01-01'),
  currentPeriodEnd: new Date('2025-02-01'),
  plan: {
    id: 'plan-pro-001',
    name: 'Pro',
    price: 2999,
    currency: 'usd',
    billingPeriod: 'monthly',
    pricingModel: 'flat',
    limits: [
      { metric: 'workflows', limit: 100, type: 'hard' },
      { metric: 'documents', limit: 0, type: 'soft' },
      { metric: 'plugins', limit: 5, type: 'hard' },
    ],
    features: ['basic-workflows', 'advanced-workflows'],
    trialDays: 14,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe('PlanLimitsService', () => {
  let service: PlanLimitsService;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        subscription: {
          findUnique: jest.fn(),
        },
        usageMeter: {
          aggregate: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PlanLimitsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLimit', () => {
    it('allows when within limit', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 30 },
      });

      const result = await service.checkLimit('tenant-001', 'workflows');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(30);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(70);
      expect(result.type).toBe('hard');
    });

    it('blocks when limit exceeded', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 150 },
      });

      const result = await service.checkLimit('tenant-001', 'workflows');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(150);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(0);
      expect(result.type).toBe('hard');
    });

    it('allows when limit is 0 (unlimited)', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.checkLimit('tenant-001', 'documents');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('returns allowed true when no limit defined for metric', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.checkLimit('tenant-001', 'api_calls');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('returns allowed true when no subscription exists', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      const result = await service.checkLimit('tenant-001', 'workflows');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('returns correct remaining when at exactly the limit', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 100 },
      });

      const result = await service.checkLimit('tenant-001', 'workflows');

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(100);
      expect(result.remaining).toBe(0);
    });

    it('queries only unfinalized records for current period', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 50 },
      });

      await service.checkLimit('tenant-001', 'workflows');

      expect(mockPrisma.admin.usageMeter.aggregate).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-001',
          metric: 'workflows',
          periodStart: { gte: mockSubscription.currentPeriodStart },
          isFinalized: false,
        },
        _sum: { value: true },
      });
    });

    it('handles zero usage gracefully', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: null },
      });

      const result = await service.checkLimit('tenant-001', 'workflows');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.remaining).toBe(100);
    });
  });

  describe('getRemaining', () => {
    it('returns remaining count for a metric', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.aggregate.mockResolvedValue({
        _sum: { value: 30 },
      });

      const remaining = await service.getRemaining('tenant-001', 'workflows');

      expect(remaining).toBe(70);
    });

    it('returns Infinity for unlimited metric', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);

      const remaining = await service.getRemaining('tenant-001', 'documents');

      expect(remaining).toBe(Infinity);
    });
  });

  describe('getAllLimits', () => {
    it('returns all limits for current plan', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.aggregate
        .mockResolvedValueOnce({ _sum: { value: 30 } })
        .mockResolvedValueOnce({ _sum: { value: 2 } });

      const results = await service.getAllLimits('tenant-001');

      expect(results).toHaveLength(3);
      expect(results[0].metric).toBe('workflows');
      expect(results[0].allowed).toBe(true);
      expect(results[0].remaining).toBe(70);
      expect(results[1].metric).toBe('documents');
      expect(results[1].remaining).toBe(Infinity);
      expect(results[2].metric).toBe('plugins');
      expect(results[2].remaining).toBe(3);
    });

    it('returns empty array when no subscription', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      const results = await service.getAllLimits('tenant-001');

      expect(results).toEqual([]);
    });
  });
});
