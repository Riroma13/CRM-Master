import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { KpiEngine } from '../kpi/kpi-engine';

interface DashboardWidgetData {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  kpiName?: string;
  datasetName?: string;
  data?: unknown;
}

interface HydratedDashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: DashboardWidgetData[];
  shared: boolean;
}

@Injectable()
export class DashboardHydrator {
  private readonly logger = new Logger(DashboardHydrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kpiEngine: KpiEngine,
  ) {}

  async hydrate(
    dashboard: {
      id: string;
      tenantId: string;
      name: string;
      description?: string | null;
      shared: boolean;
      layout?: any;
      widgets: Array<{
        id: string;
        type: string;
        title: string;
        config: any;
        position: any;
        kpiName?: string | null;
        datasetName?: string | null;
      }>;
    },
    tenantId: string,
  ): Promise<HydratedDashboard> {
    const widgetPromises = dashboard.widgets.map((widget) =>
      this.resolveWidgetData(widget, tenantId),
    );
    const resolvedWidgets = await Promise.all(widgetPromises);

    return {
      id: dashboard.id,
      tenantId,
      name: dashboard.name,
      description: dashboard.description ?? undefined,
      widgets: resolvedWidgets,
      shared: dashboard.shared,
    };
  }

  private async resolveWidgetData(
    widget: {
      id: string;
      type: string;
      title: string;
      config: any;
      position: any;
      kpiName?: string | null;
      datasetName?: string | null;
    },
    tenantId: string,
  ): Promise<DashboardWidgetData> {
    const base: DashboardWidgetData = {
      id: widget.id,
      type: widget.type,
      title: widget.title,
      config: (widget.config ?? {}) as Record<string, unknown>,
      position: (widget.position ?? { x: 0, y: 0, w: 6, h: 4 }) as {
        x: number;
        y: number;
        w: number;
        h: number;
      },
    };

    try {
      switch (widget.type) {
        case 'kpi-card': {
          if (widget.kpiName) {
            const kpi = await this.kpiEngine.getKpi(tenantId, widget.kpiName);
            base.data = kpi;
          }
          break;
        }
        case 'line-chart':
        case 'bar-chart':
        case 'pie-chart': {
          if (widget.datasetName) {
            const prisma = this.prisma.forTenant(tenantId);
            const config = (widget.config ?? {}) as Record<string, any>;
            const metrics = config.metrics as string[] | undefined;
            const granularity = (config.granularity as string) ?? 'day';

            const where: any = {
              tenantId,
              datasetName: widget.datasetName,
              granularity,
            };

            if (metrics && metrics.length > 0) {
              where.metricName = { in: metrics };
            }

            if (config.dateRange) {
              where.windowStart = {
                gte: new Date(config.dateRange.from as string),
                lte: new Date(config.dateRange.to as string),
              };
            }

            const records = await prisma.analyticsDataset.findMany({
              where,
              orderBy: { windowStart: 'asc' },
              select: {
                metricName: true,
                value: true,
                windowStart: true,
                dimensions: true,
              },
            });

            base.data = records;
          }
          break;
        }
        case 'table': {
          if (widget.datasetName) {
            const prisma = this.prisma.forTenant(tenantId);
            const config = (widget.config ?? {}) as Record<string, any>;

            const where: any = {
              tenantId,
              datasetName: widget.datasetName,
            };

            if (config.metrics && Array.isArray(config.metrics)) {
              where.metricName = { in: config.metrics as string[] };
            }
            if (config.dateRange) {
              where.windowStart = {
                gte: new Date(config.dateRange.from as string),
                lte: new Date(config.dateRange.to as string),
              };
            }

            const records = await prisma.analyticsDataset.findMany({
              where,
              orderBy: { windowStart: 'desc' },
              take: (config.limit as number) ?? 100,
            });

            base.data = records;
          }
          break;
        }
        case 'trend': {
          if (widget.datasetName) {
            const prisma = this.prisma.forTenant(tenantId);
            const config = (widget.config ?? {}) as Record<string, any>;
            const metricName = config.metricName as string | undefined;

            const where: any = {
              tenantId,
              datasetName: widget.datasetName,
              granularity: 'day',
            };

            if (metricName) {
              where.metricName = metricName;
            }

            const records = await prisma.analyticsDataset.findMany({
              where,
              orderBy: { windowStart: 'asc' },
              take: (config.days as number) ?? 30,
            });

            base.data = records;
          }
          break;
        }
        default:
          this.logger.warn(`Unknown widget type: ${widget.type}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to resolve widget ${widget.id} (${widget.title}): ${error.message}`,
      );
      base.data = { error: error.message };
    }

    return base;
  }
}
