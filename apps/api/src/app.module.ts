import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TenantsModule } from './modules/tenants/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { TareasModule } from './modules/tareas/tareas.module';
import { CitasModule } from './modules/citas/citas.module';
import { TenantResolveMiddleware } from './common/middleware/tenant-resolve.middleware';
import { TenantScopeGuard } from './common/guards/tenant-scope.guard';
import { BetterAuthGuard } from './common/guards/better-auth.guard';
import { PrismaService } from './common/prisma.service';
import { authClientProvider } from './common/auth-client.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    TenantsModule,
    AuthModule,
    ClientsModule,
    DashboardModule,
    EventosModule,
    TareasModule,
    CitasModule,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantResolveMiddleware)
      .forRoutes('*');
  }
}
