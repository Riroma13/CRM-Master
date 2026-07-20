import { Test, TestingModule } from '@nestjs/testing';
import {
  StripeGateway,
  STRIPE_CLIENT,
  type StripeClient,
  type StripeCustomer,
  type StripeSubscription,
  type StripePaymentMethod,
  type StripeEvent,
} from '../payment/stripe-gateway';
import {
  StripeCircuitBreaker,
  CircuitBreakerOpenError,
} from '../payment/stripe-circuit-breaker';

type DeepMocked<T> = {
  [P in keyof T]: T[P] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : T[P] extends object
      ? DeepMocked<T[P]>
      : T[P];
};

describe('StripeGateway', () => {
  let gateway: StripeGateway;
  let mockStripe: DeepMocked<StripeClient>;
  let breaker: StripeCircuitBreaker;

  beforeEach(async () => {
    mockStripe = {
      customers: {
        create: jest.fn(),
        del: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
      },
      paymentMethods: {
        attach: jest.fn(),
        detach: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    breaker = new StripeCircuitBreaker();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeGateway,
        { provide: StripeCircuitBreaker, useValue: breaker },
        { provide: STRIPE_CLIENT, useValue: mockStripe },
      ],
    }).compile();

    gateway = module.get(StripeGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('creates a customer in Stripe', async () => {
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_123',
        email: 'tenant@example.com',
      });

      const result = await gateway.createCustomer(
        'tenant-001',
        'tenant@example.com',
      );

      expect(result.id).toBe('cus_123');
      expect(result.email).toBe('tenant@example.com');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'tenant@example.com',
        metadata: { tenantId: 'tenant-001' },
      });
    });

    it('throws typed error on Stripe failure', async () => {
      mockStripe.customers.create.mockRejectedValue({
        type: 'StripeError',
        code: 'authentication_required',
        message: 'Invalid API key',
        statusCode: 401,
      });

      await expect(
        gateway.createCustomer('tenant-001', 'test@test.com'),
      ).rejects.toMatchObject({
        code: 'authentication_required',
        statusCode: 401,
      });
    });
  });

  describe('createSubscription', () => {
    it('creates a subscription in Stripe', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
      } as StripeSubscription);

      const result = await gateway.createSubscription(
        'cus_123',
        'price_pro',
      );

      expect(result.id).toBe('sub_123');
      expect(result.status).toBe('active');
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_pro' }],
        off_session: true,
      });
    });

    it('passes trial days when provided', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_456',
        customer: 'cus_456',
        status: 'trialing',
      } as StripeSubscription);

      await gateway.createSubscription('cus_456', 'price_pro', 14);

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ trial_period_days: 14 }),
      );
    });

    it('throws typed error on failure', async () => {
      mockStripe.subscriptions.create.mockRejectedValue({
        type: 'StripeError',
        code: 'card_declined',
        message: 'Your card was declined',
        statusCode: 402,
      });

      await expect(
        gateway.createSubscription('cus_123', 'price_pro'),
      ).rejects.toMatchObject({ code: 'card_declined', statusCode: 402 });
    });
  });

  describe('updateSubscription', () => {
    it('updates subscription with items and proration', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
      } as StripeSubscription);

      const result = await gateway.updateSubscription(
        'sub_123',
        [{ price: 'price_enterprise' }],
        'always_invoice',
      );

      expect(result.id).toBe('sub_123');
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_123',
        {
          items: [{ price: 'price_enterprise' }],
          proration_behavior: 'always_invoice',
        },
      );
    });
  });

  describe('cancelSubscription', () => {
    it('cancels subscription in Stripe', async () => {
      mockStripe.subscriptions.cancel.mockResolvedValue({
        id: 'sub_123',
        status: 'canceled',
      });

      await gateway.cancelSubscription('sub_123');

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith(
        'sub_123',
      );
    });
  });

  describe('payment methods', () => {
    it('attaches payment method to customer', async () => {
      mockStripe.paymentMethods.attach.mockResolvedValue({
        id: 'pm_123',
        customer: 'cus_123',
      } as StripePaymentMethod);

      const result = await gateway.attachPaymentMethod(
        'pm_123',
        'cus_123',
      );

      expect(result.id).toBe('pm_123');
      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith(
        'pm_123',
        { customer: 'cus_123' },
      );
    });

    it('detaches payment method', async () => {
      mockStripe.paymentMethods.detach.mockResolvedValue({
        id: 'pm_123',
        customer: 'cus_123',
      } as StripePaymentMethod);

      await gateway.detachPaymentMethod('pm_123');

      expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith(
        'pm_123',
      );
    });
  });

  describe('customer deletion', () => {
    it('deletes customer from Stripe', async () => {
      mockStripe.customers.del.mockResolvedValue({
        id: 'cus_123',
        deleted: true,
      });

      await gateway.deleteCustomer('cus_123');

      expect(mockStripe.customers.del).toHaveBeenCalledWith('cus_123');
    });
  });

  describe('webhook signature verification', () => {
    it('verifies and returns event on valid signature', () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'invoice.paid',
        data: { object: { id: 'in_123' } },
        created: 1700000000,
        livemode: false,
        pending_webhooks: 0,
        request: null,
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const result = gateway.verifyWebhookSignature(
        Buffer.from('raw body'),
        'stripe-signature',
        'whsec_test',
      );

      expect(result.id).toBe('evt_123');
      expect(result.type).toBe('invoice.paid');
    });

    it('throws typed error on invalid signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found');
      });

      expect(() =>
        gateway.verifyWebhookSignature(
          Buffer.from('bad body'),
          'bad-sig',
          'whsec_test',
        ),
      ).toThrow();
    });
  });

  describe('circuit breaker integration', () => {
    it('opens circuit after 3 consecutive failures', async () => {
      mockStripe.customers.create.mockImplementation(() =>
        Promise.reject(new Error('Stripe down')),
      );

      let caught = 0;
      for (let i = 0; i < 3; i++) {
        try {
          await gateway.createCustomer('t-1', 'a@b.com');
        } catch {
          caught++;
        }
      }
      expect(caught).toBe(3);

      expect(breaker.getState()).toBe('OPEN');
      expect(breaker.getFailureCount()).toBe(3);

      let circuitThrew = false;
      try {
        await gateway.createCustomer('t-1', 'a@b.com');
      } catch (e: any) {
        circuitThrew = e instanceof CircuitBreakerOpenError;
      }
      expect(circuitThrew).toBe(true);

      expect(mockStripe.customers.create).toHaveBeenCalledTimes(3);
    });
  });
});
