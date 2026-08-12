import { MetricsRegistry } from '../metrics/metrics-registry';
import { HealthController } from '../../health/health.controller';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  it('MUST increment httpRequestsTotal counter', async () => {
    registry.httpRequestsTotal.inc({ method: 'GET', route: '/api/health', statusCode: 200, module: 'HealthController' });

    const data = await registry.httpRequestsTotal.get();
    const matching = data.values.find(
      (v: any) => v.labels.route === '/api/health' && v.labels.statusCode === 200,
    );
    expect(matching).toBeDefined();
    expect(matching!.value).toBe(1);
  });

  it('MUST observe httpRequestDuration histogram', async () => {
    registry.httpRequestDuration.observe({ method: 'POST', route: '/api/workflows', module: 'WorkflowsController' }, 42);

    const data = await registry.httpRequestDuration.get();
    expect(data.values.length).toBeGreaterThan(0);
    const matching = data.values.find(
      (v: any) => v.labels.route === '/api/workflows',
    );
    expect(matching).toBeDefined();
  });

  it('MUST increment moduleErrorsTotal counter', async () => {
    registry.moduleErrorsTotal.inc({ module: 'WorkflowsController', errorType: 'ValidationError' });
    registry.moduleErrorsTotal.inc({ module: 'WorkflowsController', errorType: 'ValidationError' });

    const data = await registry.moduleErrorsTotal.get();
    const matching = data.values.find(
      (v: any) => v.labels.module === 'WorkflowsController' && v.labels.errorType === 'ValidationError',
    );
    expect(matching).toBeDefined();
    expect(matching!.value).toBe(2);
  });

  it('MUST set bullmqQueueDepth gauge value', async () => {
    registry.bullmqQueueDepth.set({ queue: 'workflows' }, 5);

    const data = await registry.bullmqQueueDepth.get();
    const matching = data.values.find((v: any) => v.labels.queue === 'workflows');
    expect(matching).toBeDefined();
    expect(matching!.value).toBe(5);
  });

  it('MUST set activeTenants gauge value', async () => {
    registry.activeTenants.set(10);

    const data = await registry.activeTenants.get();
    expect(data.values[0].value).toBe(10);
  });

  it('MUST support label combinations on httpRequestsTotal', async () => {
    registry.httpRequestsTotal.inc({ method: 'GET', route: '/api/health', statusCode: 200, module: 'HealthController' });
    registry.httpRequestsTotal.inc({ method: 'POST', route: '/api/workflows', statusCode: 201, module: 'WorkflowsController' });

    const data = await registry.httpRequestsTotal.get();
    expect(data.values.filter((v: any) => v.value > 0).length).toBeGreaterThanOrEqual(2);
  });

  it('MUST return metrics in Prometheus format via getMetrics', async () => {
    registry.httpRequestsTotal.inc({ method: 'GET', route: '/api/health', statusCode: 200, module: 'HealthController' });

    const output = await registry.getMetrics();
    expect(output).toContain('# HELP');
    expect(output).toContain('# TYPE');
    expect(output).toContain('http_requests_total');
  });

  it('MUST expose aggregate job metrics without payload or tenant labels', async () => {
    registry.jobDuration.observe({ queue: 'jobs', job: 'example-job' }, 42);
    registry.jobFailuresTotal.inc({ queue: 'jobs', job: 'example-job', errorType: 'TimeoutError' });
    registry.activeJobs.set({ queue: 'jobs' }, 2);

    const output = await registry.getMetrics();

    expect(output).toContain('job_duration_ms');
    expect(output).toContain('job_failures_total');
    expect(output).toContain('jobs_active');
    expect(output).not.toMatch(/payload|tenantId|correlationId|jobData/);
  });

  it('MUST report Redis readiness from the Jobs provider instead of unknown', async () => {
    const jobs = {
      getReadiness: jest.fn().mockResolvedValue({ redis: 'ok', jobs: 'ok' }),
    };
    const controller = new HealthController(
      { admin: { $queryRawUnsafe: jest.fn().mockResolvedValue(1) } } as any,
      { runAllChecks: jest.fn().mockResolvedValue([]) } as any,
      jobs as any,
    );

    const result = await controller.check();

    expect(jobs.getReadiness).toHaveBeenCalledTimes(1);
    expect(result.checks.redis).toBe('ok');
    expect(result.checks.jobs).toBe('ok');
    expect(result.checks.redis).not.toBe('unknown');
  });

  it('MUST degrade health when the Jobs provider reports Redis failure', async () => {
    const jobs = {
      getReadiness: jest.fn().mockResolvedValue({ redis: 'error', jobs: 'degraded' }),
    };
    const controller = new HealthController(
      { admin: { $queryRawUnsafe: jest.fn().mockResolvedValue(1) } } as any,
      { runAllChecks: jest.fn().mockResolvedValue([]) } as any,
      jobs as any,
    );

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.checks).toMatchObject({ redis: 'error', jobs: 'degraded' });
  });
});
