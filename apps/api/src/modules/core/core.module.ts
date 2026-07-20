import { Module } from '@nestjs/common';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { AuthModule } from '../auth/auth.module';
import { AutomationModule } from '../automation/automation.module';
import { CitasModule } from '../citas/citas.module';
import { ClientAuthModule } from '../client-auth/client-auth.module';
import { ClientUserManagementModule } from '../client-user-management/client-user-management.module';
import { ClientsModule } from '../clients/clients.module';
import { CommunicationModule } from '../communication/communication.module';
import { CommunicationsModule } from '../communications/communications.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { DocumentosModule } from '../documentos/documentos.module';
import { EventosModule } from '../eventos/eventos.module';
import { SearchModule } from '../search/search.module';
import { TareasModule } from '../tareas/tareas.module';
import { TenantsModule } from '../tenants/tenant.module';

/**
 * Aggregation module for the platform's core business context.
 *
 * Mission Control / admin back-office modules plus shared domain
 * capabilities (appointments, documents, auth) that are consumed
 * by the tenant layer and infrastructure alike.
 */
@Module({
  imports: [
    ActivityTimelineModule,
    AuthModule,
    AutomationModule,
    CitasModule,
    CommunicationModule,
    ClientAuthModule,
    ClientUserManagementModule,
    ClientsModule,
    CommunicationsModule,
    DashboardModule,
    DocumentEngineModule,
    DocumentosModule,
    EventosModule,
    SearchModule,
    TareasModule,
    TenantsModule,
  ],
})
export class CoreModule {}
