import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import type { SendMessageInput, DeliveryStatus } from "@shared/communication";
import { InMemoryDeliveryQueue } from './queue/in-memory-delivery-queue';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly queue: InMemoryDeliveryQueue,
    private readonly prisma: PrismaService,
  ) {}

  async send(input: Omit<SendMessageInput, 'messageId'>): Promise<{ messageId: string }> {
    const messageId = crypto.randomUUID();
    const message: SendMessageInput = { ...input, messageId };

    // Validate required variables would go here (Phase 4)

    await this.prisma.admin.messageDelivery.create({
      data: {
        messageId,
        tenantId: message.tenantId,
        channel: message.channel,
        provider: '',
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        body: message.body,
        status: 'pending',
      },
    });

    await this.queue.enqueue(message);
    this.logger.log(`Message ${messageId} sent to queue (channel: ${message.channel})`);
    return { messageId };
  }

  async getStatus(messageId: string): Promise<DeliveryStatus | null> {
    const delivery = await this.prisma.admin.messageDelivery.findUnique({
      where: { messageId },
    });
    if (!delivery) return null;
    return {
      deliveryId: delivery.id,
      status: delivery.status as any,
      attempts: delivery.attempts,
      lastAttemptAt: delivery.updatedAt?.toISOString(),
      error: delivery.error ?? undefined,
      updatedAt: delivery.updatedAt.toISOString(),
    };
  }

  async cancel(messageId: string): Promise<void> {
    await this.prisma.admin.messageDelivery.updateMany({
      where: { messageId, status: { in: ['pending', 'queued'] } },
      data: { status: 'failed' },
    });
  }
}
