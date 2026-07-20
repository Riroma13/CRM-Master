import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TokenService } from './auth/token.service';
import { TokenAuthGuard } from './auth/token-auth.guard';
import { ScopeGuard } from './guards/scope.guard';
import { RevokeController } from './auth/revoke.controller';
import { RateLimitService } from './rate-limit/rate-limit.service';
import { QuotaService } from './rate-limit/quota.service';
import { RateLimitGuard } from './rate-limit/rate-limit.guard';
import { SsrfValidator } from './webhook/ssrf-validator.service';
import { WebhookSubscriptionService } from './webhook/webhook-subscription.service';
import { WebhookDispatcherService } from './webhook/webhook-dispatcher.service';
import { WebhookController } from './webhook/webhook.controller';
import { V1WorkflowsController } from './v1/v1-workflows.controller';
import { V1DocumentsController } from './v1/v1-documents.controller';
import { ApiVersionMiddleware } from './middleware/api-version.middleware';
import { WorkflowModule } from '../workflow/workflow.module';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { WorkflowService } from '../workflow/workflow.service';
import { DocumentService } from '../document-engine/document.service';

@Module({
  imports: [WorkflowModule, DocumentEngineModule],
  controllers: [RevokeController, WebhookController, V1WorkflowsController, V1DocumentsController],
  providers: [
    PrismaService,
    TokenService,
    TokenAuthGuard,
    ScopeGuard,
    RateLimitService,
    QuotaService,
    RateLimitGuard,
    SsrfValidator,
    WebhookSubscriptionService,
    WebhookDispatcherService,
  ],
  exports: [
    TokenService,
    TokenAuthGuard,
    ScopeGuard,
    RateLimitService,
    QuotaService,
    RateLimitGuard,
    SsrfValidator,
    WebhookSubscriptionService,
    WebhookDispatcherService,
  ],
})
export class PublicApiModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ApiVersionMiddleware)
      .forRoutes({ path: '/api/*', method: RequestMethod.ALL });
  }
}
