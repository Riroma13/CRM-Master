import { Injectable, Logger } from '@nestjs/common';
import { KpiEngine, KpiResponse } from './kpi/kpi-engine';
import { ReportEngine, TabularResult, ReportDefinitionInput } from './report/report-engine';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private readonly kpiEngine: KpiEngine,
    private readonly reportEngine: ReportEngine,
    private readonly prisma: PrismaService,
  ) {}

  async listKpis(tenantId: string): Promise<KpiResponse[]> {
    return this.kpiEngine.listKpis(tenantId);
  }

  async getKpi(tenantId: string, name: string): Promise<KpiResponse> {
    return this.kpiEngine.getKpi(tenantId, name);
  }

  async getKpiHistory(tenantId: string, name: string, days?: number): Promise<KpiResponse> {
    return this.kpiEngine.getKpiHistory(tenantId, name, days);
  }

  async createKpi(
    tenantId: string,
    data: {
      name: string;
      displayName: string;
      formula: string;
      target?: number;
      upperThreshold?: number;
      lowerThreshold?: number;
      unit?: string;
      ttl?: number;
    },
  ): Promise<{ id: string }> {
    const prisma = this.prisma.forTenant(tenantId);

    const kpi = await prisma.kpi.create({
      data: {
        tenantId,
        name: data.name,
        displayName: data.displayName,
        formula: data.formula,
        target: data.target,
        upperThreshold: data.upperThreshold,
        lowerThreshold: data.lowerThreshold,
        unit: data.unit,
        ttl: data.ttl ?? 300,
        evaluationStrategy: 'safe-eval',
      },
    });

    return { id: kpi.id };
  }

  async generateReport(
    tenantId: string,
    definition: ReportDefinitionInput,
  ): Promise<TabularResult> {
    return this.reportEngine.generateReport(tenantId, definition);
  }

  async createReportExecution(
    tenantId: string,
    reportId: string,
  ): Promise<{ executionId: string }> {
    return this.reportEngine.createReportExecution(tenantId, reportId);
  }

  async getExecutionResult(
    executionId: string,
  ): Promise<{
    status: string;
    result?: TabularResult;
    error?: string;
  }> {
    return this.reportEngine.getExecutionResult(executionId);
  }

  async listDatasets(tenantId: string): Promise<Array<{ datasetName: string; metricNames: string[] }>> {
    const prisma = this.prisma.forTenant(tenantId);

    const records = await prisma.analyticsDataset.findMany({
      where: { tenantId },
      select: { datasetName: true, metricName: true },
      distinct: ['datasetName', 'metricName'],
    });

    const grouped = new Map<string, Set<string>>();
    for (const r of records) {
      if (!grouped.has(r.datasetName)) grouped.set(r.datasetName, new Set());
      grouped.get(r.datasetName)!.add(r.metricName);
    }

    return Array.from(grouped.entries()).map(([datasetName, metricNames]) => ({
      datasetName,
      metricNames: Array.from(metricNames),
    }));
  }
}
