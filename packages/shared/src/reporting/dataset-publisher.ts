export interface DatasetEvent {
  tenantId: string;
  datasetName: string;
  metricName: string;
  value: number;
  timestamp: string;
  dimensions?: Record<string, string>;
  eventId?: string; // for dedup
}

export interface DatasetPublisher {
  publish(event: DatasetEvent): Promise<void>;
}
