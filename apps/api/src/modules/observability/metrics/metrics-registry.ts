import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsRegistry {
  public readonly registry: promClient.Registry;
  public readonly httpRequestsTotal: promClient.Counter<string>;
  public readonly httpRequestDuration: promClient.Histogram<string>;
  public readonly moduleErrorsTotal: promClient.Counter<string>;
  public readonly bullmqQueueDepth: promClient.Gauge<string>;
  public readonly jobDuration: promClient.Histogram<string>;
  public readonly jobFailuresTotal: promClient.Counter<string>;
  public readonly activeJobs: promClient.Gauge<string>;
  public readonly activeTenants: promClient.Gauge<string>;

  constructor() {
    this.registry = new promClient.Registry();
    (this.registry as any).maxAgeSeconds = 300;

    this.httpRequestsTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'statusCode', 'module'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'route', 'module'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
      registers: [this.registry],
    });

    this.moduleErrorsTotal = new promClient.Counter({
      name: 'module_errors_total',
      help: 'Total number of errors by module',
      labelNames: ['module', 'errorType'],
      registers: [this.registry],
    });

    this.bullmqQueueDepth = new promClient.Gauge({
      name: 'bullmq_queue_depth',
      help: 'Current depth of BullMQ queues',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.jobDuration = new promClient.Histogram({
      name: 'job_duration_ms',
      help: 'Job execution duration in milliseconds',
      labelNames: ['queue', 'job'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
      registers: [this.registry],
    });

    this.jobFailuresTotal = new promClient.Counter({
      name: 'job_failures_total',
      help: 'Total number of job failures',
      labelNames: ['queue', 'job', 'errorType'],
      registers: [this.registry],
    });

    this.activeJobs = new promClient.Gauge({
      name: 'jobs_active',
      help: 'Number of active jobs',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.activeTenants = new promClient.Gauge({
      name: 'active_tenants',
      help: 'Number of active tenants',
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
