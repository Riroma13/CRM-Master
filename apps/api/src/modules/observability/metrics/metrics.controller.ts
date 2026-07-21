import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { MetricsRegistry } from './metrics-registry';

@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsRegistry) {}

  @Get('/metrics')
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }
}
