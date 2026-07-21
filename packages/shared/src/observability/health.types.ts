export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthIndicatorResult {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  checks: HealthIndicatorResult[];
  uptime: number;
  timestamp: string;
}
