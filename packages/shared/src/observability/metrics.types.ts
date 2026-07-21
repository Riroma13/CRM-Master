export interface HttpMetricLabels {
  method: string;
  route: string;
  statusCode: number;
  module: string;
}

export const METRIC_NAMES = {
  httpRequestsTotal: 'http_requests_total',
  httpRequestDuration: 'http_request_duration_ms',
  bullmqQueueDepth: 'bullmq_queue_depth',
  moduleErrorsTotal: 'module_errors_total',
} as const;
