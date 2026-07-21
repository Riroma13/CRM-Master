import { describe, it, expect } from 'vitest';
import type { HttpMetricLabels } from '../metrics.types';
import { METRIC_NAMES } from '../metrics.types';
import type { LogLevel, LogEntry } from '../logging.types';
import type { HealthStatus, HealthIndicatorResult, HealthCheckResult } from '../health.types';
import type { AlertSeverity, AlertStatus, AlertEvent } from '../alert.types';

describe('Metrics types compile correctly', () => {
  it('HttpMetricLabels accepts valid shape', () => {
    const labels: HttpMetricLabels = {
      method: 'GET',
      route: '/workflows/:id',
      statusCode: 200,
      module: 'workflows',
    };
    expect(labels.method).toBe('GET');
    expect(labels.route).toBe('/workflows/:id');
    expect(labels.statusCode).toBe(200);
    expect(labels.module).toBe('workflows');
  });

  it('METRIC_NAMES has all expected keys', () => {
    expect(METRIC_NAMES.httpRequestsTotal).toBe('http_requests_total');
    expect(METRIC_NAMES.httpRequestDuration).toBe('http_request_duration_ms');
    expect(METRIC_NAMES.bullmqQueueDepth).toBe('bullmq_queue_depth');
    expect(METRIC_NAMES.moduleErrorsTotal).toBe('module_errors_total');
  });
});

describe('Logging types compile correctly', () => {
  it('LogLevel accepts all valid values', () => {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    expect(levels).toHaveLength(6);
  });

  it('LogEntry valid shape compiles', () => {
    const entry: LogEntry = {
      timestamp: '2026-07-20T10:00:00.000Z',
      level: 'info',
      module: 'workflows',
      message: 'Workflow processed',
      tenantId: 't1',
      correlationId: 'corr-1',
      durationMs: 42,
    };
    expect(entry.message).toBe('Workflow processed');
    expect(entry.level).toBe('info');
  });

  it('LogEntry with error field', () => {
    const entry: LogEntry = {
      timestamp: '2026-07-20T10:00:00.000Z',
      level: 'error',
      module: 'workflows',
      message: 'Workflow failed',
      error: { name: 'ValidationError', message: 'Invalid input', stack: 'Error: ...' },
    };
    expect(entry.error?.name).toBe('ValidationError');
    expect(entry.error?.message).toBe('Invalid input');
  });

  it('LogEntry with metadata', () => {
    const entry: LogEntry = {
      timestamp: '2026-07-20T10:00:00.000Z',
      level: 'warn',
      module: 'notifications',
      message: 'Rate limit approaching',
      metadata: { remaining: 10, limit: 100 },
    };
    expect(entry.metadata?.remaining).toBe(10);
  });
});

describe('Health types compile correctly', () => {
  it('HealthStatus accepts all valid values', () => {
    const statuses: HealthStatus[] = ['healthy', 'degraded', 'unhealthy'];
    expect(statuses).toHaveLength(3);
  });

  it('HealthIndicatorResult valid shape', () => {
    const result: HealthIndicatorResult = {
      name: 'database',
      status: 'healthy',
      latencyMs: 5,
    };
    expect(result.status).toBe('healthy');
    expect(result.latencyMs).toBe(5);
  });

  it('HealthIndicatorResult with error', () => {
    const result: HealthIndicatorResult = {
      name: 'redis',
      status: 'unhealthy',
      latencyMs: 0,
      error: 'Connection refused',
    };
    expect(result.error).toBe('Connection refused');
  });

  it('HealthCheckResult aggregates checks', () => {
    const result: HealthCheckResult = {
      status: 'degraded',
      checks: [
        { name: 'database', status: 'healthy', latencyMs: 3 },
        { name: 'redis', status: 'unhealthy', latencyMs: 0, error: 'Timeout' },
      ],
      uptime: 3600,
      timestamp: '2026-07-20T10:00:00.000Z',
    };
    expect(result.checks).toHaveLength(2);
    expect(result.status).toBe('degraded');
    expect(result.uptime).toBe(3600);
  });
});

describe('Alert types compile correctly', () => {
  it('AlertSeverity accepts all valid values', () => {
    const severities: AlertSeverity[] = ['info', 'warning', 'critical'];
    expect(severities).toHaveLength(3);
  });

  it('AlertStatus accepts all valid values', () => {
    const statuses: AlertStatus[] = ['firing', 'resolved', 'acknowledged'];
    expect(statuses).toHaveLength(3);
  });

  it('AlertEvent valid shape compiles', () => {
    const event: AlertEvent = {
      id: 'alert-1',
      ruleName: 'HighErrorRate',
      severity: 'critical',
      status: 'firing',
      value: 0.05,
      threshold: 0.01,
      message: 'Error rate is 5%, threshold is 1%',
      startedAt: '2026-07-20T10:00:00.000Z',
    };
    expect(event.ruleName).toBe('HighErrorRate');
    expect(event.severity).toBe('critical');
    expect(event.status).toBe('firing');
  });

  it('AlertEvent with resolvedAt', () => {
    const event: AlertEvent = {
      id: 'alert-2',
      ruleName: 'HighLatency',
      severity: 'warning',
      status: 'resolved',
      value: 200,
      threshold: 500,
      message: 'P99 latency back to normal',
      startedAt: '2026-07-20T09:00:00.000Z',
      resolvedAt: '2026-07-20T09:05:00.000Z',
    };
    expect(event.resolvedAt).toBeDefined();
    expect(event.status).toBe('resolved');
  });
});
