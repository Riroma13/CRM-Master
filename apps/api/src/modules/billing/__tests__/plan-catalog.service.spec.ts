import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { PlanCatalogService } from '../plan/plan-catalog.service';
import type { Plan, PlanLimit } from '@shared/billing';

const mockPlanRow = {
  id: 'plan-free-001',
  name: 'Free',
  description: 'Free plan',
  price: 0,
  currency: 'usd',
  billingPeriod: 'monthly',
  pricingModel: 'flat',
  limits: [{ metric: 'workflows', limit: 10, type: 'hard' }],
  features: ['basic-workflows'],
  trialDays: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPlanRow2 = {
  id: 'plan-pro-001',
  name: 'Pro',
  description: 'Pro plan',
  price: 2999,
  currency: 'usd',
  billingPeriod: 'monthly',
  pricingModel: 'flat',
  limits: [{ metric: 'workflows', limit: 100, type: 'hard' }],
  features: ['basic-workflows', 'advanced-workflows'],
  trialDays: 14,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PlanCatalogService', () => {
  let service: PlanCatalogService;
  let mockPrisma: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        plan: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanCatalogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PlanCatalogService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPlans', () => {
    it('returns all plans ordered by price', async () => {
      mockPrisma.admin.plan.findMany.mockResolvedValue([mockPlanRow, mockPlanRow2]);

      const result = await service.listPlans();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Free');
      expect(result[1].name).toBe('Pro');
      expect(mockPrisma.admin.plan.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { price: 'asc' },
      });
    });

    it('filters active plans when activeOnly is true', async () => {
      mockPrisma.admin.plan.findMany.mockResolvedValue([mockPlanRow]);

      const result = await service.listPlans(true);

      expect(result).toHaveLength(1);
      expect(mockPrisma.admin.plan.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('getPlan', () => {
    it('returns a plan by id', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(mockPlanRow);

      const result = await service.getPlan('plan-free-001');

      expect(result.id).toBe('plan-free-001');
      expect(result.name).toBe('Free');
    });

    it('throws when plan not found', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(null);

      await expect(service.getPlan('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createPlan', () => {
    it('creates and returns a plan', async () => {
      const data = {
        name: 'Enterprise',
        description: 'Enterprise plan',
        price: 9999,
        pricingModel: 'flat',
        limits: [{ metric: 'workflows', limit: 1000, type: 'hard' } as PlanLimit],
        features: ['all'],
      };

      const createdRow = {
        ...mockPlanRow,
        id: 'plan-ent-001',
        name: 'Enterprise',
        price: 9999,
        limits: data.limits,
        features: data.features,
      };

      mockPrisma.admin.plan.create.mockResolvedValue(createdRow);

      const result = await service.createPlan(data);

      expect(result.name).toBe('Enterprise');
      expect(result.price).toBe(9999);
      expect(mockPrisma.admin.plan.create).toHaveBeenCalledWith({
        data: {
          name: 'Enterprise',
          description: 'Enterprise plan',
          price: 9999,
          currency: 'usd',
          billingPeriod: 'monthly',
          pricingModel: 'flat',
          limits: data.limits,
          features: data.features,
          trialDays: 14,
        },
      });
    });
  });

  describe('updatePlan', () => {
    it('updates and returns the plan', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(mockPlanRow);
      mockPrisma.admin.plan.update.mockResolvedValue({
        ...mockPlanRow,
        price: 1999,
      });

      const result = await service.updatePlan('plan-free-001', { price: 1999 });

      expect(result.price).toBe(1999);
      expect(mockPrisma.admin.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan-free-001' },
        data: { price: 1999 },
      });
    });

    it('throws when plan not found', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePlan('nonexistent', { price: 1999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('activatePlan', () => {
    it('sets plan active to true', async () => {
      const inactiveRow = { ...mockPlanRow, active: false };
      mockPrisma.admin.plan.findUnique.mockResolvedValue(inactiveRow);
      mockPrisma.admin.plan.update.mockResolvedValue({
        ...mockPlanRow,
        active: true,
      });

      const result = await service.activatePlan('plan-free-001');

      expect(result.active).toBe(true);
      expect(mockPrisma.admin.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan-free-001' },
        data: { active: true },
      });
    });

    it('throws when plan not found', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(null);

      await expect(service.activatePlan('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivatePlan', () => {
    it('sets plan active to false', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(mockPlanRow);
      mockPrisma.admin.plan.update.mockResolvedValue({
        ...mockPlanRow,
        active: false,
      });

      const result = await service.deactivatePlan('plan-free-001');

      expect(result.active).toBe(false);
      expect(mockPrisma.admin.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan-free-001' },
        data: { active: false },
      });
    });

    it('throws when plan not found', async () => {
      mockPrisma.admin.plan.findUnique.mockResolvedValue(null);

      await expect(service.deactivatePlan('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
