import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TenantsModule } from './modules/tenants/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TenantResolveMiddleware } from './common/middleware/tenant-resolve.middleware';
import { TenantScopeGuard } from './common/guards/tenant-scope.guard';
import { AdminAuthGuard } from './common/guards/admin-auth.guard';
import { PrismaService } from './common/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    TenantsModule,
    AuthModule,
    ClientsModule,
    DashboardModule,
  ],
  providers: [
    PrismaService,
    TenantResolveMiddleware,
    {
      provide: APP_GUARD,
      useClass: AdminAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantScopeGuard,
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
