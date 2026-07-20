import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async purgeExpiredTrash(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.admin.documentTrash.findMany({
      where: { expiresAt: { lte: now }, restoredAt: null },
    });

    for (const item of expired) {
      this.logger.log(`Purging expired trash: ${item.documentId}`);
      await this.prisma.admin.documentTrash.delete({ where: { id: item.id } });
      // Storage cleanup would happen here
    }
    return expired.length;
  }
}
