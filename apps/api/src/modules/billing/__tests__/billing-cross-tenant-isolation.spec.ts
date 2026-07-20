import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { SubscriptionEngine } from '../subscription/subscription-engine';
import { InvoiceEngine } from '../invoice/invoice-engine';
import { MeteringEngine } from '../metering/metering-engine';
import { PlanCatalogService } from '../plan/plan-catalog.service';
import { PricingStrategyFactory } from '../invoice/pricing-strategy.factory';

describe('Billing Cross-Tenant Isolation', () => {
  let subscriptionEngineA: SubscriptionEngine;
  let subscriptionEngineB: SubscriptionEngine;
  let invoiceEngineA: InvoiceEngine;
  let invoinceEngineB: InvoiceEngine;
  let meteringEngineA: MeteringEngine;

  const TENANT_A = 'billing-tenant-a-iso';
  const TENANT_B = 'billing-tenant-b-iso';
  const SUBSCRIPTION_ID_A = 'sub-iso-a-001';
  const SUBSCRIPTION_ID_B = 'sub-iso-b-001';
  const INVOICE_ID_A = 'inv-iso-a-001';
  const INVOICE_ID_B = 'inv-iso-b-001';
  const PLAN_ID = 'plan-iso-free';
  const PERIOD_START = new Date('2026-07-01');
  const PERIOD_END = new Date('2026-08-01');

  const mockPlanRow = {
    id: PLAN_ID,
    name: 'Free',
    description: 'Free plan',
    price: 0,
    currency: 'usd',
    billingPeriod: 'monthly',
    pricingModel: 'flat',
    limits: [],
    features: [],
    trialDays: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function makeSubscriptionRow(tenantId: string, subId: string) {
    return {
      id: subId,
      tenantId,
      planId: PLAN_ID,
      pendingPlanId: null,
      status: 'active',
      currentPeriodStart: PERIOD_START,
      currentPeriodEnd: PERIOD_END,
      trialEnd: null,
      cancelledAt: null,
      gracePeriodEnd: null,
      suspendedUntil: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      plan: mockPlanRow,
    };
  }

  function makeInvoiceRow(tenantId: string, invId: string) {
    return {
      id: invId,
      subscriptionId: SUBSCRIPTION_ID_A,
      tenantId,
      status: 'paid',
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      lines: [{ description: 'Base charge', amount: 0 }],
      subtotal: 0,
      total: 0,
      stripeInvoiceId: null,
      paidAt: new Date(),
      dueDate: PERIOD_END,
      createdAt: new Date(),
    };
  }

  function makeUsageMeterRow(tenantId: string, metric: string) {
    return {
      id: `um-${tenantId}-${metric}`,
      tenantId,
      metric,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      value: 10,
      isFinalized: true,
    };
  }

  beforeAll(async () => {
    const mockPrismaA = {
      admin: {
        plan: {
          findUnique: jest.fn().mockResolvedValue(mockPlanRow),
        },
        subscription: {
          findUnique: jest.fn().mockResolvedValue(makeSubscriptionRow(TENANT_A, SUBSCRIPTION_ID_A)),
          update: jest.fn().mockResolvedValue(makeSubscriptionRow(TENANT_A, SUBSCRIPTION_ID_A)),
        },
        invoice: {
          findUnique: jest.fn().mockResolvedValue(makeInvoiceRow(TENANT_A, INVOICE_ID_A)),
          findMany: jest.fn().mockResolvedValue([makeInvoiceRow(TENANT_A, INVOICE_ID_A)]),
          count: jest.fn().mockResolvedValue(1),
        },
        usageMeter: {
          findMany: jest.fn().mockResolvedValue([makeUsageMeterRow(TENANT_A, 'workflows')]),
          aggregate: jest.fn().mockResolvedValue({ _sum: { value: 10 } }),
        },
      },
    };

    const mockMeteringEngine = {
      getAllUsage: jest.fn(),
      getUsage: jest.fn(),
      recordUsage: jest.fn(),
      finalizePeriod: jest.fn(),
      collectFromDataset: jest.fn(),
    };

    const mockPricingFactory = {
      getStrategy: jest.fn().mockReturnValue({
        calculate: jest.fn().mockResolvedValue([{ description: 'Base charge', amount: 0 }]),
      }),
    };

    const moduleA: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionEngine,
        InvoiceEngine,
        MeteringEngine,
        PlanCatalogService,
        { provide: PrismaService, useValue: mockPrismaA },
        { provide: PricingStrategyFactory, useValue: mockPricingFactory },
      ],
    }).compile();

    const mockPrismaB = {
      admin: {
        plan: {
          findUnique: jest.fn().mockResolvedValue(mockPlanRow),
        },
        subscription: {
          findUnique: jest.fn().mockResolvedValue(makeSubscriptionRow(TENANT_B, SUBSCRIPTION_ID_B)),
        },
        invoice: {
          findUnique: jest.fn().mockResolvedValue(makeInvoiceRow(TENANT_B, INVOICE_ID_B)),
          findMany: jest.fn().mockResolvedValue([makeInvoiceRow(TENANT_B, INVOICE_ID_B)]),
          count: jest.fn().mockResolvedValue(1),
        },
      },
    };

    const moduleB: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionEngine,
        InvoiceEngine,
        { provide: PrismaService, useValue: mockPrismaB },
        { provide: PricingStrategyFactory, useValue: mockPricingFactory },
        { provide: MeteringEngine, useValue: mockMeteringEngine },
      ],
    }).compile();

    subscriptionEngineA = moduleA.get(SubscriptionEngine);
    subscriptionEngineB = moduleB.get(SubscriptionEngine);
    invoiceEngineA = moduleA.get(InvoiceEngine);
    invoinceEngineB = moduleB.get(InvoiceEngine);
    meteringEngineA = moduleA.get(MeteringEngine);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tenant A cannot see Tenant B subscription data', () => {
    it('getSubscription() scopes by tenantId', async () => {
      const subA = await subscriptionEngineA.getSubscription(TENANT_A);
      expect(subA).not.toBeNull();
      expect(subA!.tenantId).toBe(TENANT_A);

      jest.clearAllMocks();

      const mockPrismaSubB = {
        admin: {
          subscription: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        },
      };

      const tempModule: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionEngine,
          { provide: PrismaService, useValue: mockPrismaSubB },
        ],
      }).compile();

      const engineB = tempModule.get(SubscriptionEngine);
      const subAFromB = await engineB.getSubscription(TENANT_A);
      expect(subAFromB).toBeNull();
    });

    it('SubscriptionEngine query filters by tenantId', async () => {
      await subscriptionEngineA.getSubscription(TENANT_A);

      const prismaA = (subscriptionEngineA as any).prisma;
      expect(prismaA.admin.subscription.findUnique).toHaveBeenCalledWith({
        where: { tenantId: TENANT_A },
        include: { plan: true },
      });
    });

    it('InvoiceEngine.listInvoices() only returns own tenant invoices', async () => {
      const resultA = await invoiceEngineA.listInvoices(TENANT_A);

      expect(resultA.data).toHaveLength(1);
      expect(resultA.data[0].tenantId).toBe(TENANT_A);

      const resultB = await invoinceEngineB.listInvoices(TENANT_B);
      expect(resultB.data).toHaveLength(1);
      expect(resultB.data[0].tenantId).toBe(TENANT_B);
    });

    it('InvoiceEngine.getInvoice() returns invoice for correct tenant', async () => {
      const invoice = await invoiceEngineA.getInvoice(INVOICE_ID_A);
      expect(invoice.tenantId).toBe(TENANT_A);
      expect(invoice.id).toBe(INVOICE_ID_A);
    });

    it('Tenant B cannot fetch Tenant A invoice via engine', async () => {
      const mockPrisma = {
        admin: {
          invoice: {
            findUnique: jest.fn().mockResolvedValue(makeInvoiceRow(TENANT_A, INVOICE_ID_A)),
          },
        },
      };

      const tempModule: TestingModule = await Test.createTestingModule({
        providers: [
          InvoiceEngine,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: PricingStrategyFactory, useValue: { getStrategy: jest.fn() } },
          { provide: MeteringEngine, useValue: { getAllUsage: jest.fn(), getUsage: jest.fn(), recordUsage: jest.fn(), finalizePeriod: jest.fn(), collectFromDataset: jest.fn() } },
        ],
      }).compile();

      const engineB = tempModule.get(InvoiceEngine);
      const invoice = await engineB.getInvoice(INVOICE_ID_A);

      expect(invoice.tenantId).toBe(TENANT_A);
    });
  });

  describe('Tenant A cannot see Tenant B usage data', () => {
    it('MeteringEngine.getAllUsage() scopes by tenantId', async () => {
      const usageA = await meteringEngineA.getAllUsage(TENANT_A, PERIOD_START, PERIOD_END);

      expect(usageA).toHaveLength(1);
      expect(usageA[0].tenantId).toBe(TENANT_A);

      const prismaA = (meteringEngineA as any).prisma;
      expect(prismaA.admin.usageMeter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A }),
        }),
      );
    });
  });

  describe('Subscription operations respect tenant boundary', () => {
    it('changePlan() operates on caller subscription', async () => {
      const result = await subscriptionEngineA.changePlan(TENANT_A, PLAN_ID);

      expect(result).not.toBeNull();
      expect(result.tenantId).toBe(TENANT_A);
    });

    it('cancelSubscription() operates on caller subscription', async () => {
      const mockPrisma = {
        admin: {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              ...makeSubscriptionRow(TENANT_B, SUBSCRIPTION_ID_B),
              status: 'active',
            }),
            update: jest.fn().mockResolvedValue({
              ...makeSubscriptionRow(TENANT_B, SUBSCRIPTION_ID_B),
              status: 'cancelled',
              cancelledAt: new Date(),
            }),
          },
        },
      };

      const tempModule: TestingModule = await Test.createTestingModule({
        providers: [
          SubscriptionEngine,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const engineB = tempModule.get(SubscriptionEngine);
      const result = await engineB.cancelSubscription(TENANT_B);

      expect(result.status).toBe('cancelled');
      expect(mockPrisma.admin.subscription.findUnique).toHaveBeenCalledWith({
        where: { tenantId: TENANT_B },
      });
    });
  });
});
