import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAlertEvent(
    ruleName: string,
    severity: string,
    value: number,
    threshold: number,
    message: string,
    startedAt?: string,
  ) {
    const event = await this.prisma.admin.alertEvent.create({
      data: {
        ruleName,
        severity,
        status: 'firing',
        value,
        threshold,
        message,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      },
    });
    this.logger.log(`AlertEvent created: ${ruleName} (${severity}) = ${value}`);
    return event;
  }

  async resolveAlert(ruleName: string) {
    const active = await this.prisma.admin.alertEvent.findFirst({
      where: { ruleName, status: 'firing' },
      orderBy: { startedAt: 'desc' },
    });
    if (!active) return null;

    const resolved = await this.prisma.admin.alertEvent.update({
      where: { id: active.id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
    this.logger.log(`AlertEvent resolved: ${ruleName}`);
    return resolved;
  }

  async listAlerts(params: {
    tenantId?: string;
    severity?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 100);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (params.severity) where.severity = params.severity;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.admin.alertEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.admin.alertEvent.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAlertRules() {
    return this.prisma.admin.alertRule.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });
  }
}
