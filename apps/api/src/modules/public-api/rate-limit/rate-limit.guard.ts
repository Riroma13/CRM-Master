import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { QuotaService } from './quota.service';
import type { RateLimitResult, QuotaResult } from '@shared/public-api';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly quotaService: QuotaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyId: string | undefined = request.apiKeyId;
    const tenantId: string | undefined = request.tenantId;

    if (!apiKeyId || !tenantId) {
      return true;
    }

    const method = request.method;
    const route = request.route?.path || request.url || '/unknown';

    const rateResult: RateLimitResult = this.rateLimitService.checkRateLimit(apiKeyId, method, route);
    if (!rateResult.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Try again later.',
          retryAfter: rateResult.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const quotaResult: QuotaResult = await this.quotaService.checkQuota(tenantId);
    if (!quotaResult.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Monthly quota exceeded.',
          used: quotaResult.used,
          limit: quotaResult.limit,
          resetAt: quotaResult.resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.quotaService.incrementUsage(tenantId).catch(() => {});

    return true;
  }
}
