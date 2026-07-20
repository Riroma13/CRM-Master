import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { IntegrationController } from './integration.controller';
import { OAuthCallbackController } from './auth/oauth-callback.controller';
import { SchedulerController } from './scheduler/scheduler.controller';
import { IntegrationService } from './integration.service';
import { ConnectorRegistry } from './connectors/connector-registry';
import { OAuthProvider } from './auth/oauth-provider';
import { ApiKeyProvider } from './auth/api-key-provider';
import { WebhookConsumer } from './webhook/webhook-consumer';
import { RetryEngine } from './retry/retry-engine';
import { SchedulerService } from './scheduler/scheduler.service';

@Module({
  controllers: [IntegrationController, OAuthCallbackController, SchedulerController],
  providers: [
    PrismaService,
    IntegrationService,
    ConnectorRegistry,
    OAuthProvider,
    ApiKeyProvider,
    WebhookConsumer,
    RetryEngine,
    SchedulerService,
  ],
  exports: [IntegrationService, ConnectorRegistry],
})
export class IntegrationModule {}
