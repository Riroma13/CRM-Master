import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { InvoiceEngine } from '../invoice/invoice-engine';
import { PricingStrategyFactory } from '../invoice/pricing-strategy.factory';
import { MeteringEngine } from '../metering/metering-engine';
import { FlatWithOverageStrategy } from '../invoice/strategies/flat-with-overage.strategy';
import { FlatStrategy } from '../invoice/strategies/flat.strategy';
import { PerUnitStrategy } from '../invoice/strategies/per-unit.strategy';
import { TieredStrategy } from '../invoice/strategies/tiered.strategy';
import type { InvoiceLine } from '@shared/billing';

const mockPlan = {
  id: 'plan-pro-001',
  name: 'Pro',
  description: 'Pro plan',
  price: 2999,
  currency: 'usd',
  billingPeriod: 'monthly',
  pricingModel: 'flat_with_overage',
  limits: [
    { metric: 'workflows', limit: 100, overagePrice: 50, type: 'soft' },
    { metric: 'documents', limit: 1000, overagePrice: 10, type: 'soft' },
  ],
  features: ['basic-workflows'],
  trialDays: 14,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubscription = {
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

const mockUsageMeters = [
  {
    id: 'meter-001',
    tenantId: 'tenant-001',
    metric: 'workflows',
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2025-02-01'),
    value: 150,
    isFinalized: true,
  },
  {
    id: 'meter-002',
    tenantId: 'tenant-001',
    metric: 'documents',
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2025-02-01'),
    value: 1200,
    isFinalized: true,
  },
];

const mockInvoiceRow = {
  id: 'inv-001',
  subscriptionId: 'sub-001',
  tenantId: 'tenant-001',
  status: 'unpaid',
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-02-01'),
  lines: [
    { description: 'Pro (base)', amount: 2999, quantity: 1 },
    { description: 'workflows overage (50 × 50¢)', amount: 2500, quantity: 50 },
    { description: 'documents overage (200 × 10¢)', amount: 2000, quantity: 200 },
  ],
  subtotal: 7499,
  total: 7499,
  stripeInvoiceId: null,
  paidAt: null,
  dueDate: new Date('2025-03-03'),
  createdAt: new Date(),
};

describe('InvoiceEngine', () => {
  let engine: InvoiceEngine;
  let mockPrisma: any;
  let mockMeteringEngine: any;
  let factory: PricingStrategyFactory;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        subscription: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
        invoice: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          count: jest.fn(),
        },
        usageMeter: {
          findMany: jest.fn(),
        },
      },
    };

    mockMeteringEngine = {
      finalizePeriod: jest.fn(),
      recordUsage: jest.fn(),
      getUsage: jest.fn(),
      collectFromDataset: jest.fn(),
      getAllUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceEngine,
        PricingStrategyFactory,
        FlatWithOverageStrategy,
        FlatStrategy,
        PerUnitStrategy,
        TieredStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MeteringEngine, useValue: mockMeteringEngine },
        {
          provide: 'PRICING_STRATEGIES',
          useFactory: (
            flatWithOverage: FlatWithOverageStrategy,
            flat: FlatStrategy,
            perUnit: PerUnitStrategy,
            tiered: TieredStrategy,
          ) => [flatWithOverage, flat, perUnit, tiered],
          inject: [
            FlatWithOverageStrategy,
            FlatStrategy,
            PerUnitStrategy,
            TieredStrategy,
          ],
        },
      ],
    }).compile();

    engine = module.get(InvoiceEngine);
    factory = module.get(PricingStrategyFactory);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInvoice', () => {
    it('generates an invoice with correct base and overage', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.findMany.mockResolvedValue(mockUsageMeters);
      mockPrisma.admin.invoice.create.mockResolvedValue(mockInvoiceRow);

      const result = await engine.generateInvoice(
        'sub-001',
        new Date('2025-01-01'),
        new Date('2025-02-01'),
      );

      expect(result.status).toBe('unpaid');
      expect(result.subtotal).toBe(7499);
      expect(result.total).toBe(7499);
      expect(result.lines).toHaveLength(3);
      expect(mockMeteringEngine.finalizePeriod).toHaveBeenCalledWith(
        'tenant-001',
        new Date('2025-01-01'),
      );
    });

    it('creates invoice as unpaid (local-first before Stripe push)', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.admin.usageMeter.findMany.mockResolvedValue(mockUsageMeters);
      mockPrisma.admin.invoice.create.mockResolvedValue(mockInvoiceRow);

      const result = await engine.generateInvoice(
        'sub-001',
        new Date('2025-01-01'),
        new Date('2025-02-01'),
      );

      expect(result.status).toBe('unpaid');
      expect(mockPrisma.admin.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'unpaid' }),
        }),
      );
    });

    it('throws when subscription not found', async () => {
      mockPrisma.admin.subscription.findUnique.mockResolvedValue(null);

      await expect(
        engine.generateInvoice('nonexistent', new Date(), new Date()),
      ).rejects.toThrow(NotFoundException);
    });

    it('uses correct pricing strategy based on plan', async () => {
      const flatPlan = { ...mockPlan, pricingModel: 'flat' };
      const flatSub = { ...mockSubscription, plan: flatPlan };

      mockPrisma.admin.subscription.findUnique.mockResolvedValue(flatSub);
      mockPrisma.admin.usageMeter.findMany.mockResolvedValue([]);
      mockPrisma.admin.invoice.create.mockResolvedValue({
        ...mockInvoiceRow,
        lines: [{ description: 'Pro (flat)', amount: 2999, quantity: 1 }],
        subtotal: 2999,
        total: 2999,
      });

      const result = await engine.generateInvoice(
        'sub-001',
        new Date('2025-01-01'),
        new Date('2025-02-01'),
      );

      expect(result.lines).toHaveLength(1);
      expect(result.total).toBe(2999);
    });
  });

  describe('finalizeInvoice', () => {
    it('sets status to finalized for unpaid invoices', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(mockInvoiceRow);
      mockPrisma.admin.invoice.update.mockResolvedValue({
        ...mockInvoiceRow,
        status: 'finalized',
      });

      const result = await engine.finalizeInvoice('inv-001');

      expect(result.status).toBe('finalized');
      expect(mockPrisma.admin.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-001' },
          data: { status: 'finalized' },
        }),
      );
    });

    it('throws when invoice not found', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(null);

      await expect(engine.finalizeInvoice('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when invoice is already paid', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue({
        ...mockInvoiceRow,
        status: 'paid',
      });

      await expect(engine.finalizeInvoice('inv-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markPaid', () => {
    it('sets status to paid with paidAt and stripeInvoiceId', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(mockInvoiceRow);
      mockPrisma.admin.invoice.update.mockResolvedValue({
        ...mockInvoiceRow,
        status: 'paid',
        paidAt: new Date(),
        stripeInvoiceId: 'in_stripe_001',
      });

      const result = await engine.markPaid('inv-001', 'in_stripe_001');

      expect(result.status).toBe('paid');
      expect(result.stripeInvoiceId).toBe('in_stripe_001');
      expect(result.paidAt).toBeDefined();
    });

    it('throws when invoice not found', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(null);

      await expect(engine.markPaid('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markFailed', () => {
    it('sets status to failed', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(mockInvoiceRow);
      mockPrisma.admin.invoice.update.mockResolvedValue({
        ...mockInvoiceRow,
        status: 'failed',
      });

      const result = await engine.markFailed('inv-001');

      expect(result.status).toBe('failed');
    });

    it('throws when invoice not found', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(null);

      await expect(engine.markFailed('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('voidInvoice', () => {
    it('sets status to void', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(mockInvoiceRow);
      mockPrisma.admin.invoice.update.mockResolvedValue({
        ...mockInvoiceRow,
        status: 'void',
      });

      const result = await engine.voidInvoice('inv-001');

      expect(result.status).toBe('void');
    });

    it('throws when invoice not found', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(null);

      await expect(engine.voidInvoice('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listInvoices', () => {
    it('returns paginated invoices for a tenant', async () => {
      mockPrisma.admin.invoice.findMany.mockResolvedValue([mockInvoiceRow]);
      mockPrisma.admin.invoice.count.mockResolvedValue(1);

      const result = await engine.listInvoices('tenant-001');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('filters by status when provided', async () => {
      mockPrisma.admin.invoice.findMany.mockResolvedValue([]);
      mockPrisma.admin.invoice.count.mockResolvedValue(0);

      await engine.listInvoices('tenant-001', 'unpaid');

      expect(mockPrisma.admin.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-001', status: 'unpaid' },
        }),
      );
    });

    it('supports pagination', async () => {
      mockPrisma.admin.invoice.findMany.mockResolvedValue([]);
      mockPrisma.admin.invoice.count.mockResolvedValue(25);

      const result = await engine.listInvoices('tenant-001', undefined, 2, 10);

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(mockPrisma.admin.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('getInvoice', () => {
    it('returns a single invoice with lines', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(mockInvoiceRow);

      const result = await engine.getInvoice('inv-001');

      expect(result.id).toBe('inv-001');
      expect(result.lines).toHaveLength(3);
      expect(result.subtotal).toBe(7499);
    });

    it('throws when invoice not found', async () => {
      mockPrisma.admin.invoice.findUnique.mockResolvedValue(null);

      await expect(engine.getInvoice('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PricingStrategyFactory', () => {
    it('resolves correct strategy for flat_with_overage', () => {
      const strategy = factory.getStrategy('flat_with_overage');
      expect(strategy).toBeInstanceOf(FlatWithOverageStrategy);
    });

    it('resolves correct strategy for flat', () => {
      const strategy = factory.getStrategy('flat');
      expect(strategy).toBeInstanceOf(FlatStrategy);
    });

    it('resolves correct strategy for per_unit', () => {
      const strategy = factory.getStrategy('per_unit');
      expect(strategy).toBeInstanceOf(PerUnitStrategy);
    });

    it('resolves correct strategy for tiered', () => {
      const strategy = factory.getStrategy('tiered');
      expect(strategy).toBeInstanceOf(TieredStrategy);
    });

    it('throws for unknown strategy', () => {
      expect(() => factory.getStrategy('unknown')).toThrow();
    });
  });
});
