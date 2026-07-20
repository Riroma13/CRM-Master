import { describe, it, expect } from 'vitest';
import type {
  MetricAggregation,
  TimeGranularity,
  KpiStatus,
  WidgetType,
  ExportFormat,
  AnalyticsDataset,
  KpiDefinition,
  KpiValue,
  ReportDefinition,
  ReportExecution,
  Dashboard,
  DashboardWidget,
  DashboardLayout,
} from '../reporting.types';
import type { DatasetEvent, DatasetPublisher } from '../dataset-publisher';
import type { ExportContext, Exporter } from '../export.types';

describe('Types compile correctly', () => {
  it('MetricAggregation accepts valid values', () => {
    const aggregations: MetricAggregation[] = ['count', 'sum', 'avg', 'min', 'max', 'distinct', 'percentile'];
    expect(aggregations).toHaveLength(7);
  });

  it('TimeGranularity accepts valid values', () => {
    const granularities: TimeGranularity[] = ['hour', 'day', 'week', 'month'];
    expect(granularities).toHaveLength(4);
  });

  it('KpiStatus accepts valid values', () => {
    const statuses: KpiStatus[] = ['on_target', 'warning', 'critical', 'no_data', 'error'];
    expect(statuses).toHaveLength(5);
  });

  it('WidgetType accepts valid values', () => {
    const types: WidgetType[] = ['kpi-card', 'line-chart', 'bar-chart', 'pie-chart', 'table', 'trend'];
    expect(types).toHaveLength(6);
  });

  it('ExportFormat accepts valid values', () => {
    const formats: ExportFormat[] = ['pdf', 'excel', 'csv', 'json'];
    expect(formats).toHaveLength(4);
  });
});

describe('AnalyticsDataset interface', () => {
  it('valid dataset shape passes type check', () => {
    const dataset: AnalyticsDataset = {
      tenantId: 'tenant-1',
      datasetName: 'workflows',
      metricName: 'workflows_created',
      granularity: 'day',
      windowStart: '2026-07-20T00:00:00Z',
      value: 42,
      dimensions: { department: 'sales' },
      updatedAt: '2026-07-20T12:00:00Z',
    };
    expect(dataset.tenantId).toBe('tenant-1');
    expect(dataset.value).toBe(42);
    expect(dataset.granularity).toBe('day');
  });

  it('dimensions defaults to empty object', () => {
    const dataset: AnalyticsDataset = {
      tenantId: 't1',
      datasetName: 'test',
      metricName: 'count',
      granularity: 'day',
      windowStart: '2026-07-20T00:00:00Z',
      value: 0,
      dimensions: {},
      updatedAt: '2026-07-20T12:00:00Z',
    };
    expect(Object.keys(dataset.dimensions)).toHaveLength(0);
  });
});

describe('KpiDefinition interface', () => {
  it('valid KPI definition compiles', () => {
    const kpi: KpiDefinition = {
      id: 'kpi-1',
      tenantId: 'tenant-1',
      name: 'workflow_completion_rate',
      displayName: 'Workflow Completion Rate',
      formula: 'completed / total * 100',
      target: 95,
      upperThreshold: 100,
      lowerThreshold: 80,
      unit: '%',
      ttl: 300,
    };
    expect(kpi.name).toBe('workflow_completion_rate');
    expect(kpi.target).toBe(95);
  });

  it('optional fields are not required', () => {
    const kpi: KpiDefinition = {
      id: 'kpi-2',
      tenantId: 't1',
      name: 'simple_count',
      displayName: 'Simple Count',
      formula: 'total',
      ttl: 300,
    };
    expect(kpi.target).toBeUndefined();
    expect(kpi.upperThreshold).toBeUndefined();
    expect(kpi.lowerThreshold).toBeUndefined();
    expect(kpi.unit).toBeUndefined();
  });
});

describe('KpiValue interface', () => {
  it('valid KPI value compiles', () => {
    const value: KpiValue = {
      name: 'completion_rate',
      value: 92.5,
      target: 95,
      status: 'warning',
      timestamp: '2026-07-20T12:00:00Z',
      history: [
        { timestamp: '2026-07-19T12:00:00Z', value: 90 },
        { timestamp: '2026-07-20T12:00:00Z', value: 92.5 },
      ],
    };
    expect(value.status).toBe('warning');
    expect(value.history).toHaveLength(2);
  });

  it('error is populated when status is error', () => {
    const value: KpiValue = {
      name: 'broken_kpi',
      value: 0,
      status: 'error',
      timestamp: '2026-07-20T12:00:00Z',
      history: [],
      error: 'Division by zero in formula',
    };
    expect(value.error).toBeDefined();
  });
});

