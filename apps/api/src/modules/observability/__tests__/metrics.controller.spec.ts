import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from '../metrics/metrics.controller';
import { MetricsRegistry } from '../metrics/metrics-registry';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

describe('MetricsController', () => {
  let controller: MetricsController;
  let registry: MetricsRegistry;

  beforeEach(async () => {
    registry = new MetricsRegistry();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: MetricsRegistry, useValue: registry }],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('MUST return Prometheus format text with metric data', async () => {
    registry.httpRequestsTotal.inc({
      method: 'GET', route: '/test', statusCode: 200, module: 'Test',
    });

    const result = await controller.getMetrics();

    expect(result).toContain('# HELP');
    expect(result).toContain('# TYPE');
    expect(result).toContain('http_requests_total');
    expect(result).toContain('/test');
  });

  it('MUST have @Public() decorator applied to getMetrics method', () => {
    const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, MetricsController.prototype.getMetrics);
    expect(isPublic).toBe(true);
  });

  it('MUST return content containing all registered metrics', async () => {
    registry.httpRequestsTotal.inc({
      method: 'POST', route: '/api/workflows', statusCode: 201, module: 'WorkflowsController',
    });
    registry.httpRequestDuration.observe(
      { method: 'POST', route: '/api/workflows', module: 'WorkflowsController' }, 50,
    );
    registry.moduleErrorsTotal.inc({ module: 'TestModule', errorType: 'Error' });

    const result = await controller.getMetrics();

    expect(result).toContain('http_requests_total');
    expect(result).toContain('http_request_duration_ms');
    expect(result).toContain('http_requests_total');
    expect(result).toContain('module_errors_total');
  });

  it('MUST return empty metrics when no data recorded', async () => {
    const result = await controller.getMetrics();

    expect(result).toContain('# HELP');
    expect(result).toContain('# TYPE');
  });
});
