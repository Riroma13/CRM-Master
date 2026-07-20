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
import { DashboardEngine } from './dashboard/dashboard-engine';
import { DashboardHydrator } from './dashboard/dashboard-hydrator';
import { SnapshotService } from './snapshot/snapshot.service';
import { ExportService } from './export/export.service';
import { CsvExporter } from './export/csv-exporter';
import { JsonExporter } from './export/json-exporter';
import { SchedulingService } from './scheduling/scheduling.service';

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
      {
        name: 'reporting:export',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      },
      {
        name: 'reporting:schedule',
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
    DashboardEngine,
    DashboardHydrator,
    SnapshotService,
    ExportService,
    CsvExporter,
    JsonExporter,
    SchedulingService,
  ],
  exports: [
    ReportingService,
    KpiEngine,
    ReportEngine,
    DashboardEngine,
    DashboardHydrator,
    SnapshotService,
    ExportService,
    SchedulingService,
  ],
})
export class ReportingModule {}
