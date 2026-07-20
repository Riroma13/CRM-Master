import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

export interface ReportMetric {
  name: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

export interface ReportDefinitionInput {
  name: string;
  datasetName: string;
  dimensions: string[];
  metrics: ReportMetric[];
  filters?: ReportFilter[];
  dateRange?: { from: string; to: string };
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface ColumnDefinition {
  name: string;
  type: 'dimension' | 'metric' | 'timestamp';
}

export interface TabularResult {
  columns: ColumnDefinition[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

interface DatasetRecord {
  metricName: string;
  value: number;
  windowStart: Date;
  dimensions: Record<string, string>;
  granularity: string;
}

@Injectable()
export class ReportEngine {
  private readonly logger = new Logger(ReportEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reporting:report:generate') private readonly reportQueue: Queue,
  ) {}

  async generateReport(
    tenantId: string,
    definition: ReportDefinitionInput,
  ): Promise<TabularResult> {
    const prisma = this.prisma.forTenant(tenantId);
    const where: any = {
      tenantId,
      datasetName: definition.datasetName,
    };

    if (definition.dateRange) {
      where.windowStart = {
        gte: new Date(definition.dateRange.from),
        lte: new Date(definition.dateRange.to),
      };
    }

    if (definition.filters) {
      for (const filter of definition.filters) {
        if (filter.field === 'metricName') {
          if (filter.operator === 'eq') {
            where.metricName = filter.value;
          } else if (filter.operator === 'in') {
            where.metricName = { in: filter.value as string[] };
          }
        }
      }
    }

    if (definition.granularity) {
      where.granularity = definition.granularity;
    }

    const records = await prisma.analyticsDataset.findMany({
      where,
      orderBy: { windowStart: 'asc' },
    });

    const grouped = this.groupByWindow(records);

    const columns: ColumnDefinition[] = [
      { name: 'windowStart', type: 'timestamp' },
    ];

    for (const dim of definition.dimensions) {
      columns.push({ name: dim, type: 'dimension' });
    }

    const rows: Record<string, unknown>[] = [];

    for (const [key, group] of grouped) {
      const row: Record<string, unknown> = { windowStart: key };

      for (const dim of definition.dimensions) {
        row[dim] = group.dimensions[dim] ?? null;
      }

      for (const metric of definition.metrics) {
        const values = group.metrics[metric.name] ?? [];
        const isDuplicate = definition.metrics.filter((m) => m.name === metric.name).length > 1;
        const colName = isDuplicate ? `${metric.name}_${metric.aggregation}` : metric.name;
        row[colName] = this.applyAggregation(values, metric.aggregation);
        if (!columns.find((c) => c.name === colName)) {
          columns.push({ name: colName, type: 'metric' });
        }
      }

      rows.push(row);
    }

    return { columns, rows, totalRows: rows.length };
  }

  async executeReport(executionId: string): Promise<void> {
    const execution = await this.prisma.admin.reportExecution.findUnique({
      where: { id: executionId },
      include: { report: true },
    });

    if (!execution) {
      throw new Error(`Report execution ${executionId} not found`);
    }

    await this.prisma.admin.reportExecution.update({
      where: { id: executionId },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      const definition: ReportDefinitionInput = {
        name: execution.report.name,
        datasetName: execution.report.datasetName,
        dimensions: execution.report.dimensions,
        metrics: execution.report.metrics as any,
        filters: execution.report.filters as any,
        dateRange: execution.report.dateRange as any,
        granularity: (execution.report.granularity as any) ?? undefined,
      };

      const result = await this.generateReport(execution.tenantId, definition);

      await this.prisma.admin.reportExecution.update({
        where: { id: executionId },
        data: {
          status: 'completed',
          result: result as any,
          completedAt: new Date(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Report execution ${executionId} failed: ${error.message}`);
      await this.prisma.admin.reportExecution.update({
        where: { id: executionId },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });
    }
  }

  async createReportExecution(
    tenantId: string,
    reportId: string,
  ): Promise<{ executionId: string }> {
    const prisma = this.prisma.forTenant(tenantId);

    const execution = await prisma.reportExecution.create({
      data: {
        tenantId,
        reportId,
        status: 'pending',
      },
    });

    await this.reportQueue.add('generate', {
      executionId: execution.id,
      tenantId,
    });

    return { executionId: execution.id };
  }

  async getExecutionResult(
    executionId: string,
  ): Promise<{
    status: string;
    result?: TabularResult;
    error?: string;
  }> {
    const execution = await this.prisma.admin.reportExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    return {
      status: execution.status,
      result: execution.result as TabularResult | undefined,
      error: execution.error ?? undefined,
    };
  }

  private applyAggregation(
    values: number[],
    aggregation: ReportMetric['aggregation'],
  ): number {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'count':
        return values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      default:
        return values[0];
    }
  }

  private groupByWindow(
    records: DatasetRecord[],
  ): Map<
    string,
    {
      dimensions: Record<string, string>;
      metrics: Record<string, number[]>;
    }
  > {
    const grouped = new Map<
      string,
      {
        dimensions: Record<string, string>;
        metrics: Record<string, number[]>;
      }
    >();

    for (const r of records) {
      const key = r.windowStart.toISOString();
      if (!grouped.has(key)) {
        grouped.set(key, { dimensions: r.dimensions ?? {}, metrics: {} });
      }
      const group = grouped.get(key)!;
      if (!group.metrics[r.metricName]) {
        group.metrics[r.metricName] = [];
      }
      group.metrics[r.metricName].push(r.value);
    }

    return grouped;
  }
}
