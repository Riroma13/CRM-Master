import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { TokenService } from '../auth/token.service';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { QuotaService } from '../rate-limit/quota.service';
import { Reflector } from '@nestjs/core';

describe('RateLimitIntegration', () => {
  let moduleRef: TestingModule;
  let tokenService: TokenService;
  let rateLimitGuard: RateLimitGuard;
  let prisma: PrismaService;

  const TENANT_ID = 'cau-ten-rateint-0001';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        TokenService,
        RateLimitGuard,
        RateLimitService,
        QuotaService,
        Reflector,
      ],
    }).compile();

    tokenService = moduleRef.get(TokenService);
    rateLimitGuard = moduleRef.get(RateLimitGuard);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.apiQuota.deleteMany({});
      await prisma.admin.apiKey.deleteMany({});
      await moduleRef.close();
    }
  });

  afterEach(async () => {
    await prisma.admin.apiQuota.deleteMany({});
    await prisma.admin.apiKey.deleteMany({});
  });

  function mockContext(apiKeyId?: string, tenantId?: string, method = 'GET', route = '/v1/public/workflows') {
    const request: any = {
      method,
      url: route,
      route: { path: route },
      headers: {},
    };
    if (apiKeyId) request.apiKeyId = apiKeyId;
    if (tenantId) request.tenantId = tenantId;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  describe('full flow with auth', () => {
    it('should pass rate limit and quota for valid request', async () => {
      const created = await tokenService.createToken(TENANT_ID, 'Integration Key', ['workflows:read']);

      const ctx = mockContext(created.id, TENANT_ID);
      const result = await rateLimitGuard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('should allow requests up to rate limit then block', async () => {
      const created = await tokenService.createToken(TENANT_ID, 'Rate Limited Key', ['workflows:read']);

      // Delete any quota that might have been created by prior requests
      await prisma.admin.apiQuota.deleteMany({ where: { tenantId: TENANT_ID } });

      for (let i = 0; i < 100; i++) {
        const result = await rateLimitGuard.canActivate(mockContext(created.id, TENANT_ID));
        expect(result).toBe(true);
      }

      await expect(
        rateLimitGuard.canActivate(mockContext(created.id, TENANT_ID)),
      ).rejects.toThrow(HttpException);

      await expect(
        rateLimitGuard.canActivate(mockContext(created.id, TENANT_ID)),
      ).rejects.toMatchObject({
        response: { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: expect.stringContaining('Rate limit') },
      });
    });

    it('should pass through for unauthenticated requests (no apiKeyId)', async () => {
      const ctx = mockContext(undefined, undefined);
      const result = await rateLimitGuard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('should block when quota is exceeded', async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const created = await tokenService.createToken(TENANT_ID, 'Quota Limited Key', ['*:admin']);

      await prisma.admin.apiQuota.upsert({
        where: { tenantId: TENANT_ID },
        create: { tenantId: TENANT_ID, monthlyLimit: 1, usedThisMonth: 1, month: currentMonth },
        update: { monthlyLimit: 1, usedThisMonth: 1, month: currentMonth },
      });

      await expect(
        rateLimitGuard.canActivate(mockContext(created.id, TENANT_ID)),
      ).rejects.toThrow(HttpException);

      await expect(
        rateLimitGuard.canActivate(mockContext(created.id, TENANT_ID)),
      ).rejects.toMatchObject({
        response: { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: expect.stringContaining('quota') },
      });
    });
  });
});
