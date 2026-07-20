import { Global, Module, OnModuleInit, Injectable } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { DatasetIngestionService } from './ingestion/dataset-ingestion.service';
import { ReconciliationService } from './ingestion/reconciliation.service';
import { PrismaService } from '../../common/prisma.service';
import { createReportingReadOnlyMiddleware } from './reporting-read-only.middleware';
import { KpiEngine } from './kpi/kpi-engine';
import { ReportEngine } from './report/report-engine';
import { ReportingGuard } from './guards/reporting.guard';

@Injectable()
class ReportingReadOnlyRegistrar implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const client = this.prisma.admin as any;
    client.$use(createReportingReadOnlyMiddleware());
  }
}

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'reporting:dataset:ingestion',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
      {
        name: 'reporting:dataset:dlq',
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
        },
      },
      {
        name: 'reporting:report:generate',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      },
    ),
  ],
  controllers: [ReportingController],
  providers: [
    ReportingService,
    DatasetIngestionService,
    ReconciliationService,
    PrismaService,
    ReportingReadOnlyRegistrar,
    KpiEngine,
    ReportEngine,
    ReportingGuard,
  ],
  exports: [ReportingService, KpiEngine, ReportEngine],
})
export class ReportingModule {}
