import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { MeteringEngine } from './metering-engine';
import {
  WorkflowCollector,
  DocumentCollector,
  ApiCollector,
} from './collectors';

@Processor('billing:metering')
@Injectable()
export class MeteringCronService extends WorkerHost {
  private readonly logger = new Logger(MeteringCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meteringEngine: MeteringEngine,
    private readonly workflowCollector: WorkflowCollector,
    private readonly documentCollector: DocumentCollector,
    private readonly apiCollector: ApiCollector,
  ) {
    super();
  }

  async process(job: Job<void, void, string>): Promise<void> {
    this.logger.log('Starting hourly metering collection...');

    const now = new Date();
    const periodStart = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), 1),
    );
    const periodEnd = new Date(
      Date.UTC(now.getFullYear(), now.getMonth() + 1, 1),
    );

    const subscriptions = await this.prisma.admin.subscription.findMany({
      where: {
        status: { in: ['active', 'trialing', 'past_due', 'grace_period'] },
      },
    });

    for (const sub of subscriptions) {
      try {
        const workflows = await this.workflowCollector.collect(
          sub.tenantId,
          periodStart,
          periodEnd,
        );
        if (workflows > 0) {
          await this.meteringEngine.recordUsage(
            sub.tenantId,
            'total_workflows',
            workflows,
            periodStart,
          );
        }

        const documents = await this.documentCollector.collect(
          sub.tenantId,
          periodStart,
          periodEnd,
        );
        if (documents > 0) {
          await this.meteringEngine.recordUsage(
            sub.tenantId,
            'total_documents',
            documents,
            periodStart,
          );
        }

        const apiCalls = await this.apiCollector.collect(
          sub.tenantId,
          periodStart,
          periodEnd,
        );
        if (apiCalls > 0) {
          await this.meteringEngine.recordUsage(
            sub.tenantId,
            'total_api_calls',
            apiCalls,
            periodStart,
          );
        }

        this.logger.debug(
          `Metered tenant=${sub.tenantId}: workflows=${workflows} documents=${documents} apiCalls=${apiCalls}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to meter tenant=${sub.tenantId}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Hourly metering complete: ${subscriptions.length} tenants processed`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (job) {
      this.logger.error(
        `Metering job ${job.id} failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
