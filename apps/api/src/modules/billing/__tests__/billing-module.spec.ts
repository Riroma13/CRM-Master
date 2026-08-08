import { MODULE_METADATA } from '@nestjs/common/constants';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { BillingModule } from '../billing.module';
import { FeatureFlagModule } from '../feature-flags/feature-flags.module';
import { FeatureFlagService } from '../feature-flags/feature-flags.service';
import { PlanFeatureGuard } from '../feature-flags/plan-feature.guard';
import { PrismaService } from '../../../common/prisma.service';
import { PlanCatalogService } from '../plan/plan-catalog.service';
import { STRIPE_CLIENT } from '../payment/stripe-gateway';
import {
  BILLING_QUEUE_NAMES,
  BILLING_QUEUE_IDENTITIES,
} from '../billing-queue.constants';

function providersWithoutPrismaProvider() {
  return (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, FeatureFlagModule) ?? []).filter(
    (provider: unknown) => provider !== PrismaService,
  );
}

describe('BillingModule feature-flag ownership', () => {
  it('uses colon-free queue identities for every Billing queue', () => {
    expect(BILLING_QUEUE_NAMES).toEqual({
      METERING: 'billing-metering',
      INVOICE: 'billing-invoice',
      STRIPE_WEBHOOKS: 'billing-stripe-webhooks',
    });
    expect(BILLING_QUEUE_IDENTITIES).not.toContainEqual(expect.stringContaining(':'));
  });

  it('re-exports the owning module instead of foreign providers', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, BillingModule);
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, BillingModule);

    expect(imports).toContain(FeatureFlagModule);
    expect(exports).toContain(FeatureFlagModule);
    expect(exports).not.toContain(FeatureFlagService);
    expect(exports).not.toContain(PlanFeatureGuard);
  });

  it('cannot bootstrap FeatureFlagService without its local Prisma provider', async () => {
    let error: unknown;
    try {
      await Test.createTestingModule({
        providers: [...providersWithoutPrismaProvider(), { provide: EventEmitter2, useValue: {} }],
      }).compile();
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('PrismaService');
  });

  it('bootstraps with an isolated Prisma mock and keeps ownership local', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot(), FeatureFlagModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, FeatureFlagModule);
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, FeatureFlagModule);

    expect(moduleRef.get(PrismaService)).toEqual({});
    expect(providers).toContain(PrismaService);
    expect(exports).not.toContain(PrismaService);
    await moduleRef.close();
  });

  it('bootstraps the BillingModule provider graph with PlanCatalogService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [BillingModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue({})
      .overrideProvider(getQueueToken(BILLING_QUEUE_NAMES.METERING))
      .useValue({})
      .overrideProvider(getQueueToken(BILLING_QUEUE_NAMES.INVOICE))
      .useValue({})
      .overrideProvider(getQueueToken(BILLING_QUEUE_NAMES.STRIPE_WEBHOOKS))
      .useValue({})
      .useMocker((token) => {
        if (token === PrismaService) return undefined;
        if (token === ConfigService) return { get: jest.fn() };
        return {};
      })
      .compile();

    expect(moduleRef.get(PlanCatalogService)).toBeInstanceOf(PlanCatalogService);
    expect(moduleRef.get(PrismaService)).toBeInstanceOf(PrismaService);
    await moduleRef.close();
  });

  it('owns PrismaService locally without exporting it', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, BillingModule);
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, BillingModule);

    expect(providers).toContain(PrismaService);
    expect(exports).not.toContain(PrismaService);
  });
});
