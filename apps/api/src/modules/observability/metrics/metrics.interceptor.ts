import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsRegistry } from './metrics-registry';
import { normalizeRoute } from '../logging/route-normalization.middleware';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsRegistry) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const method = request.method;
    const route = request.normalizedRoute
      || normalizeRoute(request.route?.path || request.originalUrl || request.url || '');
    const moduleName = context.getClass()?.name || 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.metrics.httpRequestsTotal.inc({
            method, route, statusCode: response.statusCode, module: moduleName,
          });
          this.metrics.httpRequestDuration.observe({ method, route, module: moduleName }, duration);
        },
        error: (error: any) => {
          const duration = Date.now() - start;
          const statusCode = error.status || error.statusCode || 500;
          this.metrics.httpRequestsTotal.inc({
            method, route, statusCode, module: moduleName,
          });
          this.metrics.httpRequestDuration.observe({ method, route, module: moduleName }, duration);
          this.metrics.moduleErrorsTotal.inc({ module: moduleName, errorType: error.name || 'Error' });
        },
      }),
    );
  }
}
