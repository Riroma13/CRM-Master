import { Injectable, Logger } from '@nestjs/common';

interface SlidingWindowEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private windows = new Map<string, SlidingWindowEntry>();
  private readonly defaultLimit = 100;        // max messages per window
  private readonly windowMs = 60_000;         // 1 minute sliding window

  /**
   * Checks if a (tenantId, providerId) pair is allowed to send.
   * Key format: "rate:{tenantId}:{providerId}"
   */
  isAllowed(tenantId: string, providerId: string): boolean {
    const key = `rate:${tenantId}:${providerId}`;
    const now = Date.now();

    const entry = this.windows.get(key);
    if (!entry || now > entry.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.defaultLimit) {
      this.logger.warn(`Rate limit exceeded for ${key}`);
      return false;
    }

    entry.count++;
    return true;
  }

  getRemaining(tenantId: string, providerId: string): number {
    const key = `rate:${tenantId}:${providerId}`;
    const entry = this.windows.get(key);
    if (!entry) return this.defaultLimit;
    return Math.max(0, this.defaultLimit - entry.count);
  }
}
