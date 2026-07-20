import { Global, Module, OnModuleInit, Injectable } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { IngestionService } from './ingestion/ingestion.service';
import { PrismaService } from '../../common/prisma.service';
import { createAuditAppendOnlyMiddleware } from './audit-append-only.middleware';
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

@Injectable()
class AuditAppendOnlyRegistrar implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const client = this.prisma.admin as any;
    client.$use(createAuditAppendOnlyMiddleware());
  }
}

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'audit:ingestion',
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
      {
        name: 'audit:dlq',
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
        },
      },
      {
        name: 'audit:retention',
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
    AuditAppendOnlyRegistrar,
    AuditGuard,
    IntegrityVerifier,
    ComplianceEngine,
    ComplianceRuleRegistry,
    GDPRComplianceRule,
    SOC2ComplianceRule,
    LoginMFAExpectationRule,
    RetentionEngine,
    LegalHoldService,
    RedactionService,
    ExportService,
    JsonExporter,
    CsvExporter,
  ],
  exports: [AuditService],
})
export class AuditModule {}
