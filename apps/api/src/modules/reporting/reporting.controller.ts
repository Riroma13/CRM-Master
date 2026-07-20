import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingGuard } from './guards/reporting.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PrismaService } from '../../common/prisma.service';

@Controller('api/v1/reporting')
@UseGuards(ReportingGuard)
export class ReportingController {
  constructor(
    private readonly reporting: ReportingService,
    private readonly prisma: PrismaService,
  ) {}

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
