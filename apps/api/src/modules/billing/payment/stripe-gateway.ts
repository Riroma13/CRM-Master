import { Injectable, Inject } from '@nestjs/common';
import { StripeCircuitBreaker, CircuitBreakerOpenError } from './stripe-circuit-breaker';

export interface StripeCustomer {
  id: string;
  email: string | null;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  items?: Array<{ price: { id: string } }>;
}

export interface StripePaymentMethod {
  id: string;
  customer: string;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request: { id: string | null; idempotency_key: string | null } | null;
}

export interface StripeClient {
  customers: {
    create(params: {
      email: string;
      metadata?: Record<string, string>;
    }): Promise<StripeCustomer>;
    del(customerId: string): Promise<{ id: string; deleted: boolean }>;
  };
  subscriptions: {
    create(params: {
      customer: string;
      items: Array<{ price: string; quantity?: number }>;
      metadata?: Record<string, string>;
      trial_period_days?: number;
      off_session?: boolean;
    }): Promise<StripeSubscription>;
    retrieve(subscriptionId: string): Promise<StripeSubscription>;
    update(
      subscriptionId: string,
      params: {
        items?: Array<{ id?: string; price?: string; quantity?: number; deleted?: boolean }>;
        proration_behavior?: 'always_invoice' | 'create_prorations' | 'none';
        metadata?: Record<string, string>;
      },
    ): Promise<StripeSubscription>;
    cancel(subscriptionId: string): Promise<{ id: string; status: string }>;
  };
  paymentMethods: {
    attach(
      paymentMethodId: string,
      params: { customer: string },
    ): Promise<StripePaymentMethod>;
    detach(paymentMethodId: string): Promise<StripePaymentMethod>;
  };
  webhooks: {
    constructEvent(
      payload: string | Buffer,
      signature: string,
      secret: string,
    ): StripeEvent;
  };
}

export const STRIPE_CLIENT = 'STRIPE_CLIENT';
export const STRIPE_WEBHOOK_SECRET = 'STRIPE_WEBHOOK_SECRET';

export interface StripeGatewayError {
  code: string;
  message: string;
  statusCode?: number;
}

@Injectable()
export class StripeGateway {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: StripeClient,
    private readonly circuitBreaker: StripeCircuitBreaker,
  ) {}

  async createCustomer(
    tenantId: string,
    email: string,
  ): Promise<StripeCustomer> {
    return this.circuitBreaker.call(async () => {
      try {
        return await this.stripe.customers.create({
          email,
          metadata: { tenantId },
        });
      } catch (error: any) {
        throw this.normalizeError(error, 'createCustomer');
      }
    });
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays?: number,
  ): Promise<StripeSubscription> {
    return this.circuitBreaker.call(async () => {
      try {
        return await this.stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          ...(trialDays ? { trial_period_days: trialDays } : {}),
          off_session: true,
        });
      } catch (error: any) {
        throw this.normalizeError(error, 'createSubscription');
      }
    });
  }

  async updateSubscription(
    subscriptionId: string,
    items: Array<{ id?: string; price?: string; quantity?: number; deleted?: boolean }>,
    prorationBehavior: 'always_invoice' | 'create_prorations' | 'none' = 'always_invoice',
  ): Promise<StripeSubscription> {
    return this.circuitBreaker.call(async () => {
      try {
        return await this.stripe.subscriptions.update(subscriptionId, {
          items,
          proration_behavior: prorationBehavior,
        });
      } catch (error: any) {
        throw this.normalizeError(error, 'updateSubscription');
      }
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.circuitBreaker.call(async () => {
      try {
        await this.stripe.subscriptions.cancel(subscriptionId);
      } catch (error: any) {
        throw this.normalizeError(error, 'cancelSubscription');
      }
    });
  }

  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<StripePaymentMethod> {
    return this.circuitBreaker.call(async () => {
      try {
        return await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch (error: any) {
        throw this.normalizeError(error, 'attachPaymentMethod');
      }
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await this.circuitBreaker.call(async () => {
      try {
        await this.stripe.paymentMethods.detach(paymentMethodId);
      } catch (error: any) {
        throw this.normalizeError(error, 'detachPaymentMethod');
      }
    });
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.circuitBreaker.call(async () => {
      try {
        await this.stripe.customers.del(customerId);
      } catch (error: any) {
        throw this.normalizeError(error, 'deleteCustomer');
      }
    });
  }

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): StripeEvent {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error: any) {
      throw this.normalizeError(error, 'verifyWebhookSignature');
    }
  }

  private normalizeError(error: any, operation: string): StripeGatewayError {
    if (error && error.type === 'StripeError') {
      return {
        code: error.code ?? 'stripe_error',
        message: error.message ?? `Stripe API error in ${operation}`,
        statusCode: error.statusCode,
      };
    }

    if (error && 'code' in error && 'message' in error) {
      return error as StripeGatewayError;
    }

    return {
      code: 'stripe_gateway_error',
      message:
        error instanceof Error
          ? error.message
          : `Unexpected error in ${operation}`,
    };
  }
}
