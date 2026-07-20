export interface DatasetEvent {
  tenantId: string;
  datasetName: string;
  metricName: string;
  value: number;
  timestamp: string;
  dimensions?: Record<string, string>;
  eventId?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  granularity?: 'hour' | 'day';
}

export interface DatasetPublisher {
  publish(event: DatasetEvent): Promise<void>;
}
