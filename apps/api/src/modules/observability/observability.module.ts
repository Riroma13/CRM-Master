import { Global, Module } from '@nestjs/common';
import { PinoLoggerService } from './logging/pino-logger.service';
import { LoggingMiddleware } from './logging/logging.middleware';
import { RouteNormalizationMiddleware } from './logging/route-normalization.middleware';
import { HealthService } from './health/health.service';
import { MetricsRegistry } from './metrics/metrics-registry';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsController } from './metrics/metrics.controller';
import { AlertService } from './alerting/alert.service';
import { AlertWebhookController } from './alerting/alert-webhook.controller';

@Global()
@Module({
  controllers: [MetricsController, AlertWebhookController],
  providers: [
    PinoLoggerService,
    LoggingMiddleware,
    RouteNormalizationMiddleware,
    HealthService,
    MetricsRegistry,
    MetricsInterceptor,
    AlertService,
  ],
  exports: [PinoLoggerService, HealthService, MetricsRegistry, AlertService],
})
export class ObservabilityModule {}
