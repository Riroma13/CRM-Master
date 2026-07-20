import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class RetryEngine {
  private readonly logger = new Logger(RetryEngine.name);
  private readonly maxAttempts = 3;

  constructor(private readonly prisma: PrismaService) {}

  async shouldRetry(executionId: string): Promise<boolean> {
    const exec = await this.prisma.admin.integrationExecution.findUnique({ where: { id: executionId } });
    if (!exec) return false;
    if (exec.attempts >= this.maxAttempts) {
      await this.prisma.admin.integrationExecution.update({
        where: { id: executionId },
        data: { dlq: true, status: 'failed' },
      });
      this.logger.warn(`Execution ${executionId} moved to DLQ after ${this.maxAttempts} attempts`);
      return false;
    }
    return true;
  }
}
