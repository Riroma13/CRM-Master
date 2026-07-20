import { Injectable, Logger } from '@nestjs/common';
import type { SubscriptionStatus } from '@shared/billing';
import { StripeGateway } from '../payment/stripe-gateway';
import { SubscriptionEngine } from './subscription-engine';
import { PlanCatalogService } from '../plan/plan-catalog.service';

export interface SagaContext {
  tenantId: string;
  planId: string;
  email: string;
  priceId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentMethodId?: string;
}

export interface SagaStepResult {
  success: boolean;
  error?: string;
}

export interface SagaResult {
  success: boolean;
  context: SagaContext;
  failedStep: number;
  error?: string;
}

@Injectable()
export class ConvertTrialSaga {
  private readonly logger = new Logger(ConvertTrialSaga.name);

  constructor(
    private readonly stripeGateway: StripeGateway,
    private readonly subscriptionEngine: SubscriptionEngine,
    private readonly planCatalogService: PlanCatalogService,
  ) {}

  async execute(context: SagaContext): Promise<SagaResult> {
    const ctx: SagaContext = { ...context };

    try {
      const step1 = await this.stepCreateStripeCustomer(ctx);
      if (!step1.success) return this.fail(1, step1.error!, ctx);

      const step2 = await this.stepAttachPaymentMethod(ctx);
      if (!step2.success) {
        await this.compDeleteStripeCustomer(ctx);
        return this.fail(2, step2.error!, ctx);
      }

      const step3 = await this.stepCreateStripeSubscription(ctx);
      if (!step3.success) {
        await this.compDeleteStripeCustomer(ctx);
        return this.fail(3, step3.error!, ctx);
      }

      const step4 = await this.stepUpdateInHouseSubscription(ctx);
      if (!step4.success) {
        await this.compCancelStripeSubscription(ctx);
        await this.compDeleteStripeCustomer(ctx);
        await this.compRevertToTrialing(ctx);
        return this.fail(4, step4.error!, ctx);
      }

      this.logger.log(
        `Trial conversion complete: tenant=${ctx.tenantId}`,
      );

      return { success: true, context: ctx, failedStep: 0 };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown saga error';
      this.logger.error(`Saga crashed: ${message}`);
      return { success: false, context: ctx, failedStep: -1, error: message };
    }
  }

  async stepCreateStripeCustomer(
    context: SagaContext,
  ): Promise<SagaStepResult> {
    try {
      const customer = await this.stripeGateway.createCustomer(
        context.tenantId,
        context.email,
      );
      context.stripeCustomerId = customer.id;
      this.logger.log(
        `[Step 1] Stripe customer created: ${customer.id} for tenant=${context.tenantId}`,
      );
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to create customer',
      };
    }
  }

  async stepAttachPaymentMethod(
    context: SagaContext,
  ): Promise<SagaStepResult> {
    try {
      if (!context.stripeCustomerId || !context.paymentMethodId) {
        this.logger.log(
          `[Step 2] No payment method to attach for tenant=${context.tenantId} (free plan)`,
        );
        return { success: true };
      }

      await this.stripeGateway.attachPaymentMethod(
        context.paymentMethodId,
        context.stripeCustomerId,
      );
      this.logger.log(
        `[Step 2] Payment method attached for customer=${context.stripeCustomerId}`,
      );
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to attach payment method',
      };
    }
  }

  async stepCreateStripeSubscription(
    context: SagaContext,
  ): Promise<SagaStepResult> {
    try {
      if (!context.stripeCustomerId) {
        return {
          success: false,
          error: 'Cannot create subscription without Stripe customer',
        };
      }

      const plan = await this.planCatalogService.getPlan(context.planId);
      const trialDays = plan?.trialDays ?? 0;

      const subscription = await this.stripeGateway.createSubscription(
        context.stripeCustomerId,
        context.priceId,
        trialDays,
      );
      context.stripeSubscriptionId = subscription.id;
      this.logger.log(
        `[Step 3] Stripe subscription created: ${subscription.id} for customer=${context.stripeCustomerId}`,
      );
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to create Stripe subscription',
      };
    }
  }

  async stepUpdateInHouseSubscription(
    context: SagaContext,
  ): Promise<SagaStepResult> {
    try {
      await this.subscriptionEngine.updateSubscriptionWithStripeIds(
        context.tenantId,
        context.stripeCustomerId!,
        context.stripeSubscriptionId!,
      );
      this.logger.log(
        `[Step 4] In-house subscription updated to ACTIVE for tenant=${context.tenantId}`,
      );
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to update subscription status',
      };
    }
  }

  async compDeleteStripeCustomer(context: SagaContext): Promise<void> {
    if (!context.stripeCustomerId) return;
    try {
      await this.stripeGateway.deleteCustomer(context.stripeCustomerId);
      this.logger.log(
        `[Comp] Stripe customer deleted: ${context.stripeCustomerId}`,
      );
    } catch {
      this.logger.warn(
        `[Comp] Failed to delete Stripe customer: ${context.stripeCustomerId}`,
      );
    }
  }

  async compDetachPaymentMethod(context: SagaContext): Promise<void> {
    if (!context.paymentMethodId) return;
    try {
      await this.stripeGateway.detachPaymentMethod(context.paymentMethodId);
      this.logger.log(
        `[Comp] Payment method detached: ${context.paymentMethodId}`,
      );
    } catch {
      this.logger.warn(
        `[Comp] Failed to detach payment method: ${context.paymentMethodId}`,
      );
    }
  }

  async compCancelStripeSubscription(context: SagaContext): Promise<void> {
    if (!context.stripeSubscriptionId) return;
    try {
      await this.stripeGateway.cancelSubscription(
        context.stripeSubscriptionId,
      );
      this.logger.log(
        `[Comp] Stripe subscription cancelled: ${context.stripeSubscriptionId}`,
      );
    } catch {
      this.logger.warn(
        `[Comp] Failed to cancel Stripe subscription: ${context.stripeSubscriptionId}`,
      );
    }
  }

  async compRevertToTrialing(context: SagaContext): Promise<void> {
    try {
      await this.subscriptionEngine.updateStatus(
        context.tenantId,
        'trialing' as any,
      );
      this.logger.log(
        `[Comp] Subscription reverted to trialing for tenant=${context.tenantId}`,
      );
    } catch (error) {
      this.logger.warn(
        `[Comp] Failed to revert subscription: ${error}`,
      );
    }
  }

  private fail(
    step: number,
    error: string,
    context: SagaContext,
  ): SagaResult {
    this.logger.warn(
      `Trial conversion failed at step ${step}: ${error}`,
    );
    return {
      success: false,
      context,
      failedStep: step,
      error,
    };
  }
}
