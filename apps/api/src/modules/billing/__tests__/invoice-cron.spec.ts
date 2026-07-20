import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { InvoiceCronService } from '../invoice/invoice-cron.service';
import { InvoiceEngine } from '../invoice/invoice-engine';
import { PricingStrategyFactory } from '../invoice/pricing-strategy.factory';
import { MeteringEngine } from '../metering/metering-engine';
import { FlatWithOverageStrategy } from '../invoice/strategies/flat-with-overage.strategy';
import { FlatStrategy } from '../invoice/strategies/flat.strategy';
import { PerUnitStrategy } from '../invoice/strategies/per-unit.strategy';
import { TieredStrategy } from '../invoice/strategies/tiered.strategy';

const mockSubscriptions = [
  {
    id: 'sub-001',
    tenantId: 'tenant-001',
    planId: 'plan-pro-001',
    status: 'active',
    currentPeriodStart: new Date('2025-01-01'),
    currentPeriodEnd: new Date('2025-02-01'),
  },
  {
    id: 'sub-002',
    tenantId: 'tenant-002',
    planId: 'plan-pro-001',
    status: 'active',
    currentPeriodStart: new Date('2025-01-01'),
    currentPeriodEnd: new Date('2025-02-01'),
  },
];

describe('InvoiceCronService', () => {
  let service: InvoiceCronService;
  let mockPrisma: any;
  let mockInvoiceEngine: any;

  beforeAll(async () => {
    mockPrisma = {
      admin: {
        subscription: {
          findMany: jest.fn(),
        },
        invoice: {
          findFirst: jest.fn(),
        },
      },
    };

    mockInvoiceEngine = {
      generateInvoice: jest.fn(),
      finalizeInvoice: jest.fn(),
      markPaid: jest.fn(),
      markFailed: jest.fn(),
      voidInvoice: jest.fn(),
      listInvoices: jest.fn(),
      getInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InvoiceEngine, useValue: mockInvoiceEngine },
      ],
    }).compile();

    service = module.get(InvoiceCronService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates invoices for subscriptions past period end', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue(mockSubscriptions);
    mockPrisma.admin.invoice.findFirst.mockResolvedValue(null);
    mockInvoiceEngine.generateInvoice.mockResolvedValue({});

    const job: any = { id: 'job-001', data: undefined };
    await service.process(job);

    expect(mockInvoiceEngine.generateInvoice).toHaveBeenCalledTimes(2);
    expect(mockInvoiceEngine.generateInvoice).toHaveBeenCalledWith(
      'sub-001',
      mockSubscriptions[0].currentPeriodStart,
      mockSubscriptions[0].currentPeriodEnd,
    );
    expect(mockInvoiceEngine.generateInvoice).toHaveBeenCalledWith(
      'sub-002',
      mockSubscriptions[1].currentPeriodStart,
      mockSubscriptions[1].currentPeriodEnd,
    );
  });

  it('skips subscriptions with existing invoices for the same period', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue(mockSubscriptions);
    mockPrisma.admin.invoice.findFirst
      .mockResolvedValueOnce({ id: 'inv-001' })
      .mockResolvedValueOnce(null);
    mockInvoiceEngine.generateInvoice.mockResolvedValue({});

    const job: any = { id: 'job-002', data: undefined };
    await service.process(job);

    expect(mockInvoiceEngine.generateInvoice).toHaveBeenCalledTimes(1);
    expect(mockInvoiceEngine.generateInvoice).toHaveBeenCalledWith(
      'sub-002',
      mockSubscriptions[1].currentPeriodStart,
      mockSubscriptions[1].currentPeriodEnd,
    );
  });

  it('handles errors for individual subscriptions without crashing', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue(mockSubscriptions);
    mockPrisma.admin.invoice.findFirst.mockResolvedValue(null);
    mockInvoiceEngine.generateInvoice
      .mockRejectedValueOnce(new Error('Stripe down'))
      .mockResolvedValueOnce({});

    const job: any = { id: 'job-003', data: undefined };
    await expect(service.process(job)).resolves.toBeUndefined();

    expect(mockInvoiceEngine.generateInvoice).toHaveBeenCalledTimes(2);
  });

  it('only processes active-like subscriptions', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue([]);

    const job: any = { id: 'job-004', data: undefined };
    await service.process(job);

    expect(mockPrisma.admin.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: ['active', 'trialing', 'past_due', 'grace_period'],
          },
        }),
      }),
    );
    expect(mockInvoiceEngine.generateInvoice).not.toHaveBeenCalled();
  });

  it('does not generate invoices for cancelled subscriptions', async () => {
    mockPrisma.admin.subscription.findMany.mockResolvedValue([]);

    const job: any = { id: 'job-005', data: undefined };
    await service.process(job);

    expect(mockInvoiceEngine.generateInvoice).not.toHaveBeenCalled();
  });
});
