import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { JobsModule } from '../jobs/jobs.module';
import { JobsClientService } from '../jobs/jobs-client.service';
import { PrismaService } from '../../common/prisma.service';
import { RetentionEngine } from '../audit/retention/retention-engine';
import { RetentionService } from '../document-engine/retention/retention-service';
import { AUDIT_LIFECYCLE_TARGET_ADAPTER, DOCUMENT_TRASH_LIFECYCLE_TARGET_ADAPTER } from '../../../../../packages/shared/src/lifecycle';
import { LifecyclePolicyService } from './lifecycle-policy.service';
import { LifecycleRunnerProcessor } from './lifecycle-runner.processor';
import { LifecycleController } from './lifecycle.controller';

@Module({
  imports: [AuditModule, DocumentEngineModule, JobsModule],
  controllers: [LifecycleController],
  providers: [PrismaService, {
    provide: LifecyclePolicyService,
    useFactory: (prisma: PrismaService, jobs: JobsClientService, audit: AuditService) => new LifecyclePolicyService(prisma, jobs, audit),
    inject: [PrismaService, JobsClientService, AuditService],
  }, {
    provide: LifecycleRunnerProcessor,
    useFactory: (prisma: PrismaService, auditAdapter: RetentionEngine, documentAdapter: RetentionService, audit: AuditService) =>
      new LifecycleRunnerProcessor(prisma, [auditAdapter, documentAdapter], audit),
    inject: [PrismaService, AUDIT_LIFECYCLE_TARGET_ADAPTER, DOCUMENT_TRASH_LIFECYCLE_TARGET_ADAPTER, AuditService],
  }],
  exports: [LifecyclePolicyService, LifecycleRunnerProcessor],
})
export class LifecycleModule {}