describe('ReportDefinition interface', () => {
  it('valid report definition compiles', () => {
    const report: ReportDefinition = {
      id: 'report-1',
      tenantId: 't1',
      name: 'Monthly Workflow Summary',
      datasetName: 'workflows',
      dimensions: ['status', 'department'],
      metrics: [
        { name: 'workflows_created', aggregation: 'count' },
        { name: 'avg_completion_time', aggregation: 'avg' },
      ],
      dateRange: { from: '2026-01-01', to: '2026-07-20' },
      granularity: 'month',
    };
    expect(report.metrics).toHaveLength(2);
    expect(report.granularity).toBe('month');
  });
});

describe('ReportExecution interface', () => {
  it('valid execution with all statuses', () => {
    const statuses: ReportExecution['status'][] = ['pending', 'running', 'completed', 'failed'];
    statuses.forEach(s => {
      const exec: ReportExecution = {
        id: 'exec-1',
        tenantId: 't1',
        reportId: 'report-1',
        status: s,
        createdAt: '2026-07-20T12:00:00Z',
      };
      expect(exec.status).toBe(s);
    });
  });
});

describe('Dashboard interfaces', () => {
  it('valid dashboard compiles', () => {
    const dashboard: Dashboard = {
      id: 'dash-1',
      tenantId: 't1',
      name: 'Executive Overview',
      widgets: [],
      layout: { columns: 12, gap: 16 },
      shared: false,
    };
    expect(dashboard.name).toBe('Executive Overview');
  });

  it('valid widget compiles', () => {
    const widget: DashboardWidget = {
      id: 'widget-1',
      tenantId: 't1',
      dashboardId: 'dash-1',
      type: 'kpi-card',
      title: 'Completion Rate',
      config: { refreshInterval: 60 },
      position: { x: 0, y: 0, w: 3, h: 2 },
      kpiName: 'completion_rate',
    };
    expect(widget.type).toBe('kpi-card');
    expect(widget.position).toEqual({ x: 0, y: 0, w: 3, h: 2 });
  });

  it('DashboardLayout interface compiles', () => {
    const layout: DashboardLayout = { columns: 12, gap: 16 };
    expect(layout.columns).toBe(12);
  });
});

describe('DatasetPublisher interface', () => {
  it('DatasetPublisher contract compiles', () => {
    const publisher: DatasetPublisher = {
      async publish(_event) {},
    };
    expect(publisher.publish).toBeDefined();
    expect(typeof publisher.publish).toBe('function');
  });

  it('publish accepts a DatasetEvent', async () => {
    const events: DatasetEvent[] = [];
    const publisher: DatasetPublisher = {
      async publish(event) {
        events.push(event);
      },
    };

    await publisher.publish({
      tenantId: 't1',
      datasetName: 'workflows',
      metricName: 'workflows_created',
      value: 1,
      timestamp: '2026-07-20T12:00:00Z',
      dimensions: { department: 'sales' },
    });

    expect(events).toHaveLength(1);
    expect(events[0].metricName).toBe('workflows_created');
  });

  it('publish works with optional eventId for dedup', async () => {
    const publisher: DatasetPublisher = {
      async publish(event) {
        expect(event.eventId).toBeDefined();
      },
    };

    await publisher.publish({
      tenantId: 't1',
      datasetName: 'test',
      metricName: 'count',
      value: 1,
      timestamp: '2026-07-20T12:00:00Z',
      eventId: 'evt-123',
    });
  });

  it('publish works without optional dimensions', async () => {
    const publisher: DatasetPublisher = {
      async publish(_event) {},
    };

    await expect(
      publisher.publish({
        tenantId: 't1',
        datasetName: 'test',
        metricName: 'count',
        value: 5,
        timestamp: '2026-07-20T12:00:00Z',
      }),
    ).resolves.toBeUndefined();
  });
});

describe('Exporter interface with ExportContext', () => {
  it('Exporter contract compiles', () => {
    const exporter: Exporter = {
      format: 'csv',
      contentType: 'text/csv',
      async export(_data, _context) {
        return Buffer.from('a,b,c\n1,2,3');
      },
    };
    expect(exporter.format).toBe('csv');
    expect(exporter.contentType).toBe('text/csv');
  });

  it('ExportContext includes tenantId', () => {
    const context: ExportContext = {
      tenantId: 't1',
      userId: 'u1',
      format: 'pdf',
      options: { pageSize: 'A4' },
      correlationId: 'corr-1',
    };
    expect(context.tenantId).toBe('t1');
    expect(context.correlationId).toBe('corr-1');
  });

  it('ExportContext works without optional fields', () => {
    const context: ExportContext = {
      tenantId: 't1',
      userId: 'u1',
      format: 'json',
    };
    expect(context.options).toBeUndefined();
    expect(context.correlationId).toBeUndefined();
  });

  it('Exporter returns Buffer with correct content type', async () => {
    const exporter: Exporter = {
      format: 'json',
      contentType: 'application/json',
      async export(data, _context) {
        return Buffer.from(JSON.stringify(data));
      },
    };

    const result = await exporter.export({ key: 'value' }, {
      tenantId: 't1',
      userId: 'u1',
      format: 'json',
    });

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('{"key":"value"}');
  });
});
