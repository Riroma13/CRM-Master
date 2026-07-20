import {
  StripeCircuitBreaker,
  CircuitBreakerOpenError,
} from '../payment/stripe-circuit-breaker';

describe('StripeCircuitBreaker', () => {
  let breaker: StripeCircuitBreaker;

  beforeEach(() => {
    jest.useFakeTimers();
    breaker = new StripeCircuitBreaker({
      threshold: 3,
      windowMs: 60_000,
      openTimeoutMs: 30_000,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('CLOSED state', () => {
    it('starts in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('calls the function and returns result on success', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const result = await breaker.call(fn);

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('remains CLOSED after fewer than 3 failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Stripe error'));

      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.getFailureCount()).toBe(2);
    });
  });

  describe('OPEN state', () => {
    it('transitions to OPEN after 3 failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Stripe error'));

      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');

      expect(breaker.getState()).toBe('OPEN');
      expect(breaker.getFailureCount()).toBe(3);
    });

    it('rejects calls immediately when OPEN', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Stripe error'));

      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');

      expect(breaker.getState()).toBe('OPEN');

      const successFn = jest.fn().mockResolvedValue('should not reach');
      await expect(breaker.call(successFn)).rejects.toThrow(
        CircuitBreakerOpenError,
      );
      expect(successFn).not.toHaveBeenCalled();
    });

    it('transitions to HALF_OPEN after openTimeoutMs', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Stripe error'));

      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(fn)).rejects.toThrow('Stripe error');

      expect(breaker.getState()).toBe('OPEN');

      jest.advanceTimersByTime(30_001);

      const successFn = jest
        .fn()
        .mockResolvedValue('after timeout');
      const result = await breaker.call(successFn);

      expect(result).toBe('after timeout');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('allows one test call in HALF_OPEN then blocks others', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Stripe error'));

      await expect(breaker.call(failFn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(failFn)).rejects.toThrow('Stripe error');
      await expect(breaker.call(failFn)).rejects.toThrow('Stripe error');

      expect(breaker.getState()).toBe('OPEN');

      jest.advanceTimersByTime(30_001);

      const testFn = jest.fn().mockResolvedValue('test ok');
      const result = await breaker.call(testFn);

      expect(result).toBe('test ok');
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe('HALF_OPEN state', () => {
    it('allows exactly one test call in HALF_OPEN', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('error'));
      await expect(breaker.call(failFn)).rejects.toThrow();
      await expect(breaker.call(failFn)).rejects.toThrow();
      await expect(breaker.call(failFn)).rejects.toThrow();

      jest.advanceTimersByTime(30_001);

      const testFn = jest.fn().mockResolvedValue('ok');
      const result = await breaker.call(testFn);
      expect(result).toBe('ok');
    });

    it('reopens after test call failure in HALF_OPEN', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('error'));
      await expect(breaker.call(failFn)).rejects.toThrow();
      await expect(breaker.call(failFn)).rejects.toThrow();
      await expect(breaker.call(failFn)).rejects.toThrow();

      jest.advanceTimersByTime(30_001);

      const stillFail = jest.fn().mockRejectedValue(new Error('still down'));
      await expect(breaker.call(stillFail)).rejects.toThrow('still down');

      expect(breaker.getState()).toBe('OPEN');

      const blocked = jest.fn().mockResolvedValue('blocked');
      await expect(breaker.call(blocked)).rejects.toThrow(
        CircuitBreakerOpenError,
      );
      expect(blocked).not.toHaveBeenCalled();
    });
  });

  describe('window-based failure counting', () => {
    it('resets failure count if window elapses before threshold', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('error'));

      await expect(breaker.call(failFn)).rejects.toThrow();
      await expect(breaker.call(failFn)).rejects.toThrow();

      expect(breaker.getFailureCount()).toBe(2);
      expect(breaker.getState()).toBe('CLOSED');

      jest.advanceTimersByTime(60_001);

      await expect(breaker.call(failFn)).rejects.toThrow();
      expect(breaker.getFailureCount()).toBe(1);
    });
  });

  describe('reset()', () => {
    it('resets state to CLOSED with 0 failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('error'));
      await expect(breaker.call(fn)).rejects.toThrow();
      await expect(breaker.call(fn)).rejects.toThrow();
      await expect(breaker.call(fn)).rejects.toThrow();

      expect(breaker.getState()).toBe('OPEN');

      breaker.reset();

      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.getFailureCount()).toBe(0);

      const okFn = jest.fn().mockResolvedValue('recovered');
      const result = await breaker.call(okFn);
      expect(result).toBe('recovered');
    });
  });
});
