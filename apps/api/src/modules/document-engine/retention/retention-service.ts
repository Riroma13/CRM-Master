import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { LifecycleExecutionContext, LifecyclePolicyInput, LifecycleRunResult } from '../../../../../../packages/shared/src/lifecycle';

@Injectable()
export class RetentionService {
  readonly target = 'document-trash' as const;
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: LifecycleExecutionContext, _policy: LifecyclePolicyInput): Promise<LifecycleRunResult> {
    return { purgedCount: await this.purgeExpiredTrash(context.tenantId) };
  }

  async purgeExpiredTrash(tenantId?: string): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.admin.documentTrash.findMany({
      where: { ...(tenantId ? { tenantId } : {}), expiresAt: { lte: now }, restoredAt: null },
    });

    for (const item of expired) {
      this.logger.log(`Purging expired trash: ${item.documentId}`);
      await this.prisma.admin.documentTrash.delete({ where: { id: item.id } });
      // Storage cleanup would happen here
    }
    return expired.length;
  }
}
