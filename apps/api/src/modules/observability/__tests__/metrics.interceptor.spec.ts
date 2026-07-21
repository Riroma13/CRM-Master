import { of, throwError } from 'rxjs';
import { MetricsInterceptor } from '../metrics/metrics.interceptor';
import { MetricsRegistry } from '../metrics/metrics-registry';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
    interceptor = new MetricsInterceptor(registry);
  });

  it('MUST record metrics on successful request', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/v1/health',
          normalizedRoute: '/api/v1/health',
        }),
        getResponse: () => ({ statusCode: 200 }),
      }),
      getClass: () => ({ name: 'HealthController' }),
    } as any;

    const next = { handle: () => of('ok') };

    interceptor.intercept(context, next).subscribe({
      complete: async () => {
        const data = await registry.httpRequestsTotal.get();
        const match = data.values.find(
          (v: any) => v.labels.method === 'GET' && v.labels.route === '/api/v1/health',
        );
        expect(match).toBeDefined();
        expect(match!.value).toBe(1);
        done();
      },
    });
  });

  it('MUST record httpRequestDuration on successful request', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/v1/health',
          normalizedRoute: '/api/v1/health',
        }),
        getResponse: () => ({ statusCode: 200 }),
      }),
      getClass: () => ({ name: 'HealthController' }),
    } as any;

    const next = { handle: () => of('ok') };

    interceptor.intercept(context, next).subscribe({
      complete: async () => {
        const data = await registry.httpRequestDuration.get();
        const match = data.values.find(
          (v: any) => v.labels.route === '/api/v1/health',
        );
        expect(match).toBeDefined();
        done();
      },
    });
  });

  it('MUST record moduleErrorsTotal on error', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/workflows',
          normalizedRoute: '/api/workflows',
        }),
        getResponse: () => ({ statusCode: 500 }),
      }),
      getClass: () => ({ name: 'WorkflowsController' }),
    } as any;

    const testError = new Error('validation failed');
    (testError as any).status = 400;
    const next = { handle: () => throwError(() => testError) };

    interceptor.intercept(context, next).subscribe({
      error: async () => {
        const errors = await registry.moduleErrorsTotal.get();
        const match = errors.values.find(
          (v: any) => v.labels.module === 'WorkflowsController' && v.labels.errorType === 'Error',
        );
        expect(match).toBeDefined();
        expect(match!.value).toBe(1);

        const requests = await registry.httpRequestsTotal.get();
        const reqMatch = requests.values.find(
          (v: any) => v.labels.statusCode === 400,
        );
        expect(reqMatch).toBeDefined();
        done();
      },
    });
  });

  it('MUST use route normalization when normalizedRoute is not set', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/tenants/42/workflows/550e8400-e29b-41d4-a716-446655440000',
        }),
        getResponse: () => ({ statusCode: 200 }),
      }),
      getClass: () => ({ name: 'TenantController' }),
    } as any;

    const next = { handle: () => of('ok') };

    interceptor.intercept(context, next).subscribe({
      complete: async () => {
        const data = await registry.httpRequestsTotal.get();
        const match = data.values.find((v: any) => v.labels.method === 'GET');
        expect(match).toBeDefined();
        expect(match!.labels.route).toBe('/api/tenants/:param/workflows/:param');
        done();
      },
    });
  });

  it('MUST use module name from controller class', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/api/v1/health',
          normalizedRoute: '/api/v1/health',
        }),
        getResponse: () => ({ statusCode: 200 }),
      }),
      getClass: () => ({ name: 'HealthController' }),
    } as any;

    const next = { handle: () => of('ok') };

    interceptor.intercept(context, next).subscribe({
      complete: async () => {
        const data = await registry.httpRequestsTotal.get();
        const match = data.values.find((v: any) => v.labels.module === 'HealthController');
        expect(match).toBeDefined();
        done();
      },
    });
  });
});
