import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from '../rate-limit/rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [RateLimitService],
    }).compile();

    service = moduleRef.get(RateLimitService);
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('within limit', () => {
    it('should allow first request', () => {
      const result = service.checkRateLimit('key-1', 'GET', '/v1/public/workflows');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
      expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(result.retryAfter).toBeUndefined();
    });

    it('should decrement remaining on each request', () => {
      service.checkRateLimit('key-2', 'GET', '/v1/public/workflows');
      const result = service.checkRateLimit('key-2', 'GET', '/v1/public/workflows');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(98);
    });
  });

  describe('limit exceeded', () => {
    it('should block when limit is reached', () => {
      for (let i = 0; i < 100; i++) {
        const result = service.checkRateLimit('key-3', 'GET', '/v1/public/workflows');
        if (!result.allowed) {
          throw new Error(`Unexpected block at request ${i + 1}`);
        }
      }

      const result = service.checkRateLimit('key-3', 'GET', '/v1/public/workflows');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThanOrEqual(1);
    });

    it('should include retryAfter in seconds', () => {
      for (let i = 0; i < 100; i++) {
        service.checkRateLimit('key-4', 'GET', '/v1/public/workflows');
      }
      const result = service.checkRateLimit('key-4', 'GET', '/v1/public/workflows');
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThanOrEqual(1);
    });

    it('should accept custom limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = service.checkRateLimit('key-5', 'GET', '/v1/public/workflows', 5);
        expect(result.allowed).toBe(true);
      }

      const result = service.checkRateLimit('key-5', 'GET', '/v1/public/workflows', 5);
      expect(result.allowed).toBe(false);
    });
  });

  describe('window reset', () => {
    it('should allow requests after window expires', async () => {
      const shortWindow = 50;

      service.checkRateLimit('key-6', 'GET', '/v1/public/documents', 2, shortWindow);
      service.checkRateLimit('key-6', 'GET', '/v1/public/documents', 2, shortWindow);

      let result = service.checkRateLimit('key-6', 'GET', '/v1/public/documents', 2, shortWindow);
      expect(result.allowed).toBe(false);

      await new Promise(resolve => setTimeout(resolve, shortWindow + 10));

      result = service.checkRateLimit('key-6', 'GET', '/v1/public/documents', 2, shortWindow);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('different endpoints independent', () => {
    it('should track separate pools for different routes', () => {
      for (let i = 0; i < 100; i++) {
        service.checkRateLimit('key-7', 'GET', '/v1/public/workflows');
      }

      const blocked = service.checkRateLimit('key-7', 'GET', '/v1/public/workflows');
      expect(blocked.allowed).toBe(false);

      const allowed = service.checkRateLimit('key-7', 'GET', '/v1/public/documents');
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(99);
    });

    it('should track separate pools for different methods', () => {
      for (let i = 0; i < 100; i++) {
        service.checkRateLimit('key-8', 'GET', '/v1/public/workflows');
      }

      const blocked = service.checkRateLimit('key-8', 'GET', '/v1/public/workflows');
      expect(blocked.allowed).toBe(false);

      const allowed = service.checkRateLimit('key-8', 'POST', '/v1/public/workflows');
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(99);
    });

    it('should track separate pools for different keys', () => {
      for (let i = 0; i < 100; i++) {
        service.checkRateLimit('key-a', 'GET', '/v1/public/workflows');
      }

      const blocked = service.checkRateLimit('key-a', 'GET', '/v1/public/workflows');
      expect(blocked.allowed).toBe(false);

      const allowed = service.checkRateLimit('key-b', 'GET', '/v1/public/workflows');
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should reset all rate limit windows', () => {
      for (let i = 0; i < 100; i++) {
        service.checkRateLimit('key-9', 'GET', '/v1/public/workflows');
      }

      let result = service.checkRateLimit('key-9', 'GET', '/v1/public/workflows');
      expect(result.allowed).toBe(false);

      service.clearCache();

      result = service.checkRateLimit('key-9', 'GET', '/v1/public/workflows');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });
});
