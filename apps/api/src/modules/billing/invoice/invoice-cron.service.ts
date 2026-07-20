import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { InvoiceEngine } from './invoice-engine';

@Processor('billing:invoice')
@Injectable()
export class InvoiceCronService extends WorkerHost {
  private readonly logger = new Logger(InvoiceCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceEngine: InvoiceEngine,
  ) {
    super();
  }

  async process(job: Job<void, void, string>): Promise<void> {
    this.logger.log('Starting daily invoice generation...');

    const now = new Date();
    const subscriptions = await this.prisma.admin.subscription.findMany({
      where: {
        status: { in: ['active', 'trialing', 'past_due', 'grace_period'] },
        currentPeriodEnd: { lte: now },
      },
      include: { plan: true },
    });

    this.logger.log(
      `Found ${subscriptions.length} subscriptions needing invoicing`,
    );

    for (const sub of subscriptions) {
      try {
        const existingInvoice = await this.prisma.admin.invoice.findFirst({
          where: {
            subscriptionId: sub.id,
            periodStart: sub.currentPeriodStart,
            periodEnd: sub.currentPeriodEnd,
          },
        });

        if (existingInvoice) {
          this.logger.debug(
            `Invoice already exists for subscription=${sub.id} period=${sub.currentPeriodStart.toISOString()}`,
          );
          continue;
        }

        await this.invoiceEngine.generateInvoice(
          sub.id,
          sub.currentPeriodStart,
          sub.currentPeriodEnd,
        );

        this.logger.log(
          `Invoice generated: subscription=${sub.id} tenant=${sub.tenantId}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to generate invoice for subscription=${sub.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Daily invoice generation complete: ${subscriptions.length} processed`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (job) {
      this.logger.error(
        `Invoice job ${job.id} failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
