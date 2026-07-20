import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import type { ExportFormat } from '@shared/reporting/reporting.types';

const EXPORTS_DIR = path.resolve(process.cwd(), 'exports');

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reporting:export') private readonly exportQueue: Queue,
  ) {}

  async createExport(
    tenantId: string,
    type: string,
    format: ExportFormat,
    config?: Record<string, unknown>,
  ) {
    const prisma = this.prisma.forTenant(tenantId);

    const job = await prisma.exportJob.create({
      data: {
        tenantId,
        type,
        format,
        status: 'pending',
        config: config ?? {},
      },
    });

    await this.exportQueue.add(
      'export',
      {
        jobId: job.id,
        tenantId,
        type,
        format,
        config,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    return {
      id: job.id,
      status: job.status,
      format: job.format,
      createdAt: job.createdAt,
    };
  }

  async getExport(tenantId: string, jobId: string) {
    const prisma = this.prisma.forTenant(tenantId);

    const job = await prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Export job ${jobId} not found`);
    }

    return job;
  }

  async downloadExport(tenantId: string, jobId: string) {
    const prisma = this.prisma.forTenant(tenantId);

    const job = await prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Export job ${jobId} not found`);
    }

    if (job.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant export access denied');
    }

    if (job.status !== 'completed') {
      throw new Error(`Export job ${jobId} is not completed (status: ${job.status})`);
    }

    const filePath = this.getExportPath(tenantId, jobId, job.format as ExportFormat);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Export file not found at ${filePath}`);
    }

    return fs.createReadStream(filePath);
  }

  async markCompleted(
    jobId: string,
    tenantId: string,
    format: ExportFormat,
    buffer: Buffer,
  ) {
    const filePath = this.getExportPath(tenantId, jobId, format);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, buffer);

    const prisma = this.prisma.forTenant(tenantId);
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        filePath,
        completedAt: new Date(),
      },
    });
  }

  async markFailed(jobId: string, tenantId: string, error: string) {
    const prisma = this.prisma.forTenant(tenantId);
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error,
        completedAt: new Date(),
      },
    });
  }

  private getExportPath(
    tenantId: string,
    jobId: string,
    format: ExportFormat,
  ): string {
    return path.join(EXPORTS_DIR, tenantId, `${jobId}.${format}`);
  }
}
