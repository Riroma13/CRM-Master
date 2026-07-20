export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: string;
}
