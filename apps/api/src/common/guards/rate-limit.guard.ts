import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  // In-memory store: tenantId → { count, resetAt }
  private store = new Map<string, RateLimitEntry>();

  // Default: 100 requests per 60 seconds per tenant
  private readonly maxRequests = 100;
  private readonly windowMs = 60_000;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip rate limiting for @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = (request as any).tenantId || 'anonymous';

    const now = Date.now();
    let entry = this.store.get(tenantId);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(tenantId, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, this.maxRequests - entry.count);
    const resetSec = Math.ceil((entry.resetAt - now) / 1000);
    request.res?.setHeader('X-RateLimit-Limit', this.maxRequests);
    request.res?.setHeader('X-RateLimit-Remaining', remaining);
    request.res?.setHeader('X-RateLimit-Reset', resetSec);

    if (entry.count > this.maxRequests) {
      throw new HttpException(
        { message: 'Demasiadas solicitudes. Intente de nuevo en unos segundos.', retryAfter: resetSec },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
