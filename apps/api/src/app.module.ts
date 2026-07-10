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
import { TenantDashboardModule } from './modules/tenant-dashboard/tenant-dashboard.module';
import { TenantClientesModule } from './modules/tenant-clientes/tenant-clientes.module';
import { TenantTareasModule } from './modules/tenant-tareas/tenant-tareas.module';
import { TenantNotificacionesModule } from './modules/tenant-notificaciones/tenant-notificaciones.module';
import { TenantProfileModule } from './modules/tenant-profile/tenant-profile.module';
import { TenantSistemasModule } from './modules/tenant-sistemas/tenant-sistemas.module';
import { TenantRecursosModule } from './modules/tenant-recursos/tenant-recursos.module';
import { TenantModulesModule } from './modules/tenant-modules/tenant-modules.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { TenantHealthModule } from './modules/tenant-health/tenant-health.module';
import { SearchModule } from './modules/search/search.module';
import { AdminToolsModule } from './modules/admin-tools/admin-tools.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { TenantIncidenciasModule } from './modules/tenant-incidencias/tenant-incidencias.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
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
    TenantsModule,
    AuthModule,
    ClientsModule,
    DashboardModule,
    EventosModule,
    TareasModule,
    CitasModule,
    TenantDashboardModule,
    TenantClientesModule,
    TenantTareasModule,
    TenantNotificacionesModule,
    TenantProfileModule,
    TenantSistemasModule,
    TenantRecursosModule,
    TenantModulesModule,
    NotificationsModule,
    TenantIncidenciasModule,
    HealthModule,
    AuditModule,
    TenantHealthModule,
    SearchModule,
    AdminToolsModule,
    CommunicationsModule,
    DocumentosModule,
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
