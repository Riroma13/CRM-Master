import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { InvoiceEngine } from '../invoice/invoice-engine';
import { SubscriptionEngine } from '../subscription/subscription-engine';

export interface StripeWebhookJobData {
  eventId: string;
  type: string;
  data: Record<string, unknown>;
}

@Processor('billing:stripe-webhooks')
@Injectable()
export class StripeWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(StripeWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceEngine: InvoiceEngine,
    private readonly subscriptionEngine: SubscriptionEngine,
  ) {
    super();
  }

  async process(job: Job<StripeWebhookJobData, void, string>): Promise<void> {
    const { eventId, type, data } = job.data;

    const existing = await this.prisma.admin.stripeWebhookEvent.findUnique({
      where: { id: eventId },
    });
    if (existing) {
      this.logger.log(`Duplicate webhook skipped: eventId=${eventId}`);
      return;
    }

    await this.prisma.admin.stripeWebhookEvent.create({
      data: {
        id: eventId,
        type,
        data: data as any,
        status: 'pending',
      },
    });

    try {
      switch (type) {
        case 'invoice.paid':
          await this.handleInvoicePaid(data);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(data);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(data);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(data);
          break;
        default:
          this.logger.log(`Unhandled webhook type: ${type} (ignored)`);
          await this.markEvent(eventId, 'ignored');
          return;
      }

      await this.markEvent(eventId, 'processed');
      this.logger.log(`Webhook processed: type=${type} eventId=${eventId}`);
    } catch (error: any) {
      this.logger.error(
        `Webhook processing failed: type=${type} eventId=${eventId} — ${error.message}`,
        error.stack,
      );
      await this.markEventFailed(eventId, error.message);
    }
  }

  private async handleInvoicePaid(data: Record<string, unknown>): Promise<void> {
    const stripeInvoiceId = data.id as string;
    await this.invoiceEngine.markPaid(stripeInvoiceId, stripeInvoiceId);
  }

  private async handleInvoicePaymentFailed(
    data: Record<string, unknown>,
  ): Promise<void> {
    const stripeInvoiceId = data.id as string;
    await this.invoiceEngine.markFailed(stripeInvoiceId);

    const customerId = data.customer as string;
    if (customerId) {
      const sub = await this.prisma.admin.subscription.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (sub) {
        await this.subscriptionEngine.updateStatus(
          sub.tenantId,
          'past_due' as any,
        );
      }
    }
  }

  private async handleSubscriptionUpdated(
    data: Record<string, unknown>,
  ): Promise<void> {
    const stripeSubId = data.id as string;
    const status = data.status as string;
    const items = data.items as { data: Array<{ price: { id: string } }> } | undefined;

    const sub = await this.prisma.admin.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (!sub) {
      this.logger.warn(
        `Subscription not found for stripeSubscriptionId=${stripeSubId}`,
      );
      return;
    }

    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'cancelled',
      incomplete: 'pending',
      incomplete_expired: 'expired',
      trialing: 'trialing',
      unpaid: 'past_due',
    };

    const mappedStatus = statusMap[status] ?? sub.status;
    if (mappedStatus !== sub.status) {
      await this.subscriptionEngine.updateStatus(
        sub.tenantId,
        mappedStatus as any,
      );
    }
  }

  private async handleSubscriptionDeleted(
    data: Record<string, unknown>,
  ): Promise<void> {
    const stripeSubId = data.id as string;

    const sub = await this.prisma.admin.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (sub) {
      await this.subscriptionEngine.cancelSubscription(sub.tenantId);
    }
  }

  private async markEvent(
    eventId: string,
    status: string,
  ): Promise<void> {
    await this.prisma.admin.stripeWebhookEvent.update({
      where: { id: eventId },
      data: {
        status,
        processedAt: status === 'processed' ? new Date() : undefined,
      },
    });
  }

  private async markEventFailed(
    eventId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.admin.stripeWebhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'failed',
        failureReason: reason,
      },
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (job) {
      this.logger.error(
        `Webhook job ${job.id} failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
