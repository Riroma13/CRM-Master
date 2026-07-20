import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { InvoiceEngine } from '../invoice/invoice-engine';
import { SubscriptionEngine } from '../subscription/subscription-engine';
import { StripeWebhookProcessor } from '../payment/stripe-webhook.processor';

describe('StripeWebhookProcessor', () => {
  let processor: StripeWebhookProcessor;
  let mockPrisma: any;
  let mockInvoiceEngine: any;
  let mockSubscriptionEngine: any;

  const mockJob = (eventId: string, type: string, data: any) => ({
    data: { eventId, type, data },
    id: eventId,
  }) as any;

  beforeEach(async () => {
    mockPrisma = {
      admin: {
        stripeWebhookEvent: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        subscription: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
        },
      },
    };

    mockInvoiceEngine = {
      markPaid: jest.fn(),
      markFailed: jest.fn(),
    };

    mockSubscriptionEngine = {
      updateStatus: jest.fn(),
      cancelSubscription: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InvoiceEngine, useValue: mockInvoiceEngine },
        { provide: SubscriptionEngine, useValue: mockSubscriptionEngine },
      ],
    }).compile();

    processor = module.get(StripeWebhookProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('idempotency', () => {
    it('skips duplicate events based on eventId', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue({
        id: 'evt_dup',
        status: 'processed',
      });

      await processor.process(
        mockJob('evt_dup', 'invoice.paid', { id: 'in_001' }),
      );

      expect(mockPrisma.admin.stripeWebhookEvent.create).not.toHaveBeenCalled();
      expect(mockInvoiceEngine.markPaid).not.toHaveBeenCalled();
    });

    it('creates StripeWebhookEvent record on first occurrence', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});

      await processor.process(
        mockJob('evt_001', 'invoice.paid', { id: 'in_001' }),
      );

      expect(mockPrisma.admin.stripeWebhookEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: 'evt_001' }),
        }),
      );
    });
  });

  describe('invoice.paid', () => {
    it('calls InvoiceEngine.markPaid with stripe invoice id', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});

      await processor.process(
        mockJob('evt_002', 'invoice.paid', {
          id: 'in_001',
          customer: 'cus_001',
        }),
      );

      expect(mockInvoiceEngine.markPaid).toHaveBeenCalledWith(
        'in_001',
        'in_001',
      );
    });

    it('marks event as processed on success', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});

      await processor.process(
        mockJob('evt_003', 'invoice.paid', { id: 'in_002' }),
      );

      expect(mockPrisma.admin.stripeWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt_003' },
          data: expect.objectContaining({ status: 'processed' }),
        }),
      );
    });
  });

  describe('invoice.payment_failed', () => {
    it('marks invoice as failed and subscription as past_due', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});
      mockPrisma.admin.subscription.findFirst.mockResolvedValue({
        tenantId: 'tenant-001',
      });

      await processor.process(
        mockJob('evt_004', 'invoice.payment_failed', {
          id: 'in_003',
          customer: 'cus_001',
        }),
      );

      expect(mockInvoiceEngine.markFailed).toHaveBeenCalledWith('in_003');
      expect(
        mockSubscriptionEngine.updateStatus,
      ).toHaveBeenCalledWith('tenant-001', 'past_due');
    });

    it('skips past_due update if no subscription found for customer', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});
      mockPrisma.admin.subscription.findFirst.mockResolvedValue(null);

      await processor.process(
        mockJob('evt_005', 'invoice.payment_failed', {
          id: 'in_004',
          customer: 'cus_unknown',
        }),
      );

      expect(mockInvoiceEngine.markFailed).toHaveBeenCalled();
      expect(
        mockSubscriptionEngine.updateStatus,
      ).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('syncs subscription status from Stripe', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});
      mockPrisma.admin.subscription.findFirst.mockResolvedValue({
        tenantId: 'tenant-001',
        status: 'active',
      });

      await processor.process(
        mockJob('evt_006', 'customer.subscription.updated', {
          id: 'sub_stripe_001',
          status: 'past_due',
          items: { data: [{ price: { id: 'price_001' } }] },
        }),
      );

      expect(
        mockSubscriptionEngine.updateStatus,
      ).toHaveBeenCalledWith('tenant-001', 'past_due');
    });

    it('skips update if subscription not found in DB', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});
      mockPrisma.admin.subscription.findFirst.mockResolvedValue(null);

      await processor.process(
        mockJob('evt_007', 'customer.subscription.updated', {
          id: 'sub_unknown',
          status: 'canceled',
        }),
      );

      expect(
        mockSubscriptionEngine.updateStatus,
      ).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.deleted', () => {
    it('cancels subscription when Stripe subscription is deleted', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});
      mockPrisma.admin.subscription.findFirst.mockResolvedValue({
        tenantId: 'tenant-001',
      });

      await processor.process(
        mockJob('evt_008', 'customer.subscription.deleted', {
          id: 'sub_stripe_002',
        }),
      );

      expect(
        mockSubscriptionEngine.cancelSubscription,
      ).toHaveBeenCalledWith('tenant-001');
    });
  });

  describe('unhandled event types', () => {
    it('marks unknown event types as ignored', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});

      await processor.process(
        mockJob('evt_009', 'payment_method.attached', {
          id: 'pm_001',
        }),
      );

      expect(mockPrisma.admin.stripeWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt_009' },
          data: expect.objectContaining({ status: 'ignored' }),
        }),
      );
    });
  });

  describe('error handling', () => {
    it('marks event as failed on processing error', async () => {
      mockPrisma.admin.stripeWebhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.admin.stripeWebhookEvent.create.mockResolvedValue({});
      mockPrisma.admin.stripeWebhookEvent.update.mockResolvedValue({});
      mockInvoiceEngine.markPaid.mockRejectedValue(
        new Error('Invoice not found'),
      );

      await processor.process(
        mockJob('evt_010', 'invoice.paid', { id: 'in_missing' }),
      );

      expect(mockPrisma.admin.stripeWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt_010' },
          data: expect.objectContaining({
            status: 'failed',
            failureReason: 'Invoice not found',
          }),
        }),
      );
    });
  });
});
