import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/prisma.service';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { SsrfValidator } from './ssrf-validator.service';

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 60_000;
const RETRY_STATUSES = ['retrying', 'failed'];

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: WebhookSubscriptionService,
    private readonly ssrfValidator: SsrfValidator,
  ) {}

  async dispatch(
    eventType: string,
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const subscriptions = await this.prisma.admin.webhookSubscription.findMany({
      where: { tenantId, active: true, eventTypes: { has: eventType } },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No active subscriptions for event ${eventType} on tenant ${tenantId}`);
      return;
    }

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    for (const sub of subscriptions) {
      const deliveryId = crypto.randomUUID();

      const delivery = await this.prisma.admin.webhookDelivery.create({
        data: {
          subscriptionId: sub.id,
          eventId,
          deliveryId,
          status: 'pending',
        },
      });

      const payload = {
        deliveryId,
        eventType,
        tenantId,
        data,
        timestamp,
      };

      try {
        await this.sendWebhook(sub, payload, delivery, 0);
      } catch (err) {
        this.logger.error(
          `Failed to dispatch webhook ${deliveryId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private async sendWebhook(
    subscription: { id: string; url: string; secret: string },
    payload: Record<string, unknown>,
    delivery: { id: string; attemptCount: number },
    attempt: number,
  ): Promise<void> {
    const validation = await this.ssrfValidator.validateUrl(subscription.url);
    if (!validation.valid) {
      await this.prisma.admin.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'failed', responseBody: validation.reason },
      });
      this.logger.warn(`SSRF validation failed for ${subscription.url}: ${validation.reason}`);
      return;
    }

    const body = JSON.stringify(payload);
    const secret = this.subscriptionService.decryptSecret(subscription.secret);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Delivery-ID': payload.deliveryId as string,
    };

    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers,
        body,
      });

      if (response.ok) {
        await this.prisma.admin.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'delivered',
            responseCode: response.status,
            responseBody: await response.text().catch(() => null),
            deliveredAt: new Date(),
          },
        });
        return;
      }

      await this.handleRetry(subscription, payload, delivery, attempt, response.status);
    } catch (err) {
      await this.handleRetry(
        subscription,
        payload,
        delivery,
        attempt,
        null,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  private async handleRetry(
    subscription: { id: string; url: string; secret: string },
    payload: Record<string, unknown>,
    delivery: { id: string; attemptCount: number },
    attempt: number,
    responseCode: number | null,
    errorMessage?: string,
  ): Promise<void> {
    const newAttempt = attempt + 1;

    if (newAttempt >= MAX_RETRIES) {
      await this.prisma.admin.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          responseCode,
          responseBody: errorMessage || `Max retries exceeded (${MAX_RETRIES})`,
          attemptCount: newAttempt,
        },
      });
      this.logger.warn(
        `Webhook ${delivery.id} dead lettered after ${MAX_RETRIES} attempts`,
      );
      return;
    }

    await this.prisma.admin.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'retrying',
        responseCode,
        responseBody: errorMessage,
        attemptCount: newAttempt,
      },
    });

    const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
    this.logger.debug(
      `Webhook ${delivery.id} attempt ${newAttempt}/${MAX_RETRIES}, retrying in ${delay}ms`,
    );

    setTimeout(() => {
      this.sendWebhook(subscription, payload, delivery, newAttempt).catch((err) => {
        this.logger.error(`Retry failed for webhook ${delivery.id}: ${err.message}`);
      });
    }, delay);
  }

  async replay(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.admin.webhookDelivery.findUnique({
      where: { deliveryId },
      include: { subscription: true },
    });

    if (!delivery) {
      throw new Error(`Delivery not found: ${deliveryId}`);
    }

    if (!delivery.subscription.active) {
      throw new Error(`Subscription ${delivery.subscriptionId} is inactive`);
    }

    await this.prisma.admin.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'pending',
        attemptCount: 0,
        responseCode: null,
        responseBody: null,
        deliveredAt: null,
      },
    });

    const payload = {
      deliveryId: delivery.deliveryId,
      eventType: 'replay',
      tenantId: delivery.subscription.tenantId,
      data: { originalDeliveryId: delivery.deliveryId },
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(
      {
        id: delivery.subscription.id,
        url: delivery.subscription.url,
        secret: delivery.subscription.secret,
      },
      payload,
      delivery,
      0,
    );
  }
}
