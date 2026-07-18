import { Module } from '@nestjs/common';
import { AdminToolsModule } from '../admin-tools/admin-tools.module';
import { AuditModule } from '../audit/audit.module';
import { ExportModule } from '../export/export.module';
import { HealthModule } from '../health/health.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SearchModule } from '../search/search.module';

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
    ExportModule,
    HealthModule,
    NotificationsModule,
    SearchModule,
  ],
})
export class InfrastructureModule {}
