import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { CoreModule } from './modules/core/core.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantResolveMiddleware } from './common/middleware/tenant-resolve.middleware';
import { TenantScopeGuard } from './common/guards/tenant-scope.guard';
import { BetterAuthGuard } from './common/guards/better-auth.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PrismaService } from './common/prisma.service';
import { authClientProvider } from './common/auth-client.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    InfrastructureModule,
    CoreModule,
    TenantModule,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantResolveMiddleware)
      .forRoutes('*');
  }
}
