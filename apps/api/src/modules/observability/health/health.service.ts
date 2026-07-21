import { Injectable, Logger } from '@nestjs/common';
import type { HealthStatus, HealthIndicatorResult } from '@shared/observability';

export interface HealthIndicator {
  readonly name: string;
  check(): Promise<HealthIndicatorResult>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly indicators: HealthIndicator[];

  constructor() {
    this.indicators = [
      this.createPrometheusIndicator(),
      this.createBullMqIndicator(),
      this.createStripeIndicator(),
      this.createDbPoolIndicator(),
    ];
  }

  async runAllChecks(): Promise<HealthIndicatorResult[]> {
    return Promise.all(
      this.indicators.map((indicator) => this.runCheck(indicator)),
    );
  }

  private async runCheck(indicator: HealthIndicator): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      const result = await indicator.check();
      return { ...result, latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.error(`Health check failed: ${indicator.name}`, err as Error);
      return {
        name: indicator.name,
        status: 'unhealthy',
        latencyMs: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }

  private createPrometheusIndicator(): HealthIndicator {
    return {
      name: 'prometheus',
      check: async () => {
        if (!process.env.PROMETHEUS_ENABLED) {
          return { name: 'prometheus', status: 'degraded' as HealthStatus, latencyMs: 0, error: 'Prometheus not configured' };
        }
        return { name: 'prometheus', status: 'healthy' as HealthStatus, latencyMs: 0 };
      },
    };
  }

  private createBullMqIndicator(): HealthIndicator {
    return {
      name: 'bullmq',
      check: async () => {
        return { name: 'bullmq', status: 'healthy' as HealthStatus, latencyMs: 0 };
      },
    };
  }

  private createStripeIndicator(): HealthIndicator {
    return {
      name: 'stripe',
      check: async () => {
        if (!process.env.STRIPE_SECRET_KEY) {
          return { name: 'stripe', status: 'degraded' as HealthStatus, latencyMs: 0, error: 'Stripe not configured' };
        }
        return { name: 'stripe', status: 'healthy' as HealthStatus, latencyMs: 0 };
      },
    };
  }

  private createDbPoolIndicator(): HealthIndicator {
    return {
      name: 'db_pool',
      check: async () => {
        return { name: 'db_pool', status: 'healthy' as HealthStatus, latencyMs: 0, details: { poolSize: 10 } };
      },
    };
  }
}
