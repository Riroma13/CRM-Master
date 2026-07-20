import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class QuarantineService {
  private readonly logger = new Logger(QuarantineService.name);
  private readonly RETENTION_DAYS = 30;
  private readonly NOTIFICATION_CHECK_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {}

  async markAsQuarantined(documentId: string, tenantId: string): Promise<void> {
    await this.prisma.admin.document.updateMany({
      where: { documentId, tenantId },
      data: { status: 'quarantined' },
    });
    this.logger.warn(`Document ${documentId} quarantined (tenant ${tenantId})`);
  }

  async purgeExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const expired = await this.prisma.admin.document.findMany({
      where: { status: 'quarantined', updatedAt: { lte: cutoff } },
    });

    for (const doc of expired) {
      this.logger.log(`Purging quarantined document ${doc.documentId}`);
      await this.prisma.admin.document.update({
        where: { id: doc.id },
        data: { status: 'deleted', isDeleted: true, deletedAt: new Date() },
      });
    }
    return expired.length;
  }
}
