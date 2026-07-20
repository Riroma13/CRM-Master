export class CircuitBreakerOpenError extends Error {
  constructor(message?: string) {
    super(message ?? 'Stripe circuit breaker is OPEN');
    this.name = 'CircuitBreakerOpenError';
  }
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  threshold?: number;
  windowMs?: number;
  openTimeoutMs?: number;
}

export class StripeCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private windowStart = 0;
  private halfOpenAllowed = true;

  private readonly threshold: number;
  private readonly windowMs: number;
  private readonly openTimeoutMs: number;

  constructor(config?: CircuitBreakerConfig) {
    this.threshold = config?.threshold ?? 3;
    this.windowMs = config?.windowMs ?? 60_000;
    this.openTimeoutMs = config?.openTimeoutMs ?? 30_000;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.openTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAllowed = true;
      } else {
        throw new CircuitBreakerOpenError();
      }
    }

    if (this.state === 'HALF_OPEN' && !this.halfOpenAllowed) {
      throw new CircuitBreakerOpenError(
        'Circuit breaker is HALF_OPEN; test call already in flight',
      );
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAllowed = false;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenAllowed = true;
    this.lastFailureTime = 0;
    this.windowStart = 0;
  }

  private onSuccess(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenAllowed = true;
  }

  private onFailure(error: unknown): void {
    const now = Date.now();
    this.lastFailureTime = now;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.halfOpenAllowed = true;
      this.failureCount = 1;
      this.windowStart = now;
      return;
    }

    if (this.failureCount === 0) {
      this.windowStart = now;
      this.failureCount = 1;
    } else {
      const windowElapsed = now - this.windowStart > this.windowMs;
      if (windowElapsed) {
        this.windowStart = now;
        this.failureCount = 1;
      } else {
        this.failureCount++;
      }
    }

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
