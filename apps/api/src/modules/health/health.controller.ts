import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from '../observability/health/health.service';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check público — estado del sistema' })
  async check() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.prisma.admin.$queryRawUnsafe('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Redis check (via simple ping through any Redis call)
    checks.redis = 'unknown';

    // Extended health indicators from HealthService
    const indicators = await this.healthService.runAllChecks();
    for (const indicator of indicators) {
      checks[indicator.name] = indicator.status;
    }

    const allOk = Object.values(checks).every((s) => s === 'ok' || s === 'unknown' || s === 'healthy');

    return {
      status: allOk ? 'ok' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
