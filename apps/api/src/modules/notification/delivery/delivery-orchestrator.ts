import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { CommunicationProvider, SendMessageInput } from '@shared/communication';

@Injectable()
export class DeliveryOrchestrator {
  private readonly logger = new Logger(DeliveryOrchestrator.name);
  private readonly MAX_RETRIES = 3;
  private readonly BACKOFF_MS: number[];
  private provider: CommunicationProvider | null = null;

  constructor(
    private readonly prisma: PrismaService,
    options?: { backoffMs?: number[] },
  ) {
    this.BACKOFF_MS = options?.backoffMs ?? [1_000, 5_000, 30_000];
  }

  setProvider(provider: CommunicationProvider) {
    this.provider = provider;
  }

  async deliver(notificationId: string): Promise<void> {
    const notification = await this.prisma.admin.notificationInstance.findUnique({
      where: { id: notificationId },
      include: { receipts: true },
    });

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found for delivery`);
      return;
    }

    if (['delivered', 'cancelled', 'expired'].includes(notification.status)) {
      this.logger.debug(`Notification ${notificationId} already in terminal state: ${notification.status}`);
      return;
    }

    const prefs = await this.prisma.forTenant(notification.tenantId).notificationPreference.findFirst({
      where: { userId: notification.userId, category: null },
    });

    if (prefs && !prefs.enabled) {
      await this.prisma.admin.notificationInstance.update({
        where: { id: notificationId },
        data: { status: 'cancelled', version: { increment: 1 } },
      });
      await this.createAudit(notification.tenantId, notificationId, 'cancelled', { reason: 'disabled at delivery' });
      return;
    }

    if (this.isInsideQuietHours(prefs, notification.createdAt)) {
      const delay = this.calculateQuietHoursDelay(prefs, notification.createdAt);
      await this.prisma.admin.notificationInstance.update({
        where: { id: notificationId },
        data: {
          status: 'scheduled',
          scheduledAt: new Date(Date.now() + delay),
          version: { increment: 1 },
        },
      });
      await this.createAudit(notification.tenantId, notificationId, 'rescheduled', { delay });
      return;
    }

    const idempotencyKey = notification.idempotencyKey || notification.id;
    let lastError: string | undefined;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        if (!this.provider) {
          throw new Error('CommunicationProvider not configured');
        }

        const content = (notification.content || {}) as Record<string, unknown>;

        const message: SendMessageInput = {
          messageId: notification.id,
          tenantId: notification.tenantId,
          channel: notification.channel || 'email',
          to: notification.userId,
          body: typeof content.body === 'string' ? content.body : '',
          subject: typeof content.subject === 'string' ? content.subject : undefined,
          variables: content,
          idempotencyKey,
        };

        const result = await this.provider.send(notification.channel || 'email', message);

        if (result.success) {
          await this.prisma.admin.notificationInstance.update({
            where: { id: notificationId },
            data: {
              status: 'delivered',
              deliveredAt: new Date(),
              version: { increment: 1 },
            },
          });

          await this.prisma.admin.notificationReceipt.create({
            data: {
              notificationId,
              tenantId: notification.tenantId,
              channel: notification.channel || 'email',
              status: 'delivered',
              providerMessageId: result.externalId,
            },
          });

          await this.createAudit(notification.tenantId, notificationId, 'delivered', { attempt, providerMessageId: result.externalId });
          return;
        }

        lastError = result.error || 'Unknown delivery error';
        await this.createAudit(notification.tenantId, notificationId, 'delivery_attempt', { attempt, error: lastError });
      } catch (error: any) {
        lastError = error.message;
        this.logger.warn(`Delivery attempt ${attempt + 1} failed for ${notificationId}: ${lastError}`);
        await this.createAudit(notification.tenantId, notificationId, 'delivery_error', { attempt, error: lastError });

        if (attempt < this.MAX_RETRIES - 1) {
          await this.sleep(this.BACKOFF_MS[attempt]);
        }
      }
    }

    await this.prisma.admin.notificationInstance.update({
      where: { id: notificationId },
      data: {
        status: 'failed',
        error: lastError,
        version: { increment: 1 },
      },
    });

    await this.prisma.admin.notificationReceipt.create({
      data: {
        notificationId,
        tenantId: notification.tenantId,
        channel: notification.channel || 'email',
        status: 'failed',
        error: lastError,
      },
    });

    await this.createAudit(notification.tenantId, notificationId, 'dlq', { error: lastError });
  }

  private isInsideQuietHours(prefs: any, referenceDate: Date): boolean {
    if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) return false;
    const tz = prefs.quietHoursTz || 'UTC';
    const nowLocal = new Date(referenceDate.toLocaleString('en-US', { timeZone: tz }));
    const currentMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();
    const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  private calculateQuietHoursDelay(prefs: any, referenceDate: Date): number {
    const tz = prefs.quietHoursTz || 'UTC';
    const nowLocal = new Date(referenceDate.toLocaleString('en-US', { timeZone: tz }));
    const currentMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    return (endMinutes - currentMinutes + (endMinutes <= currentMinutes ? 1440 : 0)) * 60 * 1000;
  }

  private async createAudit(tenantId: string, notificationId: string, eventType: string, data?: Record<string, unknown>) {
    await this.prisma.admin.notificationAudit.create({
      data: { notificationId, tenantId, eventType, data: data ?? {} },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
