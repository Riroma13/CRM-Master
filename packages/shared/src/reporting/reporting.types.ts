export type MetricAggregation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct' | 'percentile';

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

export type KpiStatus = 'on_target' | 'warning' | 'critical' | 'no_data' | 'error';

export type WidgetType = 'kpi-card' | 'line-chart' | 'bar-chart' | 'pie-chart' | 'table' | 'trend';

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export interface AnalyticsDataset {
  tenantId: string;
  datasetName: string;
  metricName: string;
  granularity: TimeGranularity;
  windowStart: string;
  value: number;
  dimensions: Record<string, string>;
  updatedAt: string;
}

export interface KpiDefinition {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  formula: string;
  target?: number;
  upperThreshold?: number;
  lowerThreshold?: number;
  unit?: string;
  ttl: number;
}

export interface KpiValue {
  name: string;
  value: number;
  target?: number;
  status: KpiStatus;
  timestamp: string;
  history: Array<{ timestamp: string; value: number }>;
  error?: string;
}

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  datasetName: string;
  dimensions: string[];
  metrics: Array<{ name: string; aggregation: MetricAggregation }>;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  dateRange?: { from: string; to: string };
  granularity?: TimeGranularity;
  schedule?: string;
}

export interface ReportExecution {
  id: string;
  tenantId: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  shared: boolean;
  roles?: string[];
}

export interface DashboardWidget {
  id: string;
  tenantId: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
  kpiName?: string;
  datasetName?: string;
}

export interface DashboardLayout {
  columns: number;
  gap: number;
}
