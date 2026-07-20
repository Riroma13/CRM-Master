import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reporting:schedule') private readonly scheduleQueue: Queue,
  ) {}

  async scheduleReport(
    tenantId: string,
    reportId: string,
    cronExpression: string,
  ) {
    const prisma = this.prisma.forTenant(tenantId);

    const report = await prisma.reportDefinition.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error(`Report definition ${reportId} not found`);
    }

    await prisma.reportDefinition.update({
      where: { id: reportId },
      data: { schedule: cronExpression },
    });

    const jobName = `report:${tenantId}:${reportId}`;

    const existing = await this.scheduleQueue.getJobScheduler(jobName);
    if (existing) {
      await this.scheduleQueue.removeJobScheduler(jobName);
    }

    await this.scheduleQueue.upsertJobScheduler(
      jobName,
      { pattern: cronExpression },
      {
        name: 'generate',
        data: {
          tenantId,
          reportId,
          type: 'scheduled',
        },
        opts: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
    );

    this.logger.log(
      `Scheduled report ${reportId} with cron: ${cronExpression}`,
    );

    return { reportId, cronExpression, status: 'scheduled' };
  }

  async unscheduleReport(tenantId: string, reportId: string) {
    const prisma = this.prisma.forTenant(tenantId);

    const report = await prisma.reportDefinition.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error(`Report definition ${reportId} not found`);
    }

    await prisma.reportDefinition.update({
      where: { id: reportId },
      data: { schedule: null },
    });

    const jobName = `report:${tenantId}:${reportId}`;
    const existing = await this.scheduleQueue.getJobScheduler(jobName);
    if (existing) {
      await this.scheduleQueue.removeJobScheduler(jobName);
    }

    this.logger.log(`Unscheduled report ${reportId}`);

    return { reportId, status: 'unscheduled' };
  }
}
