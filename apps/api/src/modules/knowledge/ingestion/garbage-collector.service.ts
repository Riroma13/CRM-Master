import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';

@Processor('kb:garbage-collector')
@Injectable()
export class GarbageCollectorService extends WorkerHost {
  private readonly logger = new Logger(GarbageCollectorService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ dryRun?: boolean }, any, string>): Promise<{ dryRun: boolean; deleted: number; orphans: number }> {
    const dryRun = job.data?.dryRun !== false;

    this.logger.log(`Starting garbage collection${dryRun ? ' (DRY RUN)' : ''}`);
    const orphans = await this.findOrphans();
    this.logger.log(`Found ${orphans.length} orphan chunks`);

    if (dryRun) {
      return { dryRun: true, deleted: 0, orphans: orphans.length };
    }

    let deleted = 0;
    const batchSize = 100;
    for (let i = 0; i < orphans.length; i += batchSize) {
      const batch = orphans.slice(i, i + batchSize);
      const ids = batch.map((o) => o.id);
      const result = await this.prisma.admin.kbChunk.deleteMany({
        where: { id: { in: ids } },
      });
      deleted += result.count;
    }

    this.logger.log(`Deleted ${deleted} orphan chunks`);
    return { dryRun: false, deleted, orphans: orphans.length };
  }

  private async findOrphans(): Promise<{ id: string; tenantId: string; sourceType: string; sourceId: string }[]> {
    const orphanCandidates = await this.prisma.admin.kbChunk.findMany({
      select: { id: true, tenantId: true, sourceType: true, sourceId: true },
      distinct: ['tenantId', 'sourceType', 'sourceId'],
    });

    const orphans: { id: string; tenantId: string; sourceType: string; sourceId: string }[] = [];

    for (const candidate of orphanCandidates) {
      const indexEntry = await this.prisma.admin.kbSourceIndex.findFirst({
        where: {
          tenantId: candidate.tenantId,
          sourceType: candidate.sourceType,
          sourceId: candidate.sourceId,
        },
      });

      if (!indexEntry) {
        const orphanChunks = await this.prisma.admin.kbChunk.findMany({
          where: {
            tenantId: candidate.tenantId,
            sourceType: candidate.sourceType,
            sourceId: candidate.sourceId,
          },
          select: { id: true, tenantId: true, sourceType: true, sourceId: true },
          take: 1,
        });
        orphans.push(...orphanChunks);
      }
    }

    return orphans;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    if (job) {
      this.logger.error(`GC job ${job.id} failed: ${error.message}`, error.stack);
    }
  }
}
