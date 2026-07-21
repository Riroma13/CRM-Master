import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { CoreModule } from './modules/core/core.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { TenantResolveMiddleware } from './common/middleware/tenant-resolve.middleware';
import { TenantScopeGuard } from './common/guards/tenant-scope.guard';
import { BetterAuthGuard } from './common/guards/better-auth.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PrismaService } from './common/prisma.service';
import { authClientProvider } from './common/auth-client.provider';
import { LoggingMiddleware } from './modules/observability/logging/logging.middleware';
import { RouteNormalizationMiddleware } from './modules/observability/logging/route-normalization.middleware';
import { MetricsInterceptor } from './modules/observability/metrics/metrics.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    InfrastructureModule,
    CoreModule,
    TenantModule,
    ObservabilityModule,
  ],
  providers: [
    PrismaService,
    authClientProvider,
    TenantResolveMiddleware,
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantScopeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RouteNormalizationMiddleware, TenantResolveMiddleware, LoggingMiddleware)
      .forRoutes('*');
  }
}
