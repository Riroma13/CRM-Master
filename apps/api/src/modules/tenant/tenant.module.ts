import { Module } from '@nestjs/common';
import { TenantAutomationsModule } from '../tenant-automations/tenant-automations.module';
import { TenantClientesModule } from '../tenant-clientes/tenant-clientes.module';
import { TenantDashboardModule } from '../tenant-dashboard/tenant-dashboard.module';
import { TenantEmailModule } from '../tenant-email/tenant-email.module';
import { TenantEncuestasModule } from '../tenant-encuestas/tenant-encuestas.module';
import { TenantEventosAcademicosModule } from '../tenant-eventos-academicos/tenant-eventos-academicos.module';
import { TenantGoogleCalendarModule } from '../tenant-google-calendar/tenant-google-calendar.module';
import { TenantHealthModule } from '../tenant-health/tenant-health.module';
import { TenantIncidenciasModule } from '../tenant-incidencias/tenant-incidencias.module';
import { TenantModulesModule } from '../tenant-modules/tenant-modules.module';
import { TenantNotificacionesModule } from '../tenant-notificaciones/tenant-notificaciones.module';
import { TenantPagosModule } from '../tenant-pagos/tenant-pagos.module';
import { TenantPlanesModule } from '../tenant-planes/tenant-planes.module';
import { TenantPlantillasModule } from '../tenant-plantillas/tenant-plantillas.module';
import { TenantPreferenciasModule } from '../tenant-preferencias/tenant-preferencias.module';
import { TenantPresupuestosModule } from '../tenant-presupuestos/tenant-presupuestos.module';
import { TenantProfileModule } from '../tenant-profile/tenant-profile.module';
import { TenantRecursosModule } from '../tenant-recursos/tenant-recursos.module';
import { TenantSistemasModule } from '../tenant-sistemas/tenant-sistemas.module';
import { TenantTareasModule } from '../tenant-tareas/tenant-tareas.module';
import { TenantWebhooksModule } from '../tenant-webhooks/tenant-webhooks.module';

/**
 * Aggregation module for all tenant-facing feature modules.
 *
 * Every `tenant-*` module lives here. The circular dependency
 * between TenantClientesModule ↔ TenantAutomationsModule ↔
 * TenantWebhooksModule resolves correctly because all three are
 * imported into the same parent scope.
 *
 * Tenant modules requiring NotificationsService or
 * CommunicationsService resolve them via direct provider
 * registration (TenantEmailModule, TenantAutomationsModule list
 * the classes in their providers array) — no additional module
 * imports needed from this aggregator.
 */
@Module({
  imports: [
    TenantAutomationsModule,
    TenantClientesModule,
    TenantDashboardModule,
    TenantEmailModule,
    TenantEncuestasModule,
    TenantEventosAcademicosModule,
    TenantGoogleCalendarModule,
    TenantHealthModule,
    TenantIncidenciasModule,
    TenantModulesModule,
    TenantNotificacionesModule,
    TenantPagosModule,
    TenantPlanesModule,
    TenantPlantillasModule,
    TenantPreferenciasModule,
    TenantPresupuestosModule,
    TenantProfileModule,
    TenantRecursosModule,
    TenantSistemasModule,
    TenantTareasModule,
    TenantWebhooksModule,
  ],
})
export class TenantModule {}
