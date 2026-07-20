import { Injectable } from '@nestjs/common';
import type { RateLimitResult } from '@shared/public-api';

interface WindowEntry {
  timestamps: number[];
}

@Injectable()
export class RateLimitService {
  private readonly windows = new Map<string, WindowEntry>();
  private readonly WINDOW_MS = 60_000;
  private readonly DEFAULT_LIMIT = 100;

  checkRateLimit(
    apiKeyId: string,
    method: string,
    route: string,
    limit?: number,
    windowMs?: number,
  ): RateLimitResult {
    const key = `ratelimit:${apiKeyId}:${method}:${route}`;
    const effectiveLimit = limit ?? this.DEFAULT_LIMIT;
    const effectiveWindow = windowMs ?? this.WINDOW_MS;
    const now = Date.now();

    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter(ts => now - ts < effectiveWindow);

    if (entry.timestamps.length >= effectiveLimit) {
      const oldest = entry.timestamps[0];
      const retryAfter = Math.ceil((oldest + effectiveWindow - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.ceil((oldest + effectiveWindow) / 1000),
        retryAfter: Math.max(1, retryAfter),
      };
    }

    entry.timestamps.push(now);
    const remaining = effectiveLimit - entry.timestamps.length;
    return {
      allowed: true,
      remaining,
      resetAt: Math.ceil((now + effectiveWindow) / 1000),
    };
  }

  clearCache(): void {
    this.windows.clear();
  }
}
