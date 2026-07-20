import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportingService } from './reporting.service';
import { ReportingGuard } from './guards/reporting.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PrismaService } from '../../common/prisma.service';
import { DashboardEngine } from './dashboard/dashboard-engine';
import { ExportService } from './export/export.service';
import { SchedulingService } from './scheduling/scheduling.service';

@Controller('api/v1/reporting')
@UseGuards(ReportingGuard)
export class ReportingController {
  constructor(
    private readonly reporting: ReportingService,
    private readonly prisma: PrismaService,
    private readonly dashboardEngine: DashboardEngine,
    private readonly exportService: ExportService,
    private readonly scheduling: SchedulingService,
  ) {}

  // ─── KPI Endpoints ─────────────────────────────────

  @Get('kpis')
  async listKpis(@TenantId() tenantId: string) {
    return this.reporting.listKpis(tenantId);
  }

  @Get('kpis/:name')
  async getKpi(
    @TenantId() tenantId: string,
    @Param('name') name: string,
    @Query('days', new DefaultValuePipe(30), new ParseIntPipe({ optional: true })) days: number,
    @Query('includeHistory') includeHistory?: string,
  ) {
    if (includeHistory === 'true') {
      return this.reporting.getKpiHistory(tenantId, name, days);
    }
    return this.reporting.getKpi(tenantId, name);
  }

  @Post('kpis')
  async createKpi(
    @TenantId() tenantId: string,
    @Body()
    body: {
      name: string;
      displayName: string;
      formula: string;
      target?: number;
      upperThreshold?: number;
      lowerThreshold?: number;
      unit?: string;
      ttl?: number;
    },
  ) {
    return this.reporting.createKpi(tenantId, body);
  }

  // ─── Dashboard Endpoints ───────────────────────────

  @Post('dashboards')
  async createDashboard(
    @TenantId() tenantId: string,
    @Body()
    body: {
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
    return this.dashboardEngine.createDashboard(tenantId, body);
  }

  @Get('dashboards')
  async listDashboards(@TenantId() tenantId: string) {
    return this.dashboardEngine.listDashboards(tenantId);
  }

  @Get('dashboards/:id')
  async getDashboard(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('hydrate') hydrate?: string,
  ) {
    if (hydrate === 'true') {
      return this.dashboardEngine.getDashboardData(tenantId, id);
    }
    return this.dashboardEngine.getDashboard(tenantId, id);
  }

  @Put('dashboards/:id')
  async updateDashboard(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      layout?: { columns: number; gap: number };
      shared?: boolean;
    },
  ) {
    return this.dashboardEngine.updateDashboard(tenantId, id, body);
  }

  @Delete('dashboards/:id')
  async deleteDashboard(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.dashboardEngine.deleteDashboard(tenantId, id);
    return { deleted: true };
  }

  // ─── Report Endpoints ──────────────────────────────

  @Post('reports/generate')
  async generateReport(
    @TenantId() tenantId: string,
    @Body()
    body: {
      reportId?: string;
      definition?: {
        name: string;
        datasetName: string;
        dimensions: string[];
        metrics: Array<{ name: string; aggregation: string }>;
        filters?: Array<{ field: string; operator: string; value: unknown }>;
        dateRange?: { from: string; to: string };
        granularity?: string;
      };
    },
  ) {
    if (body.reportId) {
      return this.reporting.createReportExecution(tenantId, body.reportId);
    }
    if (body.definition) {
      return this.reporting.generateReport(tenantId, body.definition as any);
    }
    throw new Error('Either reportId or definition is required');
  }

  @Get('reports/executions/:id')
  async getExecution(@Param('id') id: string) {
    return this.reporting.getExecutionResult(id);
  }

  // ─── Export Endpoints ──────────────────────────────

  @Post('exports')
  async createExport(
    @TenantId() tenantId: string,
    @Body()
    body: {
      type: string;
      format: 'pdf' | 'excel' | 'csv' | 'json';
      config?: Record<string, unknown>;
    },
  ) {
    return this.exportService.createExport(tenantId, body.type, body.format, body.config);
  }

  @Get('exports/:id')
  async getExport(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.exportService.getExport(tenantId, id);
  }

  @Get('exports/:id/download')
  async downloadExport(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const stream = await this.exportService.downloadExport(tenantId, id);
    const format = id.split('.').pop() ?? 'csv';
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="export-${id}.${format}"`,
    });
    stream.pipe(res);
  }

  // ─── Scheduling Endpoints ──────────────────────────

  @Post('reports/:id/schedule')
  async scheduleReport(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { cronExpression: string },
  ) {
    return this.scheduling.scheduleReport(tenantId, id, body.cronExpression);
  }

  @Delete('reports/:id/schedule')
  async unscheduleReport(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.scheduling.unscheduleReport(tenantId, id);
  }

  // ─── Dataset Endpoints ─────────────────────────────

  @Get('datasets')
  async listDatasets(@TenantId() tenantId: string) {
    return this.reporting.listDatasets(tenantId);
  }

  @Post('datasets/:name/replay')
  async replay(
    @Param('name') datasetName: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Body('tenantId') tenantId: string,
  ): Promise<{ replayed: number; failed: number }> {
    if (!from || !to) {
      throw new Error('from and to query params are required');
    }
    if (!tenantId) {
      throw new Error('tenantId is required in body');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const prisma = this.prisma.forTenant(tenantId);

    const events = await prisma.datasetIngestionLog.findMany({
      where: {
        tenantId,
        datasetName,
        timestamp: { gte: fromDate, lte: toDate },
        status: 'processed',
        eventId: { not: null },
      },
      orderBy: { timestamp: 'asc' },
    });

    let replayed = 0;
    let failed = 0;

    for (const event of events) {
      try {
        const eventDate = event.timestamp;
        const windowStart = new Date(
          Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate()),
        );

        const compositeId = {
          tenantId_datasetName_metricName_granularity_windowStart: {
            tenantId,
            datasetName: event.datasetName,
            metricName: event.metricName,
            granularity: 'day',
            windowStart,
          },
        };

        await prisma.analyticsDataset.upsert({
          where: compositeId,
          create: {
            tenantId,
            datasetName: event.datasetName,
            metricName: event.metricName,
            granularity: 'day',
            windowStart,
            value: event.value,
            dimensions: {},
          },
          update: {
            value: { increment: event.value },
          },
        });

        replayed++;
      } catch {
        failed++;
      }
    }

    return { replayed, failed };
  }
}
