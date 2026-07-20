import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { SafeEvalStrategy, KpiEvaluationStrategy } from './safe-eval-strategy';

interface KpiCacheEntry {
  value: number;
  status: KpiStatus;
  timestamp: string;
  expiresAt: number;
}

type KpiStatus = 'on_target' | 'warning' | 'critical' | 'no_data' | 'error';

export interface KpiResponse {
  name: string;
  displayName: string;
  value: number | null;
  target?: number;
  status: KpiStatus;
  unit?: string;
  timestamp: string;
  history?: Array<{ timestamp: string; value: number }>;
}

@Injectable()
export class KpiEngine {
  private readonly logger = new Logger(KpiEngine.name);
  private readonly cache = new Map<string, KpiCacheEntry>();
  private readonly strategy: KpiEvaluationStrategy;

  constructor(private readonly prisma: PrismaService) {
    this.strategy = new SafeEvalStrategy();
  }

  async computeKpi(tenantId: string, kpiName: string): Promise<KpiResponse> {
    const prisma = this.prisma.forTenant(tenantId);

    const kpiDef = await prisma.kpi.findUnique({
      where: { tenantId_name: { tenantId, name: kpiName } },
    });

    if (!kpiDef) {
      return {
        name: kpiName,
        displayName: kpiName,
        value: null,
        status: 'no_data',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const metricNames = this.extractMetricNames(kpiDef.formula);

      const metrics: Record<string, number> = {};
      for (const metricName of metricNames) {
        const dataset = await prisma.analyticsDataset.findFirst({
          where: {
            tenantId,
            metricName,
            granularity: 'day',
          },
          orderBy: { windowStart: 'desc' },
        });
        metrics[metricName] = dataset?.value ?? 0;
      }

      const value = this.strategy.evaluate(kpiDef.formula, metrics);
      const status = this.determineStatus(value, kpiDef.target, kpiDef.upperThreshold, kpiDef.lowerThreshold);

      const now = new Date();
      const entry: KpiCacheEntry = {
        value,
        status,
        timestamp: now.toISOString(),
        expiresAt: now.getTime() + (kpiDef.ttl ?? 300) * 1000,
      };

      this.cache.set(`${tenantId}:${kpiName}`, entry);

      return {
        name: kpiDef.name,
        displayName: kpiDef.displayName,
        value,
        target: kpiDef.target ?? undefined,
        status,
        unit: kpiDef.unit ?? undefined,
        timestamp: entry.timestamp,
      };
    } catch (error: any) {
      this.logger.error(`KPI evaluation failed for ${kpiName}: ${error.message}`);
      return {
        name: kpiDef.name,
        displayName: kpiDef.displayName,
        value: null,
        target: kpiDef.target ?? undefined,
        status: 'error',
        unit: kpiDef.unit ?? undefined,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getKpi(tenantId: string, kpiName: string): Promise<KpiResponse> {
    const cached = this.cache.get(`${tenantId}:${kpiName}`);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return {
        name: kpiName,
        displayName: kpiName,
        value: cached.value,
        status: cached.status,
        timestamp: cached.timestamp,
      };
    }

    if (cached && cached.expiresAt <= now) {
      this.computeKpi(tenantId, kpiName).catch((err) =>
        this.logger.error(`Stale refresh failed for ${kpiName}: ${err.message}`),
      );
      return {
        name: kpiName,
        displayName: kpiName,
        value: cached.value,
        status: cached.status,
        timestamp: cached.timestamp,
      };
    }

    return this.computeKpi(tenantId, kpiName);
  }

  async listKpis(tenantId: string): Promise<KpiResponse[]> {
    const prisma = this.prisma.forTenant(tenantId);
    const kpis = await prisma.kpi.findMany({
      where: { tenantId },
    });

    const results = await Promise.all(
      kpis.map((kpi: { name: string }) => this.getKpi(tenantId, kpi.name)),
    );

    return results;
  }

  async getKpiHistory(
    tenantId: string,
    kpiName: string,
    days: number = 30,
  ): Promise<KpiResponse> {
    const kpi = await this.getKpi(tenantId, kpiName);

    const prisma = this.prisma.forTenant(tenantId);
    const kpiDef = await prisma.kpi.findUnique({
      where: { tenantId_name: { tenantId, name: kpiName } },
    });

    if (!kpiDef) {
      return { ...kpi, history: [] };
    }

    const metricNames = this.extractMetricNames(kpiDef.formula);
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const datasets = await prisma.analyticsDataset.findMany({
      where: {
        tenantId,
        metricName: { in: metricNames },
        granularity: 'day',
        windowStart: { gte: fromDate },
      },
      orderBy: { windowStart: 'asc' },
    });

    const grouped = this.groupByDate(datasets);
    const history: Array<{ timestamp: string; value: number }> = [];

    for (const [dateStr, rowMetrics] of grouped) {
      try {
        const value = this.strategy.evaluate(kpiDef.formula, rowMetrics);
        history.push({ timestamp: dateStr, value });
      } catch {
        // skip dates where formula evaluation fails
      }
    }

    return { ...kpi, history };
  }

  private extractMetricNames(formula: string): string[] {
    const tokens = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
    const excluded = new Set(['Infinity', 'NaN']);
    return [...new Set(tokens)].filter((t) => !excluded.has(t));
  }

  private determineStatus(
    value: number,
    target?: number | null,
    upperThreshold?: number | null,
    lowerThreshold?: number | null,
  ): KpiStatus {
    if (target == null) return 'on_target';

    if (upperThreshold != null && value >= upperThreshold) return 'critical';
    if (lowerThreshold != null && value <= lowerThreshold) return 'critical';

    const warningBand = target * 0.2;
    if (upperThreshold != null && value >= target + warningBand) return 'warning';
    if (lowerThreshold != null && value <= target - warningBand) return 'warning';

    return 'on_target';
  }

  private groupByDate(
    datasets: Array<{ metricName: string; value: number; windowStart: Date }>,
  ): Map<string, Record<string, number>> {
    const grouped = new Map<string, Record<string, number>>();
    for (const d of datasets) {
      const key = d.windowStart.toISOString().slice(0, 10);
      if (!grouped.has(key)) grouped.set(key, {});
      grouped.get(key)![d.metricName] = d.value;
    }
    return grouped;
  }
}
