import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { DashboardHydrator } from './dashboard-hydrator';

@Injectable()
export class DashboardEngine {
  private readonly logger = new Logger(DashboardEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hydrator: DashboardHydrator,
  ) {}

  async getDashboard(tenantId: string, dashboardId: string) {
    const prisma = this.prisma.forTenant(tenantId);

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      include: { widgets: true },
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${dashboardId} not found`);
    }

    return dashboard;
  }

  async createDashboard(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      layout?: { columns: number; gap: number };
      widgets?: Array<{
        type: string;
        title: string;
        config?: Record<string, unknown>;
        position?: { x: number; y: number; w: number; h: number };
        kpiName?: string;
        datasetName?: string;
      }>;
    },
  ) {
    const prisma = this.prisma.forTenant(tenantId);

    const dashboard = await prisma.dashboard.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        layout: data.layout ?? { columns: 12, gap: 16 },
      },
    });

    if (data.widgets && data.widgets.length > 0) {
      await prisma.dashboardWidget.createMany({
        data: data.widgets.map((w) => ({
          tenantId,
          dashboardId: dashboard.id,
          type: w.type,
          title: w.title,
          config: w.config ?? {},
          position: w.position ?? { x: 0, y: 0, w: 6, h: 4 },
          kpiName: w.kpiName,
          datasetName: w.datasetName,
        })),
      });
    }

    return prisma.dashboard.findUnique({
      where: { id: dashboard.id },
      include: { widgets: true },
    });
  }

  async updateDashboard(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      layout?: { columns: number; gap: number };
      shared?: boolean;
    },
  ) {
    const prisma = this.prisma.forTenant(tenantId);

    const existing = await prisma.dashboard.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dashboard ${id} not found`);
    }

    return prisma.dashboard.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.layout !== undefined && { layout: data.layout }),
        ...(data.shared !== undefined && { shared: data.shared }),
      },
      include: { widgets: true },
    });
  }

  async deleteDashboard(tenantId: string, id: string) {
    const prisma = this.prisma.forTenant(tenantId);

    const existing = await prisma.dashboard.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Dashboard ${id} not found`);
    }

    await prisma.dashboard.delete({ where: { id } });
  }

  async listDashboards(tenantId: string) {
    const prisma = this.prisma.forTenant(tenantId);
    return prisma.dashboard.findMany({
      where: { tenantId },
      include: { widgets: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboardData(tenantId: string, dashboardId: string) {
    const dashboard = await this.getDashboard(tenantId, dashboardId);
    return this.hydrator.hydrate(dashboard, tenantId);
  }
}
