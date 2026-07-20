import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

interface BatchingInput {
  id: string;
  tenantId: string;
  userId: string;
  category?: string;
  definition?: { category?: string };
  severity: string;
  digestFrequency?: string;
}

@Injectable()
export class BatchingEngine {
  private readonly logger = new Logger(BatchingEngine.name);
  private readonly MAX_DIGEST_SIZE = 100;

  constructor(private readonly prisma: PrismaService) {}

  shouldBatch(input: BatchingInput): boolean {
    if (input.severity === 'critical') return false;
    if (input.digestFrequency === 'never') return false;
    return true;
  }

  getBatchKey(input: BatchingInput): string {
    const category = input.category || input.definition?.category || 'general';
    return `${input.tenantId}:${category}:${input.userId}`;
  }

  async addToBatch(input: BatchingInput): Promise<string> {
    const batchKey = this.getBatchKey(input);

    const openBatch = await this.prisma.forTenant(input.tenantId).notificationBatch.findFirst({
      where: { batchKey, status: 'open' },
      orderBy: { windowStart: 'desc' },
    });

    if (openBatch) {
      return openBatch.id;
    }

    const now = new Date();
    const windowEnd = this.getWindowEnd(now);

    const batch = await this.prisma.forTenant(input.tenantId).notificationBatch.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        category: input.category || input.definition?.category,
        batchKey,
        windowStart: now,
        windowEnd,
        status: 'open',
      },
    });

    return batch.id;
  }

  async closeBatch(tenantId: string, batchKey: string): Promise<void> {
    await this.prisma.forTenant(tenantId).notificationBatch.updateMany({
      where: { batchKey, status: 'open' },
      data: { status: 'closed', closedAt: new Date() },
    });
  }

  async processDigests(): Promise<number> {
    const closedBatches = await this.prisma.admin.notificationBatch.findMany({
      where: { status: 'closed' },
      take: 50,
    });

    let processed = 0;
    for (const batch of closedBatches) {
      const count = await this.prisma.forTenant(batch.tenantId).notificationInstance.count({
        where: {
          tenantId: batch.tenantId,
          userId: batch.userId,
          status: 'batched',
          createdAt: { gte: batch.windowStart, lte: batch.windowEnd },
        },
      });

      if (count === 0) {
        await this.prisma.admin.notificationBatch.update({
          where: { id: batch.id },
          data: { status: 'delivered' },
        });
        continue;
      }

      const subBatches = Math.ceil(count / this.MAX_DIGEST_SIZE);
      for (let i = 0; i < subBatches; i++) {
        const notificationCount = Math.min(this.MAX_DIGEST_SIZE, count - i * this.MAX_DIGEST_SIZE);
        await this.prisma.forTenant(batch.tenantId).notificationDigest.create({
          data: {
            tenantId: batch.tenantId,
            userId: batch.userId,
            category: batch.category,
            batchKey: `${batch.batchKey}:${i}`,
            scheduledAt: new Date(),
            notificationCount,
            status: 'pending',
          },
        });
      }

      await this.prisma.admin.notificationBatch.update({
        where: { id: batch.id },
        data: { status: 'delivered' },
      });
      processed++;
    }

    return processed;
  }

  private getWindowEnd(from: Date): Date {
    const end = new Date(from);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}
