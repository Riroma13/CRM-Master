import { Module } from '@nestjs/common';
import { AdminToolsModule } from '../admin-tools/admin-tools.module';
import { AuditModule } from '../audit/audit.module';
import { ExportModule } from '../export/export.module';
import { HealthModule } from '../health/health.module';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ObservabilityModule } from '../observability/observability.module';
import { SearchModule } from '../search/search.module';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';

/**
 * Aggregation module for cross-cutting infrastructure concerns.
 *
 * Health, audit, search, export, admin tools, and notifications —
 * shared services consumed by both admin and tenant contexts.
 */
@Module({
  imports: [
    AdminToolsModule,
    AuditModule,
    DocumentEngineModule,
    ExportModule,
    HealthModule,
    JobsModule,
    NotificationsModule,
    ObservabilityModule,
    SearchModule,
    LifecycleModule,
  ],
})
export class InfrastructureModule {}
