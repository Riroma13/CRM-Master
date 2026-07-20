import { Module } from '@nestjs/common';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { AuditModule } from '../audit/audit.module';
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
import { IntegrationModule } from '../integration/integration.module';
import { DocumentosModule } from '../documentos/documentos.module';
import { EventosModule } from '../eventos/eventos.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { NotificationModule } from '../notification/notification.module';
import { ReportingModule } from '../reporting/reporting.module';
import { SearchModule } from '../search/search.module';
import { TareasModule } from '../tareas/tareas.module';
import { TenantsModule } from '../tenants/tenant.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    ActivityTimelineModule,
    AuditModule,
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
    IntegrationModule,
    EventosModule,
    KnowledgeModule,
    NotificationModule,
    ReportingModule,
    SearchModule,
    TareasModule,
    TenantsModule,
    WorkflowModule,
  ],
})
export class CoreModule {}
