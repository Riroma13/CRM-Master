import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  async markAsDlq(deliveryId: string): Promise<void> {
    await this.prisma.admin.messageDelivery.update({
      where: { id: deliveryId },
      data: { dlq: true },
    });
    this.logger.warn(`Message ${deliveryId} moved to DLQ`);
  }

  async listDlq(tenantId: string, page = 1, limit = 20) {
    const where = { tenantId, dlq: true };
    const [data, total] = await Promise.all([
      this.prisma.admin.messageDelivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admin.messageDelivery.count({ where }),
    ]);
    return { data, pagination: { page, limit, total } };
  }

  async replay(deliveryId: string, tenantId: string): Promise<void> {
    const delivery = await this.prisma.admin.messageDelivery.findFirst({
      where: { id: deliveryId, tenantId },
    });
    if (!delivery) throw new NotFoundException(`Delivery ${deliveryId} not found`);

    await this.prisma.admin.messageDelivery.update({
      where: { id: deliveryId },
      data: { dlq: false, attempts: 0, status: 'pending', error: null },
    });
    this.logger.log(`Message ${deliveryId} replayed from DLQ`);
  }
}
