import { UnauthorizedException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { StripeWebhookGuard } from '../payment/stripe-webhook.guard';
import { StripeGateway, STRIPE_CLIENT, type StripeClient } from '../payment/stripe-gateway';
import { StripeCircuitBreaker } from '../payment/stripe-circuit-breaker';

type DeepMocked<T> = {
  [P in keyof T]: T[P] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : T[P] extends object
      ? DeepMocked<T[P]>
      : T[P];
};

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function createMockExecutionContext(
  body: any,
  headers: Record<string, string>,
  rawBody?: Buffer,
  response?: any,
) {
  const res = response ?? createMockResponse();
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        rawBody,
        body,
        headers,
      }),
      getResponse: () => res,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as any;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

const validEvent = {
  id: 'evt_123',
  type: 'invoice.paid',
  data: { object: { id: 'in_123' } },
  created: nowSeconds(),
  livemode: false,
  pending_webhooks: 0,
  request: null,
};

const oldEvent = {
  ...validEvent,
  id: 'evt_old',
  created: nowSeconds() - 301,
};

describe('StripeWebhookGuard', () => {
  let guard: StripeWebhookGuard;
  let mockStripe: DeepMocked<StripeClient>;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    jest.useFakeTimers();

    mockStripe = {
      customers: { create: jest.fn(), del: jest.fn() },
      subscriptions: { create: jest.fn(), retrieve: jest.fn(), update: jest.fn(), cancel: jest.fn() },
      paymentMethods: { attach: jest.fn(), detach: jest.fn() },
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(validEvent),
      },
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    } as any;

    const breaker = new StripeCircuitBreaker();
    const gateway = new StripeGateway(mockStripe as any, breaker);

    guard = new StripeWebhookGuard(gateway, mockQueue, 'whsec_test');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('valid webhook', () => {
    it('accepts event with valid signature and enqueues it', async () => {
      const context = createMockExecutionContext(
        '{"type":"invoice.paid"}',
        { 'stripe-signature': 'valid_sig' },
        Buffer.from('raw body'),
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockQueue.add).toHaveBeenCalledWith('evt_123', {
        eventId: 'evt_123',
        type: 'invoice.paid',
        data: { id: 'in_123' },
      });
    });

    it('returns 200 with received:true for valid event', async () => {
      const response = createMockResponse();

      const context = createMockExecutionContext(
        '{"type":"test"}',
        { 'stripe-signature': 'valid' },
        Buffer.from('raw'),
        response,
      );

      await guard.canActivate(context);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('invalid signature', () => {
    it('rejects event with invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching');
      });

      const context = createMockExecutionContext(
        '{"type":"test"}',
        { 'stripe-signature': 'bad_sig' },
        Buffer.from('tampered body'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('missing signature', () => {
    it('rejects event without stripe-signature header', async () => {
      const context = createMockExecutionContext(
        '{"type":"test"}',
        {},
        Buffer.from('body'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('missing body', () => {
    it('rejects event without request body', async () => {
      const context = createMockExecutionContext(
        undefined,
        { 'stripe-signature': 'sig' },
        undefined,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('expired timestamp', () => {
    it('rejects events older than 5 minutes', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(oldEvent as any);

      jest.setSystemTime(new Date((oldEvent.created + 302) * 1000));

      const context = createMockExecutionContext(
        '{"type":"test"}',
        { 'stripe-signature': 'old_sig' },
        Buffer.from('old body'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('replay attack', () => {
    it('rejects replayed event with same timestamp after 5 min', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue(oldEvent as any);

      jest.setSystemTime(new Date((oldEvent.created + 350) * 1000));

      const context = createMockExecutionContext(
        '{"type":"test"}',
        { 'stripe-signature': 'replay_sig' },
        Buffer.from('replay body'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
