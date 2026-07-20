import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingGuard } from './guards/billing.guard';
import { PlanCatalogService } from './plan/plan-catalog.service';
import { PlanLimitsService } from './plan/plan-limits.service';
import { PlanLimitGuard } from './guards/plan-limit.guard';
import { MeteringEngine } from './metering/metering-engine';
import { MeteringCronService } from './metering/metering-cron.service';
import { MeteringCronRegistrar } from './metering/metering-cron-registrar';
import {
  WorkflowCollector,
  DocumentCollector,
  ApiCollector,
} from './metering/collectors';
import { InvoiceEngine } from './invoice/invoice-engine';
import { PricingStrategyFactory } from './invoice/pricing-strategy.factory';
import { InvoiceCronService } from './invoice/invoice-cron.service';
import {
  FlatWithOverageStrategy,
  PerUnitStrategy,
  TieredStrategy,
  FlatStrategy,
} from './invoice/strategies';
import { StripeCircuitBreaker } from './payment/stripe-circuit-breaker';
import { StripeGateway, STRIPE_CLIENT, STRIPE_WEBHOOK_SECRET } from './payment/stripe-gateway';
import { StripeWebhookGuard } from './payment/stripe-webhook.guard';
import { StripeWebhookProcessor } from './payment/stripe-webhook.processor';
import { ConvertTrialSaga } from './subscription/convert-trial.saga';
import { SubscriptionEngine } from './subscription/subscription-engine';
import { LifecycleService } from './subscription/lifecycle.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'billing:metering',
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    }),
    BullModule.registerQueue({
      name: 'billing:invoice',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    }),
    BullModule.registerQueue({
      name: 'billing:stripe-webhooks',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [BillingController],
  providers: [
    BillingGuard,
    PlanCatalogService,
    PlanLimitsService,
    PlanLimitGuard,
    MeteringEngine,
    MeteringCronService,
    MeteringCronRegistrar,
    WorkflowCollector,
    DocumentCollector,
    ApiCollector,
    InvoiceEngine,
    PricingStrategyFactory,
    InvoiceCronService,
    FlatWithOverageStrategy,
    PerUnitStrategy,
    TieredStrategy,
    FlatStrategy,
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
    StripeCircuitBreaker,
    StripeGateway,
    StripeWebhookGuard,
    StripeWebhookProcessor,
    ConvertTrialSaga,
    SubscriptionEngine,
    LifecycleService,
    {
      provide: STRIPE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const Stripe = require('stripe');
        const apiKey = configService.get<string>('STRIPE_SECRET_KEY');
        return new Stripe(apiKey);
      },
      inject: [ConfigService],
    },
    {
      provide: STRIPE_WEBHOOK_SECRET,
      useFactory: (configService: ConfigService) => {
        return configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    PlanCatalogService,
    PlanLimitsService,
    PlanLimitGuard,
    MeteringEngine,
    InvoiceEngine,
    PricingStrategyFactory,
    WorkflowCollector,
    DocumentCollector,
    ApiCollector,
    StripeGateway,
    StripeCircuitBreaker,
    ConvertTrialSaga,
    SubscriptionEngine,
    LifecycleService,
  ],
})
export class BillingModule {}
