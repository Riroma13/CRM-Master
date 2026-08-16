import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { IngestionService } from './ingestion/ingestion.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditGuard } from './guards/audit.guard';
import { IntegrityVerifier } from './integrity/integrity-verifier';
import { ComplianceEngine } from './compliance/compliance-engine';
import { ComplianceRuleRegistry } from './compliance/compliance-rule-registry';
import { GDPRComplianceRule, SOC2ComplianceRule } from './compliance/default-rules';
import { LoginMFAExpectationRule } from './compliance/expectation-rules/login-mfa-rule';
import { RetentionEngine } from './retention/retention-engine';
import { LegalHoldService } from './retention/legal-hold.service';
import { RedactionService } from './retention/redaction.service';
import { ExportService } from './export/export.service';
import { JsonExporter } from './export/json-exporter';
import { CsvExporter } from './export/csv-exporter';
import { IdentityModule } from '../identity/identity.module';
import { IdentityAuditDispatcherService } from '../identity/identity-audit-dispatcher.service';
import {
  AUDIT_RETENTION_QUEUE,
  IDENTITY_AUDIT_DLQ_QUEUE,
  IDENTITY_AUDIT_INGESTION_QUEUE,
} from './audit-queue.constants';
import { AUDIT_LIFECYCLE_TARGET_ADAPTER } from '../../../../../packages/shared/src/lifecycle';

@Global()
@Module({
  imports: [
    IdentityModule,
    BullModule.registerQueue(
      {
        name: IDENTITY_AUDIT_INGESTION_QUEUE,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
      {
        name: IDENTITY_AUDIT_DLQ_QUEUE,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
        },
      },
      {
        name: AUDIT_RETENTION_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
    ),
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    IngestionService,
    PrismaService,
    AuditGuard,
    IntegrityVerifier,
    ComplianceEngine,
    ComplianceRuleRegistry,
    GDPRComplianceRule,
    SOC2ComplianceRule,
    LoginMFAExpectationRule,
    RetentionEngine,
    { provide: AUDIT_LIFECYCLE_TARGET_ADAPTER, useExisting: RetentionEngine },
    LegalHoldService,
    RedactionService,
    ExportService,
    JsonExporter,
    CsvExporter,
    IdentityAuditDispatcherService,
  ],
  exports: [AuditService, RetentionEngine, AUDIT_LIFECYCLE_TARGET_ADAPTER],
})
export class AuditModule {}
